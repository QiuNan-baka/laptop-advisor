/**
 * 鼠标规则引擎 —— 约束 → 候选鼠标 + 为什么推荐。
 *
 * 【为什么鼠标单独一套 match，不复用笔记本的 match.ts】
 * 鼠标字段（手长/握姿/连接/用途/重量克）与笔记本（屏幕/内存/独显）完全不同，
 * 硬塞进同一个 Constraints 会污染语义。鼠标走纯本地词典（枚举映射），不进大模型。
 *
 * 【软硬过滤】handSizes/grips/usages/connections 是硬过滤（枚举必须命中）；
 * weightMax 也是硬过滤，但「清单里没标重量」的鼠标保留（宁可多列不可漏杀）。
 * budget 硬过滤；静音/充电/续航三个字段数据未录，不参与筛选。
 */

import { mice, type Connection, type Mouse } from "@/data/mouse-specs";
import {
  extractMouseNumbers,
  mouseDictionary,
  MOUSE_CONSTRAINT_LABELS,
  type MouseConstraints,
} from "@/data/mouse-dictionary";

export interface MouseMatchResult {
  mouse: Mouse;
  /** 命中约束条数，越高越合适 */
  score: number;
  /** 一句话推荐理由 */
  reason: string;
  /** 超出预算多少元（仅 overBudget） */
  overBudgetBy?: number;
}

export interface MouseMatchOutcome {
  results: MouseMatchResult[];
  didRelax: boolean;
  relaxLog: string[];
  overBudget: MouseMatchResult[];
  hasInput: boolean;
}

export interface MouseParseResult {
  constraints: MouseConstraints;
  traces: { label: string; explain: string; keys: (keyof MouseConstraints)[] }[];
}

/** 把自由文本翻译成鼠标约束（纯本地词典，不调大模型） */
export function parseMouseRequirement(text: string): MouseParseResult {
  const constraints: MouseConstraints = {};
  const traces: MouseParseResult["traces"] = [];

  if (!text.trim()) return { constraints, traces };

  // 1. 显式数字：预算 + 重量（用户亲口报的值最可信）
  const numbers = extractMouseNumbers(text);
  if (Object.keys(numbers).length > 0) {
    Object.assign(constraints, numbers);
    traces.push({
      label: "具体参数",
      explain: "你报出了具体数值，我直接按你给的数字来筛。",
      keys: Object.keys(numbers) as (keyof MouseConstraints)[],
    });
  }

  // 2. 词典匹配（枚举映射）
  const lower = text.toLowerCase();
  for (const entry of mouseDictionary) {
    const hit = entry.keywords.some((k) => lower.includes(k.toLowerCase()));
    if (!hit) continue;

    for (const [key, value] of Object.entries(entry.patch)) {
      const k = key as keyof MouseConstraints;
      if (Array.isArray(value)) {
        const prev = (constraints[k] as unknown[] | undefined) ?? [];
        // 手长/握姿/用途是 OR 语义：合并去重
        if (k === "connections") {
          // 连接方式是 AND 语义：取并集（三模要求三种都有）
          const set = new Set([...(prev as Connection[]), ...(value as Connection[])]);
          constraints[k] = [...set] as never;
        } else {
          // handSizes/grips/usages：OR 语义，合并去重
          const set = new Set([...prev, ...(value as unknown[])]);
          constraints[k] = [...set] as never;
        }
      } else if (typeof value === "number") {
        const old = constraints[k] as number | undefined;
        const stricter =
          k === "budgetMax" || k === "weightMax"
            ? Math.min(old ?? Number.POSITIVE_INFINITY, value)
            : Math.max(old ?? Number.NEGATIVE_INFINITY, value);
        constraints[k] = stricter as never;
      } else if (typeof value === "boolean") {
        constraints[k] = (value || Boolean(constraints[k])) as never;
      }
    }

    traces.push({
      label: entry.label,
      explain: entry.explain,
      keys: Object.keys(entry.patch) as (keyof MouseConstraints)[],
    });
  }

  return { constraints, traces };
}

/** 单个鼠标是否满足约束 */
function mouseSatisfies(m: Mouse, c: MouseConstraints): boolean {
  if (c.budgetMax !== undefined && m.priceMin > c.budgetMax) return false;
  if (c.budgetMin !== undefined && m.priceMax < c.budgetMin) return false;
  // 手长：命中任一档即入选
  if (c.handSizes?.length && !c.handSizes.some((h) => m.handSize.includes(h))) return false;
  // 握姿：命中任一即入选
  if (c.grips?.length && !c.grips.some((g) => m.grips.includes(g))) return false;
  // 用途：命中任一即入选
  if (c.usages?.length && !c.usages.some((u) => m.usages.includes(u))) return false;
  // 连接：AND 语义，须包含所有指定方式（三模=三种都有）
  if (c.connections?.length && !c.connections.every((conn) => m.connections.includes(conn))) return false;
  // 重量：清单没标重量的保留（宁可多列不可漏杀）
  if (c.weightMax !== undefined && m.weight !== undefined && m.weight > c.weightMax) return false;
  return true;
}

/** 命中多少条约束 */
function countMouseHits(m: Mouse, c: MouseConstraints): number {
  let n = 0;
  if (c.budgetMax !== undefined) n++;
  if (c.handSizes?.length && c.handSizes.some((h) => m.handSize.includes(h))) n++;
  if (c.grips?.length && c.grips.some((g) => m.grips.includes(g))) n++;
  if (c.usages?.length && c.usages.some((u) => m.usages.includes(u))) n++;
  if (c.connections?.length && c.connections.every((x) => m.connections.includes(x))) n++;
  if (c.weightMax !== undefined && m.weight !== undefined && m.weight <= c.weightMax) n++;
  return n;
}

/** 连接方式 → 人话 */
function connectionLabel(m: Mouse): string {
  const hasWired = m.connections.includes("wired");
  const has24g = m.connections.includes("wireless24g");
  const hasBt = m.connections.includes("bluetooth");
  if (hasWired && has24g && hasBt) return "三模";
  const parts: string[] = [];
  if (hasWired) parts.push("有线");
  if (has24g) parts.push("2.4G");
  if (hasBt) parts.push("蓝牙");
  return parts.join("/");
}

/** 生成一句话推荐理由 */
function buildMouseReason(m: Mouse): string {
  const parts: string[] = [];
  parts.push(`参考价 ¥${m.priceMin}${m.priceMax !== m.priceMin ? `~${m.priceMax}` : ""}`);
  parts.push(connectionLabel(m));
  if (m.weight !== undefined) parts.push(`${m.weight}g`);
  if (parts.length === 0) parts.push(m.comment);
  return parts.join(" · ");
}

function rankMice(list: Mouse[], c: MouseConstraints): MouseMatchResult[] {
  return list
    .map((m) => ({ mouse: m, score: countMouseHits(m, c), reason: buildMouseReason(m) }))
    .sort((a, b) => b.score - a.score || a.mouse.priceMin - b.mouse.priceMin);
}

/** 放宽优先级：先放重量，再放握姿，最后放连接，预算绝不放宽 */
const MOUSE_RELAX_ORDER: (keyof MouseConstraints)[] = ["weightMax", "grips", "connections", "usages", "handSizes"];

export function matchMice(constraints: MouseConstraints): MouseMatchOutcome {
  const hasInput = Object.keys(constraints).length > 0;

  const strict = rankMice(mice.filter((m) => mouseSatisfies(m, constraints)), constraints);
  if (strict.length > 0) {
    return { results: strict, didRelax: false, relaxLog: [], overBudget: [], hasInput };
  }

  const working: MouseConstraints = { ...constraints };
  const relaxLog: string[] = [];

  for (const key of MOUSE_RELAX_ORDER) {
    if (working[key] === undefined) continue;
    delete working[key];
    const label = MOUSE_CONSTRAINT_LABELS[key];
    relaxLog.push(`放宽了「${label}」`);

    const candidates = mice.filter((m) => mouseSatisfies(m, working));
    if (candidates.length > 0) {
      return {
        results: rankMice(candidates, working),
        didRelax: true,
        relaxLog,
        overBudget: [],
        hasInput,
      };
    }
  }

  // 预算内确实没有 → 超预算最近款
  if (constraints.budgetMax !== undefined) {
    const noBudget: MouseConstraints = { ...constraints };
    delete noBudget.budgetMax;
    const near = mice.filter((m) => mouseSatisfies(m, noBudget));
    if (near.length > 0) {
      return {
        results: [],
        didRelax: true,
        relaxLog: [`${constraints.budgetMax} 元预算内没有满足条件的鼠标，下面的都超出预算`],
        overBudget: rankMice(near, noBudget)
          .slice(0, 3)
          .map((r) => ({ ...r, overBudgetBy: r.mouse.priceMin - (constraints.budgetMax ?? 0) })),
        hasInput,
      };
    }
  }

  return {
    results: rankMice(mice, {}),
    didRelax: true,
    relaxLog: [...relaxLog, "所有条件放宽后仍没有匹配，下面是全部鼠标"],
    overBudget: [],
    hasInput,
  };
}
