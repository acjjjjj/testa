import * as React from "react";
import type { AbnormalKind } from "@/types";

const MAP: Record<Exclude<AbnormalKind, "none">, { tone: "warn" | "danger"; t: string; p: string; x: string }> = {
  timeout: {
    tone: "warn",
    t: "数据接口超时, 已重试 3 次仍失败",
    p: "鉴微 insight 数据接口连续 3 次返回 timeout, 当前工作流已中止。 已保留你的 query 与 LUI 参数, 可点击稍后重试。",
    x: "api_retry_limit = 3 · trace_id 7d2-4ab9",
  },
  patch: {
    tone: "warn",
    t: "补丁库接口暂不可用, 已降级跳过",
    p: "本次结果不含补丁状态字段, 命中漏洞补丁状态统一填 \"未查询\"。 主流程继续, 不阻塞比对结果。",
    x: "4.4.7 降级 · patch_unavailable=true",
  },
  partial: {
    tone: "warn",
    t: "反思校验 3 次未达标, 输出 partial 结果",
    p: "已处理 134 / 142 条, 8 条进入跳过清单 (无访问权限 5 / 接口失败 3)。 结果仅供排查, 不允许写回风险排查模块。",
    x: "reflection_retry_limit = 3 · partial=true",
  },
  budget: {
    tone: "warn",
    t: "反问预算已用完, 剩余进入待审核清单",
    p: "本轮 5 次 LUI 反问已用完, 后续 3 对中置信命中不再弹窗, 已统一进入待审核清单, 等待你手动复核。",
    x: "lui_followup_budget = 5 · queued = 3",
  },
};

export interface AbnormalAlertProps {
  kind: AbnormalKind;
}

/** 异常路径降级反馈卡片 */
export function AbnormalAlert({ kind }: AbnormalAlertProps) {
  if (kind === "none") return null;
  const c = MAP[kind];
  return (
    <div className={`alert ${c.tone === "warn" ? "warn" : ""}`}>
      <div className="ic">!</div>
      <div className="body-text">
        <div className="t">{c.t}</div>
        <p>{c.p}</p>
        <div className="x">{c.x}</div>
      </div>
    </div>
  );
}
