/**
 * 机型检索 —— 用户直接搜型号（"无界15X" / "MagicBook Pro 14" / "ThinkBook 14+"）时，
 * 从机型库里命中对应机型。
 *
 * 【为什么和「品牌」分开】
 * 「品牌」是「品牌名 → 机型白名单」（"联想"→一批机器），
 * 「机型检索」是「型号名 → 具体机器」（"无界15X"→那一台）。
 * 两者性质不同，所以单独维护。
 *
 * 【为什么由本地做、不让 AI 做】
 * 机型名是「参数事实源」里的一等数据，AI 永远不生成参数，所以也不生成机型名。
 * 用户直接搜型号时，由这里用字符串归一化匹配，稳、快、零幻觉。
 */

import { laptops, type Laptop } from "@/data/laptops";

/** 归一化：去所有空白、转小写，让「无界 15X」「无界15x」「无界15X」都能互相命中 */
function norm(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/**
 * 从自由文本里识别用户直接搜的机型名。
 * 返回命中的机型 model 名（原样，便于展示）。
 */
export function extractModels(text: string): string[] {
  const t = norm(text);
  if (t.length < 2) return [];
  const hits: string[] = [];

  for (const l of laptops) {
    const model = norm(l.model);
    const full = `${norm(l.brand)}${model}`;

    // 1) 用户完整说出了这个型号（可能夹在一句话里，如「无界15X 打游戏怎么样」）
    if (model.length >= 4 && t.includes(model)) {
      hits.push(l.model);
      continue;
    }
    // 2) 「品牌+型号」整体出现（如「机械革命无界15X」）
    if (t.includes(full)) {
      hits.push(l.model);
    }
  }

  return [...new Set(hits)];
}

/** 某台机型是否命中用户搜的型号名（归一化后互相包含，容忍大小写/空格差异） */
export function matchesModel(l: Laptop, query: string): boolean {
  const model = norm(l.model);
  const q = norm(query);
  if (!model || !q) return false;
  return model.includes(q) || q.includes(model);
}
