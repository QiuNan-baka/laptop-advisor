/**
 * 机型库（实测精修 13 台 + 笔吧指南带参数 81 台，去重后 92 台）
 *
 * 【铁律】所有参数只来自这里，AI 永远不生成参数，只负责解释参数对你意味着什么。
 * 后续接入 RAG / Agent 时，这个文件就是检索语料，也是唯一的参数事实源。
 *
 * 结构：
 *   - 本文件底部 `curatedLaptops`（13 台实测精修机，参数最全、优缺点精修过）
 *   - `catalog-specs.ts`（81 台笔吧指南带参数机，部分字段缺失已按可选处理）
 *   - `laptops`（导出）= 二者合并去重，是匹配/RAG/Agent 共用的唯一事实源
 */

import { catalogSpecs } from "./catalog-specs";

/** 用途标签：用来把"模糊需求"落到"可筛选的场景" */
export type UsageTag =
  | "office" // 办公文档、日常
  | "coding" // 写代码
  | "gaming" // 打游戏
  | "design" // 设计 / 剪辑
  | "study" // 上网课、记笔记
  | "video"; // 看剧

export interface Laptop {
  id: string;
  brand: string;
  model: string;
  /** 参考价（原价，元） */
  price: number;
  /** 国补价（元），没有国补则省略 */
  subsidyPrice?: number;
  screen: {
    /** 物理尺寸（英寸） */
    sizeInch: number;
    /** 分辨率，如 "2560x1600" */
    resolution: string;
    /** 像素密度 PPI —— "看得清"真正该看的指标 */
    ppi: number;
    panel: string;
    /** 刷新率 Hz（面板没标注则省略） */
    refreshRate?: number;
    /** 典型亮度 nits（没标注则省略） */
    brightness?: number;
    /** 色域覆盖（没标注则省略） */
    colorGamut?: string;
  };
  cpu: {
    name: string;
    /** 核心数（没标注则省略） */
    cores?: number;
  };
  gpu: string;
  /** 内存 GB */
  ram: number;
  /** 内存类型，如 "DDR5" / "LPDDR5x" / "统一内存"（没标注则省略） */
  ramType?: string;
  /** 内存速率 MHz（如 5600；统一内存 / 没标注则省略） */
  ramSpeed?: number;
  /** 硬盘 GB（没标注则省略） */
  storage?: number;
  /** 整机重量 kg */
  weight: number;
  /** 电池容量 Wh（没标注则省略） */
  battery?: number;
  ports?: string[];
  tags: UsageTag[];
  /** 这台机器的真实优点（人话） */
  highlights: string[];
  /** 这台机器的真实短板（人话） */
  drawbacks: string[];
}

export const curatedLaptops: Laptop[] = [
  {
    id: "thinkbook-14p",
    brand: "联想",
    model: "ThinkBook 14+ 2026",
    price: 6499,
    screen: {
      sizeInch: 14.5,
      resolution: "3072x1920",
      ppi: 250,
      panel: "IPS",
      refreshRate: 120,
      brightness: 500,
      colorGamut: "100% sRGB",
    },
    cpu: { name: "Ultra 7 258V", cores: 8 },
    gpu: "核显 Arc 140V",
    ram: 32,
    storage: 1024,
    weight: 1.45,
    battery: 85,
    ports: ["USB-A x2", "USB-C x2", "HDMI", "读卡器"],
    tags: ["office", "coding", "design", "study"],
    highlights: ["3K 屏在这个价位很少见", "接口齐全，不用带扩展坞", "32G 内存可以长期用"],
    drawbacks: ["1.45kg 便携一般", "满载时风扇噪音偏大"],
  },
  {
    id: "xiaoxin-pro-14",
    brand: "联想",
    model: "小新 Pro 14 2026",
    price: 5299,
    screen: {
      sizeInch: 14,
      resolution: "2880x1800",
      ppi: 243,
      panel: "OLED",
      refreshRate: 120,
      brightness: 600,
      colorGamut: "100% DCI-P3",
    },
    cpu: { name: "Ultra 5 228V", cores: 8 },
    gpu: "核显 Arc 130V",
    ram: 32,
    storage: 1024,
    weight: 1.39,
    battery: 75,
    ports: ["USB-A x2", "USB-C x2", "HDMI"],
    tags: ["office", "coding", "study", "video"],
    highlights: ["OLED 观感通透", "同价位屏幕素质第一梯队", "重量控制在 1.4kg 内"],
    drawbacks: ["OLED 长期显示静态内容有烧屏风险", "续航一般"],
  },
  {
    id: "matebook-14",
    brand: "华为",
    model: "MateBook 14 2026",
    price: 5999,
    screen: {
      sizeInch: 14.2,
      resolution: "2880x1920",
      ppi: 244,
      panel: "OLED",
      refreshRate: 120,
      brightness: 450,
      colorGamut: "100% sRGB",
    },
    cpu: { name: "Ultra 5 225H", cores: 14 },
    gpu: "核显",
    ram: 32,
    storage: 1024,
    weight: 1.31,
    battery: 70,
    ports: ["USB-C x2", "HDMI", "USB-A"],
    tags: ["office", "study", "video", "coding"],
    highlights: ["1.31kg 便携性好", "多屏协同对华为手机用户加成大", "屏幕比例 3:2 看文档舒服"],
    drawbacks: ["游戏性能弱", "内存不可扩展"],
  },
  {
    id: "xps-13",
    brand: "戴尔",
    model: "XPS 13 2026",
    price: 9999,
    screen: {
      sizeInch: 13.4,
      resolution: "2560x1600",
      ppi: 225,
      panel: "IPS",
      refreshRate: 120,
      brightness: 500,
      colorGamut: "100% sRGB",
    },
    cpu: { name: "Ultra 7 268V", cores: 8 },
    gpu: "核显 Arc 140V",
    ram: 32,
    storage: 1024,
    weight: 1.17,
    battery: 55,
    ports: ["USB-C x2"],
    tags: ["office", "study"],
    highlights: ["做工与手感是这台机器最值钱的地方", "1.17kg 极便携"],
    drawbacks: ["只有两个 Type-C，必须带扩展坞", "同配置溢价明显", "续航偏短"],
  },
  {
    id: "macbook-air-m4",
    brand: "苹果",
    model: "MacBook Air M4 13",
    price: 8499,
    screen: {
      sizeInch: 13.6,
      resolution: "2560x1664",
      ppi: 225,
      panel: "Liquid Retina",
      refreshRate: 60,
      brightness: 500,
      colorGamut: "100% DCI-P3",
    },
    cpu: { name: "Apple M4", cores: 8 },
    gpu: "集成 GPU 8 核",
    ram: 16,
    storage: 512,
    weight: 1.24,
    battery: 53,
    ports: ["USB-C x2", "耳机口"],
    tags: ["office", "coding", "study", "design", "video"],
    highlights: ["续航是真的能撑一整天", "安静、不发热", "剪辑视频效率高"],
    drawbacks: ["60Hz 刷新率在 2026 年偏落后", "不能玩主流 Windows 游戏", "16G 内存跑大项目会紧张"],
  },
  {
    id: "rog-zephyrus-16",
    brand: "华硕",
    model: "ROG 幻16 2026",
    price: 12999,
    screen: {
      sizeInch: 16,
      resolution: "2560x1600",
      ppi: 189,
      panel: "MiniLED",
      refreshRate: 240,
      brightness: 1100,
      colorGamut: "100% DCI-P3",
    },
    cpu: { name: "Ultra 9 285H", cores: 16 },
    gpu: "RTX 5070 Laptop",
    ram: 32,
    storage: 1024,
    weight: 2.1,
    battery: 90,
    ports: ["USB-A x2", "USB-C x2", "HDMI 2.1", "读卡器"],
    tags: ["gaming", "design", "video", "coding"],
    highlights: ["240Hz MiniLED，游戏和剪辑都够用", "独显性能释放充分"],
    drawbacks: ["2.1kg 基本不适合天天背", "满载噪音大", "价格高"],
  },
  {
    id: "mechrevo-16",
    brand: "机械革命",
    model: "蛟龙 16 Pro",
    price: 7499,
    screen: {
      sizeInch: 16,
      resolution: "2560x1600",
      ppi: 189,
      panel: "IPS",
      refreshRate: 240,
      brightness: 500,
      colorGamut: "100% sRGB",
    },
    cpu: { name: "i7-14650HX", cores: 16 },
    gpu: "RTX 5060 Laptop",
    ram: 32,
    storage: 1024,
    weight: 2.3,
    battery: 80,
    ports: ["USB-A x3", "USB-C x1", "HDMI", "网口"],
    tags: ["gaming", "coding"],
    highlights: ["同价位性能最强", "240Hz 屏玩竞技游戏爽"],
    drawbacks: ["做工和售后是短板", "2.3kg + 电源砖，通勤负担重"],
  },
  {
    id: "hp-war66-15",
    brand: "惠普",
    model: "战 66 15.6",
    price: 4299,
    screen: {
      sizeInch: 15.6,
      resolution: "1920x1080",
      ppi: 141,
      panel: "IPS",
      refreshRate: 60,
      brightness: 300,
      colorGamut: "45% NTSC",
    },
    cpu: { name: "Ultra 5 125H", cores: 14 },
    gpu: "核显",
    ram: 16,
    storage: 512,
    weight: 1.74,
    battery: 56,
    ports: ["USB-A x2", "USB-C x2", "HDMI", "网口"],
    tags: ["office", "study"],
    highlights: ["便宜、接口全", "扩展性好，内存硬盘都能换"],
    drawbacks: ["屏幕素质差，色域窄、亮度低", "1.74kg 不算轻"],
  },
  {
    id: "thinkpad-e14",
    brand: "联想",
    model: "ThinkPad E14 2026",
    price: 5499,
    screen: {
      sizeInch: 14,
      resolution: "1920x1200",
      ppi: 162,
      panel: "IPS",
      refreshRate: 60,
      brightness: 400,
      colorGamut: "100% sRGB",
    },
    cpu: { name: "Ultra 5 225V", cores: 8 },
    gpu: "核显",
    ram: 16,
    storage: 512,
    weight: 1.42,
    battery: 57,
    ports: ["USB-A x2", "USB-C x2", "HDMI", "网口"],
    tags: ["office", "coding", "study"],
    highlights: ["键盘手感是这台机器的核心竞争力", "16:10 屏幕看代码行数更多"],
    drawbacks: ["分辨率只有 1200p", "外观偏商务"],
  },
  {
    id: "asus-wuwei-15",
    brand: "华硕",
    model: "无畏 Pro 15",
    price: 5499,
    screen: {
      sizeInch: 15.6,
      resolution: "2880x1620",
      ppi: 212,
      panel: "OLED",
      refreshRate: 120,
      brightness: 600,
      colorGamut: "100% DCI-P3",
    },
    cpu: { name: "Ultra 7 155H", cores: 16 },
    gpu: "核显 Arc",
    ram: 32,
    storage: 1024,
    weight: 1.5,
    battery: 75,
    ports: ["USB-A x2", "USB-C x2", "HDMI"],
    tags: ["office", "design", "video", "coding"],
    highlights: ["大屏 + 高分辨率，看视频和写代码都舒服", "OLED 色彩好"],
    drawbacks: ["OLED 烧屏风险", "15.6 英寸机身还是偏大"],
  },
  {
    id: "honor-magicbook-16",
    brand: "荣耀",
    model: "MagicBook Pro 16",
    price: 6299,
    screen: {
      sizeInch: 16,
      resolution: "3072x1920",
      ppi: 226,
      panel: "IPS",
      refreshRate: 165,
      brightness: 500,
      colorGamut: "100% sRGB",
    },
    cpu: { name: "Ultra 5 225H", cores: 14 },
    gpu: "核显",
    ram: 32,
    storage: 1024,
    weight: 1.79,
    battery: 75,
    ports: ["USB-A x2", "USB-C x2", "HDMI"],
    tags: ["office", "design", "video", "coding"],
    highlights: ["16 英寸 3K 屏，ppi 达到 226，比很多 14 寸 2K 更清晰", "同价位屏幕最强"],
    drawbacks: ["1.79kg 不算便携", "独显缺失，重度剪辑吃力"],
  },
  {
    id: "shenzhou-z8",
    brand: "神舟",
    model: "战神 Z8",
    price: 5999,
    screen: {
      sizeInch: 15.6,
      resolution: "1920x1080",
      ppi: 141,
      panel: "IPS",
      refreshRate: 144,
      brightness: 300,
      colorGamut: "72% NTSC",
    },
    cpu: { name: "i7-13650HX", cores: 14 },
    gpu: "RTX 5060 Laptop",
    ram: 16,
    storage: 512,
    weight: 2.4,
    battery: 63,
    ports: ["USB-A x3", "USB-C x1", "HDMI", "网口"],
    tags: ["gaming"],
    highlights: ["独显游戏本里的低价位选择"],
    drawbacks: ["屏幕只有 1080p", "厚重、发热大、做工一般"],
  },
  {
    id: "thunderobot-18",
    brand: "雷神",
    model: "911 18 英寸",
    price: 10999,
    screen: {
      sizeInch: 18,
      resolution: "2560x1600",
      ppi: 168,
      panel: "IPS",
      refreshRate: 240,
      brightness: 500,
      colorGamut: "100% sRGB",
    },
    cpu: { name: "Ultra 9 275HX", cores: 24 },
    gpu: "RTX 5070 Ti Laptop",
    ram: 32,
    storage: 1024,
    weight: 3.1,
    battery: 99,
    ports: ["USB-A x3", "USB-C x2", "HDMI 2.1", "网口"],
    tags: ["gaming", "video"],
    highlights: ["18 英寸大屏，视野开阔", "性能释放强"],
    drawbacks: [
      "屏幕大≠清晰：18 英寸 2.5K 的 ppi 只有 168，反而不如 14 英寸 2.8K 的 243",
      "3.1kg，基本等于台式机替代品",
    ],
  },
];

/**
 * 全量机型池 = 实测精修机（13 台）+ 笔吧指南带参数机（81 台，去重后 92 台）。
 *
 * 去重规则：笔吧指南里与实测精修机「同品牌同型号」的机型跳过，保留实测精修机
 * （它有更全的亮度/色域/核心数/接口，以及精修过的人话优缺点）。
 */
const normModel = (s: string) => s.replace(/\s+/g, "").toLowerCase();
const curatedKeys = new Set(
  curatedLaptops.map((l) => normModel(`${l.brand}${l.model}`))
);
const dedupedCatalog = catalogSpecs.filter(
  (l) => !curatedKeys.has(normModel(`${l.brand}${l.model}`))
);

export const laptops: Laptop[] = [...curatedLaptops, ...dedupedCatalog];

/** 按 id 查找机型 */
export function getLaptopById(id: string): Laptop | undefined {
  return laptops.find((l) => l.id === id);
}

/**
 * 把内存规格拼成一句人话：
 *   16GB DDR5 5600  /  32GB LPDDR5x 8533  /  16GB 统一内存  /  24GB
 * 类型或速率缺失时自动省略对应部分，绝不编造。
 */
export function formatRam(l: Laptop): string {
  const parts: string[] = [`${l.ram}GB`];
  if (l.ramType) {
    parts.push(l.ramType);
    if (l.ramSpeed !== undefined) parts.push(`${l.ramSpeed}`);
  }
  return parts.join(" ");
}
