/**
 * POST /api/parse —— 把人话翻译成结构化约束
 *
 * 【这个路由存在的原因只有一个】
 * API Key 不能出现在前端。前端代码任何人按 F12 都能看到，
 * 所以调用链必须是：浏览器 → 这个后端路由 → 大模型 → 这个路由 → 浏览器。
 * Key 只活在服务端进程里，浏览器从头到尾看不到它。
 *
 * 【安全边界】
 *   1. Key 只在服务端读取，永不回传
 *   2. 用户自带的 Key 用完即丢，不落盘、不写日志
 *   3. 每 IP 每分钟限流，防止被当成免费中转站
 *   4. 输入长度上限，防止超长文本烧 token
 */

import { connection, NextResponse } from "next/server";
import { parseWithFallback } from "@/lib/ai/parse";
import { checkRateLimit, clientKeyFrom } from "@/lib/ai/rate-limit";
import { hasConfiguredProvider } from "@/lib/ai/provider";

/** 用户输入上限：正常人描述需求不会超过这个长度 */
const MAX_INPUT_LEN = 500;

// 注意：本项目 next.config.ts 打开了 cacheComponents，
// 这个模式下 `export const dynamic / runtime / revalidate / fetchCache` 一律不允许出现。
// 需要「每次请求都真跑」的地方，改为调用 next/server 的 connection()。

interface ParseRequestBody {
  text?: unknown;
}

export async function POST(request: Request) {
  const headers = request.headers;

  // ---- 限流 ----
  const limitKey = clientKeyFrom(headers);
  const limit = checkRateLimit(limitKey);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `请求太频繁，请 ${limit.retryAfterSec} 秒后再试`,
        retryAfterSec: limit.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  // ---- 解析入参 ----
  let text = "";
  try {
    const body = (await request.json()) as ParseRequestBody;
    if (typeof body.text === "string") text = body.text;
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体不是合法的 JSON" },
      { status: 400 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { ok: false, error: "请先说一说你想用这台电脑做什么" },
      { status: 400 }
    );
  }
  if (text.length > MAX_INPUT_LEN) {
    text = text.slice(0, MAX_INPUT_LEN);
  }

  // ---- 访客自带 Key（可选）----
  // 前端如果传了 x-user-ai-key，说明评委/用户想用自己的额度试用。
  // 这个 Key 只在本次请求内存在，不写库、不打日志。
  const userKey = headers.get("x-user-ai-key")?.trim() || undefined;

  // ---- 翻译 ----
  const result = await parseWithFallback(text, { userKey });

  return NextResponse.json(result, {
    headers: {
      // 让前端知道现在系统处于哪种模式，便于界面提示
      "x-ai-configured": hasConfiguredProvider() ? "1" : "0",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * GET：给前端探测「现在有没有配 Key」用，不含任何敏感信息。
 *
 * 必须显式 connection()：cacheComponents 模式下 GET 处理器默认会被静态预渲染，
 * 那样 configured 会被固化成构建那一刻的值，改了 .env.local 也不生效。
 */
export async function GET() {
  await connection();
  return NextResponse.json(
    { configured: hasConfiguredProvider() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
