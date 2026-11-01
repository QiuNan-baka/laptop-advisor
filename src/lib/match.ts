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
import { formatCpu, efficiencyTier, hasStrongIGpu, isEfficientCpu } from "@/lib/cpu";
import {
  CONSTRAINT_LABELS,
  CONSTRAINT_UNITS,
  dictionary,
  extractBudget,
  extractNumbers,
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

  // 1.5 显式数字参数：32G内存 / 1TB / 2kg / 15.6英寸 / 120Hz。
  // 用户亲口报的具体值比词典默认值可信，所以放在词典之前提取。
  const numbers = extractNumbers(text);
  if (Object.keys(numbers).length > 0) {
    for (const [k, v] of Object.entries(numbers)) {
      const key = k as keyof Constraints;
      (constraints[key] as number) = v as number;
    }
    traces.push({
      label: "具体参数",
      explain: "你报出了具体数值，我直接按你给的数字来筛。",
      keys: Object.keys(numbers) as (keyof Constraints)[],
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
    // 显式数字优先：用户报过 32G 内存就别再拿词典的 32GB 覆盖、也别再报 16GB。
    if (entry.id === "big-ram" && constraints.ramMin !== undefined) continue;
    // 用户报过具体重量（2kg 等）就不再叠加「轻」的 1.5kg 默认值
    if (entry.id === "portable" && constraints.weightMax !== undefined) continue;
    // 用户报过具体尺寸就不再叠加「屏幕大」的默认值
    if (entry.id === "big-screen" && constraints.screenSizeMin !== undefined) continue;
    // 互斥：已经命中「轻度游戏」就不再叠加「重度游戏」的独显硬约束。
    // 否则「轻度玩3a」会同时命中两条（含"轻度玩"+含"玩3A"），
    // 既加 preferStrongIGpu 又加 requireDiscreteGpu:true，自相矛盾。
    if (entry.id === "gaming" && constraints.preferStrongIGpu === true) continue;

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

  // 3. 冲突调和（见 reconcileConstraints）
  const rec = reconcileConstraints(constraints);
  if (rec.note) traces.push(rec.note);

  return { constraints: rec.constraints, traces };
}

/**
 * 冲突调和：某些诉求组合在物理上互相矛盾，直接硬筛会导致结果极少甚至为空。
 * 规则 1：轻度游戏（preferStrongIGpu）+ 重度独显（requireDiscreteGpu）互斥 → 去独显。
 * 规则 2：「重度游戏」（requireDiscreteGpu，独显游戏本）+「轻」（weightMax < 2kg）冲突，
 *   独显游戏本受散热模组与独显重量限制，整机基本都在 1.6~2kg，几乎不存在 1.5kg 以下的，
 *   所以把重量上限放宽到 2kg，而不是筛出一两台甚至零台。
 */
export function reconcileConstraints(constraints: Constraints): {
  constraints: Constraints;
  note?: { label: string; explain: string; keys: (keyof Constraints)[] };
} {
  const rec: Constraints = { ...constraints };
  let note:
    | { label: string; explain: string; keys: (keyof Constraints)[] }
    | undefined;

  // 规则 1：轻度游戏与重度独显互斥。
  // 「轻度玩 3A」不强求独显——核显里 X7-358H/X9-388H 能带得动。
  // 若同时给了 preferStrongIGpu 和 requireDiscreteGpu，去掉独显硬约束。
  if (rec.preferStrongIGpu === true && rec.requireDiscreteGpu === true) {
    delete rec.requireDiscreteGpu;
    note = {
      label: "轻度游戏不强求独显",
      explain:
        "你说的是「轻度玩游戏」，核显轻薄本里的 X7-358H / X9-388H 已经能带得动 3A，不需要再上又重又贵的独显游戏本。所以我没按「需要独显」来筛。",
      keys: ["preferStrongIGpu", "requireDiscreteGpu"],
    };
  }

  // 规则 2：游戏本 + 轻薄冲突（详见函数注释）。
  // 注意：只有「重度游戏」（requireDiscreteGpu，即独显游戏本）才与「轻」冲突——
  // 独显游戏本受散热模组与独显重量限制，整机基本 1.6~2kg。
  // 轻度游戏走核显（X7-358H/X9-388H），核显轻薄本 1.5kg 以下大把，不冲突、不放宽。
  const wantsGaming = rec.requireDiscreteGpu === true;
  if (wantsGaming && rec.weightMax !== undefined && rec.weightMax < 2) {
    const oldWeight = rec.weightMax;
    rec.weightMax = 2;
    note = {
      label: "游戏本与轻薄冲突",
      explain: `你要「打游戏」又要「轻」，但独显游戏本受散热和独显重量限制，整机基本都在 1.6~2kg，几乎没有 ${oldWeight}kg 以下的。所以我把重量上限从 ${oldWeight}kg 放宽到 2kg，这样能筛出轻薄游戏本。`,
      keys: ["weightMax", "requireDiscreteGpu"],
    };
  }

  return note ? { constraints: rec, note } : { constraints: rec };
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
  // 注意：preferEfficient / preferStrongIGpu 都是「软偏好」而非硬过滤——它们不在这里做硬性排除，
  // 只在 countHits 加权和 rank 排序里把高能效芯片 / 强核显的机型往前排。
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
  if (c.preferEfficient && isEfficientCpu(l.cpu.name)) n++;
  if (c.preferStrongIGpu && hasStrongIGpu(l.cpu.name)) n++;
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
    .sort((a, b) => {
      // 高能效软偏好：能效档位高的排前面（tier 2 > tier 1 > 0），同档再按得分 + 价格
      if (c.preferEfficient) {
        const ta = efficiencyTier(a.laptop.cpu.name);
        const tb = efficiencyTier(b.laptop.cpu.name);
        if (ta !== tb) return tb - ta;
      }
      // 强核显软偏好：轻度玩 3A 时，Arc 强核显（X7-358H/X9-388H）排前面
      if (c.preferStrongIGpu) {
        const ia = hasStrongIGpu(a.laptop.cpu.name) ? 1 : 0;
        const ib = hasStrongIGpu(b.laptop.cpu.name) ? 1 : 0;
        if (ia !== ib) return ib - ia;
      }
      return b.score - a.score || a.laptop.price - b.laptop.price;
    });
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
