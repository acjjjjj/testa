import * as React from "react";
import { NAV } from "@/data/assets.mock";
import { Icon, type IconName } from "./Icon";

/** 鉴微 insight 主导航栏 — 哨兵 是第八项 */
export function Rail() {
  return (
    <nav className="rail" style={railStyle}>
      <div className="logo" style={logoStyle}>鉴</div>
      <div className="nav" style={navStyle}>
        {NAV.map((n) => (
          <button key={n.k} className={n.active ? "active" : ""} title={n.l} style={navBtn(n.active)}>
            <span className="ico">
              <Icon name={n.k as IconName} size={18} />
            </span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div className="me" style={meStyle}>An</div>
    </nav>
  );
}

const railStyle: React.CSSProperties = {
  background: "var(--bg-1)",
  borderRight: "1px solid var(--line)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "14px 0",
  gap: 4,
};

const logoStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: "linear-gradient(180deg, #1f2937, #0c1117)",
  display: "grid",
  placeItems: "center",
  color: "#e6e8ec",
  fontWeight: 700,
  fontSize: 13,
  border: "1px solid var(--line-2)",
  marginBottom: 10,
};

const navStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  alignItems: "center",
  width: "100%",
};

function navBtn(active?: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 8,
    color: active ? "var(--fg)" : "var(--fg-3)",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    letterSpacing: ".02em",
    transition: ".12s color, .12s background",
    background: active ? "var(--bg-2)" : "transparent",
    boxShadow: active ? "inset 0 0 0 1px var(--line-2)" : undefined,
    cursor: "pointer",
  };
}

const meStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "linear-gradient(135deg,#3a4150,#1a1f29)",
  display: "grid",
  placeItems: "center",
  fontSize: 11,
  color: "var(--fg-1)",
  border: "1px solid var(--line-2)",
};
