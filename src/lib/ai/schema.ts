/**
 * AI 输出的结构化契约（Zod）
 *
 * 【为什么需要这一层】
 * 大模型是"会自由发挥的文本生成器"，它可能：
 *   - 把数字写成字符串（"五千" / "5000元"）
 *   - 多塞几个我们不认识的字段
 *   - 输出离谱的值（weightMax: 99 公斤的笔记本？）
 * 所以我们不直接相信它的输出，先过一道"格式闸门"：
 * 类型不对 → 拒收；超出现实范围 → 拒收；拒收后带错误重试一次。
 *
 * 【铁律】模型只能输出"约束"，永远不能输出机型、价格、参数。
 */

import { z } from "zod";

/**
 * 数值的现实边界。
 * 这不只是为了防崩溃，更是「AI 安全可控」里"参数不越界"的实证：
 * 模型就算胡说，也进不了规则引擎。
 */
export const BOUNDS = {
  budgetMin: { min: 1000, max: 50000 },
  budgetMax: { min: 1000, max: 50000 },
  weightMax: { min: 0.5, max: 5 },
  screenSizeMin: { min: 10, max: 20 },
  screenSizeMax: { min: 10, max: 20 },
  /** PPI 低于 100 肉眼可见颗粒，高于 600 已超出人眼分辨极限 */
  ppiMin: { min: 100, max: 600 },
  refreshMin: { min: 60, max: 360 },
  ramMin: { min: 4, max: 128 },
  storageMin: { min: 128, max: 8192 },
  batteryMin: { min: 20, max: 120 },
} as const;

/** 某条数值约束的合法区间，用于报错时告诉模型"你错在哪" */
export function boundsHint(key: keyof typeof BOUNDS): string {
  const b = BOUNDS[key];
  return `${key} 必须在 ${b.min} 到 ${b.max} 之间`;
}

const num = (key: keyof typeof BOUNDS) =>
  z
    .number()
    .min(BOUNDS[key].min, boundsHint(key))
    .max(BOUNDS[key].max, boundsHint(key))
    .nullish()
    .transform((v) => (v === null ? undefined : v));

export const UsageTagSchema = z.enum([
  "office",
  "coding",
  "gaming",
  "design",
  "study",
  "video",
]);

/**
 * 约束体。
 * 用 .nullish() 是因为模型更习惯用 null 表示"用户没提这一项"。
 */
export const ConstraintsSchema = z.object({
  budgetMin: num("budgetMin"),
  budgetMax: num("budgetMax"),
  weightMax: num("weightMax"),
  screenSizeMin: num("screenSizeMin"),
  screenSizeMax: num("screenSizeMax"),
  ppiMin: num("ppiMin"),
  refreshMin: num("refreshMin"),
  ramMin: num("ramMin"),
  storageMin: num("storageMin"),
  batteryMin: num("batteryMin"),
  preferEfficient: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  preferStrongIGpu: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  requireDiscreteGpu: z
    .boolean()
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
  usages: z
    .array(UsageTagSchema)
    .nullish()
    .transform((v) => (v === null ? undefined : v)),
});

/** 一条翻译依据：为什么把这句话理解成了这个条件 */
export const TraceSchema = z.object({
  label: z.string().min(1).max(40),
  explain: z.string().min(1).max(300),
  keys: z.array(z.string()),
});

/** 模型要返回的完整对象 */
export const AiResponseSchema = z.object({
  constraints: ConstraintsSchema,
  traces: z.array(TraceSchema).default([]),
  /** 模型对自己这次翻译的把握程度，0~1 */
  confidence: z.number().min(0).max(1).default(0.5),
  /** 信息不足以做出判断时，它应该问回来的问题（Agent 追问用） */
  questions: z.array(z.string().max(120)).max(3).default([]),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;

/** 把 Zod 的报错压成一句人话，塞回给模型让它自己改 */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("；");
}
