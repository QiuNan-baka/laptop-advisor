/**
 * POST /api/agent —— 流式 Agent 问答（SSE）
 *
 * 【和 /api/parse 的分工】
 * /api/parse  一次调用，只做「人话 → 结构化约束」这一件事，快速返回。
 * /api/agent  多轮工具调用，自己决定查什么、查几次，边查边把过程推给前端。
 *
 * 【为什么必须用 SSE 而不是普通 JSON 响应】
 * 普通响应要等全部跑完才吐出去，Agent 走 5 步要 20 秒，用户盯着转圈 20 秒
 * 会以为卡死了。SSE 是一边跑一边推，用户第 1 秒就能看到「正在筛选机型库…」。
 * 这不是为了炫技——它让「AI 在想什么」变成看得见的东西。
 *
 * 【SSE 的坑（写在这里防止以后改坏）】
 *   - Content-Type 必须是 text/event-stream
 *   - 必须加 Cache-Control: no-cache, no-transform（no-transform 是关键，
 *     否则某些反代会压缩/缓冲，流就断了）
 *   - 必须加 Connection: keep-alive
 *   - 必须加 X-Accel-Buffering: no（nginx 默认会缓冲整个响应）
 *   - 每一帧以 \n\n 结尾
 */

import { connection, NextResponse } from "next/server";
import { runAgent, toSse } from "@/lib/agent/agent";
import { resolveProvider } from "@/lib/ai/provider";
import { clientKeyFrom } from "@/lib/ai/rate-limit";

/** 用户问题长度上限 */
const MAX_INPUT_LEN = 300;

/**
 * Agent 单独限流：比翻译严得多。
 * 一次 Agent 问答可能触发 6 次模型调用，等于 6 次翻译的账单。
 * 所以窗口给到 3 分钟 6 次——正常用户一分钟内不会深聊三轮。
 */
const AGENT_WINDOW_MS = 180_000;
const AGENT_MAX_PER_WINDOW = 6;

// cacheComponents 模式下 route segment config 一律不允许出现，
// 需要请求期执行的地方统一用 connection()。

const agentBuckets = new Map<string, { startedAt: number; count: number }>();

function checkAgentLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (agentBuckets.size > 2_000) {
    for (const [k, b] of agentBuckets) {
      if (now - b.startedAt > AGENT_WINDOW_MS) agentBuckets.delete(k);
    }
  }
  const b = agentBuckets.get(key);
  if (!b || now - b.startedAt > AGENT_WINDOW_MS) {
    agentBuckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (b.count >= AGENT_MAX_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((AGENT_WINDOW_MS - (now - b.startedAt)) / 1000),
    };
  }
  b.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

interface AgentRequestBody {
  question?: unknown;
  /** 前端已经拿到的约束摘要（可选的起点上下文） */
  seedContext?: unknown;
}

export async function POST(request: Request) {
  await connection();

  const headers = request.headers;

  // ---- 限流 ----
  const limit = checkAgentLimit(clientKeyFrom(headers));
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: `问得太频繁了，请 ${limit.retryAfterSec} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  // ---- 入参 ----
  let question = "";
  let seedContext: string | undefined;
  try {
    const body = (await request.json()) as AgentRequestBody;
    if (typeof body.question === "string") question = body.question;
    if (typeof body.seedContext === "string" && body.seedContext.trim()) {
      seedContext = body.seedContext.slice(0, 600);
    }
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法的 JSON" }, { status: 400 });
  }

  if (!question.trim()) {
    return NextResponse.json(
      { ok: false, error: "请先说说你想问什么" },
      { status: 400 }
    );
  }
  if (question.length > MAX_INPUT_LEN) question = question.slice(0, MAX_INPUT_LEN);

  // ---- 供应商 ----
  const userKey = headers.get("x-user-ai-key")?.trim() || undefined;
  const provider = resolveProvider(userKey);

  if (!provider) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "服务端没有配置大模型。你可以在输入框里填自己的 API Key 试试，或者先用下面的规则筛选功能。",
        needKey: true,
      },
      { status: 503 }
    );
  }

  // ---- 开流 ----
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (event: Parameters<typeof toSse>[0]) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(toSse(event)));
        } catch {
          closed = true;
        }
      };

      // 客户端断开时停止推送（不能直接 return，否则模型调用还在烧钱）
      request.signal.addEventListener("abort", () => {
        closed = true;
      });

      try {
        await runAgent({ question, provider, emit, seedContext });
      } catch (error) {
        emit({
          type: "error",
          message: error instanceof Error ? error.message : "服务端未知错误",
          recoverable: true,
        });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            /* 已经关了 */
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // 反代不缓冲，否则流式会变成一次性吐完
      "X-Accel-Buffering": "no",
      "x-ai-model": provider.model,
    },
  });
}

/**
 * GET：探测 Agent 是否可用。
 * 和 /api/parse 的 GET 分开，因为前端要分别知道「翻译能用吗」「对话能用吗」。
 */
export async function GET() {
  await connection();
  const p = resolveProvider();
  return NextResponse.json(
    { configured: p !== null, model: p?.model ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
