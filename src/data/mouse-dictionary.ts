/**
 * 鼠标需求词典 —— 把「小手 / 三模 / 打游戏」这类模糊说法翻译成可筛选的结构化约束。
 *
 * 【为什么鼠标不走大模型】鼠标需求基本是枚举型（手长 / 握姿 / 连接方式 / 用途），
 * 本地词典一对一映射最准最快、零 token 消耗、零 Key 依赖，符合「能写 if-else 就别用 AI」。
 *
 * 【数据诚实】清单里没录的参数（静音 / 可充电 / 可换电池 / 续航时长）不编造：
 * 对应词典条目先建好（关键词能命中、人话能展示），但 patch 置空、explain 说明「数据待补」，
 * 等用户补齐 mouse-specs.ts 里的字段后自动生效，无需改词典。
 */

import type { Connection, Grip, HandSize, MouseUsage } from "./mouse-specs";

/** 鼠标结构化约束：每一项都能在 mouse-specs.ts 上做比较 */
export interface MouseConstraints {
  budgetMin?: number;
  budgetMax?: number;
  /** 适合手长（OR 语义：命中任一档即入选） */
  handSizes?: HandSize[];
  /** 适合握姿（OR 语义） */
  grips?: Grip[];
  /** 连接方式（AND 语义：鼠标须包含所有指定方式，三模=三种都有） */
  connections?: Connection[];
  /** 用途（OR 语义） */
  usages?: MouseUsage[];
  /** 最大重量（克），清单里明确写「约 XXg」的才参与，缺失的保留不筛 */
  weightMax?: number;
  /** 以下字段清单暂未收录，词典识别但 patch 为空，等数据补齐后启用 */
  silent?: boolean;
  rechargeable?: boolean;
  batterySwappable?: boolean;
  longBattery?: boolean;
}

/** 约束键 → 人话标签 */
export const MOUSE_CONSTRAINT_LABELS: Record<keyof MouseConstraints, string> = {
  budgetMin: "最低预算",
  budgetMax: "预算上限",
  handSizes: "手长",
  grips: "握姿",
  connections: "连接方式",
  usages: "用途",
  weightMax: "重量不超过",
  silent: "静音",
  rechargeable: "可充电",
  batterySwappable: "可换电池",
  longBattery: "续航长",
};

export interface MouseDictionaryEntry {
  id: string;
  keywords: string[];
  label: string;
  explain: string;
  patch: MouseConstraints;
}

export const mouseDictionary: MouseDictionaryEntry[] = [
  // ===== 手长（用户给：小手/中小手/中手/大手） =====
  {
    id: "small-hand",
    keywords: ["小手", "手小", "手不大", "手掌小"],
    label: "小手",
    explain: "我按「适合小手（≤17cm）」来筛。小手用户抓握大模具会很吃力。",
    patch: { handSizes: ["small"] },
  },
  {
    id: "small-medium-hand",
    keywords: ["中小手"],
    label: "中小手",
    explain: "我按「适合中小手（17-18cm）」来筛。",
    patch: { handSizes: ["small-medium"] },
  },
  {
    id: "medium-hand",
    keywords: ["中手"],
    label: "中手",
    explain: "我按「适合中手（18-19cm）」来筛。",
    patch: { handSizes: ["medium"] },
  },
  {
    id: "medium-large-hand",
    keywords: ["中大手"],
    label: "中大手",
    explain: "我按「适合中大手」来筛。",
    patch: { handSizes: ["medium-large"] },
  },
  {
    id: "large-hand",
    keywords: ["大手", "手大", "手掌大"],
    label: "大手",
    explain: "我按「适合大手（≥19cm）」来筛。",
    patch: { handSizes: ["large"] },
  },

  // ===== 用途（用户给：游戏/办公/通用） =====
  {
    id: "gaming",
    keywords: ["游戏", "打游戏", "玩3a", "吃鸡", "电竞", "fps", "竞技", "lol", "cs"],
    label: "游戏",
    explain: "游戏鼠标看传感器、轻量化和低延迟。我按「游戏用途」来筛，优先排轻量电竞款。",
    patch: { usages: ["gaming"] },
  },
  {
    id: "office",
    keywords: ["办公", "写文档", "做ppt", "日常", "上班", "工作"],
    label: "办公",
    explain: "办公鼠标看握感舒适、续航和安静。我按「办公用途」来筛。",
    patch: { usages: ["office"] },
  },
  {
    id: "general",
    keywords: ["通用", "日用", "什么都干", "不挑", "随便"],
    label: "通用",
    explain: "通用鼠标兼顾游戏与办公。我按「通用用途」来筛。",
    patch: { usages: ["general"] },
  },

  // ===== 握姿（从清单补充：趴握/抓握/指握） =====
  {
    id: "palm-grip",
    keywords: ["趴握", "趴着握", "掌心贴合"],
    label: "趴握",
    explain: "趴握是掌心贴合鼠身，需要背部饱满的模具。我按「趴握」来筛。",
    patch: { grips: ["palm"] },
  },
  {
    id: "claw-grip",
    keywords: ["抓握", "抓着握"],
    label: "抓握",
    explain: "抓握是掌心悬空、指尖抓两侧，需要收腰的模具。我按「抓握」来筛。",
    patch: { grips: ["claw"] },
  },
  {
    id: "fingertip-grip",
    keywords: ["指握", "指头握", "指尖操作"],
    label: "指握",
    explain: "指握只用指尖操控，需要轻量小模具。我按「指握」来筛。",
    patch: { grips: ["fingertip"] },
  },

  // ===== 连接方式（用户给：三模 + 清单补充） =====
  {
    id: "tri-mode",
    keywords: ["三模", "三模式", "三种连接", "有线无线蓝牙都"],
    label: "三模",
    explain: "三模 = 有线 + 2.4G + 蓝牙三种连接方式都支持，兼容性最强。",
    patch: { connections: ["wired", "wireless24g", "bluetooth"] },
  },
  {
    id: "bluetooth",
    keywords: ["蓝牙", "bluetooth"],
    label: "蓝牙",
    explain: "蓝牙适合连平板/笔记本，无需接收器，但延迟略高于 2.4G。",
    patch: { connections: ["bluetooth"] },
  },
  {
    id: "wireless",
    keywords: ["无线", "2.4g", "2.4g接收器", "接收器"],
    label: "2.4G 无线",
    explain: "2.4G 接收器延迟低、抗干扰，适合游戏；但需要占用一个 USB 口。",
    patch: { connections: ["wireless24g"] },
  },
  {
    id: "wired",
    keywords: ["有线", "线控"],
    label: "有线",
    explain: "有线鼠标零延迟、免充电，适合桌面固定使用和电竞。",
    patch: { connections: ["wired"] },
  },
  {
    id: "multi-device",
    keywords: ["多设备", "多个设备", "多设备切换", "连多个", "好几个设备"],
    label: "多设备",
    explain: "「多个设备用」需要蓝牙（支持多设备记忆切换）。我按「支持蓝牙」来筛。",
    patch: { connections: ["bluetooth"] },
  },

  // ===== 轻量（用户例子「不要太重」） =====
  {
    id: "light-weight",
    keywords: ["不要太重", "轻一点", "轻量", "轻便", "轻的"],
    label: "轻量",
    explain: "轻量鼠标一般 ≤ 65g，长时间游戏/办公手更不累。我按重量 ≤ 65g 来筛（清单里没标重量的会保留）。",
    patch: { weightMax: 65 },
  },

  // ===== 以下字段清单未录，识别但不筛（数据待补） =====
  {
    id: "silent",
    keywords: ["静音", "安静", "无声", "不吵"],
    label: "静音",
    explain: "清单暂未收录「静音」参数，已记录你的需求，等数据补齐后自动参与筛选。",
    patch: {},
  },
  {
    id: "rechargeable",
    keywords: ["可充电", "充电", "typec充电", "内置电池"],
    label: "可充电",
    explain: "清单暂未收录「可充电」参数，已记录你的需求，等数据补齐后自动参与筛选。",
    patch: {},
  },
  {
    id: "battery-swappable",
    keywords: ["可换电池", "换电池", "干电池", "装电池"],
    label: "可换电池",
    explain: "清单暂未收录「可换电池」参数，已记录你的需求，等数据补齐后自动参与筛选。",
    patch: {},
  },
  {
    id: "long-battery",
    keywords: ["续航长", "续航久", "省电", "电池耐用"],
    label: "续航长",
    explain: "清单暂未收录「续航时长」参数，已记录你的需求，等数据补齐后自动参与筛选。",
    patch: {},
  },
];

/** 从自由文本里抽取「预算」与「重量」的显式数字 */
export function extractMouseNumbers(text: string): MouseConstraints {
  const patch: MouseConstraints = {};

  // 预算：200以内 / 预算200 / 不超过200 / 200左右
  const maxMatch = text.match(/(\d{2,4})\s*(?:元)?\s*(?:以内|以下|左右|之内|内)/);
  if (maxMatch) patch.budgetMax = Number(maxMatch[1]);
  const altMax = text.match(/(?:预算|最多|不超过|大概|大约|想花)\s*(\d{2,4})/);
  if (altMax) patch.budgetMax = Number(altMax[1]);
  // 区间：100-200
  const range = text.match(/(\d{2,4})\s*[-~到]\s*(\d{2,4})/);
  if (range) {
    patch.budgetMin = Number(range[1]);
    patch.budgetMax = Number(range[2]);
  }

  // 重量：XXg / XX克（鼠标重量单位是克）
  const weight = text.match(/(\d{2,3})\s*(?:g|克)\b/i);
  if (weight) {
    const v = Number(weight[1]);
    if (v >= 20 && v <= 200) patch.weightMax = v;
  }

  return patch;
}
