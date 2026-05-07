"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export interface ConfigPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 配置中心 modal — v1 read-only.
 * 把当前 demo 真实生效的阈值 / 模型 / 端点摆出来, 让评审一眼看到 PRD 2.3 节里的所有 magic number 都接通了
 */
export function ConfigPanel({ open, onClose }: ConfigPanelProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Esc 关闭
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div style={backdropStyle} onMouseDown={onClose}>
      <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
        <header style={headerStyle}>
          <div style={titleWrapStyle}>
            <Icon name="cog" size={14} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>配置中心</span>
            <span className="dim2" style={{ fontSize: 11.5 }}>
              v1 · 评审版 · 只读
            </span>
          </div>
          <button onClick={onClose} style={closeBtnStyle} title="关闭 (Esc)">
            ×
          </button>
        </header>

        <div style={bodyStyle}>
          {SECTIONS.map((sec) => (
            <section key={sec.title} style={sectionStyle}>
              <h3 style={sectionHeadStyle}>{sec.title}</h3>
              <div style={tableStyle}>
                {sec.rows.map((r) => (
                  <div key={r.k} style={rowStyle}>
                    <div style={rowKeyStyle}>
                      <span style={{ color: "var(--fg-1)", fontSize: 12.5 }}>{r.k}</span>
                      {r.note && (
                        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{r.note}</span>
                      )}
                    </div>
                    <div style={rowValStyle}>
                      <span className="mono" style={{ fontSize: 12.5, color: "var(--fg)" }}>
                        {r.v}
                      </span>
                      {r.tag && <span style={badgeStyle(r.tag)}>{r.tag}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer style={footerStyle}>
          <span className="dim2" style={{ fontSize: 11.5 }}>
            阈值参数引用 PRD v0.5 § 2.3 — v1 demo 仅展示, 实际编辑需到 鉴微 insight 主台 · 哨兵管理员
          </span>
          <button onClick={onClose} className="btn pr">
            知道了
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

interface ConfigRow {
  k: string;
  v: string;
  note?: string;
  tag?: "live" | "mock" | "lock";
}
interface ConfigSection {
  title: string;
  rows: ConfigRow[];
}

const SECTIONS: ConfigSection[] = [
  {
    title: "主控 / 模型",
    rows: [
      {
        k: "主控大模型",
        v: "未接入",
        note: "v1 demo 直连子任务模型, 主控路由 / session 上下文层 v1.x 评估接入",
        tag: "lock",
      },
      { k: "子任务模型", v: "DeepSeek-chat", note: "OpenAI 兼容协议", tag: "live" },
      { k: "API 端点", v: "api.deepseek.com", note: "Vercel Edge Function 转发", tag: "live" },
      { k: "上游超时", v: "22s", note: "≤ Vercel Edge 25s 上限", tag: "live" },
    ],
  },
  {
    title: "Agent 1 智能风险排序",
    rows: [
      { k: "VPT 三维加权权重", v: "A 0.4 / V 0.3 / I 0.3", tag: "lock" },
      { k: "综合排序分上限", v: "10.0", note: "min(VPT × 场景权重, 10)", tag: "lock" },
      { k: "AI 评分候选数", v: "5", note: "Vercel Edge 25s 内稳定完成", tag: "live" },
      { k: "P95 目标耗时", v: "≤ 30s", note: "输入 ≤ 1000 条", tag: "lock" },
    ],
  },
  {
    title: "Agent 2 智能风险排查比对",
    rows: [
      { k: "自动合并阈值", v: "≥ 95%", note: "risk_dedupe_threshold", tag: "lock" },
      { k: "中置信区间", v: "90% ~ 95%", note: "触发 LUI 反问", tag: "lock" },
      { k: "不合并阈值", v: "< 90%", tag: "lock" },
      { k: "LUI 反问预算", v: "5 次", note: "超过进入待审核清单", tag: "lock" },
      { k: "P95 目标耗时", v: "≤ 60s", note: "资产 ≤ 100 / 候选对 ≤ 500", tag: "lock" },
    ],
  },
  {
    title: "Workflow 公共参数",
    rows: [
      { k: "reflection_retry_limit", v: "3", note: "覆盖率不达标重跑上限", tag: "lock" },
      { k: "stage 推进时序", v: "running 2.4s · reflect 1.6s", note: "v1 mock 动画", tag: "mock" },
    ],
  },
  {
    title: "数据源 / 写回",
    rows: [
      { k: "数据源", v: "内部漏洞库 / 威胁情报 / CVE / CNNVD", tag: "mock" },
      { k: "补丁库", v: "厂商补丁 + 自建补丁库", tag: "mock" },
      { k: "唯一允许写回的 agent", v: "Agent 2", tag: "lock" },
      { k: "写回触发", v: "用户手动确认", note: "partial 状态禁止写回", tag: "lock" },
    ],
  },
];

// ── styles ──────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  display: "grid",
  placeItems: "center",
  zIndex: 9998,
  padding: 24,
  backdropFilter: "blur(2px)",
};

const panelStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  maxHeight: "85vh",
  background: "var(--bg-1)",
  border: "1px solid var(--line-2)",
  borderRadius: 14,
  boxShadow: "0 20px 60px rgba(0,0,0,.55)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "12px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg-2)",
};

const titleWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "var(--fg-1)",
};

const closeBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "var(--fg-2)",
  fontSize: 22,
  lineHeight: 1,
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  borderRadius: 6,
  cursor: "pointer",
};

const bodyStyle: React.CSSProperties = {
  padding: "14px 18px 18px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color: "var(--fg-3)",
  margin: "0 0 4px",
};

const tableStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const rowStyle: React.CSSProperties = {
  padding: "9px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  borderBottom: "1px solid var(--line)",
};

const rowKeyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 1,
  minWidth: 0,
};

const rowValStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
};

function badgeStyle(tag: "live" | "mock" | "lock"): React.CSSProperties {
  const colorMap = {
    live: { bg: "color-mix(in oklab, var(--mint) 20%, var(--bg-3))", fg: "var(--mint)" },
    mock: { bg: "color-mix(in oklab, var(--amber) 20%, var(--bg-3))", fg: "var(--amber)" },
    lock: { bg: "var(--bg-3)", fg: "var(--fg-3)" },
  };
  const c = colorMap[tag];
  const labelMap = { live: "live", mock: "mock", lock: "v1 锁定" };
  return {
    fontSize: 10.5,
    padding: "1px 7px",
    borderRadius: 999,
    background: c.bg,
    color: c.fg,
    fontFamily: "var(--font-mono)",
    letterSpacing: ".02em",
  };
}

const footerStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderTop: "1px solid var(--line)",
  background: "var(--bg-2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};
