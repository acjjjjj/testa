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
import { checkAccess, blockResponse } from "../_lib/guard";
import { extractContent, clamp, toNum, stripCodeFence } from "../_lib/helpers";
import { SCENE_WEIGHTS } from "@/lib/scoring";

export const runtime = "edge";
export const maxDuration = 25;

type ExtractInput = {
  query: string;
  agent?: "a1" | "a2";
};

export type ExtractedParams = {
  source: "ai" | "mock";
  model?: string;
  /** 意图分类: a1/a2 = 任务进 agent 流程, chat = 闲聊只回文字 */
  intent: "a1" | "a2" | "chat";
  /** 仅 intent=chat 时填: AI 直接给的中文回复 */
  reply?: string;
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

const SYSTEM_PROMPT = `你是"鉴微 insight 哨兵 AI 助手"的意图分类 + LUI 参数抽取模块。

第一步 - 意图分类 (intent):
判断用户 query 类型, 必须输出以下三类之一:
- "a1": 漏洞排序 / 优先级 / 处置顺序 相关任务 (例: "排序订单中心高危漏洞" / "vpt 加权排序" / "前 10 条优先处置")
- "a2": 漏洞排查 / 多源比对 / 去重 / 补丁联动 相关任务 (例: "对 192.168.1.1 多源漏洞清洗" / "组件 log4j 命中范围" / "和 CNNVD 对比")
- "chat": 闲聊 / 问候 / 一般性问题 / 帮助类 / 跟漏洞运营任务无关 (例: "你好" / "哨兵能干啥" / "今天有什么大新闻" / "帮我总结一下" / "什么是 vpt 模型")

判断规则:
- 必须明确提到资产 / 漏洞 / 排序 / 排查 / 比对 / 命中 / 补丁 等漏洞运营关键词, 才算 a1 或 a2
- 否则一律归 chat (宁可多归 chat 也不要把闲聊误判成任务)

第二步 - 输出 (按 intent 分支):

如果 intent="chat":
  严格输出 { "intent": "chat", "reply": "中文回复 50-200 字" }
  reply 要求:
  - 第一人称是"哨兵 AI 助手"
  - 如果用户问"能干啥" / "怎么用", 主动介绍 v1 demo 接通的 5 个 AI 端点 (LUI 参数抽取 / VPT 加权排序 / 后续动作建议 / 大模型相似度判断 / 比对结果汇总)
  - 如果用户问 vpt / 反思校验 / lui 反问 等专业概念, 给一句话简要解释
  - 如果是问候 / 闲聊, 简短回应 + 引导到 demo 主流程 (例: "试试在输入框输入'排序订单中心高危漏洞'")
  - 不要装"我是 AI 不能回答这个", 在哨兵 demo 范围内大方回答

如果 intent="a1" 或 "a2":
  按下方规则抽取 LUI 参数, JSON 里加 intent 字段后输出全部参数

抽取字段 (仅 intent=a1 或 a2 时):
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
  const guard = checkAccess(req);
  if (!guard.ok) return blockResponse(guard);

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
    return Response.json({ ...mockExtract(query, agent, "no-key"), __debug: "no-key (DEEPSEEK_API_KEY 未在 Vercel 环境变量配置)" });
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
      signal: AbortSignal.timeout(22000),
    });

    if (!upstream.ok) {
      const reason = `upstream HTTP ${upstream.status}`;
      const errBody = await upstream.text().catch(() => "");
      return Response.json({ ...mockExtract(query, agent, reason), __debug: `${reason}: ${errBody.slice(0, 200)}` });
    }

    const data: unknown = await upstream.json();
    const content = extractContent(data);
    if (!content) return Response.json({ ...mockExtract(query, agent, "empty content"), __debug: "DeepSeek 返回了响应但 content 为空" });

    const parsed = safeParse(content);
    if (!parsed) return Response.json({ ...mockExtract(query, agent, "json parse failed"), __debug: `json parse failed: ${content.slice(0, 200)}` });

    return Response.json({
      source: "ai" as const,
      model: "deepseek-chat",
      ...parsed,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return Response.json({ ...mockExtract(query, agent, reason), __debug: `网络异常: ${reason}` });
  }
}

// ── helpers (端点专属 — 跨端点共用的见 ../_lib/helpers.ts) ──────────────────

function safeParse(raw: string): Omit<ExtractedParams, "source" | "model"> | null {
  const cleaned = stripCodeFence(raw);
  try {
    const o = JSON.parse(cleaned) as Record<string, unknown>;
    const intentRaw = String(o.intent ?? "a1");
    const intent: "a1" | "a2" | "chat" =
      intentRaw === "chat" || intentRaw === "a2" ? intentRaw : "a1";

    // chat 分支只需要 reply, 其它字段填默认值占位
    if (intent === "chat") {
      return {
        intent: "chat",
        reply: typeof o.reply === "string" ? o.reply : "我没太明白你的意思, 可以试试在输入框输入 '排序订单中心高危漏洞' 看看 demo 效果。",
        confidence: 1,
        assetScope: "",
        severity: "高危",
        timeWindow: "",
        businessTag: "",
        sceneWeight: 1.0,
      };
    }

    const sev = String(o.severity ?? "高危");
    const severity: "高危" | "中危" | "低危" =
      sev === "中危" || sev === "低危" ? sev : "高危";
    return {
      intent,
      confidence: clamp(toNum(o.confidence, 0.7), 0, 1),
      assetScope: String(o.assetScope ?? "运营商核心业务线"),
      assetCount: typeof o.assetCount === "number" ? o.assetCount : undefined,
      severity,
      timeWindow: String(o.timeWindow ?? "近 30 天"),
      businessTag: String(o.businessTag ?? "未识别特殊场景"),
      sceneWeight: clamp(toNum(o.sceneWeight, 1.0), 0.5, 1.5),
      dataSources: Array.isArray(o.dataSources) ? (o.dataSources as string[]) : undefined,
      compareDims: Array.isArray(o.compareDims) ? (o.compareDims as string[]) : undefined,
      withPatch: typeof o.withPatch === "boolean" ? o.withPatch : undefined,
    };
  } catch {
    return null;
  }
}

/** 简易 mock 兜底: 通过 query 关键词粗匹配 + chat 意图启发式 */
function mockExtract(query: string, agent: "a1" | "a2", note?: string): ExtractedParams {
  const q = query;

  // chat 意图启发式: 没有任何漏洞运营关键词就当 chat
  const TASK_KEYWORDS = [
    "排序", "优先", "处置", "排查", "比对", "命中", "去重", "清洗", "合并",
    "漏洞", "cve", "CVE", "资产", "补丁", "vpt", "VPT", "高危", "中危", "低危",
    "业务线", "组件", "指纹", "情报", "威胁", "暴露",
  ];
  const looksLikeTask = TASK_KEYWORDS.some((k) => q.includes(k));
  if (!looksLikeTask) {
    return {
      source: "mock",
      intent: "chat",
      reply: chatReplyMock(q),
      confidence: 1,
      assetScope: "",
      severity: "高危",
      timeWindow: "",
      businessTag: "",
      sceneWeight: 1.0,
    };
  }

  let severity: ExtractedParams["severity"] = "高危";
  if (q.includes("中危")) severity = "中危";
  else if (q.includes("低危")) severity = "低危";

  // 场景权重表 v1 锁 5 类 (PRD v0.9 § 3.1.2) — 权重值统一从 lib/scoring.ts SCENE_WEIGHTS 查
  let businessTag = "未识别特殊场景";
  if (q.includes("红蓝") || q.includes("对抗") || q.includes("演练") || q.includes("护网") || q.includes("红队")) {
    businessTag = "红蓝对抗前";
  } else if (
    q.includes("业务上线") ||
    q.includes("发版") ||
    q.includes("数据库上线") ||
    q.includes("系统上线") ||
    q.includes("上线前")
  ) {
    businessTag = "业务上线前";
  } else if (q.includes("合规") || q.includes("审计") || q.includes("等保") || q.includes("监管")) {
    businessTag = "合规审计前";
  } else if (q.includes("夜间")) {
    businessTag = "夜间窗口";
  }
  const sceneWeight = SCENE_WEIGHTS[businessTag] ?? 1.0;

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

  // 任务模式: 用 query 关键词推断 a1/a2 (跟前端的 keyword 匹配规则一致)
  const inferredIntent: "a1" | "a2" =
    q.includes("比对") || q.includes("清洗") || q.includes("去重") || q.includes("合并") ? "a2" : "a1";

  return {
    source: "mock",
    intent: inferredIntent,
    confidence: note ? 0.55 : 0.78,
    assetScope,
    assetCount,
    severity,
    timeWindow,
    businessTag,
    sceneWeight,
    dataSources:
      inferredIntent === "a2" ? (q.includes("CNNVD") ? ["内部漏洞库", "CVE", "CNNVD"] : ["内部漏洞库", "CVE"]) : undefined,
    compareDims: inferredIntent === "a2" ? ["cpe", "版本号"] : undefined,
    withPatch: inferredIntent === "a2" ? true : undefined,
  };
}

/** chat 兜底回复 (无 key / AI 失败时启发式拼一句) */
function chatReplyMock(q: string): string {
  if (/你好|hi|hello|哈喽|嗨/i.test(q)) {
    return "你好, 我是 哨兵 AI 助手. 我能帮你做两件事: ①给指定范围漏洞做智能优先级排序 (Agent 1), ②做多源漏洞比对 + 去重 + 补丁联动 (Agent 2). 试试输入 '排序订单中心高危漏洞 业务上线前 7 天' 看效果。";
  }
  if (q.includes("能干") || q.includes("能做") || q.includes("怎么用") || q.includes("用法") || q.includes("介绍")) {
    return "v1 demo 接通了 5 个 DeepSeek 实时端点: ①LUI 参数智能抽取 ②VPT 三维加权 + 场景识别排序 ③后续动作建议 ④多源漏洞相似度判断 ⑤比对结果汇总 + 反思校验. 你直接发任务 query (例: '排序运营商核心业务线高危漏洞') 就能看完整流程。";
  }
  if (q.includes("vpt") || q.includes("VPT")) {
    return "VPT 是鉴微 insight 的漏洞优先级模型, 三维: 资产属性 (是否公网 / 业务关键) + 漏洞属性 (利用难度 / 影响) + 情报属性 (PoC 武器化 / 在野利用). v1 demo 在 VPT 基线分基础上加场景权重做局部排序, 综合分上限锁 10。";
  }
  if (q.includes("反思") || q.includes("reflection")) {
    return "反思校验是 PRD § 2.3 锁定的运行时校验, 0 容忍口径. 三层覆盖率检查 (资产覆盖率 / 原始漏洞处理率 / 候选对处理率) + 一致性检查 (必填字段 0 容忍). 不达标自动重跑, 上限 reflection_retry_limit 默认 3 次。";
  }
  if (q.includes("反问") || q.includes("lui")) {
    return "LUI 反问是 Agent 2 在 90% ≤ 相似度 < 95% 中置信区间触发的人工确认机制. 单工作流预算默认 5 次, 超额进入待审核清单不自动合并. 阈值落在配置中心。";
  }
  return "我没太明白. 试试发个具体任务, 例如 '排序订单中心高危漏洞' 或 '对 192.168.1.1 多源漏洞清洗', 这两类我能进 Agent 流程跑通。";
}
