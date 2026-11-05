/**
 * POST /api/parse-monitor —— 把人话翻译成显示器筛选条件
 *
 * 与 /api/parse-mouse 平行。安全边界一致：Key 只在服务端、用户 Key 用完即丢、每 IP 限流、输入长度上限。
 */

import { NextResponse } from "next/server";
import { parseMonitorWithFallback } from "@/lib/ai/monitor-parse";
import { checkRateLimit, clientKeyFrom } from "@/lib/ai/rate-limit";
import { hasConfiguredProvider } from "@/lib/ai/provider";

const MAX_INPUT_LEN = 500;

interface ParseMonitorRequestBody {
  text?: unknown;
}

export async function POST(request: Request) {
  const headers = request.headers;

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

  let text = "";
  try {
    const body = (await request.json()) as ParseMonitorRequestBody;
    if (typeof body.text === "string") text = body.text;
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体不是合法的 JSON" },
      { status: 400 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { ok: false, error: "请先说一说你想用这个显示器做什么" },
      { status: 400 }
    );
  }
  if (text.length > MAX_INPUT_LEN) {
    text = text.slice(0, MAX_INPUT_LEN);
  }

  const userKey = headers.get("x-user-ai-key")?.trim() || undefined;

  const result = await parseMonitorWithFallback(text, { userKey });

  return NextResponse.json(result, {
    headers: {
      "x-ai-configured": hasConfiguredProvider() ? "1" : "0",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return NextResponse.json(
    { configured: hasConfiguredProvider() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
