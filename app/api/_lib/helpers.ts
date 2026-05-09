/**
 * 6 个 AI 端点共享的工具函数
 *
 * 仅放真正被多个端点用到的函数。 各端点的 safeParse / mock 兜底因为返回 shape 不同
 * 各自实现, 不要在这里硬抽象。
 */

/** 从 DeepSeek (OpenAI 兼容协议) 响应里取 choices[0].message.content */
export function extractContent(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? null;
}

/** 数值 clamp (0-10 / 0-100 都用这个) */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(n.toFixed(2))));
}

/** 兜底转数字, 失败回 fallback */
export function toNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** 去除 DeepSeek 偶尔包的 ```json ... ``` 代码块标记 */
export function stripCodeFence(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}
