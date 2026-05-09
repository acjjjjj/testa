/**
 * /api/abnormal-narrate — 异常 banner AI 实时叙事
 *
 * 输入: { kind, agent, scenario, assetScope, ...context }
 * 输出: { title, body, footnote, source }
 *
 * 替代: components/AbnormalAlert.tsx 里 4 类 (timeout/patch/partial/budget) 写死的 MAP
 *
 * PRD § 4.6 锁了 10 条异常路径的语义, 每条的 PRD 文案我用作 system prompt 的"基线参考".
 * AI 在保留 PRD 关键阈值数字 (3 次重试 / partial / 5 次预算) 的前提下,
 * 基于实际 context (agent / 资产范围 / 业务场景 / 接口名) 把文案换成具体的, 让每次跳进去都不一样.
 */

import type { NextRequest } from "next/server";
import { checkAccess, blockResponse } from "../_lib/guard";
import { extractContent, stripCodeFence } from "../_lib/helpers";
import { REFLECTION_RETRY_LIMIT, LUI_FOLLOWUP_BUDGET } from "@/lib/scoring";

export const runtime = "edge";
export const maxDuration = 25;

type AbnormalKind = "timeout" | "patch" | "partial" | "budget";

type AbnormalNarrateInput = {
  kind: AbnormalKind;
  agent: "a1" | "a2";
  scenario?: string;
  assetScope?: string;
  assetCount?: number;
  /** 触发的接口名 (如 insight.assets.fingerprint) */
  iface?: string;
};

const SYSTEM_PROMPT = `你是"鉴微 insight 哨兵 AI 助手"的异常路径叙事模块.

任务: 给定异常类型和当前 context, 生成具体的中文 banner 文案. 替代死值, 让每次异常都基于真实情况叙事.

输出 JSON:
{
  "title": "短标题 18-30 字, 一句话点出问题",
  "body": "正文 60-110 字, 说清楚发生了什么 + 系统已经做了什么 + 用户该怎么办",
  "footnote": "短脚注 12-25 字, 标注 PRD 阈值或降级标识 (例: 'reflection_retry_limit = 3 · partial=true')"
}

四类异常的语义边界 (必须严格遵守, 数字不能变):

1. timeout (数据接口超时):
   - 触发: 鉴微 insight 接口连续 3 次返回 timeout, api_retry_limit 用尽
   - 系统行为: 工作流中止
   - 用户反馈: 重试 / 提工单
   - 必带: api_retry_limit = 3 · trace_id (随机 8 位 hex)

2. patch (补丁库不可用):
   - 触发: 4.4.7 补丁库 cve 查询接口不可调
   - 系统行为: 跳过补丁库匹配, 命中漏洞 补丁状态 字段统一填 '未查询', 主流程不阻塞
   - 必带: 4.4.7 降级 · patch_unavailable=true

3. partial (反思校验未达标):
   - 触发: reflection 连续 ${REFLECTION_RETRY_LIMIT} 次未达标 (例: 资产数与已比对资产数不一致)
   - 系统行为: 输出 partial 结果, 未达标项进入跳过清单, 写回按钮置灰
   - 必带: reflection_retry_limit = ${REFLECTION_RETRY_LIMIT} · partial=true

4. budget (反问预算超额):
   - 触发: LUI 反问轮次 > ${LUI_FOLLOWUP_BUDGET} (lui_followup_budget = ${LUI_FOLLOWUP_BUDGET})
   - 系统行为: 后续中置信命中对不再弹窗, 统一进入待审核清单
   - 必带: lui_followup_budget = ${LUI_FOLLOWUP_BUDGET} · queued = 数字

叙事要点:
- 必须用 context 里的具体值 (agent / assetScope / 接口名)
- 不要泛泛说 "数据接口", 要说具体接口名 (如 insight.vulns.list / insight.assets.fingerprint / patch.cve.lookup)
- partial 要说明已处理多少 / 未达标多少
- 严格遵守 PRD § 4.6 文案锁定的关键术语 (api_retry_limit / reflection_retry_limit / lui_followup_budget / patch_unavailable / partial), 这些是契约不能改

严格输出 JSON, 不要前言或代码块标记.`;

export async function POST(req: NextRequest): Promise<Response> {
  const guard = checkAccess(req);
  if (!guard.ok) return blockResponse(guard);

  let body: AbnormalNarrateInput;
  try {
    body = (await req.json()) as AbnormalNarrateInput;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.kind || !["timeout", "patch", "partial", "budget"].includes(body.kind)) {
    return Response.json({ error: "kind required" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(mockNarrate(body, "no-key"));
  }

  const userPayload = JSON.stringify({
    kind: body.kind,
    agent: body.agent,
    scenario: body.scenario ?? "未指定场景",
    assetScope: body.assetScope ?? "未指定资产范围",
    assetCount: body.assetCount,
    iface: body.iface ?? defaultIface(body.kind, body.agent),
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
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(22000),
    });

    if (!upstream.ok) return Response.json(mockNarrate(body, `upstream HTTP ${upstream.status}`));

    const data: unknown = await upstream.json();
    const content = extractContent(data);
    if (!content) return Response.json(mockNarrate(body, "empty content"));

    const parsed = safeParse(content);
    if (!parsed) return Response.json(mockNarrate(body, "json parse failed"));

    return Response.json({
      source: "ai" as const,
      model: "deepseek-chat",
      ...parsed,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return Response.json(mockNarrate(body, reason));
  }
}

// ── helpers (端点专属 — 跨端点共用的见 ../_lib/helpers.ts) ──────────────────

function safeParse(raw: string): { title: string; body: string; footnote: string } | null {
  const cleaned = stripCodeFence(raw);
  try {
    const o = JSON.parse(cleaned) as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : null;
    const body = typeof o.body === "string" ? o.body : null;
    const footnote = typeof o.footnote === "string" ? o.footnote : null;
    if (!title || !body || !footnote) return null;
    return { title, body, footnote };
  } catch {
    return null;
  }
}

function defaultIface(kind: AbnormalKind, agent: "a1" | "a2"): string {
  if (kind === "patch") return "patch.cve.lookup";
  if (agent === "a2") return "insight.assets.fingerprint";
  return "insight.vulns.list";
}

/** mock 兜底: PRD § 4.6 锁定的基线文案 (跟原 AbnormalAlert 一致), 但插入 context */
function mockNarrate(
  body: AbnormalNarrateInput,
  note?: string
): { source: "mock"; title: string; body: string; footnote: string; note?: string } {
  const ctx = body.assetScope ? ` (${body.assetScope})` : "";
  const iface = body.iface ?? defaultIface(body.kind, body.agent);
  const map: Record<AbnormalKind, { title: string; body: string; footnote: string }> = {
    timeout: {
      title: "数据接口超时, 已重试 3 次仍失败",
      body: `${iface}${ctx} 连续 3 次返回 timeout, 当前工作流已中止. 已保留你的 query 与 LUI 参数, 可点击稍后重试.`,
      footnote: `api_retry_limit = 3 · trace_id ${randHex(8)}`,
    },
    patch: {
      title: "补丁库接口暂不可用, 已降级跳过",
      body: `本次结果不含补丁状态字段, 命中漏洞补丁状态统一填 "未查询". 主流程继续, 不阻塞${body.agent === "a2" ? "比对" : "排序"}结果.`,
      footnote: "4.4.7 降级 · patch_unavailable=true",
    },
    partial: {
      title: `反思校验 ${REFLECTION_RETRY_LIMIT} 次未达标, 输出 partial 结果`,
      body: `已处理 134 / ${body.assetCount ?? 142} 条, 8 条进入跳过清单 (无访问权限 5 / 接口失败 3). 结果仅供排查, 不允许写回风险排查模块.`,
      footnote: `reflection_retry_limit = ${REFLECTION_RETRY_LIMIT} · partial=true`,
    },
    budget: {
      title: "反问预算已用完, 剩余进入待审核清单",
      body: `本轮 ${LUI_FOLLOWUP_BUDGET} 次 LUI 反问已用完, 后续 3 对中置信命中不再弹窗, 已统一进入待审核清单, 等待你手动复核.`,
      footnote: `lui_followup_budget = ${LUI_FOLLOWUP_BUDGET} · queued = 3`,
    },
  };
  return { source: "mock", note, ...map[body.kind] };
}

function randHex(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}
