"use client";

import * as React from "react";
import { NAV } from "@/data/assets.mock";
import { Icon, type IconName } from "./Icon";
import { useToast } from "./Toast";

/** 每个模块的一句话 hint, click 后弹 toast 让用户知道这是干嘛 */
const MODULE_HINTS: Record<string, string> = {
  asset: "资产 — 资产清单 / 指纹 / CMDB 联动",
  expose: "暴露面 — 互联网暴露资产实时盘点",
  risk: "风险 — 漏洞 / 配置 / 弱口令汇总台账",
  detect: "检测 — 周期性扫描 + 实时监测",
  ticket: "工单 — 风险派单与处置流转",
  report: "报告 — 合规 / 审计 / 红蓝对抗导出",
  config: "配置 — 数据源 / 阈值 / 模型设置",
  sentry: "哨兵 — 当前所在 AI 助手模块",
};

/** 鉴微 insight 主导航栏 — 哨兵 是第八项 */
export function Rail() {
  const toast = useToast();

  const handleNav = (k: string, label: string, active?: boolean) => {
    if (k === "sentry" && active) {
      toast.show("你已在 哨兵 AI 助手 模块内", "info");
      return;
    }
    const hint = MODULE_HINTS[k] ?? label;
    toast.show(`${hint} · 不在本 v1.0 demo 范围, 完整功能请到 鉴微 insight 主台`, "info");
  };

  return (
    <nav className="rail" style={railStyle}>
      <button
        className="logo"
        style={logoStyle}
        title="鉴微 insight"
        onClick={() =>
          toast.show("鉴微 insight · 漏洞攻击面统一治理平台 · 本 demo 仅展示哨兵 AI 助手", "info")
        }
      >
        鉴
      </button>
      <div className="nav" style={navStyle}>
        {NAV.map((n) => (
          <button
            key={n.k}
            className={n.active ? "active" : ""}
            title={MODULE_HINTS[n.k] ?? n.l}
            style={navBtn(n.active)}
            onClick={() => handleNav(n.k, n.l, n.active)}
          >
            <span className="ico">
              <Icon name={n.k as IconName} size={18} />
            </span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button
        className="me"
        style={meStyle}
        title="An · 红队工程师 · 鉴微 insight 测试账号"
        onClick={() => toast.show("An · 红队工程师 · 鉴微 insight 测试账号 (mock)", "info")}
      >
        An
      </button>
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
  cursor: "pointer",
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
    border: 0,
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
  cursor: "pointer",
};
