import * as React from "react";
import { Icon } from "./Icon";
import type { AgentId, Stage } from "@/types";

export interface TopBarProps {
  agent: AgentId;
  stage: Stage;
}

/** 顶部面包屑 + session 状态 */
export function TopBar({ agent, stage }: TopBarProps) {
  const isWelcome = stage === "welcome";
  const title = isWelcome ? "新对话" : agent === "a1" ? "智能风险排序" : "智能风险排查比对";
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
        <span className="pill" style={{ cursor: "default" }}>
          <Icon name="cog" size={10} /> 配置中心
        </span>
      </div>
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
