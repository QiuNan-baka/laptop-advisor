/**
 * 显示器需求解析统一入口：AI 优先，失败自动降级到本地显示器词典。
 *
 * 与 mouse-parse.ts 平行（mouse-parse 是鼠标专用）。三层降级：
 *   第 1 层：服务端内置 Key
 *   第 2 层：用户自带 Key
 *   第 3 层：本地显示器词典（parseMonitorRequirement）
 */

import { parseMonitorRequirement } from "@/lib/monitor-match";
import type { MonitorConstraints } from "@/data/monitor-dictionary";
import { callWithSchema, AiCallError } from "./client";
import { resolveProvider } from "./provider";
import { MONITOR_SYSTEM_PROMPT } from "./monitor-prompt";
import { MonitorAiResponseSchema, type MonitorAiResponse } from "./monitor-schema";
import type { ParseSource } from "./types";

export interface MonitorTrace {
  label: string;
  explain: string;
  keys: (keyof MonitorConstraints)[];
}

export interface MonitorUnifiedParseResult {
  ok: boolean;
  source: ParseSource;
  constraints: MonitorConstraints;
  traces: MonitorTrace[];
  confidence: number;
  questions: string[];
  fallbackReason?: string;
  model?: string;
  elapsedMs: number;
}

export interface MonitorParseOptions {
  userKey?: string;
  allowAi?: boolean;
}

function normalizeTraces(
  traces: MonitorAiResponse["traces"]
): MonitorTrace[] {
  return traces
    .filter((t) => t.label.trim() && t.explain.trim())
    .map((t) => ({
      label: t.label.trim(),
      explain: t.explain.trim(),
      keys: t.keys.filter(Boolean) as (keyof MonitorConstraints)[],
    }));
}

export async function parseMonitorWithFallback(
  text: string,
  options: MonitorParseOptions = {}
): Promise<MonitorUnifiedParseResult> {
  const startedAt = Date.now();
  const trimmed = text.trim();

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

  const ruleResult = parseMonitorRequirement(trimmed);
  const fallback = (
    reason: string,
    source: ParseSource
  ): MonitorUnifiedParseResult => ({
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

  const userKey = options.userKey?.trim();
  const provider = resolveProvider(userKey || undefined);
  if (!provider) {
    return fallback(
      "没有配置可用的 API Key，已降级到本地显示器词典（功能完整，理解力较弱）",
      "rule"
    );
  }
  const source: ParseSource = userKey ? "user_key" : "builtin";

  try {
    const ai = await callWithSchema(
      provider,
      MONITOR_SYSTEM_PROMPT,
      MonitorAiResponseSchema,
      trimmed
    );

    if (Object.keys(ai.constraints).length === 0 && ai.questions.length === 0) {
      return fallback(
        "模型认为信息不足，已用本地词典给出初步理解",
        source
      );
    }

    // 本地词典识别出的显式数字（预算/尺寸/刷新率/亮度）合并进 AI 结果，防漏。
    const merged: MonitorConstraints = { ...ai.constraints };
    if (ruleResult.constraints.budgetMin !== undefined) {
      merged.budgetMin = ruleResult.constraints.budgetMin;
    }
    if (ruleResult.constraints.budgetMax !== undefined) {
      merged.budgetMax = ruleResult.constraints.budgetMax;
    }
    if (ruleResult.constraints.sizeMin !== undefined) {
      merged.sizeMin = ruleResult.constraints.sizeMin;
    }
    if (ruleResult.constraints.sizeMax !== undefined) {
      merged.sizeMax = ruleResult.constraints.sizeMax;
    }
    if (ruleResult.constraints.refreshMin !== undefined) {
      merged.refreshMin = ruleResult.constraints.refreshMin;
    }
    if (ruleResult.constraints.brightnessMin !== undefined) {
      merged.brightnessMin = ruleResult.constraints.brightnessMin;
    }

    return {
      ok: true,
      source,
      constraints: merged,
      traces: normalizeTraces(ai.traces),
      confidence: ai.confidence,
      questions: ai.questions,
      model: provider.model,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    const kind = error instanceof AiCallError ? error.kind : "network";
    const message = error instanceof Error ? error.message : "调用模型失败";
    const reasonMap: Record<string, string> = {
      http: "模型服务返回错误",
      network: "网络不可达",
      timeout: "模型响应超时",
      schema: "模型输出格式不合规",
      empty: "模型返回空内容",
    };
    return fallback(
      `${reasonMap[kind] ?? "AI 不可用"}（${message.slice(0, 80)}），已自动降级到本地显示器词典，功能不受影响`,
      source
    );
  }
}
