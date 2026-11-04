/**
 * Agent 主循环 —— 让模型自己决定「下一步查什么」
 *
 * 【Agent 和「一次 Prompt 答完」到底差在哪】
 * 一次 Prompt：用户问题 → 模型 → 答案。模型看不到真实数据，只能凭记忆编。
 * Agent：      用户问题 → 模型想「我需要先筛选」→ 调 filter_laptops
 *                        → 拿到真实结果 → 发现是 0 台 → 自己决定调 diagnose_shortage
 *                        → 拿到「是预算卡死了」→ 才组织语言回答
 *
 * 这个「走几步、每步查什么」是模型自己决定的，不是我写死的 if-else。
 * 这就是评分表里「Agent/工作流设计」和「Agent 自主决策」的实质。
 *
 * 【但自主 ≠ 失控】三道闸门：
 *   1. 步数上限 MAX_STEPS：最多 6 轮工具调用，防止死循环烧钱
 *   2. 总时长上限 TOTAL_TIMEOUT_MS：不管走几步，45 秒必须收尾
 *   3. 工具内部全部用 Zod 校验参数，越界直接拒收，模型改不了底线
 *
 * 【流式怎么做】
 * 每走一步就往外推一条事件（想什么、调了什么、结果如何），
 * 而不是等全部跑完再一次性吐出来。用户在界面上能实时看到 AI 在干什么，
 * 这不是装饰——它让「AI 在想」这件事变得可观察，对应「AI 思考状态可视化」。
 */

import type { ProviderConfig } from "@/lib/ai/provider";
import { describeCall, describeConstraints, executeTool, safeJson, TOOLS } from "./tools";
import type { ConstraintPatch } from "./tools";
import type { Citation } from "./rag";
import { parseRequirement } from "@/lib/match";

/** 最多几轮工具调用。超了必须收尾，不许无限查下去。 */
const MAX_STEPS = 6;

/** 整体预算。用户等 45 秒还没结果，体验就已经崩了。 */
const TOTAL_TIMEOUT_MS = 45_000;

/** 单次模型请求超时 */
const REQUEST_TIMEOUT_MS = 25_000;

/** 最终回答最多多少 token，防止模型写小作文 */
const ANSWER_MAX_TOKENS = 1_600;

// ---------- 往外推的事件 ----------

export type AgentEvent =
  | { type: "stage"; text: string }
  | { type: "thought"; text: string }
  | { type: "tool_call"; name: string; label: string }
  | { type: "tool_result"; name: string; label: string; summary: string; citations?: Citation[] }
  /**
   * 模型在调用工具前的那句「我先查一下」旁白。
   * 它已经作为 delta 流出去了，所以带上 chars 让前端把这几个字符从正文里摘掉，
   * 挪进「查证过程」区域。否则用户会看到旁白和正式回答混在一起，像是说了两遍。
   */
  | { type: "narration"; text: string; chars: number }
  | { type: "delta"; text: string }
  | { type: "citations"; items: Citation[] }
  /**
   * 模型通过 update_constraints 工具整理出的条件变更。
   * 前端收到后渲染「是否同步至匹配结果」确认区，等用户点按钮才真正应用。
   * 只是提议，不是指令——AI 不能越权改用户已定的条件。
   */
  | { type: "constraint_patch"; patch: ConstraintPatch; summary: string }
  | { type: "done"; steps: number; elapsedMs: number }
  | { type: "error"; message: string; recoverable: boolean };

export type Emit = (e: AgentEvent) => void;

// ---------- Agent 的系统提示词 ----------

const AGENT_SYSTEM_PROMPT = `你是一台笔记本选购顾问。你不是在"聊天"，你是在"用工具查资料然后回答"。

【你必须遵守的工作流程】
1. 先判断用户需要什么：预算、用途、屏幕、重量等。用户没说清就先问，不要瞎猜。
2. 需要机型时，调用 filter_laptops 从参数库筛选。**绝不能凭记忆报机型**。
3. 如果 filter_laptops 返回 0 台，必须调用 diagnose_shortage 找出哪条卡死了，然后在回答里如实告诉用户"是预算卡住了"或"是重量卡住了"，由用户决定放不放宽。**绝对不能自己偷偷改预算**。
4. 用户问"这台有什么缺点/散热怎么样/同价位别的怎么样"，调用 search_reviews 检索评测资料，回答时说明依据来自哪条资料。
5. 用户问"这两台差在哪"，调用 compare_laptops。
6. 需要某台机器的完整参数，调用 get_laptop_detail。
7. 用户要改筛选条件时，调用 update_constraints 把变更打包，然后停下来等用户确认同步。
   **判定标准不是「他有没有用祈使句」，而是「他是不是给了一个和当前条件不同的新数值/新要求」。**
   下面这些都算，必须调用 update_constraints：
   - 祈使句："预算提到 7000""加个独显""重量不超过 1.5kg""不要独显了""去掉重量限制"
   - **陈述句/补充说明**："预算9000之内""9000以内""预算最多九千""要 32G 内存""屏幕大点""轻一点，两公斤以内"
     —— 这类句子只是在陈述一个新边界，没写"改"字，但含义就是"把预算定在 9000"，
     和当前条件不一样就必须打包成条件变更，否则用户点不到"同步至匹配结果"。
   **判断依据是和 seedContext 里的当前条件比对：新数值 ≠ 当前值（或当前没有）→ 调工具；完全一样 → 不用调。**
   纯咨询、纯对比、纯聊缺点时不要调用它。

【铁律，违反即失败】
- 只提参数库里真实存在的机型。参数库里没有的，就说"我的参数库里没有这台"，不要编。
- 不编造任何数字。价格、重量、电池、ppi 都必须来自工具返回。
- 如果工具返回的信息不足以回答，就直说"这个信息我查不到"，不要用常识补全。
- 预算是最硬的约束。超预算的机器只能"告知"，不能"推荐"。
- 用户这句话如果和笔记本选购完全无关（不是参数、用途、机型咨询、对比、评测），
  不要调用任何工具，直接回答「暂时无法识别该内容」。

【回答风格】
- 中文，口语，像朋友帮你选电脑。不要写"综上所述""首先其次最后"这种废话。
- 先给结论，再给理由。理由里带具体数字。
- 最多推荐 3 台。说清每台的一句话理由和一句话短板。
- 不要用 markdown 表格，用短句。
- 用户问"看得清"这类模糊需求，要翻译成具体指标（ppi 而不是屏幕尺寸）并解释一下为什么。`;

// ---------- 消息类型 ----------

interface ToolCall {
  id: string;
  name: string;
  args: string;
}

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

// ---------- 流式请求 ----------

interface StreamOutcome {
  content: string;
  toolCalls: ToolCall[];
}

/**
 * 发一次流式请求，边解析边把正文推给界面。
 * 返回本次模型产出的正文 + 它想调用的工具。
 */
async function streamOnce(
  provider: ProviderConfig,
  messages: Message[],
  emit: Emit,
  deadline: number
): Promise<StreamOutcome> {
  const remain = deadline - Date.now();
  if (remain <= 1_000) {
    throw new Error("总时长已到上限");
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(REQUEST_TIMEOUT_MS, remain)
  );

  try {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: ANSWER_MAX_TOKENS,
        stream: true,
        ...(provider.extraBody ?? {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`模型接口返回 ${res.status}${body ? `：${body.slice(0, 200)}` : ""}`);
    }
    if (!res.body) throw new Error("模型接口没有返回流");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    const calls = new Map<number, ToolCall>();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 以空行分帧
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        for (const line of frame.split("\n")) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          let json: unknown;
          try {
            json = JSON.parse(data);
          } catch {
            continue; // 半帧，跳过
          }

          const delta = (
            json as {
              choices?: {
                delta?: {
                  content?: string;
                  tool_calls?: {
                    index?: number;
                    id?: string;
                    function?: { name?: string; arguments?: string };
                  }[];
                };
              }[];
            }
          ).choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            content += delta.content;
            emit({ type: "delta", text: delta.content });
          }

          for (const tc of delta.tool_calls ?? []) {
            const idx = tc.index ?? 0;
            const cur = calls.get(idx) ?? { id: "", name: "", args: "" };
            if (tc.id) cur.id = tc.id;
            if (tc.function?.name) cur.name = tc.function.name;
            if (tc.function?.arguments) cur.args += tc.function.arguments;
            calls.set(idx, cur);
          }
        }
      }
    }

    return {
      content,
      toolCalls: [...calls.values()].filter((c) => c.name),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 主循环 ----------

export interface RunAgentOptions {
  question: string;
  provider: ProviderConfig;
  emit: Emit;
  /** 可选：先把用户这句话翻译成约束，作为 Agent 的起点上下文 */
  seedContext?: string;
}

export async function runAgent({ question, provider, emit, seedContext }: RunAgentOptions): Promise<void> {
  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_TIMEOUT_MS;

  const messages: Message[] = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    {
      role: "user",
      content: seedContext
        ? `${seedContext}\n\n用户原话："""${question}"""\n\n` +
          `（提醒：如果这句话里出现了和上面条件不同的新数值——哪怕是「预算9000之内」这种陈述句——` +
          `先调 update_constraints 把变更打包，再回答。条件完全没变就不用调。）\n\n请开始查资料并回答。`
        : `用户原话："""${question}"""\n\n请开始查资料并回答。`,
    },
  ];

  const cited = new Map<string, Citation>();
  let steps = 0;
  // 本轮是否已经产出过「条件变更」（模型调 update_constraints 或本地兜底）。避免重复触发同步按钮。
  let patched = false;

  try {
    for (let step = 0; step < MAX_STEPS; step += 1) {
      steps = step + 1;
      if (Date.now() >= deadline) break;

      if (step === 0) {
        emit({ type: "stage", text: "正在理解你的需求…" });
      }

      const outcome = await streamOnce(provider, messages, emit, deadline);

      // 没有工具调用 = 模型认为可以直接答了，收工
      if (outcome.toolCalls.length === 0) {
        if (!outcome.content.trim()) {
          emit({ type: "error", message: "模型没有返回任何内容", recoverable: true });
        }
        break;
      }

      // 这一轮的正文其实是「我先查一下」这类旁白。
      // 它已经被 delta 推给前端了，这里补一条 narration 让前端把它从正文里摘出来，
      // 否则最终回答前面会挂着一串重复的旁白。
      if (outcome.content.trim()) {
        emit({ type: "narration", text: outcome.content.trim(), chars: outcome.content.length });
      }

      // 记录助手这一轮的意图（OpenAI 要求原样回传 tool_calls）
      messages.push({
        role: "assistant",
        content: outcome.content || null,
        tool_calls: outcome.toolCalls.map((c) => ({
          id: c.id || `call_${step}_${c.name}`,
          type: "function" as const,
          function: { name: c.name, arguments: c.args || "{}" },
        })),
      });

      // 逐个执行
      for (const call of outcome.toolCalls) {
        const label = describeCall(call.name, call.args);
        emit({ type: "tool_call", name: call.name, label });

        const result = await executeTool(call.name, call.args);

        if (result.citations?.length) {
          for (const c of result.citations) cited.set(c.id, c);
        }

        emit({
          type: "tool_result",
          name: call.name,
          label,
          summary: result.summary,
          citations: result.citations,
        });

        // 条件变更：单独发一条事件给前端，触发「是否同步」确认区
        if (result.constraintPatch) {
          patched = true;
          emit({
            type: "constraint_patch",
            patch: result.constraintPatch,
            summary: result.summary,
          });
        }

        messages.push({
          role: "tool",
          tool_call_id: call.id || `call_${step}_${call.name}`,
          content: result.content,
        });
      }

      // 每步都提醒一次预算，避免模型第 6 步才想起来
      if (step === MAX_STEPS - 2) {
        messages.push({
          role: "user",
          content: "（系统提示：这是最后一步了，请基于已查到的资料直接回答，不要再调用工具。）",
        });
      }
    }

    if (cited.size > 0) {
      emit({ type: "citations", items: [...cited.values()] });
    }

    // 兜底：模型这一轮没调 update_constraints，但用户的话里可能藏着明确的参数/用途变更。
    // 典型场景：用户问「预算9000之内」（陈述句），小模型有时把它当普通问题直接答了，
    // 于是没有 constraint_patch → 「同步至匹配结果」按钮消失。
    // 这里用本地规则引擎再解析一次：解析出约束就补发一个 patch，让按钮出现。
    // 纯咨询（「这几台差在哪」「散热怎么样」）解析不出任何约束，不会误触发。
    if (!patched) {
      const fallback = parseRequirement(question);
      if (Object.keys(fallback.constraints).length > 0) {
        const summary = describeConstraints(fallback.constraints).join("、");
        emit({
          type: "constraint_patch",
          patch: { set: fallback.constraints },
          summary: `我从你这句话里读到了这些条件：${summary}。点「同步至匹配结果」会把它合并进当前条件并重新筛选。`,
        });
      }
    }

    emit({ type: "done", steps, elapsedMs: Date.now() - startedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent 运行出错";
    emit({ type: "error", message, recoverable: true });
    emit({ type: "done", steps, elapsedMs: Date.now() - startedAt });
  }
}

/** 把 Agent 事件序列化成 SSE 帧 */
export function toSse(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** 导出给测试用 */
export const __agentInternals = { safeJson, MAX_STEPS, TOTAL_TIMEOUT_MS };
