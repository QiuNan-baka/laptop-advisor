/**
 * 显示器规则引擎 —— 约束 → 候选显示器 + 为什么推荐。
 * 镜像 mouse-match.ts，字段换为显示器（尺寸/面板/分辨率/刷新率/亮度/曲面/用途）。
 */

import { monitors, type Monitor } from "@/data/monitor-specs";
import {
  extractMonitorNumbers,
  monitorDictionary,
  MONITOR_CONSTRAINT_LABELS,
  type MonitorConstraints,
} from "@/data/monitor-dictionary";

export interface MonitorMatchResult {
  monitor: Monitor;
  score: number;
  reason: string;
  overBudgetBy?: number;
}

export interface MonitorMatchOutcome {
  results: MonitorMatchResult[];
  didRelax: boolean;
  relaxLog: string[];
  overBudget: MonitorMatchResult[];
  hasInput: boolean;
}

export interface MonitorParseResult {
  constraints: MonitorConstraints;
  traces: { label: string; explain: string; keys: (keyof MonitorConstraints)[] }[];
}

export function parseMonitorRequirement(text: string): MonitorParseResult {
  const constraints: MonitorConstraints = {};
  const traces: MonitorParseResult["traces"] = [];

  if (!text.trim()) return { constraints, traces };

  // 1. 显式数字：预算/尺寸/刷新率/亮度
  const numbers = extractMonitorNumbers(text);
  if (Object.keys(numbers).length > 0) {
    Object.assign(constraints, numbers);
    traces.push({
      label: "具体参数",
      explain: "你报出了具体数值，我直接按你给的数字来筛。",
      keys: Object.keys(numbers) as (keyof MonitorConstraints)[],
    });
  }

  // 2. 词典匹配
  const lower = text.toLowerCase();
  for (const entry of monitorDictionary) {
    const hit = entry.keywords.some((k) => lower.includes(k.toLowerCase()));
    if (!hit) continue;

    for (const [key, value] of Object.entries(entry.patch)) {
      const k = key as keyof MonitorConstraints;
      if (Array.isArray(value)) {
        const prev = (constraints[k] as unknown[] | undefined) ?? [];
        const set = new Set([...prev, ...(value as unknown[])]);
        constraints[k] = [...set] as never;
      } else if (typeof value === "number") {
        const old = constraints[k] as number | undefined;
        if (k === "budgetMax" || k === "sizeMax" || k === "refreshMin" || k === "brightnessMin") {
          constraints[k] = (k === "budgetMax" || k === "sizeMax"
            ? Math.min(old ?? Number.POSITIVE_INFINITY, value)
            : Math.max(old ?? Number.NEGATIVE_INFINITY, value)) as never;
        } else if (k === "sizeMin") {
          constraints[k] = Math.max(old ?? Number.NEGATIVE_INFINITY, value) as never;
        } else {
          constraints[k] = value as never;
        }
      } else if (typeof value === "boolean") {
        constraints[k] = (value || Boolean(constraints[k])) as never;
      }
    }

    traces.push({
      label: entry.label,
      explain: entry.explain,
      keys: Object.keys(entry.patch) as (keyof MonitorConstraints)[],
    });
  }

  return { constraints, traces };
}

function monitorSatisfies(m: Monitor, c: MonitorConstraints): boolean {
  if (c.budgetMax !== undefined && m.priceMin > c.budgetMax) return false;
  if (c.budgetMin !== undefined && m.priceMax < c.budgetMin) return false;
  if (c.sizeMin !== undefined && m.sizeInch < c.sizeMin) return false;
  if (c.sizeMax !== undefined && m.sizeInch > c.sizeMax) return false;
  if (c.panelTypes?.length && !c.panelTypes.includes(m.panelType)) return false;
  if (c.miniLed !== undefined && m.miniLed !== c.miniLed) return false;
  if (c.resolutions?.length && !c.resolutions.includes(m.resolution)) return false;
  if (c.refreshMin !== undefined && m.refreshRate < c.refreshMin) return false;
  if (c.brightnessMin !== undefined && m.brightness < c.brightnessMin) return false;
  if (c.curved !== undefined && m.curved !== c.curved) return false;
  if (c.usages?.length && !c.usages.some((u) => m.usages.includes(u))) return false;
  return true;
}

function countMonitorHits(m: Monitor, c: MonitorConstraints): number {
  let n = 0;
  if (c.budgetMax !== undefined) n++;
  if (c.sizeMin !== undefined && m.sizeInch >= c.sizeMin) n++;
  if (c.sizeMax !== undefined && m.sizeInch <= c.sizeMax) n++;
  if (c.panelTypes?.length && c.panelTypes.includes(m.panelType)) n++;
  if (c.miniLed !== undefined && m.miniLed === c.miniLed) n++;
  if (c.resolutions?.length && c.resolutions.includes(m.resolution)) n++;
  if (c.refreshMin !== undefined && m.refreshRate >= c.refreshMin) n++;
  if (c.brightnessMin !== undefined && m.brightness >= c.brightnessMin) n++;
  if (c.curved !== undefined && m.curved === c.curved) n++;
  if (c.usages?.length && c.usages.some((u) => m.usages.includes(u))) n++;
  return n;
}

function buildMonitorReason(m: Monitor): string {
  const parts: string[] = [];
  parts.push(`参考价 ¥${m.priceMin}${m.priceMax !== m.priceMin ? `~${m.priceMax}` : ""}`);
  parts.push(`${m.sizeInch}英寸`);
  parts.push(m.resolution);
  parts.push(`${m.refreshRate}Hz`);
  if (m.miniLed) parts.push("MiniLED");
  return parts.join(" · ");
}

function rankMonitors(list: Monitor[], c: MonitorConstraints): MonitorMatchResult[] {
  return list
    .map((m) => ({ monitor: m, score: countMonitorHits(m, c), reason: buildMonitorReason(m) }))
    .sort((a, b) => b.score - a.score || a.monitor.priceMin - b.monitor.priceMin);
}

const MONITOR_RELAX_ORDER: (keyof MonitorConstraints)[] = [
  "brightnessMin", "curved", "miniLed", "refreshMin", "sizeMin", "sizeMax", "panelTypes", "resolutions", "usages",
];

export function matchMonitors(constraints: MonitorConstraints): MonitorMatchOutcome {
  const hasInput = Object.keys(constraints).length > 0;

  const strict = rankMonitors(monitors.filter((m) => monitorSatisfies(m, constraints)), constraints);
  if (strict.length > 0) {
    return { results: strict, didRelax: false, relaxLog: [], overBudget: [], hasInput };
  }

  const working: MonitorConstraints = { ...constraints };
  const relaxLog: string[] = [];

  for (const key of MONITOR_RELAX_ORDER) {
    if (working[key] === undefined) continue;
    delete working[key];
    const label = MONITOR_CONSTRAINT_LABELS[key];
    relaxLog.push(`放宽了「${label}」`);

    const candidates = monitors.filter((m) => monitorSatisfies(m, working));
    if (candidates.length > 0) {
      return {
        results: rankMonitors(candidates, working),
        didRelax: true,
        relaxLog,
        overBudget: [],
        hasInput,
      };
    }
  }

  if (constraints.budgetMax !== undefined) {
    const noBudget: MonitorConstraints = { ...constraints };
    delete noBudget.budgetMax;
    const near = monitors.filter((m) => monitorSatisfies(m, noBudget));
    if (near.length > 0) {
      return {
        results: [],
        didRelax: true,
        relaxLog: [`${constraints.budgetMax} 元预算内没有满足条件的显示器，下面的都超出预算`],
        overBudget: rankMonitors(near, noBudget)
          .slice(0, 3)
          .map((r) => ({ ...r, overBudgetBy: r.monitor.priceMin - (constraints.budgetMax ?? 0) })),
        hasInput,
      };
    }
  }

  return {
    results: rankMonitors(monitors, {}),
    didRelax: true,
    relaxLog: [...relaxLog, "所有条件放宽后仍没有匹配，下面是全部显示器"],
    overBudget: [],
    hasInput,
  };
}
