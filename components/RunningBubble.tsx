import * as React from "react";
import { Badge } from "./Badge";
import { WorkflowInline } from "./WorkflowInline";
import { runningLogFor } from "@/data/workflow.mock";
import { INLINE_STEPS, inlineStepIndexFor } from "@/lib/workflowState";
import type { AgentId, Stage } from "@/types";

export interface RunningBubbleProps {
  agent: AgentId;
  stage: Extract<Stage, "running" | "reflect" | "followup">;
}

/** 工作流推进中 / 反思中 / LUI 反问中 — 共用气泡头部 */
export function RunningBubble({ agent, stage }: RunningBubbleProps) {
  const log = runningLogFor(agent);
  return (
    <div className={`msg agent${agent === "a2" ? " a2" : ""}`}>
      <div className="av">{agent === "a1" ? "A1" : "A2"}</div>
      <div className="body">
        <div className="who">
          <b>{agent === "a1" ? "智能风险排序" : "智能风险排查比对"}</b>
          {stage === "reflect" ? (
            <Badge tone="amber">反思校验中</Badge>
          ) : stage === "followup" ? (
            <Badge tone="amber">LUI 反问中</Badge>
          ) : (
            <Badge tone="blue">执行中</Badge>
          )}
          <span className="dim2 mono">参数已确认 · 工作流推进</span>
        </div>

        <WorkflowInline steps={INLINE_STEPS} current={inlineStepIndexFor(stage)} />

        {stage === "running" && (
          <div className="card" style={{ background: "var(--bg-2)" }}>
            <div className="cb" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              {log.map((row) => (
                <div
                  key={row.ts}
                  className={row.emphasize ? "em" : "dim"}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  {row.emphasize ? (
                    <>
                      <span className="live-dot" />
                      <span className="shimmer">{row.text}</span>
                    </>
                  ) : (
                    <>
                      <span className="mono dim2">{row.ts}</span>
                      <span>{row.text}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === "reflect" && (
          <div className="text dim" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="live-dot" />
            <span className="shimmer">反思校验中 · 覆盖率 + 一致性 0 容忍口径 …</span>
          </div>
        )}
      </div>
    </div>
  );
}
