/**
 * 键盘机型库 —— 真实解析自《2025-2026 年各价位段机械键盘推荐清单.docx》（用户 m07288 提供）。
 *
 * 44 款在售型号，六大价位段（50-100 / 100-300 / 300-500 / 500-1000 / 1000-1500 / 1500-2000+）。
 * 字段只录清单里真实出现的：配列 / 轴体类型 / 连接方式 / 网页驱动 / 用途 / 一句话点评。
 * 铁律不变：清单里没有的参数不编造。
 */

export type Layout = "60" | "65" | "75" | "80" | "98" | "100";
export type SwitchType = "linear" | "tactile" | "clicky" | "magnetic" | "optical" | "low-profile";
export type Connection = "wired" | "wireless24g" | "bluetooth";
export type KeyboardUsage = "gaming" | "office" | "general";

export interface Keyboard {
  id: string;
  brand: string;
  model: string;
  priceMin: number;
  priceMax: number;
  /** 配列（按百分比归一：60/65/75/80/98/100） */
  layout: Layout;
  /** 轴体类型（可多选） */
  switchTypes: SwitchType[];
  /** 连接方式（三模 = 有线+2.4G+蓝牙） */
  connections: Connection[];
  /** 是否提供网页驱动 */
  webDriver: boolean;
  /** 适合用途 */
  usages: KeyboardUsage[];
  /** 一句话点评（原文） */
  comment: string;
}

export const LAYOUT_LABELS: Record<Layout, string> = {
  "60": "60%（61 键）",
  "65": "65%（68 键）",
  "75": "75%（81/84 键）",
  "80": "80% TKL（87/88 键）",
  "98": "98%（98 键）",
  "100": "100%（104/108 键）",
};

export const SWITCH_TYPE_LABELS: Record<SwitchType, string> = {
  linear: "线性轴",
  tactile: "段落轴",
  clicky: "青轴/clicky",
  magnetic: "磁轴",
  optical: "光轴",
  "low-profile": "矮轴",
};

export const KEYBOARD_USAGE_LABELS: Record<KeyboardUsage, string> = {
  gaming: "游戏",
  office: "办公",
  general: "通用",
};

export const keyboards: Keyboard[] = [
  // ============ 50-100 元 ============
  {
    id: "kb-001", brand: "RK", model: "R87",
    priceMin: 79, priceMax: 109,
    layout: "80", switchTypes: ["linear", "tactile"], connections: ["wired"],
    webDriver: true, usages: ["office", "general"],
    comment: "百元内做工扎实的 TKL，键帽和卫星轴调校在同价位靠前",
  },
  {
    id: "kb-002", brand: "达尔优", model: "DK100",
    priceMin: 69, priceMax: 99,
    layout: "100", switchTypes: ["linear", "tactile"], connections: ["wired"],
    webDriver: false, usages: ["office"],
    comment: "网吧同款，耐造便宜，适合办公室批量采购或备用",
  },
  {
    id: "kb-003", brand: "雷柏", model: "V500PRO",
    priceMin: 79, priceMax: 119,
    layout: "100", switchTypes: ["linear", "tactile"], connections: ["wired"],
    webDriver: false, usages: ["office", "general"],
    comment: "金属上盖质感不错，老牌走量款，售后网点多",
  },
  {
    id: "kb-004", brand: "微星", model: "GK50Z V2",
    priceMin: 99, priceMax: 129,
    layout: "100", switchTypes: ["linear", "tactile"], connections: ["wired"],
    webDriver: false, usages: ["gaming", "office"],
    comment: "RGB 灯效齐全，游戏品牌入门款，适合喜欢灯的用户",
  },
  {
    id: "kb-005", brand: "联想", model: "MK9",
    priceMin: 69, priceMax: 99,
    layout: "100", switchTypes: ["linear", "tactile"], connections: ["wired"],
    webDriver: false, usages: ["office"],
    comment: "整机品牌配套键盘，手感中规中矩，胜在稳定和保修",
  },
  {
    id: "kb-006", brand: "狼途", model: "LT84",
    priceMin: 89, priceMax: 129,
    layout: "75", switchTypes: ["linear", "tactile"], connections: ["wired"],
    webDriver: false, usages: ["general"],
    comment: "百元内少见的 75% 配列，桌面空间紧张时很实用",
  },
  {
    id: "kb-007", brand: "艾石头", model: "FE87",
    priceMin: 99, priceMax: 149,
    layout: "80", switchTypes: ["linear", "tactile"], connections: ["wired"],
    webDriver: false, usages: ["general"],
    comment: "百元 Gasket 结构代表，声音表现超出价位预期",
  },

  // ============ 100-300 元 ============
  {
    id: "kb-008", brand: "VGN", model: "V87 Pro",
    priceMin: 149, priceMax: 199,
    layout: "80", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["general"],
    comment: "百元档三模 TKL 销量王，填充和声音调校成熟，闭眼买不易错",
  },
  {
    id: "kb-009", brand: "狼蛛", model: "F87 Pro V2",
    priceMin: 179, priceMax: 259,
    layout: "80", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["general", "gaming"],
    comment: "Gasket + 多层填充，麻将音取向，配置给得很满",
  },
  {
    id: "kb-010", brand: "迈从", model: "G87",
    priceMin: 179, priceMax: 249,
    layout: "80", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["general", "office"],
    comment: "外观偏简约，办公桌面不突兀，网页调参方便",
  },
  {
    id: "kb-011", brand: "ATK", model: "VXE V75X",
    priceMin: 199, priceMax: 299,
    layout: "75", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["general", "gaming"],
    comment: "75% 配列 + 旋钮，游戏和办公切换成本低",
  },
  {
    id: "kb-012", brand: "珂芝", model: "K75 Lite",
    priceMin: 179, priceMax: 249,
    layout: "75", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["general", "office"],
    comment: "配色和键帽颜值突出，适合注重桌面观感的用户",
  },
  {
    id: "kb-013", brand: "RK", model: "R98",
    priceMin: 189, priceMax: 249,
    layout: "98", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["office", "general"],
    comment: "保留数字区又比全尺寸短，财务和表格用户友好",
  },
  {
    id: "kb-014", brand: "黑峡谷", model: "X3",
    priceMin: 199, priceMax: 299,
    layout: "80", switchTypes: ["clicky", "linear"], connections: ["wired"],
    webDriver: false, usages: ["gaming", "general"],
    comment: "BOX 轴防尘结构耐用，段落手感干脆，老牌口碑款",
  },
  {
    id: "kb-015", brand: "狼蛛", model: "F108 Pro",
    priceMin: 199, priceMax: 259,
    layout: "100", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["office", "general"],
    comment: "全尺寸三模，带旋钮和屏幕，适合既要数字区又要无线的人",
  },

  // ============ 300-500 元 ============
  {
    id: "kb-016", brand: "WOB", model: "Rainy75",
    priceMin: 399, priceMax: 499,
    layout: "75", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["general", "office"],
    comment: "铝合金外壳 + 优秀填充，被很多 UP 主称为 400 元档质感标杆",
  },
  {
    id: "kb-017", brand: "VGN", model: "V98 Pro V2",
    priceMin: 299, priceMax: 399,
    layout: "98", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["office", "general"],
    comment: "98 配列三模热门款，屏幕和旋钮实用，适合办公主力",
  },
  {
    id: "kb-018", brand: "ATK", model: "Z87 Pro",
    priceMin: 399, priceMax: 499,
    layout: "80", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["gaming", "general"],
    comment: "ATK 机械键盘主力，填充扎实，游戏响应和手感兼顾",
  },
  {
    id: "kb-019", brand: "迈从", model: "G75 Pro",
    priceMin: 299, priceMax: 399,
    layout: "75", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["general", "office"],
    comment: "75% 带旋钮，外观克制，适合办公桌搭",
  },
  {
    id: "kb-020", brand: "PMO", model: "极光80",
    priceMin: 399, priceMax: 459,
    layout: "80", switchTypes: ["linear", "tactile"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["general", "gaming"],
    comment: "透光键帽 + 灯效是卖点，喜欢 RGB 桌搭可以看",
  },
  {
    id: "kb-021", brand: "维咖", model: "NUT65",
    priceMin: 399, priceMax: 499,
    layout: "65", switchTypes: ["linear", "tactile"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["general"],
    comment: "铝坨坨 + 独特外观，65% 小配列，偏客制化审美",
  },
  {
    id: "kb-022", brand: "LEOBOG", model: "Hi98C Pro",
    priceMin: 299, priceMax: 399,
    layout: "98", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["office", "general"],
    comment: "98 配列带屏幕，声音取向偏 HiFi，性价比不错",
  },
  {
    id: "kb-023", brand: "艾石头", model: "MG75 Pro",
    priceMin: 299, priceMax: 399,
    layout: "75", switchTypes: ["magnetic"], connections: ["wired"],
    webDriver: false, usages: ["gaming", "general"],
    comment: "全铝 CNC + Gasket，磁轴里少见的质感取向，RT 最低 0.005mm",
  },

  // ============ 500-1000 元 ============
  {
    id: "kb-024", brand: "ATK", model: "RS6",
    priceMin: 599, priceMax: 699,
    layout: "65", switchTypes: ["magnetic"], connections: ["wired"],
    webDriver: true, usages: ["gaming"],
    comment: "RT 快速触发 + 8K，FPS 玩家热门磁轴小配列",
  },
  {
    id: "kb-025", brand: "ATK", model: "EDGE60 HE",
    priceMin: 499, priceMax: 599,
    layout: "60", switchTypes: ["magnetic"], connections: ["wired"],
    webDriver: true, usages: ["gaming"],
    comment: "60% 极致小尺寸，给鼠标留足空间，适合低灵敏度 FPS",
  },
  {
    id: "kb-026", brand: "迈从", model: "Ace 68 Pro",
    priceMin: 499, priceMax: 599,
    layout: "65", switchTypes: ["magnetic"], connections: ["wired"],
    webDriver: true, usages: ["gaming"],
    comment: "网页驱动功能全，RT、SOCD 等参数可细调",
  },
  {
    id: "kb-027", brand: "CHERRY", model: "PIXIU75",
    priceMin: 699, priceMax: 899,
    layout: "75", switchTypes: ["linear", "tactile"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["office", "general"],
    comment: "75% 三模 + 六层消音，金属旋钮和 LED 屏，办公向的稳妥选择",
  },
  {
    id: "kb-028", brand: "WOB", model: "Crush80 Reboot",
    priceMin: 599, priceMax: 799,
    layout: "80", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["general", "office"],
    comment: "CNC 铝壳 + 磁吸快拆，机械轴里的质感与可玩性兼顾",
  },
  {
    id: "kb-029", brand: "ROG", model: "游侠2 RX",
    priceMin: 699, priceMax: 799,
    layout: "80", switchTypes: ["optical"], connections: ["wired"],
    webDriver: false, usages: ["gaming"],
    comment: "光轴响应快、防水防尘，大厂做工和售后是优势",
  },
  {
    id: "kb-030", brand: "NuPhy", model: "Air75 V2",
    priceMin: 799, priceMax: 999,
    layout: "75", switchTypes: ["low-profile"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["office", "general"],
    comment: "矮轴轻薄，Mac 友好，经常带出门或桌面极简的首选",
  },

  // ============ 1000-1500 元 ============
  {
    id: "kb-031", brand: "ROG", model: "夜魔 Azoth",
    priceMin: 1099, priceMax: 1299,
    layout: "75", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["gaming", "general"],
    comment: "OLED 屏 + 三向旋钮，Gasket 手感，ROG 机械键盘口碑款",
  },
  {
    id: "kb-032", brand: "ROG", model: "游侠2 98 无线",
    priceMin: 1099, priceMax: 1409,
    layout: "98", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["office", "gaming"],
    comment: "保留数字区的无线旗舰，续航和无线稳定性是强项",
  },
  {
    id: "kb-033", brand: "Keychron", model: "Q1 Pro",
    priceMin: 1099, priceMax: 1499,
    layout: "75", switchTypes: ["linear", "tactile"], connections: ["wired", "bluetooth"],
    webDriver: true, usages: ["office", "general"],
    comment: "全铝机身 + 客制化级可玩性，Mac / Win 双系统友好",
  },
  {
    id: "kb-034", brand: "CHERRY", model: "PIXIU98",
    priceMin: 999, priceMax: 1199,
    layout: "98", switchTypes: ["linear", "tactile"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["office", "gaming"],
    comment: "原厂 MX2A 轴 + 金属旋钮和 LED 屏，8000Hz 回报率",
  },
  {
    id: "kb-035", brand: "雷蛇", model: "黑寡妇蜘蛛 V4 75%",
    priceMin: 1099, priceMax: 1299,
    layout: "75", switchTypes: ["tactile", "linear"], connections: ["wired"],
    webDriver: false, usages: ["gaming"],
    comment: "铝合金上盖 + 雷蛇生态，灯效和联动是主要卖点",
  },
  {
    id: "kb-036", brand: "NuPhy", model: "Gem80",
    priceMin: 1099, priceMax: 1299,
    layout: "80", switchTypes: ["linear", "tactile"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["office", "general"],
    comment: "客制化取向的量产键盘，做工和可玩性都在线",
  },
  {
    id: "kb-037", brand: "杜伽", model: "K610W",
    priceMin: 1099, priceMax: 1399,
    layout: "100", switchTypes: ["linear", "tactile"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["office", "general"],
    comment: "全尺寸三模，续航长，适合财务、行政等重数字输入场景",
  },

  // ============ 1500-2000+ 元 ============
  {
    id: "kb-038", brand: "ROG", model: "夜魔 X Azoth X",
    priceMin: 1799, priceMax: 1999,
    layout: "75", switchTypes: ["linear"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: false, usages: ["gaming", "general"],
    comment: "夜魔升级款，屏幕、旋钮、结构和无线全面加强",
  },
  {
    id: "kb-039", brand: "Wooting", model: "60HE v2",
    priceMin: 1499, priceMax: 1699,
    layout: "60", switchTypes: ["magnetic"], connections: ["wired"],
    webDriver: true, usages: ["gaming"],
    comment: "磁轴 RT 的标杆，驱动调校和固件生态最成熟",
  },
  {
    id: "kb-040", brand: "Keychron", model: "Q6 Max",
    priceMin: 1699, priceMax: 1899,
    layout: "100", switchTypes: ["linear", "tactile"], connections: ["wired", "wireless24g", "bluetooth"],
    webDriver: true, usages: ["office", "general"],
    comment: "全尺寸铝坨坨三模，客制化玩家的办公毕业款之一",
  },
  {
    id: "kb-041", brand: "罗技", model: "G Pro X TKL Rapid",
    priceMin: 1499, priceMax: 1799,
    layout: "80", switchTypes: ["magnetic"], connections: ["wired"],
    webDriver: false, usages: ["gaming"],
    comment: "罗技首款磁轴键盘，RT 和快速触发齐全，适合职业取向",
  },
  {
    id: "kb-042", brand: "雷蛇", model: "猎魂光蛛 V3 Pro",
    priceMin: 1699, priceMax: 1999,
    layout: "100", switchTypes: ["optical"], connections: ["wired"],
    webDriver: false, usages: ["gaming"],
    comment: "模拟光轴 + 8K，雷蛇键盘旗舰，灯效和手感都在第一梯队",
  },
  {
    id: "kb-043", brand: "雷蛇", model: "黑寡妇蜘蛛 V4 Pro",
    priceMin: 1799, priceMax: 1999,
    layout: "100", switchTypes: ["clicky", "linear"], connections: ["wired"],
    webDriver: false, usages: ["gaming", "office"],
    comment: "带旋钮和多媒体键的全尺寸旗舰，适合雷蛇生态用户",
  },
  {
    id: "kb-044", brand: "ROG", model: "龙骑士 2 无线",
    priceMin: 1599, priceMax: 1899,
    layout: "100", switchTypes: ["optical"], connections: ["wired", "wireless24g"],
    webDriver: false, usages: ["gaming", "office"],
    comment: "全尺寸无线 + 光轴，适合需要数字区的 ROG 生态用户",
  },
];

export function getKeyboardById(id: string): Keyboard | undefined {
  return keyboards.find((k) => k.id === id);
}
