/**
 * Agent 流式客户端 —— 在浏览器里读 SSE
 *
 * 【为什么不直接用 EventSource】
 * EventSource 只能发 GET 请求，带不了请求体，也带不了自定义请求头
 * （我们需要 x-user-ai-key）。所以改用 fetch + ReadableStream 手动解析 SSE。
 *
 * 【SSE 解析为什么不能直接 split("\n\n")】
 * 网络分片是不可控的：一个 UTF-8 中文字符可能被切成两半，
 * 一帧 SSE 也可能被切成三块送过来。所以必须：
 *   1. 用 TextDecoder 的 { stream: true } 保留半截字节
 *   2. 维护 buffer，只处理完整的空行分帧，剩下的留到下一轮
 */

import type { AgentEvent } from "@/lib/agent/agent";

export interface AgentRequestOptions {
  question: string;
  seedContext?: string;
  userKey?: string;
  signal?: AbortSignal;
}

export type AgentStreamHandler = (event: AgentEvent) => void;

/**
 * 发起一次 Agent 问答，事件边到边回调。
 * 返回值只在流结束时 resolve，表示"正常跑完"或"抛错"。
 */
export async function streamAgent(
  { question, seedContext, userKey, signal }: AgentRequestOptions,
  onEvent: AgentStreamHandler
): Promise<void> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 访客自带 Key：只放在请求头里，不写 localStorage / cookie / URL
      ...(userKey && userKey.trim() ? { "x-user-ai-key": userKey.trim() } : {}),
    },
    body: JSON.stringify({ question, seedContext }),
    signal,
  });

  if (!res.ok) {
    // 后端在开流之前报错时返回的是 JSON，不是 SSE
    const text = await res.text().catch(() => "");
    let message = `请求失败（${res.status}）`;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  if (!res.body) throw new Error("服务器没有返回数据流");

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      // stream: true 让解码器保留被切断的多字节字符
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatch(frame, onEvent);
      }
    }
    // 有些服务端最后一帧不带结尾空行，这里补一次
    if (buffer.trim()) dispatch(buffer, onEvent);
  } finally {
    reader.releaseLock?.();
  }
}

function dispatch(frame: string, onEvent: AgentStreamHandler): void {
  for (const line of frame.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      onEvent(JSON.parse(data) as AgentEvent);
    } catch {
      // 半帧或非法 JSON：丢掉，不影响后面的帧
    }
  }
}
