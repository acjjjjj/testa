import type { Stage, AgentId } from "@/types";

/**
 * 把 stage 映射到 workflow 推进的索引 (用于阶段泳道节点高亮)。
 *
 * 返回值:
 *   - 'idle'    welcome / lui — 未开始
 *   - 'planning'  正在执行 planning 步骤
 *   - 'execution' 正在执行 execution 步骤
 *   - 'reflect'   反思校验
 *   - 'done'      已交付
 */
export type WorkflowPhase = "idle" | "planning" | "execution" | "reflect" | "done";

export function phaseFor(stage: Stage): WorkflowPhase {
  switch (stage) {
    case "welcome":
    case "lui":
      return "idle";
    case "running":
      return "execution";
    case "reflect":
      return "reflect";
    case "followup":
      return "execution"; // followup 阶段 execution 还没结束
    case "final":
    case "handoff":
    case "writeback-done":
      return "done";
    default:
      return "idle";
  }
}

/**
 * 把 stage 映射到顶部 wf-inline 的"6 步胶囊"中的当前 step 索引。
 * 顺序: 参数确认 → planning → execution → tools → reflection → final response
 */
export function inlineStepIndexFor(stage: Stage): number {
  switch (stage) {
    case "lui":
      return 0;
    case "running":
      return 2;
    case "followup":
      return 3;
    case "reflect":
      return 4;
    case "final":
    case "handoff":
    case "writeback-done":
      return 5;
    default:
      return 0;
  }
}

export const INLINE_STEPS = ["参数确认", "planning", "execution", "tools", "reflection", "final response"];

export function isFinalStage(stage: Stage): boolean {
  return stage === "final" || stage === "writeback-done";
}

export function showsRightPane(stage: Stage): boolean {
  return stage !== "welcome" && stage !== "lui";
}

export function defaultUserQueryFor(agent: AgentId): string {
  return agent === "a1"
    ? "排序 运营商核心业务线 在重要业务上线前的所有高危漏洞, 红蓝对抗演练前需要紧急处置的优先靠前。"
    : "对 组织结构 / 订单中心 下所有资产做多源漏洞清洗合并, 用 内部漏洞库 + 威胁情报 + cve, 结合补丁库。";
}
