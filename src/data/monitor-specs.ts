/**
 * 显示器机型库 —— 真实解析自《2026显示器选购推荐清单_300-5000元.docx》（用户 m07288 提供）。
 *
 * 18 款机型，四价位段（300-500 / 500-1000 / 1000-1500 / 1500-5000）。
 * 字段只录清单里真实出现的：面板类型 / 尺寸 / 分辨率 / 刷新率 / 亮度 / 用途 / 点评。
 * 铁律不变：清单里没有的参数不编造。
 */

export type PanelType =
  | "IPS"
  | "FastIPS"
  | "NanoIPS"
  | "RapidIPS"
  | "AHIPS"
  | "VA"
  | "FastVA"
  | "QDOLED";
export type Resolution = "1080p" | "2K" | "4K";
export type MonitorUsage = "gaming" | "office" | "design" | "general" | "video";

export interface Monitor {
  id: string;
  brand: string;
  model: string;
  priceMin: number;
  priceMax: number;
  sizeInch: number;
  panelType: PanelType;
  /** MiniLED 背光（可叠加在 IPS/VA 上） */
  miniLed: boolean;
  resolution: Resolution;
  refreshRate: number;
  /** 亮度 nit（取 SDR 典型值；仅给 HDR 峰值时用峰值并注明） */
  brightness: number;
  /** 是否曲面 */
  curved: boolean;
  usages: MonitorUsage[];
  comment: string;
}

export const PANEL_TYPE_LABELS: Record<PanelType, string> = {
  IPS: "IPS",
  FastIPS: "Fast IPS",
  NanoIPS: "Nano IPS",
  RapidIPS: "Rapid IPS",
  AHIPS: "AH-IPS",
  VA: "VA",
  FastVA: "Fast VA",
  QDOLED: "QD-OLED",
};

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  "1080p": "1080p",
  "2K": "2K",
  "4K": "4K",
};

export const MONITOR_USAGE_LABELS: Record<MonitorUsage, string> = {
  gaming: "游戏",
  office: "办公",
  design: "设计",
  general: "通用",
  video: "影音",
};

export const monitors: Monitor[] = [
  // ============ 300-500 元 ============
  {
    id: "monitor-001", brand: "科睿", model: "X5",
    priceMin: 490, priceMax: 499, sizeInch: 24.5, panelType: "FastIPS", miniLed: false,
    resolution: "1080p", refreshRate: 260, brightness: 400, curved: false,
    usages: ["gaming", "video"],
    comment: "500 元内的 260Hz 小钢炮，24.5 英寸是 FPS 圈公认的黄金尺寸",
  },
  {
    id: "monitor-002", brand: "长虹", model: "ADDFUN 24G1FG",
    priceMin: 449, priceMax: 449, sizeInch: 23.8, panelType: "FastIPS", miniLed: false,
    resolution: "1080p", refreshRate: 180, brightness: 300, curved: false,
    usages: ["gaming", "office"],
    comment: "450 元把 180Hz Fast IPS 压到门槛最低，宿舍第一屏",
  },
  {
    id: "monitor-003", brand: "HKC", model: "V2419",
    priceMin: 443, priceMax: 449, sizeInch: 23.8, panelType: "IPS", miniLed: false,
    resolution: "1080p", refreshRate: 144, brightness: 250, curved: false,
    usages: ["office", "general"],
    comment: "450 元档的办公稳妥牌，线下售后网点多",
  },
  {
    id: "monitor-004", brand: "Redmi", model: "A24（100Hz 版）",
    priceMin: 499, priceMax: 519, sizeInch: 23.8, panelType: "IPS", miniLed: false,
    resolution: "1080p", refreshRate: 100, brightness: 300, curved: false,
    usages: ["office", "general"],
    comment: "小米生态办公入门款，3 年原厂整机保修",
  },

  // ============ 500-1000 元 ============
  {
    id: "monitor-005", brand: "微星", model: "MAG 245F X24",
    priceMin: 519, priceMax: 519, sizeInch: 23.8, panelType: "RapidIPS", miniLed: false,
    resolution: "1080p", refreshRate: 240, brightness: 300, curved: false,
    usages: ["gaming"],
    comment: "519 元的一线品牌 240Hz，0.5ms GTG",
  },
  {
    id: "monitor-006", brand: "AOC", model: "24G50Z2",
    priceMin: 576, priceMax: 623, sizeInch: 23.8, panelType: "FastIPS", miniLed: false,
    resolution: "1080p", refreshRate: 260, brightness: 300, curved: false,
    usages: ["gaming", "video"],
    comment: "260Hz + 96% P3 的色彩型电竞屏，既快又艳",
  },
  {
    id: "monitor-007", brand: "泰坦军团", model: "P2710R2+",
    priceMin: 799, priceMax: 799, sizeInch: 27, panelType: "FastIPS", miniLed: false,
    resolution: "2K", refreshRate: 200, brightness: 400, curved: false,
    usages: ["general", "gaming", "video"],
    comment: "800 元档最均衡的 27 英寸 2K 水桶机，办公/3A/轻度 FPS 全覆盖",
  },
  {
    id: "monitor-008", brand: "REDMI", model: "A27Q 2026",
    priceMin: 699, priceMax: 749, sizeInch: 27, panelType: "IPS", miniLed: false,
    resolution: "2K", refreshRate: 120, brightness: 300, curved: false,
    usages: ["office", "general"],
    comment: "700 元档的 27 英寸 2K 办公屏，文字锐利色彩舒服",
  },
  {
    id: "monitor-009", brand: "HKC", model: "G27H4 Max",
    priceMin: 918, priceMax: 989, sizeInch: 27, panelType: "FastIPS", miniLed: false,
    resolution: "2K", refreshRate: 275, brightness: 350, curved: false,
    usages: ["gaming", "general"],
    comment: "千元内 27 英寸 2K 275Hz，大屏与帧率兼得",
  },

  // ============ 1000-1500 元 ============
  {
    id: "monitor-010", brand: "盛色", model: "D76",
    priceMin: 1099, priceMax: 1299, sizeInch: 27, panelType: "VA", miniLed: false,
    resolution: "2K", refreshRate: 360, brightness: 500, curved: false,
    usages: ["gaming"],
    comment: "27 英寸 2K 360Hz 的极限帧率方案，1000 元档最激进",
  },
  {
    id: "monitor-011", brand: "联想", model: "拯救者 Y27h-30",
    priceMin: 1499, priceMax: 1499, sizeInch: 27, panelType: "NanoIPS", miniLed: false,
    resolution: "2K", refreshRate: 180, brightness: 400, curved: false,
    usages: ["general", "office", "design"],
    comment: "1500 元内最全能的 2K 180Hz，75W Type-C 一线连 + USB Hub",
  },
  {
    id: "monitor-012", brand: "AOC", model: "CQ32G4E",
    priceMin: 1499, priceMax: 1499, sizeInch: 31.5, panelType: "FastVA", miniLed: false,
    resolution: "2K", refreshRate: 180, brightness: 300, curved: true,
    usages: ["gaming", "video"],
    comment: "1500 元的 31.5 英寸 2K 曲面，看电影和 3A 沉浸感强",
  },
  {
    id: "monitor-013", brand: "AOC", model: "AG275QXPD",
    priceMin: 1499, priceMax: 1499, sizeInch: 27, panelType: "AHIPS", miniLed: false,
    resolution: "2K", refreshRate: 180, brightness: 600, curved: false,
    usages: ["gaming", "video", "general"],
    comment: "LG 原厂 AH-IPS 的 HDR600 电竞屏，画质通透",
  },

  // ============ 1500-5000 元 ============
  {
    id: "monitor-014", brand: "AOC", model: "Q27G4SMN",
    priceMin: 2099, priceMax: 2099, sizeInch: 27, panelType: "FastVA", miniLed: true,
    resolution: "2K", refreshRate: 300, brightness: 450, curved: false,
    usages: ["gaming", "video"],
    comment: "2099 元的 2K 300Hz MiniLED，1152 分区，高刷 + HDR 光效",
  },
  {
    id: "monitor-015", brand: "联想", model: "战27uz",
    priceMin: 2199, priceMax: 2199, sizeInch: 27, panelType: "FastIPS", miniLed: true,
    resolution: "4K", refreshRate: 200, brightness: 450, curved: false,
    usages: ["general", "gaming"],
    comment: "2199 元的 4K 200Hz / 1080p 400Hz 双模 MiniLED",
  },
  {
    id: "monitor-016", brand: "KTC", model: "M27P6",
    priceMin: 2299, priceMax: 2299, sizeInch: 27, panelType: "FastIPS", miniLed: true,
    resolution: "4K", refreshRate: 160, brightness: 600, curved: false,
    usages: ["general", "design", "gaming"],
    comment: "2299 元参数最全面的 4K MiniLED，SDR 600nit",
  },
  {
    id: "monitor-017", brand: "微星", model: "MAG 272UP QD-OLED",
    priceMin: 3207, priceMax: 3207, sizeInch: 26.5, panelType: "QDOLED", miniLed: false,
    resolution: "4K", refreshRate: 240, brightness: 250, curved: false,
    usages: ["gaming", "video"],
    comment: "3200 元档的 4K 240Hz QD-OLED 门票，0.03ms GTG",
  },
  {
    id: "monitor-018", brand: "AOC", model: "U32G5D",
    priceMin: 3498, priceMax: 4187, sizeInch: 31.5, panelType: "QDOLED", miniLed: false,
    resolution: "4K", refreshRate: 180, brightness: 250, curved: false,
    usages: ["gaming", "video"],
    comment: "3498 元（补贴到手价，标价 4187）的 31.5 英寸 4K 180Hz QD-OLED",
  },
];

export function getMonitorById(id: string): Monitor | undefined {
  return monitors.find((m) => m.id === id);
}
