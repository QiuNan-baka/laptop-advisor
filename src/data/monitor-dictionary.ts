/**
 * 显示器需求词典 —— 把「尺寸 / 面板 / 分辨率 / 刷新率 / 用途」翻译成可筛选约束。
 * 显示器需求部分枚举（面板类型/分辨率/用途）+ 部分数值（尺寸/刷新率/亮度），
 * 本地词典 + 显式数字混合解析，符合「能写 if-else 就别用 AI」。铁律不变：不编造参数。
 */

import type { MonitorUsage, PanelType, Resolution } from "./monitor-specs";

export interface MonitorConstraints {
  budgetMin?: number;
  budgetMax?: number;
  /** 最小屏幕尺寸（英寸） */
  sizeMin?: number;
  /** 最大屏幕尺寸（英寸） */
  sizeMax?: number;
  /** 面板类型（OR 语义） */
  panelTypes?: PanelType[];
  /** 是否要求 MiniLED */
  miniLed?: boolean;
  /** 分辨率（OR 语义） */
  resolutions?: Resolution[];
  /** 最小刷新率 Hz */
  refreshMin?: number;
  /** 最小亮度 nit */
  brightnessMin?: number;
  /** 是否曲面 */
  curved?: boolean;
  /** 用途（OR 语义） */
  usages?: MonitorUsage[];
}

export const MONITOR_CONSTRAINT_LABELS: Record<keyof MonitorConstraints, string> = {
  budgetMin: "最低预算",
  budgetMax: "预算上限",
  sizeMin: "最小尺寸",
  sizeMax: "最大尺寸",
  panelTypes: "面板类型",
  miniLed: "MiniLED",
  resolutions: "分辨率",
  refreshMin: "刷新率下限",
  brightnessMin: "亮度下限",
  curved: "曲面",
  usages: "用途",
};

export interface MonitorDictionaryEntry {
  id: string;
  keywords: string[];
  label: string;
  explain: string;
  patch: MonitorConstraints;
}

export const monitorDictionary: MonitorDictionaryEntry[] = [
  // ===== 尺寸 =====
  {
    id: "size-24",
    keywords: ["24寸", "24英寸", "23.8", "24.5", "小屏", "小尺寸"],
    label: "24 英寸",
    explain: "24 英寸左右是 FPS 玩家公认的黄金尺寸，也适合桌面紧凑。我按「≤25 英寸」来筛。",
    patch: { sizeMax: 25 },
  },
  {
    id: "size-27",
    keywords: ["27寸", "27英寸", "大屏", "大尺寸"],
    label: "27 英寸",
    explain: "27 英寸是当前主流大屏尺寸，办公/游戏/影音都合适。我按「27 英寸左右」来筛。",
    patch: { sizeMin: 26, sizeMax: 28 },
  },
  {
    id: "size-32",
    keywords: ["32寸", "32英寸", "31.5", "超大屏", "巨屏"],
    label: "32 英寸",
    explain: "32 英寸超大屏，适合影音和 3A 沉浸。我按「≥31 英寸」来筛。",
    patch: { sizeMin: 31 },
  },

  // ===== 分辨率 =====
  {
    id: "res-1080",
    keywords: ["1080p", "全高清", "fhd"],
    label: "1080p",
    explain: "1080p 全高清，对显卡压力小，高刷电竞屏主流。我按「1080p」来筛。",
    patch: { resolutions: ["1080p"] },
  },
  {
    id: "res-2k",
    keywords: ["2k", "1440p", "2k分辨率", "qhd"],
    label: "2K",
    explain: "2K（1440p）是办公和 3A 游戏的甜点分辨率，清晰与帧率兼顾。我按「2K」来筛。",
    patch: { resolutions: ["2K"] },
  },
  {
    id: "res-4k",
    keywords: ["4k", "2160p", "4k分辨率", "uhd", "超高清"],
    label: "4K",
    explain: "4K（2160p）超高清，设计修图和观影首选。我按「4K」来筛。",
    patch: { resolutions: ["4K"] },
  },

  // ===== 刷新率 =====
  {
    id: "high-refresh",
    keywords: ["高刷", "高刷新", "刷新率高", "电竞屏", "游戏屏", "144hz", "240hz", "打游戏"],
    label: "高刷新率",
    explain: "游戏看刷新率，越高越跟手。我按「≥144Hz」来筛。",
    patch: { refreshMin: 144 },
  },
  {
    id: "super-refresh",
    keywords: ["240hz", "260hz", "360hz", "超高刷", "帧率优先", "fps竞技"],
    label: "超高刷新率",
    explain: "FPS 竞技建议 240Hz 起步。我按「≥240Hz」来筛。",
    patch: { refreshMin: 240 },
  },

  // ===== 面板类型 =====
  {
    id: "panel-ips",
    keywords: ["ips", "ips面板", "广视角"],
    label: "IPS",
    explain: "IPS 色彩好、可视角度广，办公和设计首选。我按「IPS 类面板」来筛。",
    patch: { panelTypes: ["IPS", "FastIPS", "NanoIPS", "RapidIPS", "AHIPS"] },
  },
  {
    id: "panel-oled",
    keywords: ["oled", "qd-oled", "qdoled", "量子点"],
    label: "OLED",
    explain: "OLED 自发光、对比度极高，观感最好但价格高。我按「OLED」来筛。",
    patch: { panelTypes: ["QDOLED"] },
  },
  {
    id: "panel-miniled",
    keywords: ["miniled", "mini led", "分区背光", "hdr光效"],
    label: "MiniLED",
    explain: "MiniLED 分区背光带来更好 HDR 光效，高刷屏常见。我按「MiniLED」来筛。",
    patch: { miniLed: true },
  },
  {
    id: "panel-curved",
    keywords: ["曲面", "曲面屏", "带鱼", "沉浸"],
    label: "曲面",
    explain: "曲面屏视野包裹感强，适合影音和 3A。我按「曲面」来筛。",
    patch: { curved: true },
  },

  // ===== 用途 =====
  {
    id: "mon-gaming",
    keywords: ["游戏", "打游戏", "电竞", "fps", "3a", "3a大作", "吃鸡", "瓦", "cs"],
    label: "游戏",
    explain: "游戏显示器看刷新率和响应。我按「游戏用途」来筛，优先高刷电竞屏。",
    patch: { usages: ["gaming"] },
  },
  {
    id: "mon-office",
    keywords: ["办公", "写文档", "做ppt", "表格", "日常", "上班", "工作"],
    label: "办公",
    explain: "办公显示器看分辨率、护眼和支架。我按「办公用途」来筛。",
    patch: { usages: ["office"] },
  },
  {
    id: "mon-design",
    keywords: ["设计", "修图", "调色", "剪辑", "色准", "色域", "adobe", "达芬奇", "ps"],
    label: "设计",
    explain: "设计看色准和色域，首选高色域 IPS/OLED。我按「设计用途」来筛。",
    patch: { usages: ["design"] },
  },
  {
    id: "mon-video",
    keywords: ["看电影", "追剧", "影音", "观影", "视频"],
    label: "影音",
    explain: "影音看尺寸、对比度和色域。我按「影音用途」来筛。",
    patch: { usages: ["video"] },
  },
  {
    id: "mon-general",
    keywords: ["通用", "日用", "什么都干", "不挑", "随便"],
    label: "通用",
    explain: "通用显示器兼顾办公与轻度娱乐。我按「通用用途」来筛。",
    patch: { usages: ["general"] },
  },
];

/** 从自由文本里抽取预算、尺寸、刷新率、亮度的显式数字 */
export function extractMonitorNumbers(text: string): MonitorConstraints {
  const patch: MonitorConstraints = {};

  // 预算
  const maxMatch = text.match(/(\d{3,5})\s*(?:元)?\s*(?:以内|以下|左右|之内|内)/);
  if (maxMatch) patch.budgetMax = Number(maxMatch[1]);
  const altMax = text.match(/(?:预算|最多|不超过|大概|大约|想花)\s*(\d{3,5})/);
  if (altMax) patch.budgetMax = Number(altMax[1]);
  const range = text.match(/(\d{3,5})\s*[-~到]\s*(\d{3,5})/);
  if (range) {
    patch.budgetMin = Number(range[1]);
    patch.budgetMax = Number(range[2]);
  }

  // 尺寸：27寸 / 27英寸 / 24.5英寸
  const size = text.match(/(\d{2}(?:\.\d)?)\s*(?:寸|英寸)/);
  if (size) {
    const v = Number(size[1]);
    if (v >= 20 && v <= 40) {
      patch.sizeMin = v;
      patch.sizeMax = v;
    }
  }

  // 刷新率：144hz / 240Hz / 144
  const refresh = text.match(/(\d{2,3})\s*(?:hz|赫兹)/i);
  if (refresh) {
    const v = Number(refresh[1]);
    if (v >= 60 && v <= 360) patch.refreshMin = v;
  }

  // 亮度：400nit / 300尼特
  const brightness = text.match(/(\d{3,4})\s*(?:nit|尼特|流明)/i);
  if (brightness) {
    const v = Number(brightness[1]);
    if (v >= 200 && v <= 1000) patch.brightnessMin = v;
  }

  return patch;
}
