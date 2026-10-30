/**
 * 解析需求的统一入口：AI 优先，失败自动降级到本地词典
 *
 * 【三层降级，这是「AI 安全可控 4 分」的核心】
 *   第 1 层：服务端内置 Key（我自己的 Key，住环境变量里）
 *   第 2 层：用户自带 Key（前端传上来，用完就丢，不落盘不写日志）
 *   第 3 层：本地关键词词典（完全离线，永远可用）
 *
 * 上层只会看到 { ok, source, ... }，不需要知道是谁翻译的。
 */

import { parseRequirement } from "@/lib/match";
import type { Constraints } from "@/data/dictionary";
import { callProvider, AiCallError } from "./client";
import { resolveProvider } from "./provider";
import type { AiResponse } from "./schema";
import type { ParseSource, UnifiedParseResult } from "./types";

// 这几个类型前后端都要用，统一定义在 types.ts（那里不依赖任何 Node API）；
// 在这里转出去，服务端代码继续从 "./parse" 取即可，不必改 import 路径。
export type { ParseSource, UnifiedParseResult } from "./types";

export interface ParseOptions {
  /** 用户自带的 Key，来自请求头。为空则用服务端配置。 */
  userKey?: string;
  /** 允许调用 AI（有些场景想强制走规则，比如演示降级） */
  allowAi?: boolean;
}

/** 把 AI 的返回和词典的结果合并：AI 理解不了的部分，词典兜住 */
function normalizeTraces(
  traces: AiResponse["traces"]
): UnifiedParseResult["traces"] {
  return traces
    .filter((t) => t.label.trim() && t.explain.trim())
    .map((t) => ({
      label: t.label.trim(),
      explain: t.explain.trim(),
      keys: t.keys.filter(Boolean) as (keyof Constraints)[],
    }));
}

export async function parseWithFallback(
  text: string,
  options: ParseOptions = {}
): Promise<UnifiedParseResult> {
  const startedAt = Date.now();
  const trimmed = text.trim();

  // 空输入直接走词典（省一次 API 调用）
  if (!trimmed) {
    return {
      ok: false,
      source: "rule",
      constraints: {},
      traces: [],
      confidence: 0,
      questions: [],
      elapsedMs: 0,
    };
  }

  const ruleResult = parseRequirement(trimmed);
  const fallback = (reason: string, source: ParseSource): UnifiedParseResult => ({
    // 用词典的结果兜住，永远有东西可展示
    ok: false,
    source,
    constraints: ruleResult.constraints,
    traces: ruleResult.traces,
    confidence: 0,
    questions: [],
    fallbackReason: reason,
    elapsedMs: Date.now() - startedAt,
  });

  if (options.allowAi === false) {
    return fallback("已切换为纯规则模式", "rule");
  }

  // 1. 选供应商：用户自带 Key 优先
  const userKey = options.userKey?.trim();
  const provider = resolveProvider(userKey || undefined);
  if (!provider) {
    return fallback(
      "没有配置可用的 API Key，已降级到本地关键词词典（功能完整，理解力较弱）",
      "rule"
    );
  }
  const source: ParseSource = userKey ? "user_key" : "builtin";

  // 2. 调模型
  try {
    const ai = await callProvider(provider, trimmed);

    // AI 一条约束都没给出来（比如用户说"随便"），也退回词典
    if (Object.keys(ai.constraints).length === 0 && ai.questions.length === 0) {
      return fallback(
        "模型认为信息不足，已用本地词典给出初步理解",
        source
      );
    }

    return {
      ok: true,
      source,
      constraints: ai.constraints,
      traces: normalizeTraces(ai.traces),
      confidence: ai.confidence,
      questions: ai.questions,
      model: provider.model,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    const kind = error instanceof AiCallError ? error.kind : "network";
    const message =
      error instanceof Error ? error.message : "调用模型失败";
    const reasonMap: Record<string, string> = {
      http: "模型服务返回错误",
      network: "网络不可达",
      timeout: "模型响应超时",
      schema: "模型输出格式不合规",
      empty: "模型返回空内容",
    };
    return fallback(
      `${reasonMap[kind] ?? "AI 不可用"}（${message.slice(0, 80)}），已自动降级到本地词典，功能不受影响`,
      source
    );
  }
}
