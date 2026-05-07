/**
 * /api/extract-params — LUI 参数智能抽取 (A1 + A2 共用)
 *
 * 输入: 用户中文自然语言 query, agent 类型
 * 输出: 结构化参数 (asset / severity / timeWindow / businessTag / sceneWeight / confidence)
 *
 * 接 DeepSeek (OpenAI 兼容协议)
 * 行为: 无 key / 失败 → 兜底返回 mock 参数, demo 永不翻车
 */

import type { NextRequest } from "next/server";

export const runtime = "edge";
export const maxDuration = 12;

type ExtractInput = {
  query: string;
  agent?: "a1" | "a2";
};

export type ExtractedParams = {
  source: "ai" | "mock";
  model?: string;
  confidence: number; // 0-1
  /** 资产范围 (业务线 / 资产组 / IP 段) */
  assetScope: string;
  /** 资产关联条数 (估算) */
  assetCount?: number;
  /** 漏洞等级: 高危 / 中危 / 低危 */
  severity: "高危" | "中危" | "低危";
  /** 时间窗口描述 */
  timeWindow: string;
  /** 业务场景标签 */
  businessTag: string;
  /** 场景权重 0.9-1.25 */
  sceneWeight: number;
  /** A2 专用: 数据源 (内部漏洞库 / 威胁情报 / CVE / CNNVD) */
  dataSources?: string[];
  /** A2 专用: 比对维度 (cpe / 版本号 / 组件指纹) */
  compareDims?: string[];
  /** A2 专用: 是否结合补丁库 */
  withPatch?: boolean;
};

const SYSTEM_PROMPT = `你是"鉴微 insight 哨兵 AI 助手"的 LUI 参数抽取模块。

任务: 从用户的中文自然语言 query 里识别结构化参数, 用于驱动 Agent 1 智能风险排序 / Agent 2 智能风险排查比对。

抽取字段:
- assetScope: 资产范围 (业务线名 / 资产组 / IP 段 / 单资产), 用户没说就猜"运营商核心业务线"
- assetCount: 估算的关联资产数量 (数字)。"业务线"级 80-200, "资产组"级 20-80, "单资产"=1, "IP 段"按掩码估
- severity: 必须是 "高危" / "中危" / "低危" 之一。用户没说默认"高危"
- timeWindow: 时间窗口的中文描述, 例如 "业务上线前 7 天" / "近 30 天" / "实时"
- businessTag: 业务场景标签, v1 锁 5 类, 必须是以下之一: "业务上线前" / "夜间窗口" / "合规审计前" / "红蓝对抗前" / "未识别特殊场景"
- sceneWeight: 对应 businessTag 的场景权重, 必须严格使用以下固定映射 (PRD v0.9 § 3.1.2 锁定):
   - 业务上线前 → 1.15
   - 夜间窗口 → 1.05
   - 合规审计前 → 1.10
   - 红蓝对抗前 → 1.20
   - 未识别特殊场景 → 1.00
- 场景词别名表 (从用户 query 里识别这些关键词, 映射回上面 5 类):
   - 数据库上线 / 系统上线 / 发版前 / 重要业务上线 → 业务上线前
   - 监管检查 / 等保检查 / 审计 → 合规审计前
   - 攻防演练 / 护网 / 红队演练 / 红蓝对抗 → 红蓝对抗前
   - 夜间变更 / 夜间处置窗口 / 夜间 → 夜间窗口
   - 都对不上 → 未识别特殊场景 (权重 1.00)
- confidence: 整体抽取置信度 (0-1, 一位小数), 字段都明确给 0.85+, 部分推断给 0.6-0.84, 都是猜的给 0.4-0.59

如果用户提到 "比对" / "排查" / "去重" / "多源" → 视为 Agent 2, 额外抽:
- dataSources: 数组, 取自 ["内部漏洞库", "威胁情报", "CVE", "CNNVD"]。用户没说默认 ["内部漏洞库", "CVE"]
- compareDims: 数组, 取自 ["cpe", "版本号", "组件指纹"]。默认 ["cpe", "版本号"]
- withPatch: bool, 是否结合补丁库, 默认 true

严格输出 JSON, 不要前言或代码块标记。`;

export async function POST(req: NextRequest): Promise<Response> {
  let body: ExtractInput;
  try {
    body = (await req.json()) as ExtractInput;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { query, agent = "a1" } = body;
  if (!query || typeof query !== "string") {
    return Response.json({ error: "query required" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(mockExtract(query, agent, "no-key"));
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
            content: `agent: ${agent}\nuser query: ${query}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      return Response.json(mockExtract(query, agent, `upstream HTTP ${upstream.status}`));
    }

    const data: unknown = await upstream.json();
    const content = extractContent(data);
    if (!content) return Response.json(mockExtract(query, agent, "empty content"));

    const parsed = safeParse(content);
    if (!parsed) return Response.json(mockExtract(query, agent, "json parse failed"));

    return Response.json({
      source: "ai" as const,
      model: "deepseek-chat",
      ...parsed,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return Response.json(mockExtract(query, agent, reason));
  }
}

// ── helpers ──────────────────────────────────────────────────

function extractContent(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? null;
}

function safeParse(raw: string): Omit<ExtractedParams, "source" | "model"> | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const o = JSON.parse(cleaned) as Record<string, unknown>;
    const sev = String(o.severity ?? "高危");
    const severity: "高危" | "中危" | "低危" =
      sev === "中危" || sev === "低危" ? sev : "高危";
    return {
      confidence: clamp(toNum(o.confidence, 0.7), 0, 1),
      assetScope: String(o.assetScope ?? "运营商核心业务线"),
      assetCount: typeof o.assetCount === "number" ? o.assetCount : undefined,
      severity,
      timeWindow: String(o.timeWindow ?? "近 30 天"),
      businessTag: String(o.businessTag ?? "日常巡检"),
      sceneWeight: clamp(toNum(o.sceneWeight, 1.0), 0.5, 1.5),
      dataSources: Array.isArray(o.dataSources) ? (o.dataSources as string[]) : undefined,
      compareDims: Array.isArray(o.compareDims) ? (o.compareDims as string[]) : undefined,
      withPatch: typeof o.withPatch === "boolean" ? o.withPatch : undefined,
    };
  } catch {
    return null;
  }
}

function toNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(n.toFixed(2))));
}

/** 简易 mock 兜底: 通过 query 关键词粗匹配 */
function mockExtract(query: string, agent: "a1" | "a2", note?: string): ExtractedParams {
  const q = query;
  let severity: ExtractedParams["severity"] = "高危";
  if (q.includes("中危")) severity = "中危";
  else if (q.includes("低危")) severity = "低危";

  // 场景权重表 v1 锁 5 类 (PRD v0.9 § 3.1.2)
  let businessTag = "未识别特殊场景";
  let sceneWeight = 1.0;
  if (q.includes("红蓝") || q.includes("对抗") || q.includes("演练") || q.includes("护网") || q.includes("红队")) {
    businessTag = "红蓝对抗前";
    sceneWeight = 1.2;
  } else if (
    q.includes("业务上线") ||
    q.includes("发版") ||
    q.includes("数据库上线") ||
    q.includes("系统上线") ||
    q.includes("上线前")
  ) {
    businessTag = "业务上线前";
    sceneWeight = 1.15;
  } else if (q.includes("合规") || q.includes("审计") || q.includes("等保") || q.includes("监管")) {
    businessTag = "合规审计前";
    sceneWeight = 1.1;
  } else if (q.includes("夜间")) {
    businessTag = "夜间窗口";
    sceneWeight = 1.05;
  }

  let timeWindow = "近 30 天";
  const m = q.match(/(\d+)\s*天/);
  if (m) timeWindow = `近 ${m[1]} 天`;
  if (q.includes("上线前")) timeWindow = "业务上线前 " + (m ? m[1] : "7") + " 天";
  if (q.includes("实时")) timeWindow = "实时";

  let assetScope = "运营商核心业务线";
  let assetCount: number | undefined = 142;
  const ipMatch = q.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:\/\d+)?)/);
  if (ipMatch) {
    assetScope = ipMatch[1];
    assetCount = ipMatch[1].includes("/") ? 32 : 1;
  } else if (q.includes("订单") || q.includes("CRM") || q.includes("crm")) {
    assetScope = "订单中心业务线";
    assetCount = 64;
  } else if (q.includes("Web") || q.includes("web")) {
    assetScope = "运营商 Web 资产组";
    assetCount = 86;
  }

  return {
    source: "mock",
    confidence: note ? 0.55 : 0.78,
    assetScope,
    assetCount,
    severity,
    timeWindow,
    businessTag,
    sceneWeight,
    dataSources:
      agent === "a2" ? (q.includes("CNNVD") ? ["内部漏洞库", "CVE", "CNNVD"] : ["内部漏洞库", "CVE"]) : undefined,
    compareDims: agent === "a2" ? ["cpe", "版本号"] : undefined,
    withPatch: agent === "a2" ? true : undefined,
  };
}
