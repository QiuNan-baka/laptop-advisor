/**
 * 品牌识别 —— 把「品牌名」从用户话里识别出来，并处理母品牌 / 子品牌的展开关系。
 *
 * 【为什么品牌要和需求词典分开】
 * 「需求词典」是「用途/需求 → 参数约束」（"打游戏"→独显），
 * 「品牌」是「品牌名 → 机型白名单」，两类信息性质不同。
 * 这里单独维护一份品牌表，产出 Constraints.brands 白名单，交给规则引擎硬过滤。
 *
 * 【母品牌 / 子品牌的展开规则（用户 m06285 明确）】
 * - 搜母品牌 → 列出该品牌下所有子品牌机型（"联想"含 ThinkPad、来酷）。
 * - 搜子品牌 → 只列子品牌本身（"ROG"只列 ROG，不展开成华硕）。
 * 实现：给每台机型打「品牌标签」集合，母品牌机型自带子品牌标签的反向覆盖——
 *   联想 来酷Air → {联想, 来酷}
 *   ThinkPad X14 → {联想, ThinkPad}
 *   华硕 灵耀14 → {华硕}
 *   ROG 幻16   → {华硕, ROG}
 * 搜"联想"→ brands=["联想"]，命中的所有「标签含联想」的机型（含 ThinkPad、来酷）。
 * 搜"来酷"→ brands=["来酷"]，只命中「标签含来酷」的机型（不含其他联想本）。
 */

import type { Laptop } from "@/data/laptops";

/** 一条品牌条目：label=品牌标签，keywords=用户可能说的搜索词 */
export interface BrandEntry {
  /** 品牌标签（写入 Constraints.brands 的值，也是机型标签匹配的键） */
  label: string;
  /** 用户可能说的词（命中任意一个即识别为该品牌） */
  keywords: string[];
  /** 为什么这样翻译 + 母/子品牌展开关系，展示给用户看 */
  explain: string;
}

/** 全量品牌表（22 个品牌标签：4 母品牌 + 5 子品牌 + 13 独立品牌） */
export const BRAND_ENTRIES: BrandEntry[] = [
  { label: "联想", keywords: ["联想", "lenovo"], explain: "你提到了联想，我会展示联想（含 ThinkPad、来酷）的机型" },
  { label: "来酷", keywords: ["来酷", "lecool"], explain: "你提到了来酷（联想子品牌），我只展示来酷机型" },
  { label: "ThinkPad", keywords: ["thinkpad", "think pad"], explain: "你提到了 ThinkPad（联想子品牌），我只展示 ThinkPad 机型" },
  { label: "机械革命", keywords: ["机械革命", "mechrevo"], explain: "你提到了机械革命" },
  { label: "华硕", keywords: ["华硕", "asus"], explain: "你提到了华硕，我会展示华硕（含 ROG）的机型" },
  { label: "ROG", keywords: ["rog", "玩家国度", "败家之眼"], explain: "你提到了 ROG（华硕子品牌），我只展示 ROG 机型" },
  { label: "荣耀", keywords: ["荣耀", "honor"], explain: "你提到了荣耀" },
  { label: "惠普", keywords: ["惠普", "hp", "暗影精灵", "omen"], explain: "你提到了惠普" },
  { label: "苹果", keywords: ["苹果", "apple", "macbook", "mac"], explain: "你提到了苹果" },
  { label: "微星", keywords: ["微星", "msi"], explain: "你提到了微星" },
  { label: "小米", keywords: ["小米", "xiaomi"], explain: "你提到了小米，我会展示小米（含红米）的机型" },
  { label: "红米", keywords: ["红米", "redmi"], explain: "你提到了红米（小米子品牌），我只展示红米机型" },
  { label: "戴尔", keywords: ["戴尔", "dell"], explain: "你提到了戴尔，我会展示戴尔（含 Alienware）的机型" },
  { label: "ALIENWARE", keywords: ["alienware", "外星人"], explain: "你提到了 Alienware（戴尔子品牌），我只展示 Alienware 机型" },
  { label: "雷神", keywords: ["雷神", "thunderobot"], explain: "你提到了雷神" },
  { label: "神舟", keywords: ["神舟", "hasee"], explain: "你提到了神舟" },
  { label: "华为", keywords: ["华为", "huawei"], explain: "你提到了华为" },
  { label: "机械师", keywords: ["机械师", "machenike"], explain: "你提到了机械师" },
  { label: "雷蛇", keywords: ["雷蛇", "razer"], explain: "你提到了雷蛇" },
  { label: "七彩虹", keywords: ["七彩虹", "colorful"], explain: "你提到了七彩虹" },
  { label: "微软", keywords: ["微软", "surface", "microsoft"], explain: "你提到了微软（Surface）" },
  { label: "LG", keywords: ["lg", "gram"], explain: "你提到了 LG（gram）" },
];

/**
 * 一台机型 → 它归属的品牌标签集合。
 * 母品牌机型会带上子品牌的反向标签，使得「搜母品牌命中所有子品牌」成立。
 */
export function brandTags(l: Laptop): string[] {
  const tags = new Set<string>();
  const b = l.brand;
  const m = l.model;

  if (b === "联想") {
    tags.add("联想");
    // 来酷在数据里 brand 字段是「联想」、靠 model 前缀「来酷」区分，这里单独打标签
    if (m.startsWith("来酷")) tags.add("来酷");
  } else if (b === "ThinkPad") {
    tags.add("联想");
    tags.add("ThinkPad");
  } else if (b === "华硕") {
    tags.add("华硕");
  } else if (b === "ROG") {
    tags.add("华硕");
    tags.add("ROG");
  } else if (b === "小米") {
    tags.add("小米");
  } else if (b === "红米") {
    tags.add("小米");
    tags.add("红米");
  } else if (b === "ALIENWARE") {
    tags.add("戴尔");
    tags.add("ALIENWARE");
  } else {
    tags.add(b);
  }

  return [...tags];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 从自由文本里识别命中的品牌条目。
 * 中文关键词用 includes 匹配；纯英文/数字关键词用词边界匹配，
 * 避免短词（lg / hp / mac / msi）误命中其它英文单词里的子串。
 */
export function extractBrands(text: string): BrandEntry[] {
  if (!text.trim()) return [];
  const lower = text.toLowerCase();
  const hits: BrandEntry[] = [];

  for (const entry of BRAND_ENTRIES) {
    const hit = entry.keywords.some((k) => {
      const kl = k.toLowerCase();
      if (/^[a-z0-9]+$/.test(kl)) {
        const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(kl)}([^a-z0-9]|$)`, "i");
        return re.test(lower);
      }
      return lower.includes(kl);
    });
    if (hit) hits.push(entry);
  }

  return hits;
}
