/**
 * 规则引擎 —— 主干交给规则，长尾交给 AI。
 *
 * 输入：结构化约束（Constraints）
 * 输出：候选机型 + 每个机型为什么被选中
 *
 * 【自主决策证据】两条"AI 自己做的判断"：
 *   1. 严格筛选为空时，按优先级自动放宽非预算条件再查一次，并把放宽了什么告诉用户；
 *   2. 预算内确实没有时，不擅自放宽预算，而是给出"最接近但超预算"的选择，让用户自己决定。
 *      —— 预算属于用户的硬约束，程序不该替用户改。
 */

import { laptops, type Laptop } from "@/data/laptops";
import { formatCpu } from "@/lib/cpu";
import {
  CONSTRAINT_LABELS,
  CONSTRAINT_UNITS,
  dictionary,
  extractBudget,
  type Constraints,
} from "@/data/dictionary";

export interface MatchResult {
  laptop: Laptop;
  /** 匹配得分，越高越合适 */
  score: number;
  /** 为什么推荐它（一句话） */
  reason: string;
  /** 超出预算多少元（仅 overBudget 里有值） */
  overBudgetBy?: number;
}

export interface MatchOutcome {
  /** 最终要展示的结果 */
  results: MatchResult[];
  /** 是否发生了自动放宽 */
  didRelax: boolean;
  /** 放宽了什么（人话） */
  relaxLog: string[];
  /** 预算内没有结果时，最接近但超预算的机型 */
  overBudget: MatchResult[];
  /** 用户是否提了能识别的需求 */
  hasInput: boolean;
}

/** 从自由文本里解析出结构化约束 + 翻译依据 */
export interface ParseResult {
  constraints: Constraints;
  /** 每条翻译的依据，用于在界面上"让翻译过程可见" */
  traces: { label: string; explain: string; keys: (keyof Constraints)[] }[];
}

/** 关键词匹配：把自由文本翻译成结构化约束 */
export function parseRequirement(text: string): ParseResult {
  const constraints: Constraints = {};
  const traces: ParseResult["traces"] = [];

  if (!text.trim()) return { constraints, traces };

  // 1. 预算数字（自由文本里的数字最优先）
  const budget = extractBudget(text);
  if (Object.keys(budget).length > 0) {
    Object.assign(constraints, budget);
    traces.push({
      label: "预算",
      explain: `我从你的话里读到了具体金额 ${
        budget.budgetMax ?? "?"
      } 元。你说的数字比词典里的默认值可信，所以以你说的为准。`,
      keys: Object.keys(budget) as (keyof Constraints)[],
    });
  }

  // 2. 词典匹配
  const lower = text.toLowerCase();
  for (const entry of dictionary) {
    const hit = entry.keywords.some((k) => lower.includes(k.toLowerCase()));
    if (!hit) continue;

    // 预算类词典只在用户没说具体数字时才生效
    if (entry.id === "cheap" && constraints.budgetMax !== undefined) continue;
    if (entry.id === "big-storage" && constraints.storageMin !== undefined) continue;

    for (const [key, value] of Object.entries(entry.patch)) {
      const k = key as keyof Constraints;
      if (k === "usages") {
        const merged = new Set([
          ...(constraints.usages ?? []),
          ...((value as Constraints["usages"]) ?? []),
        ]);
        constraints.usages = [...merged];
      } else if (typeof value === "number") {
        const oldValue = constraints[k] as number | undefined;
        // 同一个键取更严格的值
        const stricter =
          k === "budgetMax" || k === "weightMax" || k === "screenSizeMax"
            ? Math.min(oldValue ?? Number.POSITIVE_INFINITY, value)
            : Math.max(oldValue ?? Number.NEGATIVE_INFINITY, value);
        (constraints[k] as number) = stricter;
      } else if (typeof value === "boolean") {
        (constraints[k] as boolean) = value || Boolean(constraints[k]);
      }
    }

    traces.push({
      label: entry.label,
      explain: entry.explain,
      keys: Object.keys(entry.patch) as (keyof Constraints)[],
    });
  }

  return { constraints, traces };
}

/** 单个机型是否满足约束 */
export function satisfies(l: Laptop, c: Constraints): boolean {
  if (c.budgetMax !== undefined && l.price > c.budgetMax) return false;
  if (c.budgetMin !== undefined && l.price < c.budgetMin) return false;
  if (c.weightMax !== undefined && l.weight > c.weightMax) return false;
  if (c.screenSizeMin !== undefined && l.screen.sizeInch < c.screenSizeMin) return false;
  if (c.screenSizeMax !== undefined && l.screen.sizeInch > c.screenSizeMax) return false;
  if (c.ppiMin !== undefined && l.screen.ppi < c.ppiMin) return false;
  if (c.refreshMin !== undefined && (l.screen.refreshRate === undefined || l.screen.refreshRate < c.refreshMin)) return false;
  if (c.ramMin !== undefined && l.ram < c.ramMin) return false;
  if (c.storageMin !== undefined && (l.storage === undefined || l.storage < c.storageMin)) return false;
  if (c.batteryMin !== undefined && (l.battery === undefined || l.battery < c.batteryMin)) return false;
  if (c.requireDiscreteGpu && !/RTX|GTX|Radeon RX/.test(l.gpu)) return false;
  return true;
}

/** 命中了多少条用户约束（用于排序） */
function countHits(l: Laptop, c: Constraints): number {
  let n = 0;
  if (c.budgetMax !== undefined) n++;
  if (c.weightMax !== undefined) n++;
  if (c.screenSizeMin !== undefined) n++;
  if (c.ppiMin !== undefined) n++;
  if (c.refreshMin !== undefined) n++;
  if (c.ramMin !== undefined) n++;
  if (c.storageMin !== undefined) n++;
  if (c.batteryMin !== undefined) n++;
  if (c.requireDiscreteGpu) n++;
  if (c.usages?.length && c.usages.some((u) => l.tags.includes(u))) n++;
  return n;
}

/** 生成一句"为什么推荐它" */
function buildReason(l: Laptop, c: Constraints): string {
  const parts: string[] = [];
  if (c.ppiMin !== undefined && l.screen.ppi >= c.ppiMin) {
    parts.push(`${l.screen.sizeInch} 英寸 ${l.screen.resolution}，ppi ${l.screen.ppi}`);
  }
  if (c.weightMax !== undefined) parts.push(`${l.weight}kg`);
  if (c.budgetMax !== undefined) parts.push(`到手 ${l.price} 元`);
  // 处理器 + 显卡永远显示且相邻：这两项是用户看一台机器的第一眼，
  // 内存容量交给下面的参数格去显示，这里不重复占位。
  parts.push(formatCpu(l.cpu.name), l.gpu);
  if (parts.length === 0) parts.push(l.highlights[0] ?? "综合表现均衡");
  return parts.join(" · ");
}

/** 排序：命中约束多的优先，然后价格升序 */
function rank(list: Laptop[], c: Constraints): MatchResult[] {
  return list
    .map((l) => ({
      laptop: l,
      score: countHits(l, c),
      reason: buildReason(l, c),
    }))
    .sort((a, b) => b.score - a.score || a.laptop.price - b.laptop.price);
}

/**
 * 放宽优先级：从"最不影响本质需求"的开始放宽。
 * 【刻意不含 budgetMax】预算属于用户的硬约束，程序不该替用户改。
 */
const RELAX_ORDER: (keyof Constraints)[] = [
  "storageMin",
  "batteryMin",
  "refreshMin",
  "ramMin",
  "screenSizeMin",
  "ppiMin",
  "weightMax",
  "requireDiscreteGpu",
];

function describeConstraint(key: keyof Constraints, value: unknown): string {
  const label = CONSTRAINT_LABELS[key];
  const unit = CONSTRAINT_UNITS[key] ?? "";
  if (typeof value === "boolean") return label;
  return `${label} ${value}${unit}`;
}

/**
 * 主入口：约束 → 结果
 * 含"结果为空自动放宽约束再查一次"的自主决策逻辑
 */
export function match(constraints: Constraints): MatchOutcome {
  const hasInput = Object.keys(constraints).length > 0;

  // ===== 第一轮：严格匹配 =====
  const strict = rank(laptops.filter((l) => satisfies(l, constraints)), constraints);
  if (strict.length > 0) {
    return { results: strict, didRelax: false, relaxLog: [], overBudget: [], hasInput };
  }

  // ===== 第二轮：结果为空 → 逐项放宽非预算条件 =====
  const working: Constraints = { ...constraints };
  const relaxLog: string[] = [];

  for (const key of RELAX_ORDER) {
    if (working[key] === undefined) continue;
    const original = working[key];
    delete working[key];
    relaxLog.push(`放宽了「${describeConstraint(key, original)}」`);

    const candidates = laptops.filter((l) => satisfies(l, working));
    if (candidates.length > 0) {
      return {
        results: rank(candidates, working),
        didRelax: true,
        relaxLog,
        overBudget: [],
        hasInput,
      };
    }
  }

  // ===== 第三轮：预算内确实没有 → 给"最接近但超预算"的选择，交给用户决定 =====
  if (constraints.budgetMax !== undefined) {
    const noBudget: Constraints = { ...constraints };
    delete noBudget.budgetMax;
    const near = laptops.filter((l) => satisfies(l, noBudget));
    if (near.length > 0) {
      return {
        results: [],
        didRelax: true,
        relaxLog: [`${constraints.budgetMax} 元预算内没有满足条件的机型，下面的都超出预算`],
        overBudget: rank(near, noBudget)
          .slice(0, 3)
          .map((r) => ({ ...r, overBudgetBy: r.laptop.price - (constraints.budgetMax ?? 0) })),
        hasInput,
      };
    }
  }

  // ===== 全放宽也没有 → 返回全部（按价格排） =====
  return {
    results: rank(laptops, {}),
    didRelax: true,
    relaxLog: [...relaxLog, "所有条件放宽后仍没有匹配，下面是全部机型"],
    overBudget: [],
    hasInput,
  };
}
