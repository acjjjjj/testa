import type { AgentId, WorkflowToolCall } from "@/types";

/**
 * Workflow 阶段 (PRD 7.x 阶段泳道版):
 * UI → Planning (p1..pN) → Execution → Tools (sidetracked) → Reflection → Final response
 */
export const A1_PLANNING_STEPS = [
  "解析 query 抽取参数",
  "参数与权限校验",
  "制定执行计划",
];
export const A1_EXECUTION_STEPS = [
  "调用数据接口",
  "vpt 三维加权",
  "大模型场景识别",
  "生成排序与排序原因",
];
export const A2_PLANNING_STEPS = [
  "解析 query 抽取参数",
  "参数与权限校验",
  "制定执行计划",
];
export const A2_EXECUTION_STEPS = [
  "并行调用资产指纹 / 多源漏洞",
  "指纹 × 版本碰撞",
  "候选收敛 (cve/cpe/厂商)",
  "大模型相似度判断",
  "LUI 反问中置信对",
  "补丁库 cve 等值查询",
];

/** 运行时进度日志 (mock 时间戳, 仅用于演示气氛) */
export const A1_RUNNING_LOG: Array<{ ts: string; text: string; emphasize?: boolean }> = [
  { ts: "10:42:03", text: "解析 query · 抽取 4 个参数, 1 项置信度低" },
  { ts: "10:42:05", text: "权限校验通过 · 142 资产可访问" },
  { ts: "10:42:07", text: "insight.vulns.list → 拉取 142 条高危漏洞" },
  { ts: "10:42:09", text: "vpt.score.calc → 142 × 3 维基线分" },
  { ts: "10:42:11", text: "大模型场景识别 · 已识别 \"业务上线前\" + \"红蓝对抗前\"…", emphasize: true },
];

export const A2_RUNNING_LOG: Array<{ ts: string; text: string; emphasize?: boolean }> = [
  { ts: "10:42:03", text: "解析 query · 资产范围已展开 64 资产" },
  { ts: "10:42:06", text: "并行拉取 资产指纹 + 内部漏洞库 + 威胁情报 + CVE" },
  { ts: "10:42:11", text: "指纹 × 漏洞库碰撞 → 588 初步命中" },
  { ts: "10:42:13", text: "候选收敛 (cpe + 厂商 + 版本范围) → 482 对入大模型" },
  { ts: "10:42:18", text: "大模型相似度判断 · 已处理 318 / 482 对…", emphasize: true },
];

/** 工具调用记录 (mock) */
export const A1_TOOL_CALLS: WorkflowToolCall[] = [
  { tn: "insight.vulns.list", ar: "→ 142 条", rt: "1.8s" },
  { tn: "vpt.score.calc",     ar: "→ 142 × 3", rt: "0.7s" },
  { tn: "deepseek.chat.infer",   ar: "→ 场景识别", rt: "0.9s" },
];
export const A2_TOOL_CALLS: WorkflowToolCall[] = [
  { tn: "insight.assets.fingerprint", ar: "→ 64 资产", rt: "2.1s" },
  { tn: "insight.vulns.list",         ar: "→ 588 命中", rt: "1.5s" },
  { tn: "cve.match.bulk",             ar: "→ 482 候选对", rt: "3.4s" },
  { tn: "patch.cve.lookup",           ar: "→ 412 → 2 暂无 / 1 待发布", rt: "2.6s" },
  { tn: "deepseek.chat.infer",           ar: "→ 相似度 × 482 对", rt: "7.2s" },
];

export function planningStepsFor(agent: AgentId) {
  return agent === "a1" ? A1_PLANNING_STEPS : A2_PLANNING_STEPS;
}
export function executionStepsFor(agent: AgentId) {
  return agent === "a1" ? A1_EXECUTION_STEPS : A2_EXECUTION_STEPS;
}
export function toolCallsFor(agent: AgentId) {
  return agent === "a1" ? A1_TOOL_CALLS : A2_TOOL_CALLS;
}
export function runningLogFor(agent: AgentId) {
  return agent === "a1" ? A1_RUNNING_LOG : A2_RUNNING_LOG;
}
