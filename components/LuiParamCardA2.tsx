"use client";

import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { Seg } from "./Seg";
import { useDemoStore } from "@/lib/store";

export interface LuiParamCardA2Props {
  onSubmit: () => void;
  onCancel: () => void;
}

/** Agent 2 LUI 参数确认卡 — 4 字段, 数据来源 = AI 抽取 / mock 兜底 / 默认值 */
export function LuiParamCardA2({ onSubmit, onCancel }: LuiParamCardA2Props) {
  const { state } = useDemoStore();
  const ps = state.paramsState;

  const ai = ps.kind === "done" ? ps.params : null;
  const isLoading = ps.kind === "loading";
  const isAi = ai?.source === "ai";
  const confidence = ai?.confidence ?? 0.91;

  const initialAssetScope = ai?.assetScope ?? "组织结构 / 订单中心";
  const initialAssetCount = ai?.assetCount ?? 64;
  const dataSourcesArr = ai?.dataSources ?? ["内部漏洞库", "威胁情报", "CVE"];
  const dataSourcesText = dataSourcesArr.join(" + ");
  const initialDim = ai?.compareDims?.[0] ?? "cpe";
  const initialPatch = ai?.withPatch === false ? "否" : "是";

  const [assetScope, setAssetScope] = React.useState(initialAssetScope);
  const [assetCount, setAssetCount] = React.useState<number>(initialAssetCount);
  const [dim, setDim] = React.useState(initialDim);
  const [usePatch, setUsePatch] = React.useState(initialPatch);
  React.useEffect(() => {
    if (ai?.assetScope) setAssetScope(ai.assetScope);
    if (typeof ai?.assetCount === "number") setAssetCount(ai.assetCount);
  }, [ai?.assetScope, ai?.assetCount]);
  React.useEffect(() => {
    if (ai?.compareDims?.[0]) setDim(ai.compareDims[0]);
  }, [ai?.compareDims]);
  React.useEffect(() => {
    if (typeof ai?.withPatch === "boolean") setUsePatch(ai.withPatch ? "是" : "否");
  }, [ai?.withPatch]);

  // 点击资产范围 → 在 A2 预设里循环切换 (含单资产 + IP 段, 跟 A1 不太一样)
  const ASSET_OPTIONS_A2: Array<{ scope: string; count: number }> = [
    { scope: "组织结构 / 订单中心", count: 64 },
    { scope: "192.168.1.1", count: 1 },
    { scope: "10.42.18.0/24 网段", count: 32 },
    { scope: "运营商 web 资产组", count: 86 },
    { scope: "运营商核心业务线", count: 142 },
  ];
  const cycleAssetScope = () => {
    const idx = ASSET_OPTIONS_A2.findIndex((o) => o.scope === assetScope);
    const next = ASSET_OPTIONS_A2[(idx + 1) % ASSET_OPTIONS_A2.length];
    setAssetScope(next.scope);
    setAssetCount(next.count);
  };

  const sourceBadge = isLoading ? (
    <Badge tone="amber">AI 解析中…</Badge>
  ) : isAi ? (
    <Badge tone="mint">DeepSeek 抽取</Badge>
  ) : ai ? (
    <Badge tone="amber">本地兜底</Badge>
  ) : null;

  return (
    <div className="msg agent a2">
      <div className="av">A2</div>
      <div className="body">
        <div className="who">
          <b>智能风险排查比对</b>
          <Badge tone="mint">参数确认</Badge>
          <span className="dim2">10:42</span>
        </div>
        <div className="text dim">
          {isLoading
            ? "AI 正在解析资产范围 / 数据源 / 比对维度..."
            : "已识别资产范围, 请确认数据源与比对维度。"}
        </div>

        <div className="card lui">
          <div className="ch">
            <div className="t">
              <Icon name="note" size={14} />
              <span>LUI 参数卡片</span>
              <span className="ix">智能风险排查比对</span>
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
                <div className="hint">192.168.1.1 等明确单资产将自动展开 (点击切换)</div>
              </div>
              <div className="field">
                <div className="lb">
                  <span>数据源选择</span>
                  <span className="req">必填</span>
                </div>
                <div className="ctrl">
                  <span>{dataSourcesText}</span>
                  <span className="dim2 mono">{dataSourcesArr.length} / 4</span>
                </div>
                <div className="hint">v1 支持 内部 / 威胁情报 / CVE / CNNVD</div>
              </div>
              <div className="field">
                <div className="lb">
                  <span>比对维度</span>
                  <span className="req">必填</span>
                </div>
                <Seg options={["cpe", "版本号", "组件指纹"]} value={dim} onChange={setDim} />
                <div className="hint">三维任一命中即纳入候选</div>
              </div>
              <div className="field">
                <div className="lb">
                  <span>是否结合补丁库</span>
                  <span className="req">必填</span>
                </div>
                <Seg options={["是", "否"]} value={usePatch} onChange={setUsePatch} />
                <div className="hint">选 否 时跳过补丁状态查询</div>
              </div>
            </div>
          </div>
          <div className="actions">
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="cog" size={12} />
              <span>
                反问阈值 <span className="mono">95% / 90%</span> · 反问预算 5 次
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

const ctrlBtnStyle: React.CSSProperties = {
  width: "100%",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
};
