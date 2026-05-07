"use client";

import * as React from "react";
import { Icon } from "./Icon";
import type { Stage, AgentId } from "@/types";

export interface BottomComposerProps {
  stage: Stage;
  agent: AgentId;
  onPickAgent: (agent: AgentId) => void;
}

/** 底部输入框 + 引用资产 / agent 切换 chip */
export function BottomComposer({ stage, agent, onPickAgent }: BottomComposerProps) {
  const placeholder =
    stage === "welcome"
      ? "输入需求, 例如 \"排序 xxx 业务线高危漏洞\" 或 \"192.168.1.1 多源漏洞清洗\""
      : "继续追问, 或切换到另一个 agent — 主控会带上当前上下文";
  return (
    <div style={footerStyle}>
      <div style={composerStyle}>
        <textarea
          placeholder={placeholder}
          style={textareaStyle}
          aria-label="输入框"
        />
        <div style={rowStyle}>
          <div style={leftToolsStyle}>
            <button style={chipStyle} title="从资产清单中选择">
              <Icon name="plus" size={12} /> 引用资产
            </button>
            <button
              style={chipStyle}
              data-active={agent === "a1"}
              onClick={() => onPickAgent("a1")}
              title="切到智能风险排序"
            >
              <Icon name="wand" size={12} /> agent 1
            </button>
            <button
              style={chipStyle}
              data-active={agent === "a2"}
              onClick={() => onPickAgent("a2")}
              title="切到智能风险排查比对"
            >
              <Icon name="wand" size={12} /> agent 2
            </button>
          </div>
          <div style={{ ...leftToolsStyle, gap: 10 }}>
            <span style={{ color: "var(--fg-3)", fontSize: 11 }}>
              主控: 问津大模型 · 上下文 5 / 32k
            </span>
            <button style={sendStyle}>
              <Icon name="send" size={12} /> 发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const footerStyle: React.CSSProperties = {
  padding: "12px 24px 16px",
  borderTop: "1px solid var(--line)",
  background: "var(--bg-0)",
  flexShrink: 0,
};
const composerStyle: React.CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  background: "var(--bg-2)",
  border: "1px solid var(--line-2)",
  borderRadius: 14,
  padding: "10px 12px 10px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  boxShadow: "0 4px 20px rgba(0,0,0,.25)",
};
const textareaStyle: React.CSSProperties = {
  background: "transparent",
  border: 0,
  outline: 0,
  color: "var(--fg)",
  resize: "none",
  font: "inherit",
  width: "100%",
  minHeight: 36,
  maxHeight: 120,
  lineHeight: 1.5,
  fontFamily: "var(--font-sans)",
  fontSize: 13,
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
};
const leftToolsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "var(--fg-2)",
  fontSize: 11.5,
  flexWrap: "wrap",
};
const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 8px",
  borderRadius: 7,
  border: "1px solid var(--line)",
  background: "var(--bg-3)",
  color: "var(--fg-1)",
  fontSize: 11,
  cursor: "pointer",
};
const sendStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--fg)",
  color: "#0b0d11",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: ".01em",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
};
