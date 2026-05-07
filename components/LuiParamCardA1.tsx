"use client";

import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { Seg } from "./Seg";
import { useDemoStore } from "@/lib/store";

export interface LuiParamCardA1Props {
  onSubmit: () => void;
  onCancel: () => void;
}

/** Agent 1 LUI 参数确认卡 — 4 字段, 数据来源 = AI 抽取 / mock 兜底 / 默认值 */
export function LuiParamCardA1({ onSubmit, onCancel }: LuiParamCardA1Props) {
  const { state } = useDemoStore();
  const ps = state.paramsState;

  // AI 抽取的真值 / mock 兜底值; 全空时用历史默认 (兼容老路径)
  const ai = ps.kind === "done" ? ps.params : null;
  const isLoading = ps.kind === "loading";
  const isAi = ai?.source === "ai";
  const confidence = ai?.confidence ?? 0.84;

  const initialAssetScope = ai?.assetScope ?? "运营商核心业务线";
  const initialAssetCount = ai?.assetCount ?? 142;
  const initialSeverity = ai?.severity ?? "高危";
  const initialTimeWindow = ai?.timeWindow ?? "业务上线前 7 天";
  const businessTag = ai?.businessTag ?? "重要业务上线";
  const sceneWeight = ai?.sceneWeight ?? 1.15;

  const [severity, setSeverity] = React.useState<string>(initialSeverity);
  const [assetScope, setAssetScope] = React.useState<string>(initialAssetScope);
  const [assetCount, setAssetCount] = React.useState<number>(initialAssetCount);
  const [timeWindow, setTimeWindow] = React.useState<string>(initialTimeWindow);

  // AI 重新抽取后, 同步本地选中
  React.useEffect(() => {
    if (ai?.severity) setSeverity(ai.severity);
  }, [ai?.severity]);
  React.useEffect(() => {
    if (ai?.assetScope) setAssetScope(ai.assetScope);
    if (typeof ai?.assetCount === "number") setAssetCount(ai.assetCount);
  }, [ai?.assetScope, ai?.assetCount]);
  React.useEffect(() => {
    if (ai?.timeWindow) setTimeWindow(ai.timeWindow);
  }, [ai?.timeWindow]);

  // 点击资产范围 → 在预设里循环切换
  const ASSET_OPTIONS: Array<{ scope: string; count: number }> = [
    { scope: "运营商核心业务线", count: 142 },
    { scope: "订单中心业务线", count: 64 },
    { scope: "运营商 Web 资产组", count: 86 },
    { scope: "10.42.0.0/16 网段", count: 218 },
    { scope: "组织结构 A · 边缘", count: 32 },
  ];
  const cycleAssetScope = () => {
    const idx = ASSET_OPTIONS.findIndex((o) => o.scope === assetScope);
    const next = ASSET_OPTIONS[(idx + 1) % ASSET_OPTIONS.length];
    setAssetScope(next.scope);
    setAssetCount(next.count);
  };

  // 点击时间窗口 → 在预设里循环切换
  const TIME_OPTIONS = [
    "业务上线前 7 天",
    "业务上线前 14 天",
    "近 7 天",
    "近 30 天",
    "近 90 天",
    "实时",
  ];
  const cycleTimeWindow = () => {
    const idx = TIME_OPTIONS.indexOf(timeWindow);
    setTimeWindow(TIME_OPTIONS[(idx + 1) % TIME_OPTIONS.length]);
  };

  const sourceBadge = isLoading ? (
    <Badge tone="amber">AI 解析中…</Badge>
  ) : isAi ? (
    <Badge tone="mint">DeepSeek 抽取</Badge>
  ) : ai ? (
    <Badge tone="amber">本地兜底</Badge>
  ) : null;

  return (
    <div className="msg agent">
      <div className="av">A1</div>
      <div className="body">
        <div className="who">
          <b>智能风险排序</b>
          <Badge tone="blue">参数确认</Badge>
          <span className="dim2">10:42</span>
        </div>
        <div className="text dim">
          {isLoading
            ? "AI 正在从你的请求里解析参数..."
            : ai
            ? `已从你的请求里抽取出 ${[ai.assetScope, ai.severity, ai.timeWindow, ai.businessTag].filter(Boolean).length} 个参数, 请确认或调整。`
            : "已从你的请求里抽取出 4 个参数, 请确认或调整。"}
        </div>

        <div className="card lui">
          <div className="ch">
            <div className="t">
              <Icon name="note" size={14} />
              <span>LUI 参数卡片</span>
              <span className="ix">智能风险排序</span>
              {sourceBadge}
            </div>
            <div className="m">
              <span>抽取置信度 {confidence.toFixed(2)}</span>
            </div>
          </div>
          <div className="cb">
            <div className="grid">
              <div className="field">
                <div className="lb">
                  <span>资产范围</span>
                  <span className="req">必填</span>
                </div>
                <button
                  className="ctrl"
                  type="button"
                  onClick={cycleAssetScope}
                  title="点击切换 (mock 预设)"
                  style={ctrlBtnStyle}
                >
                  <span>
                    <b>{assetScope}</b> · 关联 {assetCount} 资产
                  </span>
                  <Icon name="caret" size={12} />
                </button>
                <div className="hint">支持业务线 / 资产组 / 单资产 / IP 段 (点击切换)</div>
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
                <button
                  className="ctrl"
                  type="button"
                  onClick={cycleTimeWindow}
                  title="点击切换 (mock 预设)"
                  style={ctrlBtnStyle}
                >
                  <span>{timeWindow}</span>
                  <Icon name="caret" size={12} />
                </button>
                <div className="hint">未填默认近 30 天 (点击切换)</div>
              </div>
              <div className="field">
                <div className="lb">
                  <span>特殊业务标签</span>
                  <span className={confidence < 0.7 ? "pend" : "dim2"}>
                    {confidence < 0.7 ? "待确认" : "已识别"}
                  </span>
                </div>
                <div className={confidence < 0.7 ? "ctrl warn" : "ctrl"}>
                  <span>
                    <b>{businessTag}</b> · 场景权重 {sceneWeight.toFixed(2)}
                  </span>
                  <Icon name="wand" size={12} />
                </div>
                <div className="hint">
                  {isAi
                    ? `大模型识别置信度 ${confidence.toFixed(2)}`
                    : `识别置信度 ${confidence.toFixed(2)}, ${confidence < 0.7 ? "建议确认" : "可继续"}`}
                </div>
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
              <button className="btn pr" onClick={onSubmit} disabled={isLoading}>
                {isLoading ? "AI 解析中…" : "确认参数, 开始执行"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 把 .ctrl 这种纯展示 div 变成可点击 button 时复用 (CSS 类已经管样式, 只需要重置 <button> 默认值)
const ctrlBtnStyle: React.CSSProperties = {
  width: "100%",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
};
