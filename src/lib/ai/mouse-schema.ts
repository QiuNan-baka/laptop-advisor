/**
 * 鼠标 AI 输出的结构化契约（Zod）。
 *
 * 与笔记本 schema.ts 同构，但字段完全不同（手长 / 握姿 / 连接 / 用途 / 重量克）。
 * 铁律不变：模型只能输出「约束」，永远不能输出具体型号、价格、参数。
 */

import { z } from "zod";

export const MOUSE_BOUNDS = {
  budgetMin: { min: 30, max: 10000 },
  budgetMax: { min: 30, max: 10000 },
  weightMax: { min: 20, max: 200 },
} as const;

function boundsHint(key: keyof typeof MOUSE_BOUNDS): string {
  const b = MOUSE_BOUNDS[key];
  return `${key} 必须在 ${b.min} 到 ${b.max} 之间`;
}

const num = (key: keyof typeof MOUSE_BOUNDS) =>
  z
    .number()
    .min(MOUSE_BOUNDS[key].min, boundsHint(key))
    .max(MOUSE_BOUNDS[key].max, boundsHint(key))
    .nullish()
    .transform((v) => (v === null ? undefined : v));

const HandSizeSchema = z.enum(["small", "small-medium", "medium", "medium-large", "large"]);
const GripSchema = z.enum(["palm", "claw", "fingertip"]);
const ConnectionSchema = z.enum(["wired", "wireless24g", "bluetooth"]);
const MouseUsageSchema = z.enum(["gaming", "office", "general"]);

const enumArr = <T extends z.ZodTypeAny>(s: T) =>
  z
    .array(s)
    .nullish()
    .transform((v) => (v === null ? undefined : v));

export const MouseSchema = z.object({
  budgetMin: num("budgetMin"),
  budgetMax: num("budgetMax"),
  handSizes: enumArr(HandSizeSchema),
  grips: enumArr(GripSchema),
  connections: enumArr(ConnectionSchema),
  usages: enumArr(MouseUsageSchema),
  weightMax: num("weightMax"),
  silent: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  rechargeable: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  batterySwappable: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  longBattery: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
});

export const MouseTraceSchema = z.object({
  label: z.string().min(1).max(40),
  explain: z.string().min(1).max(300),
  keys: z.array(z.string()),
});

export const MouseAiResponseSchema = z.object({
  constraints: MouseSchema,
  traces: z.array(MouseTraceSchema).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  questions: z.array(z.string().max(120)).max(3).default([]),
});

export type MouseAiResponse = z.infer<typeof MouseAiResponseSchema>;
