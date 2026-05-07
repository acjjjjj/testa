"use client";

import * as React from "react";
import { Icon } from "./Icon";
import { Dropdown } from "./Dropdown";
import type { Stage, AgentId } from "@/types";

export interface BottomComposerProps {
  stage: Stage;
  agent: AgentId;
  /** 切换当前 agent (不发送) */
  onPickAgent: (agent: AgentId) => void;
  /** 发送文本 query 启动指定 agent (text 必须非空) */
  onSubmitQuery: (text: string, agent: AgentId) => void;
}

/** 底部输入框 + 引用资产 / agent 切换 chip / 发送 */
export function BottomComposer({ stage, agent, onPickAgent, onSubmitQuery }: BottomComposerProps) {
  const [text, setText] = React.useState("");
  const placeholder =
    stage === "welcome"
      ? "输入需求, 例如 \"排序订单中心高危漏洞\" 或 \"对 192.168.1.1 多源漏洞清洗\""
      : "继续追问, 或切换到另一个 agent — 主控会带上当前上下文";

  const sendWith = (a: AgentId) => {
    const t = text.trim();
    if (!t) return;
    onSubmitQuery(t, a);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送, Shift+Enter 换行
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendWith(agent);
    }
  };

  // 引用资产候选 (mock 预设)
  const ASSET_REFS: Array<{ ref: string; hint: string }> = [
    { ref: "@order-svc-prod-07 (10.42.18.7)", hint: "订单服务 · 业务上线前重点" },
    { ref: "@edge-gw-bj-03 (10.42.2.21)", hint: "边缘网关 · 公网暴露" },
    { ref: "@crm-web-04 (172.20.4.18)", hint: "CRM Web · 重要业务系统" },
    { ref: "@k8s-node-prod-12 (10.42.5.31)", hint: "Kubernetes 节点 · 生产" },
    { ref: "@jumphost-sh-01 (10.42.0.19)", hint: "运维跳板机 · 红蓝对抗" },
    { ref: "@cicd-jenkins-bj-02 (10.42.40.28)", hint: "Jenkins · 供应链审视" },
  ];
  // 选中一条资产 → 替换文本里的旧引用, 保持主体文字
  const insertAssetRef = (next: string) => {
    setText((t) => {
      const stripped = t.replace(/@[\w-]+ \([^)]+\)/g, "").replace(/\s{2,}/g, " ").trim();
      return stripped ? `${stripped} ${next}` : `排序 ${next} 上的高危漏洞`;
    });
  };
  // 当前文本里已经引用的资产 (用于在菜单里高亮)
  const currentAssetRef = (text.match(/@[\w-]+ \([^)]+\)/) || [])[0] ?? "";

  const canSend = text.trim().length > 0;

  return (
    <div style={footerStyle}>
      <div style={composerStyle}>
        <textarea
          placeholder={placeholder}
          style={textareaStyle}
          aria-label="输入框"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div style={rowStyle}>
          <div style={leftToolsStyle}>
            <Dropdown
              triggerClassName=""
              triggerStyle={chipStyle}
              menuWidth={300}
              placement="top"
              title="选一个资产引用 (mock)"
              value={currentAssetRef}
              onPick={insertAssetRef}
              options={ASSET_REFS.map((a) => ({
                label: a.ref,
                hint: a.hint,
                value: a.ref,
              }))}
            >
              <Icon name="plus" size={12} /> 引用资产
            </Dropdown>
            <button
              style={{ ...chipStyle, ...(agent === "a1" ? activeChipStyle : null) }}
              data-active={agent === "a1"}
              onClick={() => (canSend ? sendWith("a1") : onPickAgent("a1"))}
              title={canSend ? "用当前文本启动 Agent 1" : "切到智能风险排序"}
            >
              <Icon name="wand" size={12} /> agent 1
            </button>
            <button
              style={{ ...chipStyle, ...(agent === "a2" ? activeChipStyle : null) }}
              data-active={agent === "a2"}
              onClick={() => (canSend ? sendWith("a2") : onPickAgent("a2"))}
              title={canSend ? "用当前文本启动 Agent 2" : "切到智能风险排查比对"}
            >
              <Icon name="wand" size={12} /> agent 2
            </button>
          </div>
          <div style={{ ...leftToolsStyle, gap: 10 }}>
            <span style={{ color: "var(--fg-3)", fontSize: 11 }}>
              主控: 问津大模型 · 上下文 5 / 32k
            </span>
            <button
              style={{ ...sendStyle, opacity: canSend ? 1 : 0.45, cursor: canSend ? "pointer" : "not-allowed" }}
              onClick={() => sendWith(agent)}
              disabled={!canSend}
              title={canSend ? "发送 (Enter)" : "请先输入需求"}
            >
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
const activeChipStyle: React.CSSProperties = {
  background: "color-mix(in oklab, var(--blue) 20%, var(--bg-3))",
  color: "var(--fg)",
  borderColor: "color-mix(in oklab, var(--blue) 40%, var(--line))",
};
const sendStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--fg)",
  color: "#0b0d11",
  border: 0,
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: ".01em",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};
