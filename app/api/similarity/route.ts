/**
 * /api/similarity — Agent 2 LUI 反问卡的"语义相似度判断"真 AI 端点
 *
 * 接 DeepSeek (OpenAI 兼容协议)
 * 输入: 两条候选漏洞的来源 / 编号 / 名称
 * 输出: { score: 0-100, reason: string, source: "ai" | "mock" }
 *
 * 行为:
 *   - 环境变量 DEEPSEEK_API_KEY 存在 → 真调大模型
 *   - 不存在 / 调用失败 → 兜底返回 mock 分数, 保证 demo 永不翻车
 */

import type { NextRequest } from "next/server";
import { checkAccess, blockResponse } from "../_lib/guard";
import { extractContent, stripCodeFence, clamp } from "../_lib/helpers";

export const runtime = "edge"; // Vercel Edge Function, 冷启动快
export const maxDuration = 25; // Vercel Hobby Edge 上限, 配合 22s AbortSignal

type SimilarityInput = {
  a: { src: string; id: string; nm: string };
  b: { src: string; id: string; nm: string };
  /** 前端传入的 mock 兜底分, 真 AI 失败时用 */
  fallbackScore?: number;
};

type SimilarityOutput = {
  score: number;
  reason: string;
  source: "ai" | "mock";
  model?: string;
};

const SYSTEM_PROMPT = `你是"鉴微 insight 哨兵 AI 助手 — Agent 2 智能风险排查比对"中的相似度判断模块。

任务: 给定来自两个不同漏洞数据源的候选记录 A 和 B, 判断它们是不是同一个漏洞, 输出 0-100 的相似度分数和一句中文理由。

判断维度 (按重要性排序):
1. CVE 编号一致 → 95-100
2. 漏洞名称指向同一组件 + 攻击面一致 → 88-95
3. 同组件不同攻击面 / 别名不同 → 70-87
4. 仅命中关键词、攻击面差异大 → 40-69
5. 完全不相关 → 0-39

严格输出 JSON, 不要任何前言或代码块标记:
{ "score": 整数 0-100, "reason": "一句话中文理由, 不超过 40 字" }`;

export async function POST(req: NextRequest): Promise<Response> {
  const guard = checkAccess(req);
  if (!guard.ok) return blockResponse(guard);

  let body: SimilarityInput;
  try {
    body = (await req.json()) as SimilarityInput;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { a, b, fallbackScore = 92 } = body;
  if (!a?.id || !b?.id) {
    return Response.json({ error: "missing a / b" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  // 没配 key → 直接走 mock, 保证本地 / 静态部署 demo 不挂
  if (!apiKey) {
    return Response.json(mockResponse(fallbackScore));
  }

  try {
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              `A 来源=${a.src} 编号=${a.id} 名称=${a.nm}\n` +
              `B 来源=${b.src} 编号=${b.id} 名称=${b.nm}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 200,
      }),
      // 22s 超时 (Vercel Edge 25s 硬上限内, 留 3s 给序列化)
      signal: AbortSignal.timeout(22000),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("[similarity] deepseek http", upstream.status, text);
      return Response.json(mockResponse(fallbackScore, "上游 HTTP " + upstream.status));
    }

    const data: unknown = await upstream.json();
    const content = extractContent(data);
    if (!content) {
      return Response.json(mockResponse(fallbackScore, "上游响应为空"));
    }

    const parsed = safeParseScore(content);
    if (!parsed) {
      return Response.json(mockResponse(fallbackScore, "JSON 解析失败"));
    }

    const out: SimilarityOutput = {
      score: clamp(parsed.score, 0, 100),
      reason: String(parsed.reason).slice(0, 80),
      source: "ai",
      model: "deepseek-chat",
    };
    return Response.json(out);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[similarity] error", msg);
    return Response.json(mockResponse(fallbackScore, "网络异常"));
  }
}

// ── helpers ────────────────────────────────────────────────────

function mockResponse(score: number, note?: string): SimilarityOutput {
  return {
    score: clamp(score, 0, 100),
    reason: note
      ? `mock 兜底 (${note}): 厂商名归一化、cpe 匹配、版本号交集均命中`
      : "mock 兜底: 厂商名归一化、cpe 匹配、版本号交集均命中",
    source: "mock",
  };
}

function safeParseScore(raw: string): { score: number; reason: string } | null {
  // DeepSeek 在 json_object 模式下偶尔会包多一层代码块, 容错一下
  const cleaned = stripCodeFence(raw);
  try {
    const obj = JSON.parse(cleaned) as { score?: unknown; reason?: unknown };
    const score = typeof obj.score === "number" ? obj.score : Number(obj.score);
    const reason = typeof obj.reason === "string" ? obj.reason : String(obj.reason ?? "");
    if (!Number.isFinite(score) || !reason) return null;
    return { score, reason };
  } catch {
    return null;
  }
}
