"use client";

import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { Seg } from "./Seg";

export interface LuiParamCardA1Props {
  onSubmit: () => void;
  onCancel: () => void;
}

/** Agent 1 LUI 参数确认卡 — 4 字段 */
export function LuiParamCardA1({ onSubmit, onCancel }: LuiParamCardA1Props) {
  const [severity, setSeverity] = React.useState("高危");

  return (
    <div className="msg agent">
      <div className="av">A1</div>
      <div className="body">
        <div className="who">
          <b>智能风险排序</b>
          <Badge tone="blue">参数确认</Badge>
          <span className="dim2">10:42</span>
        </div>
        <div className="text dim">已从你的请求里抽取出 4 个参数, 请确认或调整。</div>

        <div className="card lui">
          <div className="ch">
            <div className="t">
              <Icon name="note" size={14} />
              <span>LUI 参数卡片</span>
              <span className="ix">智能风险排序</span>
            </div>
            <div className="m">
              <span>抽取置信度 0.84</span>
            </div>
          </div>
          <div className="cb">
            <div className="grid">
              <div className="field">
                <div className="lb">
                  <span>资产范围</span>
                  <span className="req">必填</span>
                </div>
                <div className="ctrl">
                  <span>
                    <b>运营商核心业务线</b> · 关联 142 资产
                  </span>
                  <Icon name="caret" size={12} />
                </div>
                <div className="hint">支持业务线 / 资产组 / 单资产 / IP 段</div>
              </div>
              <div className="field">
                <div className="lb">
                  <span>漏洞等级</span>
                  <span className="req">必填</span>
                </div>
                <Seg options={["高危", "中危", "低危"]} value={severity} onChange={setSeverity} />
                <div className="hint">v1 支持三档</div>
              </div>
              <div className="field">
                <div className="lb">
                  <span>时间窗口</span>
                  <span className="dim2">可选</span>
                </div>
                <div className="ctrl">
                  <span>业务上线前 7 天</span>
                  <Icon name="caret" size={12} />
                </div>
                <div className="hint">未填默认近 30 天</div>
              </div>
              <div className="field">
                <div className="lb">
                  <span>特殊业务标签</span>
                  <span className="pend">待确认</span>
                </div>
                <div className="ctrl warn">
                  <span>
                    <b>重要业务上线</b> → <span className="mono dim">业务上线前</span> · 场景权重 1.15
                  </span>
                  <Icon name="wand" size={12} />
                </div>
                <div className="hint">大模型识别置信度 0.62 &lt; 0.70, 建议确认</div>
              </div>
            </div>
          </div>
          <div className="actions">
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="cog" size={12} />
              <span>
                阈值参数引用 <span className="mono">2.3</span> 节配置中心
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn gh" onClick={onCancel}>
                取消
              </button>
              <button className="btn pr" onClick={onSubmit}>
                确认参数, 开始执行
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
