"use client";

import * as React from "react";
import { HISTORY } from "@/data/assets.mock";
import type { HistoryItem } from "@/types";
import { Icon } from "./Icon";

export interface SidebarProps {
  activeId: string | null;
  /** 用户运行时新建的对话条目 (会显示在 mock HISTORY 上方) */
  dynamicHistory?: HistoryItem[];
  onPick: (id: string) => void;
  onNew: () => void;
}

/** 历史对话侧栏 */
export function Sidebar({ activeId, dynamicHistory = [], onPick, onNew }: SidebarProps) {
  // dynamic 在前 + mock HISTORY 在后, 都参与搜索 / 高亮 / 渲染
  const allItems = React.useMemo(
    () => [...dynamicHistory, ...HISTORY],
    [dynamicHistory]
  );
  return (
    <aside className="side-pane" style={asideStyle}>
      <div style={hdStyle}>
        <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: ".01em" }}>哨兵 AI 助手</div>
        <button onClick={onNew} style={newBtnStyle}>
          <Icon name="plus" size={11} /> 新对话
        </button>
      </div>
      <div style={{ padding: "8px 12px" }}>
        <input
          placeholder="搜索对话标题…"
          style={searchInputStyle}
          onChange={() => {
            /* mock — no-op */
          }}
        />
      </div>
      <div style={groupStyle}>最近</div>
      <div style={listStyle}>
        {allItems.map((c) => (
          <div
            key={c.id}
            className={`conv ${c.id === activeId ? "active" : ""}`}
            onClick={() => onPick(c.id)}
            style={convStyle(c.id === activeId)}
          >
            <div style={titleStyle}>{c.t}</div>
            <div style={metaStyle}>
              <span style={tagStyle}>{c.tag}</span>
              <span>{c.m}</span>
              {c.live && (
                <span style={{ marginLeft: "auto", color: "color-mix(in oklch, var(--ac-blue) 80%, white)", fontSize: 10.5 }}>
                  ● 进行中
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

const asideStyle: React.CSSProperties = {
  background: "var(--bg-1)",
  borderRight: "1px solid var(--line)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};
const hdStyle: React.CSSProperties = {
  padding: "14px 16px 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--line)",
};
const newBtnStyle: React.CSSProperties = {
  padding: "5px 9px",
  borderRadius: 6,
  background: "var(--bg-3)",
  border: "1px solid var(--line-2)",
  fontSize: 11,
  color: "var(--fg-1)",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
};
const searchInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  color: "var(--fg)",
  borderRadius: 7,
  padding: "7px 10px",
  font: "inherit",
  outline: "none",
};
const groupStyle: React.CSSProperties = {
  padding: "10px 14px 4px",
  fontSize: 10.5,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color: "var(--fg-3)",
};
const listStyle: React.CSSProperties = { padding: "2px 8px", overflowY: "auto", flex: 1, minHeight: 0 };
function convStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
    background: active ? "var(--bg-2)" : undefined,
    boxShadow: active ? "inset 0 0 0 1px var(--line-2)" : undefined,
  };
}
const titleStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--fg)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const metaStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--fg-3)",
  display: "flex",
  gap: 6,
  alignItems: "center",
};
const tagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "1px 6px",
  borderRadius: 999,
  background: "rgba(255,255,255,.04)",
  color: "var(--fg-2)",
  fontSize: 10.5,
};
