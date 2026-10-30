/**
 * 前后端共享的类型。
 *
 * 单独放一个文件是为了让浏览器端的组件能 import 类型，
 * 又不会把服务端的 Node 代码（读环境变量、发 HTTP 请求）带进前端包。
 * `import type` 在编译后会被完全擦除，所以这只是「纸面上的约定」。
 */

import type { Constraints } from "@/data/dictionary";

/** 这次翻译是谁干的 —— 会直接显示在界面上给用户看 */
export type ParseSource = "builtin" | "user_key" | "rule";

/** 一条翻译依据：为什么把这句话理解成了这个条件 */
export interface Trace {
  label: string;
  explain: string;
  keys: (keyof Constraints)[];
}

/** 一次翻译的完整结果（服务端 /api/parse 返回什么，这里就是什么） */
export interface UnifiedParseResult {
  ok: boolean;
  /** builtin=用了服务端 Key，user_key=用了访客自己的 Key，rule=降级到词典 */
  source: ParseSource;
  constraints: Constraints;
  traces: Trace[];
  /** 模型自评的把握程度 0~1 */
  confidence: number;
  /** 信息不足时模型反问的问题（Agent 追问） */
  questions: string[];
  /** 降级时的原因，会显示在界面上 */
  fallbackReason?: string;
  /** 本次用的模型名，便于标注「由 deepseek-chat 翻译」 */
  model?: string;
  /** 耗时，毫秒 */
  elapsedMs: number;
}

/** 前端调用失败时的统一形状 */
export interface ParseError {
  message: string;
  /** 429 时告诉用户还要等几秒 */
  retryAfterSec?: number;
}

/** 供应商的中文名，用于界面标注 */
export const SOURCE_LABELS: Record<ParseSource, string> = {
  builtin: "大模型翻译",
  user_key: "大模型翻译（你提供的 Key）",
  rule: "本地词典翻译",
};
