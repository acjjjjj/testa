"use client";

import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import type { RankedVuln } from "@/types";

export interface HandoffBridgeProps {
  vuln: RankedVuln;
  onContinue: () => void;
}

/** A1 → A2 串联桥接卡片 */
export function HandoffBridge({ vuln, onContinue }: HandoffBridgeProps) {
  return (
    <div className="msg agent">
      <div
        className="av"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--ac-blue) 45%, #000), color-mix(in oklch, var(--ac-mint) 35%, #000))",
        }}
      >
        ↪
      </div>
      <div className="body">
        <div className="who">
          <b>主控大模型 · 上下文桥接</b>
          <Badge tone="blue" dot={false}>
            A1 → A2
          </Badge>
          <span className="dim2 mono">session mGqA-31f · ctx_passed</span>
        </div>
        <div className="text">
          已引用 <b>Agent 1 排序结果 #{String(vuln.rk).padStart(2, "0")}</b>:{" "}
          <span className="mono em">{vuln.cve}</span> · {vuln.name}。 将该漏洞作为{" "}
          <b>Agent 2 · 智能风险排查比对</b> 的上下文, 自动带入 LUI 参数。
        </div>
        <div className="card">
          <div className="ch">
            <div className="t">
              <Icon name="note" size={13} />
              <span>自动带入参数 · 待你确认</span>
            </div>
            <div className="m">
              <span className="dim2 mono">来自 A1 上下文 4 / 4</span>
            </div>
          </div>
          <div className="cb" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="dim2" style={{ width: 120, flexShrink: 0 }}>
                目标漏洞
              </span>
              <span className="mono em">{vuln.cve}</span>
              <span className="dim">· {vuln.name}</span>
              <Badge tone="blue" dot={false}>
                A1 引用
              </Badge>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="dim2" style={{ width: 120, flexShrink: 0 }}>
                资产范围
              </span>
              <span className="em">运营商核心业务线</span>
              <span className="dim">· 142 资产</span>
              <Badge tone="blue" dot={false}>
                A1 引用
              </Badge>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="dim2" style={{ width: 120, flexShrink: 0 }}>
                数据源
              </span>
              <span className="em">内部漏洞库 + 威胁情报 + CVE</span>
              <Badge tone="mute" dot={false}>
                默认
              </Badge>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="dim2" style={{ width: 120, flexShrink: 0 }}>
                是否结合补丁库
              </span>
              <span className="em">是</span>
              <Badge tone="mute" dot={false}>
                默认
              </Badge>
            </div>
          </div>
        </div>
        <div className="ops">
          <button className="pr" onClick={onContinue}>
            <Icon name="send" size={12} /> 启动 Agent 2
          </button>
          <span className="sp" />
          <span className="meta">agent 间不横向通信, 上下文走主控大模型 session</span>
        </div>
      </div>
    </div>
  );
}
