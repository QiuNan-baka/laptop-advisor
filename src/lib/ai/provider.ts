/**
 * AI 供应商适配层 —— 可换接口、可换模型、可换 Key
 *
 * 【设计目标】
 * 1. 用户想换成任何一家大模型（DeepSeek / 智谱 / 通义 / Kimi / 本地 Ollama），
 *    只改 .env.local 里的三个变量，一行代码都不用动。
 * 2. 评委/访客想用自己的 Key，前端可以直接带上来，用完不落盘。
 * 3. 我的 Key 只活在后端进程里，浏览器里永远看不到。
 *
 * 【为什么只支持 OpenAI 兼容协议】
 * 现在国内主流厂商（DeepSeek、智谱、通义、Kimi、硅基流动、甚至本地的
 * Ollama / vLLM）都提供 /chat/completions 这个相同形状的接口。
 * 只要对齐它，等于一次性支持了所有厂商，不用为每家写适配器。
 */

export interface ProviderConfig {
  /** 供应商标识，仅用于日志和界面显示 */
  name: string;
  /** 接口地址，形如 https://api.deepseek.com/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** 这个供应商是否支持流式（几乎所有都支持，留口子备用） */
  stream: boolean;
}

export type ProviderId =
  | "deepseek"
  | "zhipu"
  | "moonshot"
  | "siliconflow"
  | "ollama"
  | "custom";

/** 常见供应商的默认值，用户只填 Key 就能用 */
export const PRESETS: Record<
  Exclude<ProviderId, "custom">,
  { name: string; baseUrl: string; model: string; keyEnv: string }
> = {
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    keyEnv: "DEEPSEEK_API_KEY",
  },
  zhipu: {
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    keyEnv: "ZHIPU_API_KEY",
  },
  moonshot: {
    name: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    keyEnv: "MOONSHOT_API_KEY",
  },
  siliconflow: {
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
    keyEnv: "SILICONFLOW_API_KEY",
  },
  ollama: {
    name: "本地 Ollama",
    baseUrl: "http://localhost:11434/v1",
    model: "qwen2.5:7b",
    keyEnv: "",
  },
};

/** 供应商白名单：custom 模式也允许，但必须自己给 baseUrl */
const KNOWN: ProviderId[] = [
  "deepseek",
  "zhipu",
  "moonshot",
  "siliconflow",
  "ollama",
  "custom",
];

function envString(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * 解析出这次的供应商配置。
 *
 * @param overrideKey 用户自己带的 Key（来自请求头），优先级高于环境变量。
 *                    这是「三层降级」的第二层：评委可以用自己的 Key 试用。
 */
export function resolveProvider(overrideKey?: string): ProviderConfig | null {
  const rawId = (envString("AI_PROVIDER") || "deepseek").toLowerCase();
  const id = (KNOWN.includes(rawId as ProviderId) ? rawId : "custom") as ProviderId;

  // 1. 完全自定义：一切以环境变量为准，支持任何 OpenAI 兼容端点
  if (id === "custom") {
    const baseUrl = envString("AI_BASE_URL");
    const model = envString("AI_MODEL");
    const apiKey = overrideKey || envString("AI_API_KEY");
    if (!baseUrl || !model) return null;
    // 本地端点（如 Ollama）允许没有 Key
    if (!apiKey && !isLocalUrl(baseUrl)) return null;
    return { name: "自定义端点", baseUrl, apiKey, model, stream: true };
  }

  // 2. 预置供应商：默认值打底，环境变量可覆盖
  const preset = PRESETS[id];
  const baseUrl = envString("AI_BASE_URL") || preset.baseUrl;
  const model = envString("AI_MODEL") || preset.model;
  const apiKey = overrideKey || (preset.keyEnv ? envString(preset.keyEnv) : "");
  if (!apiKey && !isLocalUrl(baseUrl)) return null;

  return { name: preset.name, baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, model, stream: true };
}

function isLocalUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/.test(url);
}

/** 当前有没有配置可用的大模型（用于界面提示「现在是 AI 模式还是兜底模式」） */
export function hasConfiguredProvider(): boolean {
  return resolveProvider() !== null;
}

/**
 * Key 脱敏：日志、错误信息、界面回显里绝对不能出现完整 Key。
 * 只留前 3 位和后 4 位，中间打码。
 */
export function maskKey(key: string): string {
  if (!key) return "(未配置)";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 3)}${"*".repeat(Math.min(key.length - 7, 12))}${key.slice(-4)}`;
}
