/**
 * /api/next-actions — Agent 1 后续动作建议
 *
 * 输入: A1 真 AI 排序后的 top 5 CVE (cve / 名称 / vptA/V/I / score / sceneTag) + 业务场景
 * 输出: 3 条针对性中文后续动作建议
 *
 * 替代: data/ranking.mock.ts 里写死的 A1_NEXT_ACTIONS
 *
 * PRD v0.9 sec 3.1.2 步骤 f 锁意思 (3 条):
 *   - 优先处置前 N 条
 *   - 按 vpt 维度分组复核
 *   - 跳转风险管理模块批量分配
 * 但具体文案 PRD 没锁, AI 应该基于实际排序结果给针对性建议
 */

import type { NextRequest } from "next/server";
import { checkAccess, blockResponse } from "../_lib/guard";

export const runtime = "edge";
export const maxDuration = 25;

type NextActionsInput = {
  scenario?: string;
  ranked: Array<{
    cve: string;
    name: string;
    vptA: number;
    vptV: number;
    vptI: number;
    score: number;
    sceneTag: string;
    desc: string;
  }>;
};

const SYSTEM_PROMPT = `你是"鉴微 insight 哨兵 AI 助手 — Agent 1 后续动作建议"模块。

任务: 给定 Agent 1 排好序的 top 候选漏洞清单和业务场景, 输出 3 条针对性中文后续动作建议, 帮运营人员快速决策。

PRD 锁定 3 条建议必须覆盖以下意思 (具体文案你来写, 必须基于实际数据生成不要套模板):
1. 优先处置建议 — 基于 top 几条的特点 (公网 RCE / PoC 武器化 / 供应链 / 跳板机) 给一条具体的紧急动作
2. 复核建议 — 按 vpt 三维某个维度 (资产属性 / 漏洞属性 / 情报属性) 分组复核, 针对当前数据里最突出的维度给建议
3. 跳转建议 — 跳转风险管理模块批量分配工单, 给出建议的分配维度 (按业务系统 / 按负责人 / 按补丁状态等)

每条 30-55 个汉字, 必须基于本次 ranked 里的具体 CVE / vpt 维度 / 场景标签, 不要泛泛而谈。

严格输出 JSON, 不要前言或代码块标记:
{
  "actions": ["第一条建议", "第二条建议", "第三条建议"]
}`;

export async function POST(req: NextRequest): Promise<Response> {
  const guard = checkAccess(req);
  if (!guard.ok) return blockResponse(guard);

  let body: NextActionsInput;
  try {
    body = (await req.json()) as NextActionsInput;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!Array.isArray(body.ranked) || body.ranked.length === 0) {
    return Response.json({ error: "ranked required" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(mockActions(body));
  }

  const userPayload = JSON.stringify({
    scenario: body.scenario ?? "未指定",
    ranked: body.ranked.slice(0, 5).map((r) => ({
      cve: r.cve,
      name: r.name,
      vpt: { A: r.vptA, V: r.vptV, I: r.vptI },
      score: r.score,
      scene: r.sceneTag,
      desc: r.desc,
    })),
  });

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
          { role: "user", content: userPayload },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(22000),
    });

    if (!upstream.ok) return Response.json(mockActions(body, `upstream HTTP ${upstream.status}`));

    const data: unknown = await upstream.json();
    const content = extractContent(data);
    if (!content) return Response.json(mockActions(body, "empty content"));

    const parsed = safeParse(content);
    if (!parsed) return Response.json(mockActions(body, "json parse failed"));

    return Response.json({
      source: "ai" as const,
      model: "deepseek-chat",
      actions: parsed.actions,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return Response.json(mockActions(body, reason));
  }
}

// ── helpers ──────────────────────────────────────────────────

function extractContent(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? null;
}

function safeParse(raw: string): { actions: string[] } | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const o = JSON.parse(cleaned) as Record<string, unknown>;
    const actions = Array.isArray(o.actions) ? (o.actions as unknown[]).filter((s) => typeof s === "string").slice(0, 3) : null;
    if (!actions || actions.length === 0) return null;
    return { actions: actions as string[] };
  } catch {
    return null;
  }
}

/** mock 兜底: 基于 top 1 的特征做个最简陋的拼装, 保留 3 条结构 */
function mockActions(
  body: NextActionsInput,
  note?: string
): { source: "mock"; actions: string[]; note?: string } {
  const top = body.ranked[0];
  const sceneText = top?.sceneTag ?? "当前场景";
  return {
    source: "mock",
    note,
    actions: [
      `优先处置前 ${Math.min(body.ranked.length, 10)} 条 (综合分高), 推送给业务线 owner / 运维负责人立即处置`,
      `按 vpt 三维 情报属性 维度分组复核, 关注 PoC 武器化 / 供应链投毒条目`,
      `跳转风险管理模块, 按 ${sceneText} 场景批量分配工单, 字段映射已对齐`,
    ],
  };
}
