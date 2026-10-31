/**
 * 机型库（笔吧评测室《【双11】笔记本电脑选购指南》带参数 81 台）
 *
 * 【铁律】所有参数只来自 D:\Xiaomi\【双11】笔记本电脑选购指南.docx（笔吧评测室 2026-10-30），
 * AI 永远不生成参数，只负责解释参数对你意味着什么。
 * 后续接入 RAG / Agent 时，这个文件就是检索语料，也是唯一的参数事实源。
 *
 * 结构：
 *   - 参数数据在 `catalog-specs.ts`（81 台笔吧指南带参数机，部分字段缺失已按可选处理）
 *   - `laptops`（导出）= catalogSpecs，是匹配 / RAG / Agent 共用的唯一事实源
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

/** 全量机型池 = 笔吧指南带参数机（81 台） */
export const laptops: Laptop[] = catalogSpecs;

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
