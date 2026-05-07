"use client";

import * as React from "react";
import { useDemoStore } from "@/lib/store";
import { Badge } from "./Badge";
import { Domain, Node } from "./Domain";
import { Icon } from "./Icon";
import {
  planningStepsFor,
  executionStepsFor,
  toolCallsFor,
} from "@/data/workflow.mock";
import { phaseFor } from "@/lib/workflowState";

/**
 * 右侧 Workflow 状态可视化 — 6 域骨架:
 * UI / Planning / Execution / Tools (sidetracked) / Reflection / Final response
 */
export function WorkflowStatus() {
  const { state } = useDemoStore();
  const { agent, stage } = state;
  const phase = phaseFor(stage);

  const planning = planningStepsFor(agent);
  const execution = executionStepsFor(agent);
  const tools = toolCallsFor(agent);

  const isDone = phase === "done";
  const inReflect = phase === "reflect";
  const inExec = phase === "execution";
  const inPlan = phase === "planning";

  // 节点状态: planning 全部 done 当 phase 至少到 execution; execution 在 phase=execution 时 active
  const planStatus = (i: number): "done" | "active" | "pending" => {
    if (phase === "idle") return "pending";
    if (phase === "planning") return i === 0 ? "active" : "pending";
    return "done";
  };
  const execStatus = (i: number): "done" | "active" | "pending" => {
    if (isDone) return "done";
    if (!inExec) return "pending";
    return i === 0 ? "active" : i === 1 ? "active" : "pending";
  };

  return (
    <aside className="right-pane" style={asideStyle}>
      <div style={hdStyle}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Workflow 状态</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>
            {agent === "a1" ? "agent 1 · 智能风险排序" : "agent 2 · 智能风险排查比对"}
          </div>
        </div>
        {!isDone ? <span className="live-dot" /> : <Badge tone="mint">完成</Badge>}
      </div>
      <div style={bodyStyle}>
        <Domain name="UI" ix="ui" status="done">
          <Node status="done">user query</Node>
          <Node status={phase !== "idle" ? "done" : "active"}>lui 参数卡片</Node>
        </Domain>

        <Domain name="Planning" ix="p" status={inPlan ? "active" : phase === "idle" ? "pending" : "done"}>
          {planning.map((s, i) => (
            <Node
              key={i}
              status={planStatus(i)}
              meta={i === 0 ? "主控大模型" : i === 1 ? "权限层" : "规划"}
            >
              <span className="mono dim2" style={{ marginRight: 6 }}>
                p{i + 1}
              </span>
              {s}
            </Node>
          ))}
        </Domain>

        <Domain
          name="Execution"
          ix="e"
          status={inExec ? "active" : isDone ? "done" : "pending"}
        >
          {execution.map((s, i) => (
            <Node key={i} status={execStatus(i)}>
              {s}
            </Node>
          ))}
          <Node status={isDone ? "done" : "pending"}>
            <span className="dim2">是否完毕 · 决策</span>
          </Node>
        </Domain>

        <Domain name="Tools" ix="t" status="pending">
          {tools.map((t) => (
            <Node
              key={t.tn}
              tool
              status={isDone || inExec ? "done" : "pending"}
              meta={<span>{t.rt}</span>}
            >
              {t.tn}
            </Node>
          ))}
        </Domain>

        <Domain
          name="Reflection"
          ix="r"
          status={inReflect ? "active" : isDone ? "done" : "pending"}
        >
          <Node status={isDone ? "done" : inReflect ? "active" : "pending"}>
            覆盖率检查 <span className="meta mono">{isDone ? "0 / 142 漏" : "…"}</span>
          </Node>
          <Node status={isDone ? "done" : inReflect ? "active" : "pending"}>
            一致性检查 <span className="meta mono">{isDone ? "pass" : "…"}</span>
          </Node>
          <Node status={isDone ? "done" : "pending"}>
            <span className="dim2">是否达标 · 决策</span>
          </Node>
        </Domain>

        <Domain name="Final response" ix="f" status={isDone ? "done" : "pending"}>
          <Node status={isDone ? "done" : "pending"}>包装结果交付 UI</Node>
        </Domain>

        <div className="conf">
          <span className="l">综合置信度</span>
          <span className="b">
            <i style={{ width: isDone ? "88%" : "62%" }} />
          </span>
          <span className="v">{isDone ? "0.88" : "0.62"}</span>
        </div>

        <div className="sp-12" />
        <div className="card" style={{ background: "transparent", border: "1px solid var(--line)" }}>
          <div className="ch" style={{ padding: "10px 12px" }}>
            <div className="t" style={{ fontSize: 11.5 }}>
              <Icon name="flow" size={12} />
              <span>工具调用记录</span>
            </div>
            <span className="meta mono dim2">{isDone ? `${tools.length} 次` : "进行中"}</span>
          </div>
          <div className="cb" style={{ padding: "4px 12px 10px" }}>
            {tools.map((t) => (
              <div key={t.tn} className="tool-row">
                <span className="tn">{t.tn}</span>
                <span className="ar">{t.ar}</span>
                <span className="rt">{t.rt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

const asideStyle: React.CSSProperties = {
  background: "var(--bg-1)",
  borderLeft: "1px solid var(--line)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};
const hdStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid var(--line)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const bodyStyle: React.CSSProperties = {
  padding: "14px 14px 22px",
  overflowY: "auto",
  flex: 1,
  minHeight: 0,
};
