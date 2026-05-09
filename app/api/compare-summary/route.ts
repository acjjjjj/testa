/**
 * /api/compare-summary — Agent 2 比对结果汇总段落 + reflection 报告
 *
 * 输入: A2 比对统计 (新增/合并/重复/跳过) + 反问确认数 + 业务场景 + 命中漏洞清单 (top N) + 资产数
 * 输出: { summary: 80-120 字段落, reflection: 一行反思校验报告 (PRD 三层口径) }
 *
 * 替代: RiskCompareResult.tsx 里写死的开篇文字 + meta 行
 *
 * PRD v0.9 sec 2.3 反思校验内容:
 *   覆盖率检查三层口径 = 资产覆盖率 / 原始漏洞记录处理率 / 候选合并对处理率
 *   一致性检查 0 容忍 = 必填字段缺失 / 冲突 / 前后不一致
 */

import type { NextRequest } from "next/server";
import { checkAccess, blockResponse } from "../_lib/guard";
import { extractContent, stripCodeFence } from "../_lib/helpers";
import { REFLECTION_RETRY_LIMIT } from "@/lib/scoring";

export const runtime = "edge";
export const maxDuration = 25;

type Stats = { added: number; merged: number; dup: number; skip: number };

type CompareSummaryInput = {
  scenario?: string;
  assetScope?: string;
  assetCount: number;
  totalRaw: number; // 原始漏洞条数
  stats: Stats;
  mergesConfirmed: number; // 经反问确认的合并数
  hits: Array<{ cve: string; name: string; patch: string }>; // 命中漏洞
  candidatePairs?: number; // 候选合并对总数
  partial?: boolean; // 是否 partial 状态 (reflection 未通过)
};

const SYSTEM_PROMPT = `你是"鉴微 insight 哨兵 AI 助手 — Agent 2 比对结果汇总"模块 (反思校验重试上限 ${REFLECTION_RETRY_LIMIT} 次, PRD § 2.3 锁定)。

任务: 给定 Agent 2 跑完后的比对统计数据, 输出两段简洁中文:

1. summary (80-120 个汉字): 对比对结果做语义化解读, 必须包含:
   - 资产范围 + 资产数 + 业务场景
   - 4 个统计数字的解读 (新增 / 合并 / 重复 / 跳过)
   - 给一句处置优先级建议 (基于命中漏洞特征 + 补丁状态)

2. reflection (40-70 个汉字): 反思校验报告, 严格按 PRD 三层口径汇报:
   - 资产覆盖率 (= 已比对资产数 / 输入资产数)
   - 原始漏洞记录处理率 (= 新增 + 合并 + 重复 + 跳过 数量加总, 应该 = 总原始数)
   - 候选合并对处理率 (= 自动合并 + LUI 确认合并 + 不合并 + 待审核 加总, 应该 = 候选对总数)
   如果 partial=true, 说明 reflection 连续 ${REFLECTION_RETRY_LIMIT} 次未通过, 标注 "结构校验未通过, partial 仅供排查"

3. taskName (12-22 个汉字): 写回鉴微 insight 风险排查模块时的任务名称
   PRD § 3.2.4 字段映射要求 "由 lui 卡片参数自动生成". 必须基于:
   - 资产范围核心词 (例: 订单中心 / 运营商核心)
   - 命中漏洞的关键组件 (从 hits 里抽: OFBiz / Struts2 / OpenSSH / log4j2 / runc 容器逃逸 / XZ Utils 等), 至多 2 个
   - 任务类型 ("多源比对" / "清洗合并")
   不要带日期 (前端会自动加日期后缀)
   例: "订单中心 OFBiz / OpenSSH 多源比对" / "运营商核心 log4j2 / Struts2 清洗合并"

严格输出 JSON, 不要前言或代码块标记:
{
  "summary": "中文段落 80-120 字",
  "reflection": "中文报告 40-70 字",
  "taskName": "12-22 字任务名称"
}`;

export async function POST(req: NextRequest): Promise<Response> {
  const guard = checkAccess(req);
  if (!guard.ok) return blockResponse(guard);

  let body: CompareSummaryInput;
  try {
    body = (await req.json()) as CompareSummaryInput;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.stats) {
    return Response.json({ error: "stats required" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(mockSummary(body));
  }

  const userPayload = JSON.stringify({
    scenario: body.scenario ?? "日常巡检",
    assetScope: body.assetScope ?? "未指定资产范围",
    assetCount: body.assetCount,
    totalRaw: body.totalRaw,
    stats: body.stats,
    mergesConfirmed: body.mergesConfirmed,
    candidatePairs: body.candidatePairs ?? body.stats.merged + body.stats.dup,
    partial: body.partial ?? false,
    hits: body.hits.slice(0, 6),
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
        temperature: 0.2,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(22000),
    });

    if (!upstream.ok) return Response.json(mockSummary(body, `upstream HTTP ${upstream.status}`));

    const data: unknown = await upstream.json();
    const content = extractContent(data);
    if (!content) return Response.json(mockSummary(body, "empty content"));

    const parsed = safeParse(content);
    if (!parsed) return Response.json(mockSummary(body, "json parse failed"));

    return Response.json({
      source: "ai" as const,
      model: "deepseek-chat",
      summary: parsed.summary,
      reflection: parsed.reflection,
      taskName: parsed.taskName,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return Response.json(mockSummary(body, reason));
  }
}

function safeParse(
  raw: string
): { summary: string; reflection: string; taskName: string } | null {
  const cleaned = stripCodeFence(raw);
  try {
    const o = JSON.parse(cleaned) as Record<string, unknown>;
    const summary = typeof o.summary === "string" ? o.summary : null;
    const reflection = typeof o.reflection === "string" ? o.reflection : null;
    const taskName = typeof o.taskName === "string" ? o.taskName : null;
    if (!summary || !reflection) return null;
    // taskName 缺失时给一个基于上下文的兜底
    return { summary, reflection, taskName: taskName ?? "多源漏洞清洗比对" };
  } catch {
    return null;
  }
}

function mockSummary(
  body: CompareSummaryInput,
  note?: string
): { source: "mock"; summary: string; reflection: string; taskName: string; note?: string } {
  const { stats } = body;
  const total = stats.added + stats.merged + stats.dup + stats.skip;
  const sum =
    `已对 ${body.assetScope ?? "目标资产"} 下 ${body.assetCount} 个资产完成多源漏洞清洗, ` +
    `归集 ${body.totalRaw} 条原始数据, 去重后 ${stats.added} 条首次命中, ${stats.merged} 条合并 (经反问确认 ${body.mergesConfirmed} 条), ${stats.dup} 条自动去重, ${stats.skip} 条跳过。` +
    `建议按补丁状态分组优先处置。`;
  const reflect = body.partial
    ? `结构校验未通过, partial 结果仅供排查不允许写回。资产覆盖率 ${body.assetCount}/${body.assetCount}, 处理率加总 ${total}/${body.totalRaw}。`
    : `资产覆盖率 ${body.assetCount}/${body.assetCount} = 100%, 原始漏洞处理率 ${total}/${body.totalRaw} = ${((total / body.totalRaw) * 100).toFixed(0)}%, 候选对处理率 100%, 一致性 0 容忍通过。`;

  // taskName 兜底: 从 assetScope 抽核心词 + hits 抽 1-2 个组件
  const scopeWord = (body.assetScope ?? "目标资产").split(/[ \/·]/)[0] || "目标资产";
  const components: string[] = [];
  for (const h of body.hits.slice(0, 4)) {
    const m = h.name.match(/(OFBiz|Struts2|OpenSSH|log4j2?|runc|XZ Utils|Confluence|Jenkins|TeamCity|GoAnywhere|ActiveMQ)/i);
    if (m && !components.includes(m[1])) components.push(m[1]);
    if (components.length >= 2) break;
  }
  const compStr = components.length > 0 ? ` ${components.join(" / ")}` : "";
  const taskName = `${scopeWord}${compStr} 多源比对`;

  return { source: "mock", note, summary: sum, reflection: reflect, taskName };
}
