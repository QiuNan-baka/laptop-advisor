/**
 * 推荐名录的查询层。
 *
 * 【和 match.ts 的分工】
 *   match.ts       在实测参数库上做硬筛选（预算、重量、ppi……），回答"哪台达标"；
 *   guide.ts       在推荐名录上做软参考（同价位还有谁、优缺点是什么），回答"同价位还有什么值得看"。
 *
 * 两者永不混算：名录里的机器参数不全，绝不参与数值筛选。
 */

import {
  guideCatalog,
  type GuideCategory,
  type GuideEntry,
} from "@/data/guide-catalog";
import type { Constraints } from "@/data/dictionary";

/** 名录里出现过的价位段，按价格升序去重 */
export function priceBands(): { min: number; max: number | null }[] {
  const seen = new Map<string, { min: number; max: number | null }>();
  for (const g of guideCatalog) {
    const key = `${g.priceMin}-${g.priceMax}`;
    if (!seen.has(key)) seen.set(key, { min: g.priceMin, max: g.priceMax });
  }
  return [...seen.values()].sort((a, b) => a.min - b.min);
}

/**
 * 找出预算落在哪个价位段。
 * 预算是 6000 时命中 5500~6500 这一段；预算超出最高段时落在最上面一段。
 */
export function bandFor(budget: number): { min: number; max: number | null } {
  const bands = priceBands();
  for (const b of bands) {
    if (b.max === null) return b;
    if (budget <= b.max) return b;
  }
  return bands[bands.length - 1];
}

/** 从用户说的用途推断该看哪个定位；推断不出来就返回 null（不限制） */
export function categoryFromUsages(
  usages: Constraints["usages"]
): GuideCategory | null {
  if (!usages || usages.length === 0) return null;
  // 打游戏优先看游戏本，但它不等于"必须独显"，只是参考方向
  if (usages.includes("gaming")) return "gaming";
  // 剪辑/设计看全能本，轻薄本带不动
  if (usages.includes("design")) return "allround";
  return null;
}

/**
 * 给出一段预算附近的推荐名录。
 *
 * 逻辑：预算落在哪一段就取哪一段，再补上相邻的下一个价位段——
 * 因为很多人预算是有上下浮动的，卡死在单一段会漏掉"加点钱能买的"。
 */
export function guideNearBudget(
  budget: number | undefined,
  usages: Constraints["usages"]
): GuideEntry[] {
  if (budget === undefined) {
    const wanted = categoryFromUsages(usages);
    return wanted
      ? guideCatalog.filter((g) => g.category === wanted)
      : guideCatalog;
  }

  const bands = priceBands();
  const current = bandFor(budget);
  const idx = bands.findIndex((b) => b.min === current.min);
  const picked = new Set<number>([current.min]);
  if (idx + 1 < bands.length) picked.add(bands[idx + 1].min);
  if (idx > 0) picked.add(bands[idx - 1].min);

  return guideCatalog.filter((g) => picked.has(g.priceMin));
}

/** 按定位过滤；null 表示不过滤 */
export function filterByCategory(
  list: GuideEntry[],
  category: GuideCategory | null
): GuideEntry[] {
  if (!category) return list;
  const hit = list.filter((g) => g.category === category);
  // 该价位段这个定位一台都没有时，退回不过滤，别让用户看到空列表
  return hit.length > 0 ? hit : list;
}
