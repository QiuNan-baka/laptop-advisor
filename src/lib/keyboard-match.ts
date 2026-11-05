/**
 * 键盘规则引擎 —— 约束 → 候选键盘 + 为什么推荐。
 * 镜像 mouse-match.ts，字段换为键盘（配列/轴体/连接/网页驱动/用途）。
 */

import { keyboards, type Connection, type Keyboard } from "@/data/keyboard-specs";
import {
  extractKeyboardNumbers,
  keyboardDictionary,
  KEYBOARD_CONSTRAINT_LABELS,
  type KeyboardConstraints,
} from "@/data/keyboard-dictionary";

export interface KeyboardMatchResult {
  keyboard: Keyboard;
  score: number;
  reason: string;
  overBudgetBy?: number;
}

export interface KeyboardMatchOutcome {
  results: KeyboardMatchResult[];
  didRelax: boolean;
  relaxLog: string[];
  overBudget: KeyboardMatchResult[];
  hasInput: boolean;
}

export interface KeyboardParseResult {
  constraints: KeyboardConstraints;
  traces: { label: string; explain: string; keys: (keyof KeyboardConstraints)[] }[];
}

export function parseKeyboardRequirement(text: string): KeyboardParseResult {
  const constraints: KeyboardConstraints = {};
  const traces: KeyboardParseResult["traces"] = [];

  if (!text.trim()) return { constraints, traces };

  // 1. 显式数字：预算
  const numbers = extractKeyboardNumbers(text);
  if (Object.keys(numbers).length > 0) {
    Object.assign(constraints, numbers);
    traces.push({
      label: "具体参数",
      explain: "你报出了具体数值，我直接按你给的数字来筛。",
      keys: Object.keys(numbers) as (keyof KeyboardConstraints)[],
    });
  }

  // 2. 词典匹配
  const lower = text.toLowerCase();
  for (const entry of keyboardDictionary) {
    const hit = entry.keywords.some((k) => lower.includes(k.toLowerCase()));
    if (!hit) continue;

    for (const [key, value] of Object.entries(entry.patch)) {
      const k = key as keyof KeyboardConstraints;
      if (Array.isArray(value)) {
        const prev = (constraints[k] as unknown[] | undefined) ?? [];
        if (k === "connections") {
          const set = new Set([...(prev as Connection[]), ...(value as Connection[])]);
          constraints[k] = [...set] as never;
        } else {
          const set = new Set([...prev, ...(value as unknown[])]);
          constraints[k] = [...set] as never;
        }
      } else if (typeof value === "number") {
        const old = constraints[k] as number | undefined;
        const stricter =
          k === "budgetMax" ? Math.min(old ?? Number.POSITIVE_INFINITY, value)
          : Math.max(old ?? Number.NEGATIVE_INFINITY, value);
        constraints[k] = stricter as never;
      } else if (typeof value === "boolean") {
        constraints[k] = (value || Boolean(constraints[k])) as never;
      }
    }

    traces.push({
      label: entry.label,
      explain: entry.explain,
      keys: Object.keys(entry.patch) as (keyof KeyboardConstraints)[],
    });
  }

  return { constraints, traces };
}

function keyboardSatisfies(kb: Keyboard, c: KeyboardConstraints): boolean {
  if (c.budgetMax !== undefined && kb.priceMin > c.budgetMax) return false;
  if (c.budgetMin !== undefined && kb.priceMax < c.budgetMin) return false;
  if (c.layouts?.length && !c.layouts.includes(kb.layout)) return false;
  if (c.switchTypes?.length && !c.switchTypes.some((s) => kb.switchTypes.includes(s))) return false;
  if (c.connections?.length && !c.connections.every((conn) => kb.connections.includes(conn))) return false;
  if (c.webDriver !== undefined && kb.webDriver !== c.webDriver) return false;
  if (c.usages?.length && !c.usages.some((u) => kb.usages.includes(u))) return false;
  return true;
}

function countKeyboardHits(kb: Keyboard, c: KeyboardConstraints): number {
  let n = 0;
  if (c.budgetMax !== undefined) n++;
  if (c.layouts?.length && c.layouts.includes(kb.layout)) n++;
  if (c.switchTypes?.length && c.switchTypes.some((s) => kb.switchTypes.includes(s))) n++;
  if (c.connections?.length && c.connections.every((x) => kb.connections.includes(x))) n++;
  if (c.webDriver !== undefined && kb.webDriver === c.webDriver) n++;
  if (c.usages?.length && c.usages.some((u) => kb.usages.includes(u))) n++;
  return n;
}

function switchTypeLabel(kb: Keyboard): string {
  return kb.switchTypes.map((s) => ({
    linear: "线性轴",
    tactile: "段落轴",
    clicky: "青轴",
    magnetic: "磁轴",
    optical: "光轴",
    "low-profile": "矮轴",
  })[s]).join("/");
}

function connectionLabel(kb: Keyboard): string {
  const hasWired = kb.connections.includes("wired");
  const has24g = kb.connections.includes("wireless24g");
  const hasBt = kb.connections.includes("bluetooth");
  if (hasWired && has24g && hasBt) return "三模";
  const parts: string[] = [];
  if (hasWired) parts.push("有线");
  if (has24g) parts.push("2.4G");
  if (hasBt) parts.push("蓝牙");
  return parts.join("/");
}

function buildKeyboardReason(kb: Keyboard): string {
  const parts: string[] = [];
  parts.push(`参考价 ¥${kb.priceMin}${kb.priceMax !== kb.priceMin ? `~${kb.priceMax}` : ""}`);
  parts.push(`${kb.layout}%`);
  parts.push(switchTypeLabel(kb));
  parts.push(connectionLabel(kb));
  return parts.join(" · ");
}

function rankKeyboards(list: Keyboard[], c: KeyboardConstraints): KeyboardMatchResult[] {
  return list
    .map((kb) => ({ keyboard: kb, score: countKeyboardHits(kb, c), reason: buildKeyboardReason(kb) }))
    .sort((a, b) => b.score - a.score || a.keyboard.priceMin - b.keyboard.priceMin);
}

const KEYBOARD_RELAX_ORDER: (keyof KeyboardConstraints)[] = ["webDriver", "switchTypes", "connections", "usages", "layouts"];

export function matchKeyboards(constraints: KeyboardConstraints): KeyboardMatchOutcome {
  const hasInput = Object.keys(constraints).length > 0;

  const strict = rankKeyboards(keyboards.filter((kb) => keyboardSatisfies(kb, constraints)), constraints);
  if (strict.length > 0) {
    return { results: strict, didRelax: false, relaxLog: [], overBudget: [], hasInput };
  }

  const working: KeyboardConstraints = { ...constraints };
  const relaxLog: string[] = [];

  for (const key of KEYBOARD_RELAX_ORDER) {
    if (working[key] === undefined) continue;
    delete working[key];
    const label = KEYBOARD_CONSTRAINT_LABELS[key];
    relaxLog.push(`放宽了「${label}」`);

    const candidates = keyboards.filter((kb) => keyboardSatisfies(kb, working));
    if (candidates.length > 0) {
      return {
        results: rankKeyboards(candidates, working),
        didRelax: true,
        relaxLog,
        overBudget: [],
        hasInput,
      };
    }
  }

  if (constraints.budgetMax !== undefined) {
    const noBudget: KeyboardConstraints = { ...constraints };
    delete noBudget.budgetMax;
    const near = keyboards.filter((kb) => keyboardSatisfies(kb, noBudget));
    if (near.length > 0) {
      return {
        results: [],
        didRelax: true,
        relaxLog: [`${constraints.budgetMax} 元预算内没有满足条件的键盘，下面的都超出预算`],
        overBudget: rankKeyboards(near, noBudget)
          .slice(0, 3)
          .map((r) => ({ ...r, overBudgetBy: r.keyboard.priceMin - (constraints.budgetMax ?? 0) })),
        hasInput,
      };
    }
  }

  return {
    results: rankKeyboards(keyboards, {}),
    didRelax: true,
    relaxLog: [...relaxLog, "所有条件放宽后仍没有匹配，下面是全部键盘"],
    overBudget: [],
    hasInput,
  };
}
