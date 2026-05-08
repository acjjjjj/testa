/**
 * API 端点访问守卫
 *
 * 用途: 防止外部直接扫到 /api/* 端点后无限调用, 烧 DeepSeek 余额.
 *
 * 策略 (按从松到严):
 * 1. Origin / Referer 检查 — 只接受来自本站的请求
 * 2. 简单的 IP rate limit — 单 IP 每分钟最多 N 次 (per Edge instance, best-effort)
 *
 * 注意: Vercel Edge Function 跨实例不共享内存, rate limit 是 per-instance 的尽力策略.
 * 想做严格限速需要接 Vercel KV / Upstash. demo 范围内 origin 检查 + 软 rate limit 足够.
 */

const ALLOWED_HOSTS = [
  "testa-ashen.vercel.app",
  "testa-acjjjjjs-projects.vercel.app", // Vercel 给的项目级别域
  "localhost:3000",
  "localhost:3001",
  "127.0.0.1:3000",
];

const ALLOWED_HOST_SUFFIXES = [
  ".vercel.app", // Vercel preview / branch deploy 的随机域名都允许 (acjjjjj 项目内)
  ".zeabur.app", // Zeabur 国际部署
  ".zeabur.cn", // Zeabur 中国大陆部署 (zeabur.cn 入口给的域名)
];

interface Bucket {
  count: number;
  resetAt: number;
}

const RATE_WINDOW_MS = 60_000; // 1 分钟
const RATE_MAX = 100; // 单 IP 单分钟最多 100 次 (Edge per-instance best-effort)
// 备注: 之前 20 太严, 演示 + 内部 stress test 都会被自己卡; 100 对正常用户体感 0 影响

const buckets = new Map<string, Bucket>();

export type GuardResult = { ok: true } | { ok: false; status: number; reason: string };

/**
 * 入口: 同时检 Origin / Referer + IP rate limit.
 * 如果允许返回 { ok: true }, 否则返回 Response 用的 status + reason.
 */
export function checkAccess(req: Request): GuardResult {
  // 1. Origin / Referer 检查
  const originRaw = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  if (!originRaw) {
    return { ok: false, status: 403, reason: "missing origin/referer" };
  }
  let host = "";
  try {
    host = new URL(originRaw).host;
  } catch {
    return { ok: false, status: 403, reason: "invalid origin" };
  }

  const allowed =
    ALLOWED_HOSTS.includes(host) || ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s));
  if (!allowed) {
    return { ok: false, status: 403, reason: `host not allowed: ${host}` };
  }

  // 2. IP rate limit (per-instance, best-effort)
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    b.count += 1;
    if (b.count > RATE_MAX) {
      return {
        ok: false,
        status: 429,
        reason: `rate limit: ${b.count}/${RATE_MAX} per ${RATE_WINDOW_MS / 1000}s`,
      };
    }
  }

  // 简单的清理: 偶尔扫一下过期 bucket (减少内存堆积)
  if (Math.random() < 0.01) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  return { ok: true };
}

/** 快捷返回 Response */
export function blockResponse(g: Extract<GuardResult, { ok: false }>): Response {
  return Response.json({ error: g.reason }, { status: g.status });
}
