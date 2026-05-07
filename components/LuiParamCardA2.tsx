"use client";

import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { Seg } from "./Seg";
import { Dropdown } from "./Dropdown";
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
  // 数据源 (key 用 join("|") 做单值, 简化 Dropdown)
  const [dataSourcesKey, setDataSourcesKey] = React.useState<string>(dataSourcesArr.join("|"));
  React.useEffect(() => {
    if (ai?.dataSources) setDataSourcesKey(ai.dataSources.join("|"));
  }, [ai?.dataSources]);
  const dataSourcesShown = dataSourcesKey.split("|");
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

  // 资产范围候选 (A2 比 A1 多了 单资产 / IP 段)
  const ASSET_OPTIONS_A2: Array<{ scope: string; count: number; hint: string }> = [
    { scope: "组织结构 / 订单中心", count: 64, hint: "组织 · 64 资产" },
    { scope: "192.168.1.1", count: 1, hint: "单资产 · 1" },
    { scope: "10.42.18.0/24 网段", count: 32, hint: "IP 段 · 32 资产" },
    { scope: "运营商 web 资产组", count: 86, hint: "资产组 · 86 资产" },
    { scope: "运营商核心业务线", count: 142, hint: "业务线 · 142 资产" },
  ];
  const pickAssetScope = (v: string) => {
    const next = ASSET_OPTIONS_A2.find((o) => o.scope === v);
    if (!next) return;
    setAssetScope(next.scope);
    setAssetCount(next.count);
  };

  // 数据源候选 (常见组合, 替代多选 UI 的简化方案)
  const DATASOURCE_OPTIONS: Array<{ label: string; hint: string; sources: string[] }> = [
    { label: "内部漏洞库 + CVE", hint: "默认 · 2 / 4", sources: ["内部漏洞库", "CVE"] },
    {
      label: "内部漏洞库 + CVE + 威胁情报",
      hint: "推荐 · 3 / 4",
      sources: ["内部漏洞库", "CVE", "威胁情报"],
    },
    {
      label: "全部 4 库",
      hint: "完整覆盖 · 4 / 4",
      sources: ["内部漏洞库", "CVE", "威胁情报", "CNNVD"],
    },
    { label: "仅内部库", hint: "最快 · 1 / 4", sources: ["内部漏洞库"] },
    { label: "CVE + CNNVD", hint: "公开库 · 2 / 4", sources: ["CVE", "CNNVD"] },
  ];
  const pickDataSources = (v: string) => {
    const opt = DATASOURCE_OPTIONS.find((o) => o.sources.join("|") === v);
    if (!opt) return;
    setDataSourcesKey(opt.sources.join("|"));
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
                <Dropdown
                  triggerClassName="ctrl"
                  triggerStyle={ctrlBtnStyle}
                  title="切换资产范围"
                  value={assetScope}
                  onPick={pickAssetScope}
                  options={ASSET_OPTIONS_A2.map((o) => ({
                    label: o.scope,
                    hint: o.hint,
                    value: o.scope,
                  }))}
                >
                  <span>
                    <b>{assetScope}</b> · 关联 {assetCount} 资产
                  </span>
                  <Icon name="caret" size={12} />
                </Dropdown>
                <div className="hint">192.168.1.1 等明确单资产将自动展开</div>
              </div>
              <div className="field">
                <div className="lb">
                  <span>数据源选择</span>
                  <span className="req">必填</span>
                </div>
                <Dropdown
                  triggerClassName="ctrl"
                  triggerStyle={ctrlBtnStyle}
                  title="切换数据源组合"
                  value={dataSourcesKey}
                  onPick={pickDataSources}
                  options={DATASOURCE_OPTIONS.map((o) => ({
                    label: o.label,
                    hint: o.hint,
                    value: o.sources.join("|"),
                  }))}
                >
                  <span>{dataSourcesShown.join(" + ")}</span>
                  <span className="dim2 mono">{dataSourcesShown.length} / 4</span>
                </Dropdown>
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
