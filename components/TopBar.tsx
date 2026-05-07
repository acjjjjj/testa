"use client";

import * as React from "react";
import { Icon } from "./Icon";
import { ConfigPanel } from "./ConfigPanel";
import type { AgentId, Stage } from "@/types";

export interface TopBarProps {
  agent: AgentId;
  stage: Stage;
}

/** 顶部面包屑 + session 状态 + 配置中心入口 */
export function TopBar({ agent, stage }: TopBarProps) {
  const isWelcome = stage === "welcome";
  const title = isWelcome ? "新对话" : agent === "a1" ? "智能风险排序" : "智能风险排查比对";
  const [configOpen, setConfigOpen] = React.useState(false);

  return (
    <div style={topbarStyle}>
      <div style={crumbStyle}>
        <Icon name="sentry" size={14} />
        <span>哨兵</span>
        <span className="dim2">/</span>
        <b style={{ color: "var(--fg)", fontWeight: 600 }}>{title}</b>
        {!isWelcome && (
          <span className="pill">
            <span className="dot" />
            session mGqA-31f
          </span>
        )}
      </div>
      <div style={rightStyle}>
        <span className="mono dim2">v1.0 · 评审版</span>
        <button
          className="pill"
          style={configBtnStyle}
          onClick={() => setConfigOpen(true)}
          title="查看 v1 demo 当前生效的阈值 / 模型 / 端点"
        >
          <Icon name="cog" size={10} /> 配置中心
        </button>
      </div>
      <ConfigPanel open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  );
}

const topbarStyle: React.CSSProperties = {
  height: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 18px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg-0)",
  flexShrink: 0,
};
const crumbStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "var(--fg-2)",
  fontSize: 12,
};
const rightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "var(--fg-2)",
  fontSize: 12,
};
const configBtnStyle: React.CSSProperties = {
  background: "var(--bg-3)",
  border: "1px solid var(--line-2)",
  color: "var(--fg-1)",
  cursor: "pointer",
  font: "inherit",
};
