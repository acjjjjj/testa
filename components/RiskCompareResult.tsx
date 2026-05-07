"use client";

import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { useDemoStore } from "@/lib/store";
import { COMPARE_STATS, A2_TOTAL_RAW, A2_ASSET_COUNT, MERGE_PAIRS, PATCH_HITS } from "@/data/compare.mock";
import { exportPatchHitsCsv } from "@/lib/exportCsv";

export interface RiskCompareResultProps {
  partial?: boolean;
  onWriteback: () => void;
}

/** Agent 2 final response — 比对统计 + 命中/补丁表 + 去重合并记录 */
export function RiskCompareResult({ partial, onWriteback }: RiskCompareResultProps) {
  const { state } = useDemoStore();
  const writebackDisabled = !!partial;

  return (
    <div className="msg agent a2">
      <div className="av">A2</div>
      <div className="body">
        <div className="who">
          <b>智能风险排查比对</b>
          <Badge tone="mint">已完成</Badge>
          <span className="dim2">
            耗时 48.7s · {A2_ASSET_COUNT} 资产全部覆盖 · 反问 {state.mergesConfirmed} 轮
          </span>
        </div>
        <div className="text">
          已对 <b>组织结构 · 订单中心</b> 下 <b>{A2_ASSET_COUNT}</b> 个资产完成多源漏洞清洗合并, 共归集
          <b> {A2_TOTAL_RAW} </b>条原始漏洞数据, 去重后 <b>{COMPARE_STATS.added}</b> 条首次命中,{" "}
          <b>{COMPARE_STATS.merged}</b> 条合并记录。
        </div>

        <div className="card">
          <div className="ch">
            <div className="t">
              <Icon name="risk" size={13} />
              <span>比对统计</span>
            </div>
            <div className="m">
              <span className="mono dim2">总计 {A2_TOTAL_RAW}</span>
            </div>
          </div>
          <div className="cb">
            <div className="stat-grid">
              <div className="stat">
                <div className="v">{COMPARE_STATS.added}</div>
                <div className="l">新增命中</div>
                <div className="x">首次命中漏洞</div>
              </div>
              <div className="stat">
                <div className="v">{COMPARE_STATS.merged}</div>
                <div className="l">已合并记录</div>
                <div className="x">{state.mergesConfirmed} 条经反问确认</div>
              </div>
              <div className="stat">
                <div className="v">{COMPARE_STATS.dup}</div>
                <div className="l">自动去重</div>
                <div className="x">相似度 ≥ 95%</div>
              </div>
              <div className="stat">
                <div className="v">{COMPARE_STATS.skip}</div>
                <div className="l">跳过记录</div>
                <div className="x">见跳过清单</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ch">
            <div className="t">
              <Icon name="shield" size={13} />
              <span>命中漏洞 · 补丁可行性</span>
            </div>
            <div className="m">
              <Badge tone="mint" dot={false}>
                已有补丁 6
              </Badge>
              <Badge tone="amber" dot={false}>
                待发布 1
              </Badge>
              <Badge tone="rose" dot={false}>
                暂无 1
              </Badge>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 160 }}>CVE</th>
                <th>漏洞</th>
                <th style={{ width: 160 }}>命中资产</th>
                <th style={{ width: 140 }}>命中维度</th>
                <th style={{ width: 120 }}>数据来源</th>
                <th style={{ width: 90 }}>命中置信度</th>
                <th style={{ width: 90 }}>补丁状态</th>
              </tr>
            </thead>
            <tbody>
              {PATCH_HITS.map((h) => (
                <tr key={h.cve}>
                  <td>
                    <div className="cve">{h.cve}</div>
                  </td>
                  <td>
                    <div className="name">{h.name}</div>
                  </td>
                  <td>
                    <div className="mono em" style={{ fontSize: 11.5 }}>
                      {h.asset}
                    </div>
                  </td>
                  <td>
                    <div className="mono dim" style={{ fontSize: 11 }}>
                      {h.dim}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {h.src.map((s) => (
                        <span
                          key={s}
                          className="mono dim2"
                          style={{
                            fontSize: 10,
                            padding: "1px 5px",
                            border: "1px solid var(--line)",
                            borderRadius: 4,
                            background: "var(--bg-3)",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="mono em">{h.conf.toFixed(2)}</span>
                  </td>
                  <td>
                    {h.patch === "已有补丁" && <Badge tone="mint" dot={false}>已有</Badge>}
                    {h.patch === "待发布" && <Badge tone="amber" dot={false}>待发布</Badge>}
                    {h.patch === "暂无" && <Badge tone="rose" dot={false}>暂无</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="ch">
            <div className="t">
              <Icon name="flow" size={13} />
              <span>去重合并记录</span>
            </div>
            <div className="m">
              <span className="dim2">
                展示 5 / {COMPARE_STATS.merged + COMPARE_STATS.dup}
              </span>
            </div>
          </div>
          <div className="cb" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MERGE_PAIRS.map((p) => (
              <div key={p.id} className="mpair">
                <div className="col">
                  <div className="src">{p.a.src}</div>
                  <div className="id">{p.a.id}</div>
                  <div className="nm">{p.a.nm}</div>
                </div>
                <div className="arr">{p.action === "no" ? "✕" : "⇄"}</div>
                <div className="col">
                  <div className="src">
                    {p.b.src} ·{" "}
                    <span
                      className="mono em"
                      style={{ color: p.action === "no" ? "var(--fg-3)" : "inherit" }}
                    >
                      {(p.conf * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="id">{p.b.id}</div>
                  <div
                    className="nm"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}
                  >
                    <span>{p.b.nm}</span>
                    {p.action === "auto" && (
                      <Badge tone="mint" dot={false}>
                        自动合并
                      </Badge>
                    )}
                    {p.action === "ask" && (
                      <Badge tone="amber" dot={false}>
                        反问确认
                      </Badge>
                    )}
                    {p.action === "no" && (
                      <Badge tone="mute" dot={false}>
                        不合并
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ops">
          <button className="gh" onClick={() => exportPatchHitsCsv(PATCH_HITS)}>
            <Icon name="export" size={12} /> 导出比对结果 (CSV)
          </button>
          <button
            className={`pr ${writebackDisabled ? "gh" : ""}`}
            disabled={writebackDisabled}
            onClick={() => !writebackDisabled && onWriteback()}
            title={writebackDisabled ? "partial 结果仅供排查, 不允许写回风险排查模块" : ""}
          >
            <Icon name="pin" size={12} /> 存为风险排查任务
          </button>
          <span className="sp" />
          <span className="meta">
            {writebackDisabled
              ? "partial = true · 补丁库不可用 · 仅允许导出 CSV"
              : "写回鉴微 insight · 7 字段映射 · partial = false"}
          </span>
        </div>
      </div>
    </div>
  );
}
