/**
 * 极简内存限流器
 *
 * 【为什么需要它】
 * 部署到公网后，任何人只要打开 F12 就能看到 /api/parse，
 * 然后拿着我的域名当免费中转站疯狂调用，账单算我的。
 * 所以要限流：同一个人短时间内最多问几次。
 *
 * 【为什么不用 Redis】
 * 单人演示项目，一个进程就够。内存 Map 足够挡掉脚本刷接口。
 * 注意：Serverless 多实例部署时内存限流会被绕过，README 里已注明。
 */

interface Bucket {
  /** 这个时间窗口开始的时间戳 */
  startedAt: number;
  /** 窗口内已用次数 */
  count: number;
}

const buckets = new Map<string, Bucket>();

/** 每个 IP 每分钟最多 8 次 AI 翻译（正常人 1 分钟内不会问超过 8 遍） */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

/** 保险：防止 Map 无限增长把内存吃满 */
const MAX_KEYS = 5_000;

export interface RateLimitResult {
  allowed: boolean;
  /** 还剩几次 */
  remaining: number;
  /** 需要等多少秒 */
  retryAfterSec: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();

  // 超量时清掉过期桶，避免内存泄漏
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) {
      if (now - b.startedAt > WINDOW_MS) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt > WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true, remaining: MAX_PER_WINDOW - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= MAX_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((WINDOW_MS - (now - bucket.startedAt)) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: MAX_PER_WINDOW - bucket.count, retryAfterSec: 0 };
}

/** 从请求头里尽量取一个能代表"谁在调用"的值 */
export function clientKeyFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "local";
}
