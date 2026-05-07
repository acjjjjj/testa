/**
 * /api/rank — Agent 1 智能风险排序的 真 AI 端点
 *
 * 接 DeepSeek (OpenAI 兼容协议)
 * 输入: 候选漏洞清单 + 业务场景
 * 输出: 排好序的 RankedVuln[] (含 VPT 三维分 + 场景权重 + 综合分 + 排序原因)
 *
 * 行为:
 *   - DEEPSEEK_API_KEY 存在 → 真调大模型
 *   - 不存在 / 调用失败 → 兜底返回 mock 排序, 保证 demo 永不翻车
 */

import type { NextRequest } from "next/server";
import type { RankedVuln } from "@/types";

export const runtime = "edge";
export const maxDuration = 30;

type RankInput = {
  scenario?: string;
  items: Array<{
    cve: string;
    name: string;
    severity: string;
    desc: string;
    asset: string; // host / ip
  }>;
};

type RankOutput = {
  source: "ai" | "mock";
  model?: string;
  ranked: RankedVuln[];
  /** AI 给出的整体策略说明 */
  summary?: string;
};

const SYSTEM_PROMPT = `你是"鉴微 insight 哨兵 AI 助手 — Agent 1 智能风险排序"模块。

任务: 给定一组候选漏洞 (CVE 编号 + 名称 + 严重等级 + 描述 + 关联资产) 和当前业务场景, 按 VPT 三维加权 + 场景权重输出排序结果。

VPT 三维评分指南 (各维度 0-10):
- vptA (资产属性): 资产暴露面、业务关键程度、是否公网可达、是否堡垒/跳板
- vptV (漏洞属性): 利用复杂度低/EXP 公开/可 RCE/可达 root 给高分
- vptI (情报属性): 已观察到 PoC 武器化、勒索/APT 利用、供应链投毒给高分

基线分 base = 三维平均, 保留一位小数。

场景权重 sceneWeight (匹配业务场景给出, 取值 0.9-1.25):
- "红蓝对抗前" → 1.20 (PoC 武器化 / 公网暴露 / 横向移动跳板优先)
- "业务上线前" → 1.10 (合规审计向 / 配置类 / 鉴权类优先)
- "0day 应急" → 1.25 (情报维度高分 + 公网可达)
- "日常巡检" → 1.00
- "供应链审视" → 1.15
sceneTag 输出场景关键词, 只能从上面 5 个里选一个最匹配。

综合排序分 score = min(base × sceneWeight, 10), 保留一位小数。

desc 输出: 用 18-30 个汉字给出一句"为什么排这位"的中文理由, 必须基于本条的 vptA/V/I 维度+场景说服力, 简短直接。

严格输出 JSON object, 不要任何前言或代码块标记:
{
  "summary": "一句中文整体策略, 30-60 字, 解释场景识别和排序逻辑",
  "ranked": [
    {
      "cve": "CVE-xxxx-xxxxx",
      "name": "...",
      "asset": "<原样回传 host / ip>",
      "vptA": 数值,
      "vptV": 数值,
      "vptI": 数值,
      "base": 数值,
      "sceneWeight": 数值,
      "sceneTag": "红蓝对抗前 / 业务上线前 / 0day 应急 / 日常巡检 / 供应链审视 之一",
      "score": 数值,
      "desc": "排这位的中文理由"
    },
    ...
  ]
}

ranked 数组按 score 从高到低排序, 数量与输入一致。`;

export async function POST(req: NextRequest): Promise<Response> {
  let body: RankInput;
  try {
    body = (await req.json()) as RankInput;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { items, scenario = "运营商核心业务" } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "items required" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(mockRanking(items, scenario, "no-key"));
  }

  try {
    const userPayload =
      `业务场景: ${scenario}\n\n候选漏洞清单 (共 ${items.length} 条):\n` +
      items
        .map(
          (v, i) =>
            `${i + 1}. CVE=${v.cve} | 名称=${v.name} | 严重=${v.severity} | 资产=${v.asset} | 描述=${v.desc}`
        )
        .join("\n");

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
        max_tokens: 1500,
      }),
      // 22s upstream timeout, 留 3s 序列化兜底返回, Vercel Edge 25s 总预算内
      signal: AbortSignal.timeout(22000),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("[rank] deepseek http", upstream.status, text);
      return Response.json(mockRanking(items, scenario, "上游 HTTP " + upstream.status));
    }

    const data: unknown = await upstream.json();
    const content = extractContent(data);
    if (!content) {
      return Response.json(mockRanking(items, scenario, "上游响应为空"));
    }

    const parsed = safeParseRanking(content, items);
    if (!parsed) {
      return Response.json(mockRanking(items, scenario, "JSON 解析失败"));
    }

    const out: RankOutput = {
      source: "ai",
      model: "deepseek-chat",
      summary: parsed.summary,
      ranked: parsed.ranked,
    };
    return Response.json(out);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[rank] error", msg);
    return Response.json(mockRanking(items, scenario, "网络异常 " + msg));
  }
}

// ── helpers ────────────────────────────────────────────────────

function extractContent(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? null;
}

type RawRanked = Partial<RankedVuln> & { rk?: number };

function safeParseRanking(
  raw: string,
  items: RankInput["items"]
): { summary: string; ranked: RankedVuln[] } | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  let obj: { summary?: unknown; ranked?: unknown };
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const list = Array.isArray(obj.ranked) ? (obj.ranked as RawRanked[]) : null;
  if (!list || list.length === 0) return null;

  // 按 score 降序, 重新分配 rk
  const sorted = list
    .filter(
      (v): v is RawRanked & { cve: string; score: number } =>
        typeof v.cve === "string" && typeof v.score === "number"
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, items.length)
    .map<RankedVuln>((v, i) => ({
      rk: i + 1,
      cve: v.cve,
      name: String(v.name ?? findItem(items, v.cve)?.name ?? "(未知)"),
      asset: String(v.asset ?? findItem(items, v.cve)?.asset ?? ""),
      vptA: clamp(toNum(v.vptA), 0, 10),
      vptV: clamp(toNum(v.vptV), 0, 10),
      vptI: clamp(toNum(v.vptI), 0, 10),
      base: clamp(toNum(v.base), 0, 10),
      sceneWeight: clamp(toNum(v.sceneWeight, 1.0), 0.5, 1.5),
      sceneTag: String(v.sceneTag ?? "日常巡检"),
      score: clamp(toNum(v.score), 0, 10),
      desc: String(v.desc ?? findItem(items, v.cve)?.desc ?? ""),
    }));

  if (sorted.length === 0) return null;

  return {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    ranked: sorted,
  };
}

function findItem(items: RankInput["items"], cve: string) {
  return items.find((it) => it.cve === cve);
}

function toNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(n.toFixed(2))));
}

function mockRanking(items: RankInput["items"], scenario: string, note?: string): RankOutput {
  // 简易兜底: 按 severity 给一个粗排
  const sevScore: Record<string, number> = {
    critical: 9.0,
    high: 7.5,
    medium: 5.0,
    low: 3.0,
  };
  const ranked: RankedVuln[] = [...items]
    .sort((a, b) => (sevScore[b.severity] ?? 0) - (sevScore[a.severity] ?? 0))
    .map((it, i) => {
      const base = sevScore[it.severity] ?? 5;
      const sceneWeight = 1.1;
      return {
        rk: i + 1,
        cve: it.cve,
        name: it.name,
        asset: it.asset,
        vptA: base - 0.5,
        vptV: base + 0.3,
        vptI: base - 0.3,
        base,
        sceneWeight,
        sceneTag: scenario,
        score: clamp(base * sceneWeight, 0, 10),
        desc: it.desc,
      };
    });

  return {
    source: "mock",
    summary: note
      ? `mock 兜底 (${note}): 按严重等级粗排, 业务场景 ${scenario}`
      : `mock 兜底: 按严重等级粗排, 业务场景 ${scenario}`,
    ranked,
  };
}
