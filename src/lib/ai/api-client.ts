/**
 * 浏览器端调用 /api/parse 的唯一入口。
 *
 * 【为什么不直接在组件里 fetch】
 * 一个 fetch 背后有七八件必须处理的琐事：超时、HTTP 状态码、后端返回的业务错误、
 * JSON 解析失败、用户中途取消、网络断开……散落在组件里会到处漏。
 * 收成一个函数后，组件只需要 `const res = await requestParse(text)` 一行。
 *
 * 【Key 的位置】
 * 用户自带的 Key 通过请求头 x-user-ai-key 传，只活在这个函数的局部变量里，
 * 不写 localStorage、不写 cookie、不进 URL —— 用完即丢。
 */

import type { ParseError, UnifiedParseResult } from "./types";

/** 前端等多久算超时。后端自己 20 秒就放弃，这里留点余量兜住网络慢。 */
const CLIENT_TIMEOUT_MS = 25_000;

export interface RequestParseOptions {
  /** 访客自带的 Key；为空则让后端用内置 Key */
  userKey?: string;
  /** 用于取消（用户连点时取消上一次） */
  signal?: AbortSignal;
}

export type ParseOutcome =
  | { ok: true; data: UnifiedParseResult }
  | { ok: false; error: ParseError };

/** 把各种异常统一成一句能给用户看的话 */
function normalizeError(error: unknown): ParseError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { message: "已取消" };
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return { message: "翻译太慢了，请再试一次" };
  }
  if (error instanceof TypeError) {
    // fetch 在网络层失败（断网、后端没启动）时抛 TypeError
    return { message: "连不上服务器，请确认开发服务器还在运行" };
  }
  return {
    message: error instanceof Error ? error.message : "翻译失败，请重试",
  };
}

export async function requestParse(
  text: string,
  options: RequestParseOptions = {}
): Promise<ParseOutcome> {
  // 不用 AbortSignal.any()：那个 API 要 Chrome 116+，兼容性没必要赌。
  // 自己拿一个 controller 合流「用户取消」和「超时」两个来源。
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CLIENT_TIMEOUT_MS);
  const relayAbort = () => controller.abort();
  options.signal?.addEventListener("abort", relayAbort, { once: true });

  const cleanup = () => {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", relayAbort);
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const userKey = options.userKey?.trim();
  if (userKey) headers["x-user-ai-key"] = userKey;

  let response: Response;
  try {
    response = await fetch("/api/parse", {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch (error) {
    cleanup();
    // 到底是用户取消还是超时？两个来源分别判定
    if (options.signal?.aborted) return { ok: false, error: { message: "已取消" } };
    if (timedOut) {
      return { ok: false, error: { message: "翻译太慢了，请再试一次" } };
    }
    return { ok: false, error: normalizeError(error) };
  }
  cleanup();

  // 后端用 NextResponse.json 返回业务错误时也带 HTTP 状态码，这里一并处理
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const body = payload as { error?: string; retryAfterSec?: number } | null;
    return {
      ok: false,
      error: {
        message: body?.error ?? `服务器返回 ${response.status}`,
        retryAfterSec: body?.retryAfterSec,
      },
    };
  }

  if (!payload || typeof payload !== "object") {
    return { ok: false, error: { message: "服务器返回了无法识别的内容" } };
  }

  return { ok: true, data: payload as UnifiedParseResult };
}

/** 探测后端有没有配 Key —— 用来在界面上提示「当前是演示态」 */
export async function probeProvider(): Promise<boolean> {
  try {
    const response = await fetch("/api/parse", {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { configured?: boolean };
    return data.configured === true;
  } catch {
    return false;
  }
}
