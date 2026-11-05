/**
 * 键盘 AI 输出的结构化契约（Zod）。
 *
 * 与 mouse-schema.ts 同构，但字段是键盘专属（配列 / 轴体类型 / 连接方式 / 网页驱动 / 用途）。
 * 铁律不变：模型只能输出「约束」，永远不能输出具体型号、价格、参数。
 */

import { z } from "zod";

export const KEYBOARD_BOUNDS = {
  budgetMin: { min: 30, max: 10000 },
  budgetMax: { min: 30, max: 10000 },
} as const;

function boundsHint(key: keyof typeof KEYBOARD_BOUNDS): string {
  const b = KEYBOARD_BOUNDS[key];
  return `${key} 必须在 ${b.min} 到 ${b.max} 之间`;
}

const num = (key: keyof typeof KEYBOARD_BOUNDS) =>
  z
    .number()
    .min(KEYBOARD_BOUNDS[key].min, boundsHint(key))
    .max(KEYBOARD_BOUNDS[key].max, boundsHint(key))
    .nullish()
    .transform((v) => (v === null ? undefined : v));

const LayoutSchema = z.enum(["60", "65", "75", "80", "98", "100"]);
const SwitchTypeSchema = z.enum([
  "linear",
  "tactile",
  "clicky",
  "magnetic",
  "optical",
  "low-profile",
]);
const ConnectionSchema = z.enum(["wired", "wireless24g", "bluetooth"]);
const KeyboardUsageSchema = z.enum(["gaming", "office", "general"]);

const enumArr = <T extends z.ZodTypeAny>(s: T) =>
  z
    .array(s)
    .nullish()
    .transform((v) => (v === null ? undefined : v));

export const KeyboardSchema = z.object({
  budgetMin: num("budgetMin"),
  budgetMax: num("budgetMax"),
  layouts: enumArr(LayoutSchema),
  switchTypes: enumArr(SwitchTypeSchema),
  connections: enumArr(ConnectionSchema),
  webDriver: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  usages: enumArr(KeyboardUsageSchema),
});

export const KeyboardTraceSchema = z.object({
  label: z.string().min(1).max(40),
  explain: z.string().min(1).max(300),
  keys: z.array(z.string()),
});

export const KeyboardAiResponseSchema = z.object({
  constraints: KeyboardSchema,
  traces: z.array(KeyboardTraceSchema).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  questions: z.array(z.string().max(120)).max(3).default([]),
});

export type KeyboardAiResponse = z.infer<typeof KeyboardAiResponseSchema>;
