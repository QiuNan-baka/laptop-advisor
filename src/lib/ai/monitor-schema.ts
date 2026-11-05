/**
 * 显示器 AI 输出的结构化契约（Zod）。
 *
 * 与 mouse-schema.ts 同构，但字段是显示器专属（尺寸 / 面板 / 分辨率 / 刷新率 / 亮度 / 曲面 / 用途）。
 * 铁律不变：模型只能输出「约束」，永远不能输出具体型号、价格、参数。
 */

import { z } from "zod";

export const MONITOR_BOUNDS = {
  budgetMin: { min: 100, max: 50000 },
  budgetMax: { min: 100, max: 50000 },
  sizeMin: { min: 20, max: 50 },
  sizeMax: { min: 20, max: 50 },
  refreshMin: { min: 60, max: 360 },
  brightnessMin: { min: 200, max: 1000 },
} as const;

function boundsHint(key: keyof typeof MONITOR_BOUNDS): string {
  const b = MONITOR_BOUNDS[key];
  return `${key} 必须在 ${b.min} 到 ${b.max} 之间`;
}

const num = (key: keyof typeof MONITOR_BOUNDS) =>
  z
    .number()
    .min(MONITOR_BOUNDS[key].min, boundsHint(key))
    .max(MONITOR_BOUNDS[key].max, boundsHint(key))
    .nullish()
    .transform((v) => (v === null ? undefined : v));

const PanelTypeSchema = z.enum([
  "IPS",
  "FastIPS",
  "NanoIPS",
  "RapidIPS",
  "AHIPS",
  "VA",
  "FastVA",
  "QDOLED",
]);
const ResolutionSchema = z.enum(["1080p", "2K", "4K"]);
const MonitorUsageSchema = z.enum(["gaming", "office", "design", "general", "video"]);

const enumArr = <T extends z.ZodTypeAny>(s: T) =>
  z
    .array(s)
    .nullish()
    .transform((v) => (v === null ? undefined : v));

export const MonitorSchema = z.object({
  budgetMin: num("budgetMin"),
  budgetMax: num("budgetMax"),
  sizeMin: num("sizeMin"),
  sizeMax: num("sizeMax"),
  panelTypes: enumArr(PanelTypeSchema),
  miniLed: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  resolutions: enumArr(ResolutionSchema),
  refreshMin: num("refreshMin"),
  brightnessMin: num("brightnessMin"),
  curved: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  usages: enumArr(MonitorUsageSchema),
});

export const MonitorTraceSchema = z.object({
  label: z.string().min(1).max(40),
  explain: z.string().min(1).max(300),
  keys: z.array(z.string()),
});

export const MonitorAiResponseSchema = z.object({
  constraints: MonitorSchema,
  traces: z.array(MonitorTraceSchema).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  questions: z.array(z.string().max(120)).max(3).default([]),
});

export type MonitorAiResponse = z.infer<typeof MonitorAiResponseSchema>;
