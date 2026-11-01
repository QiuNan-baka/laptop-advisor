/**
 * 需求词典 —— 这个产品的真正壁垒，不是模型。
 *
 * 作用：把用户嘴里的"模糊说法"翻译成"可被机型参数验证的结构化约束"。
 * 【设计原则】模型只做意图分类 + 置信度，领域映射交给这里的规则。
 *   这样即使大模型挂了、或者换了模型，产品的判断力也不会变。
 */

import type { UsageTag } from "./laptops";

/** 结构化约束：每一项都能直接在机型库上做比较运算 */
export interface Constraints {
  budgetMin?: number;
  budgetMax?: number;
  /** 最大重量 kg */
  weightMax?: number;
  /** 最小屏幕尺寸 inch */
  screenSizeMin?: number;
  /** 最大屏幕尺寸 inch */
  screenSizeMax?: number;
  /** 最小像素密度 PPI —— "看得清"的正确衡量方式 */
  ppiMin?: number;
  /** 最小刷新率 Hz */
  refreshMin?: number;
  /** 最小内存 GB */
  ramMin?: number;
  /** 最小硬盘 GB */
  storageMin?: number;
  /** 最小电池 Wh */
  batteryMin?: number;
  /** 是否需要独显 */
  requireDiscreteGpu?: boolean;
  /** 优先高能效芯片（「续航久」的正确映射，不是大电池） */
  preferEfficient?: boolean;
  /** 优先强核显（「轻度玩 3A」的正确映射，不强求独显） */
  preferStrongIGpu?: boolean;
  /** 命中的用途标签 */
  usages?: UsageTag[];
}

/** 约束键 → 人话标签 */
export const CONSTRAINT_LABELS: Record<keyof Constraints, string> = {
  budgetMin: "最低预算",
  budgetMax: "预算上限",
  weightMax: "重量不超过",
  screenSizeMin: "屏幕至少",
  screenSizeMax: "屏幕最大",
  ppiMin: "清晰度不低于",
  refreshMin: "刷新率至少",
  ramMin: "内存至少",
  storageMin: "硬盘至少",
  batteryMin: "电池至少",
  requireDiscreteGpu: "需要独显",
  preferEfficient: "优先高能效芯片",
  preferStrongIGpu: "优先强核显",
  usages: "适用场景",
};

/** 约束键 → 单位（用于把数字渲染成人话） */
export const CONSTRAINT_UNITS: Partial<Record<keyof Constraints, string>> = {
  budgetMin: "元",
  budgetMax: "元",
  weightMax: "kg",
  screenSizeMin: "英寸",
  screenSizeMax: "英寸",
  ppiMin: "ppi",
  refreshMin: "Hz",
  ramMin: "GB",
  storageMin: "GB",
  batteryMin: "Wh",
};

export interface DictionaryEntry {
  id: string;
  /** 用户可能说的词（命中任意一个即触发） */
  keywords: string[];
  /** 这条翻译在界面上显示的名字 */
  label: string;
  /** 为什么这样翻译 —— 展示给用户看，让"翻译过程可见" */
  explain: string;
  /** 翻译出来的约束 */
  patch: Constraints;
}

export const dictionary: DictionaryEntry[] = [
  {
    id: "clear-screen",
    keywords: ["看得清", "清晰", "分辨率高", "屏幕好", "细腻", "不糊"],
    label: "看得清",
    explain:
      "「看得清」不等于「分辨率高」。清晰度取决于像素密度 ppi（= 分辨率 ÷ 屏幕尺寸）。一台 15.6 英寸 1080p 只有 141pp 清晰度，还不如 14 英寸 2.8K 的 243ppi。所以我按 ppi ≥ 190 来筛。",
    patch: { ppiMin: 190 },
  },
  {
    id: "big-screen",
    keywords: ["屏幕大", "大屏", "看着爽", "写代码方便"],
    label: "屏幕大",
    explain: "「大屏」是物理尺寸，我按对角线 ≥ 15.6 英寸来筛。注意：屏幕大和清晰是两件事。",
    patch: { screenSizeMin: 15.6 },
  },
  {
    id: "portable",
    keywords: ["轻", "便携", "带着方便", "背着", "通勤", "经常带出门"],
    label: "便携",
    explain: "「轻」我按整机 ≤ 1.5kg 来筛。超过 1.6kg 通勤负担会明显增加，2kg 以上基本不适合天天背。",
    patch: { weightMax: 1.5 },
  },
  {
    id: "light-gaming",
    keywords: ["轻度游戏", "轻度玩", "偶尔玩", "随便玩", "轻度3a", "轻游戏", "轻度玩游戏", "轻量游戏", "玩点游戏"],
    label: "轻度游戏",
    explain:
      "「轻度玩 3A」不需要独显。核显轻薄本里，只有 Intel Core Ultra X7-358H / X9-388H 的 Arc 强核显带得动 3A，其余核显（Apple M / 骁龙 X / 普通 Ultra）玩不动。所以我优先推荐这两款芯片的机型，而不是盲目上又重又贵的独显游戏本。",
    patch: { usages: ["gaming"], preferStrongIGpu: true },
  },
  {
    id: "gaming",
    keywords: ["打游戏", "游戏", "玩3A", "吃鸡", "原神", "电竞"],
    label: "打游戏",
    explain: "游戏需求真正卡的是独显 + 高刷屏，不是 CPU。我按「需要独显 + 刷新率 ≥ 120Hz」来筛。",
    patch: { requireDiscreteGpu: true, refreshMin: 120, usages: ["gaming"] },
  },
  {
    id: "coding",
    keywords: ["写代码", "编程", "开发", "程序员", "跑项目"],
    label: "写代码",
    explain: "写代码最卡的是内存和屏幕纵向空间，不是显卡。我按内存 ≥ 16GB 来筛。",
    patch: { ramMin: 16, usages: ["coding"] },
  },
  {
    id: "video-edit",
    keywords: ["剪视频", "剪辑", "做视频", "PR", "达芬奇"],
    label: "剪视频",
    explain: "剪视频要同时吃显存、内存和屏幕色域。我按「需要独显 + 内存 ≥ 16GB」来筛。",
    patch: { requireDiscreteGpu: true, ramMin: 16, usages: ["design"] },
  },
  {
    id: "design",
    keywords: ["设计", "画图", "PS", "作图", "设计专业"],
    label: "做设计",
    explain: "做图对色域和分辨率敏感，对独显要求不如剪视频高。我按清晰度 ppi ≥ 190 来筛。",
    patch: { ppiMin: 190, usages: ["design"] },
  },
  {
    id: "battery",
    keywords: ["续航", "一天不用充电", "电池耐用", "上课一天"],
    label: "续航好",
    explain:
      "「一天不用充电」看的不是电池多大，而是芯片的能效比。一台 99Wh 电池的 HX 游戏本反而不如一台 52Wh 的 Apple M4 轻薄本耐造。所以我优先推荐高能效芯片（Apple M / 骁龙 X / Core Ultra / Ryzen AI）的机型，而不是盲目追大电池。",
    patch: { preferEfficient: true },
  },
  {
    id: "office",
    keywords: ["办公", "写文档", "做PPT", "日常用", "看看网页"],
    label: "日常办公",
    explain: "办公场景对性能要求很低，但要稳定、不烫手。我按办公用途来筛。",
    patch: { usages: ["office"] },
  },
  {
    id: "study",
    keywords: ["上课", "网课", "记笔记", "学生", "大学"],
    label: "学生上课",
    explain: "学生场景核心是便携 + 续航 + 价格。我按学习用途来筛。",
    patch: { usages: ["study"] },
  },
  {
    id: "cheap",
    keywords: ["便宜", "预算有限", "省钱", "不太贵", "性价比"],
    label: "价位不高",
    explain: "没给具体数字时，我按 5500 元以下来理解。如果不对，你可以在下面直接改。",
    patch: { budgetMax: 5500 },
  },
  {
    id: "quiet",
    keywords: ["安静", "不吵", "风扇声音小", "图书馆"],
    label: "安静",
    explain: "噪音在参数里体现不出来，但轻薄本普遍比游戏本安静。我按重量 ≤ 1.6kg 来近似。",
    patch: { weightMax: 1.6 },
  },
  {
    id: "big-storage",
    keywords: ["硬盘大", "存很多", "存资料", "1T", "1TB"],
    label: "存储大",
    explain: "我按硬盘 ≥ 1024GB 来筛。",
    patch: { storageMin: 1024 },
  },
  {
    id: "big-ram",
    keywords: ["内存大", "多开", "开很多网页", "虚拟机", "跑AI"],
    label: "内存大",
    explain: "多开浏览器 / 跑虚拟机 / 本地跑模型，吃的是内存。我按内存 ≥ 32GB 来筛。",
    patch: { ramMin: 32 },
  },
  {
    id: "watch-video",
    keywords: ["看剧", "看视频", "追剧", "看电影"],
    label: "看剧",
    explain: "看剧主要看屏幕素质和屏幕尺寸。我按 ppi ≥ 150 来筛。",
    patch: { ppiMin: 150, usages: ["video"] },
  },
];

/** 从自由文本里抽取预算数字，如「8000以内」「预算 6000」「不超过7000」 */
export function extractBudget(text: string): Constraints {
  const patch: Constraints = {};
  // 8000以内 / 8000以下 / 8000元以内
  const maxMatch = text.match(/(\d{3,5})\s*(?:元)?\s*(?:以内|以下|左右|之内|内)/);
  if (maxMatch) patch.budgetMax = Number(maxMatch[1]);
  // 不超过8000 / 预算8000 / 大概8000
  const altMax = text.match(/(?:预算|最多|不超过|大概|大约|想花)\s*(\d{3,5})/);
  if (altMax) patch.budgetMax = Number(altMax[1]);
  // 5000-8000 这种区间
  const range = text.match(/(\d{3,5})\s*[-~到]\s*(\d{3,5})/);
  if (range) {
    patch.budgetMin = Number(range[1]);
    patch.budgetMax = Number(range[2]);
  }
  return patch;
}

/** 从自由文本里抽取「数字 + 单位」的显式参数，如「32G内存」「1TB」「两公斤」「15.6英寸」「120Hz」 */
export function extractNumbers(text: string): Constraints {
  const patch: Constraints = {};

  // 内存：32G内存 / 32GB内存 / 内存32G / 16G
  const ram = text.match(/(\d{1,3})\s*(?:g|gb)\s*(?:内存|运存)?/i);
  if (ram) {
    const v = Number(ram[1]);
    if (v >= 4 && v <= 128) patch.ramMin = v;
  }

  // 硬盘：1T / 2TB（转成 GB）
  const tb = text.match(/(\d{1,2})\s*(?:t|tb)\b/i);
  if (tb) {
    const v = Number(tb[1]);
    if (v >= 1 && v <= 8) patch.storageMin = v * 1024;
  }

  // 重量：两公斤 / 2kg / 1.5千克（中文数字只处理「两」，其他交给词典）
  const cnWeight = text.match(/两\s*(?:公斤|千克|kg)/i);
  if (cnWeight) patch.weightMax = 2;
  const numWeight = text.match(/(\d(?:\.\d)?)\s*(?:公斤|千克|kg)\b/i);
  if (numWeight) {
    const v = Number(numWeight[1]);
    if (v >= 0.5 && v <= 5) patch.weightMax = v;
  }

  // 屏幕：15.6英寸 / 16寸 / 14英寸
  const size = text.match(/(\d{2}(?:\.\d)?)\s*(?:英寸|寸)/);
  if (size) {
    const v = Number(size[1]);
    if (v >= 10 && v <= 20) patch.screenSizeMin = v;
  }

  // 刷新率：120Hz / 144hz / 165赫兹
  const hz = text.match(/(\d{2,3})\s*(?:hz|赫兹)/i);
  if (hz) {
    const v = Number(hz[1]);
    if (v >= 60 && v <= 360) patch.refreshMin = v;
  }

  return patch;
}
