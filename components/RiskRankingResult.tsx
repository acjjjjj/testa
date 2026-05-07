"use client";

import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { ScoreBar } from "./ScoreBar";
import { SORTED_VULNS, A1_TOTAL, A1_NEXT_ACTIONS } from "@/data/ranking.mock";
import { exportRankingCsv } from "@/lib/exportCsv";
import { useDemoStore } from "@/lib/store";
import type { RankedVuln } from "@/types";

export interface RiskRankingResultProps {
  onHandoff: (vuln: RankedVuln) => void;
}

/** Agent 1 final response — 真 AI 排序 (DeepSeek), 失败 / 加载中走 mock 兜底 */
export function RiskRankingResult({ onHandoff }: RiskRankingResultProps) {
  const { state } = useDemoStore();
  const ai = state.aiRanking;
  const isAi = ai.kind === "done" && ai.source === "ai";
  const isLoading = ai.kind === "loading";

  // 数据源选择: AI 完成 → 用 AI 结果; 否则用 mock
  const ranked: RankedVuln[] = ai.kind === "done" ? ai.ranked : SORTED_VULNS;
  const totalCount = ranked.length > A1_TOTAL ? ranked.length : A1_TOTAL;
  const summary = ai.kind === "done" && ai.summary ? ai.summary : null;

  // 标签 / 状态条
  const statusBadge = isLoading ? (
    <Badge tone="amber">DeepSeek 评分中…</Badge>
  ) : isAi ? (
    <Badge tone="mint">DeepSeek 实时排序 · 已完成</Badge>
  ) : ai.kind === "done" && ai.source === "mock" ? (
    <Badge tone="amber">mock 兜底 · 已完成</Badge>
  ) : ai.kind === "error" ? (
    <Badge tone="amber">AI 调用超时 · 已展示历史 mock</Badge>
  ) : (
    <Badge tone="mint">已完成</Badge>
  );

  return (
    <div className="msg agent">
      <div className="av">A1</div>
      <div className="body">
        <div className="who">
          <b>智能风险排序</b>
          {statusBadge}
          <span className="dim2">
            {isAi ? "AI 实时打分" : "耗时 24.3s"} · {totalCount} 条全部覆盖
          </span>
        </div>
        <div className="text">
          {summary ? (
            <span>{summary}</span>
          ) : (
            <>
              已对 <b>运营商核心业务线 · 高危</b> 范围内 <b>{totalCount}</b> 条漏洞排序完毕。
              识别业务场景为
              <span className="mono em"> 业务上线前</span>(权重 <span className="mono">×1.10</span>) +
              <span className="mono em"> 红蓝对抗前</span>(权重 <span className="mono">×1.20</span>),
              <span className="em"> 多场景命中取最高权重</span>, 综合排序分上限锁 10。前 10 条建议优先处置:
            </>
          )}
        </div>

        {isLoading && (
          <div
            className="card"
            style={{
              padding: "14px 16px",
              marginBottom: 0,
              borderColor: "var(--amber-line, var(--line))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <Icon name="spark" size={13} />
              <span>
                正在调用 <span className="mono em">DeepSeek</span> 对 {ranked.length} 条候选做 vpt 三维实时评分,
                此处先展示历史 mock 结果, AI 评分完成后会自动刷新。
              </span>
            </div>
          </div>
        )}

        <div className="card">
          <div className="ch">
            <div className="t">
              <Icon name="risk" size={13} />
              <span>
                排序结果 · 前 {ranked.length} / {totalCount}
              </span>
            </div>
            <div className="m">
              <Badge tone="blue">vpt 三维加权</Badge>
              <Badge tone="violet" dot={false}>
                场景识别
              </Badge>
              {isAi && ai.kind === "done" && ai.model && (
                <Badge tone="mint" dot={false}>
                  {ai.model}
                </Badge>
              )}
              <span className="mono">综合排序分降序</span>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 34 }}>#</th>
                <th>漏洞</th>
                <th style={{ width: 160 }}>关联资产</th>
                <th style={{ width: 140 }}>vpt 三维 · 基线</th>
                <th style={{ width: 130 }}>场景权重</th>
                <th style={{ width: 120 }}>综合排序分</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((v) => {
                const [host, ip] = v.asset.split(" / ");
                return (
                  <tr key={v.cve}>
                    <td>
                      <span className={`rk ${v.rk <= 3 ? "top" : ""}`}>
                        {String(v.rk).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <div className="cve">{v.cve}</div>
                      <div className="name">{v.name}</div>
                      <div className="desc">{v.desc}</div>
                    </td>
                    <td>
                      <div className="mono em" style={{ fontSize: 11.5 }}>
                        {host}
                      </div>
                      <div className="mono dim2" style={{ fontSize: 10.5 }}>
                        {ip}
                      </div>
                    </td>
                    <td>
                      <div className="vpt-row">
                        <span title="资产属性">A {v.vptA}</span>
                        <span title="漏洞属性">V {v.vptV}</span>
                        <span title="情报属性">I {v.vptI}</span>
                      </div>
                      <div style={{ marginTop: 5 }}>
                        <ScoreBar value={v.base} tone="blue" />
                      </div>
                    </td>
                    <td>
                      <span className="mono em" style={{ fontSize: 13 }}>
                        ×{v.sceneWeight.toFixed(2)}
                      </span>
                      <div className="dim2" style={{ fontSize: 10.5, marginTop: 3 }}>
                        {v.sceneTag}
                      </div>
                    </td>
                    <td>
                      <ScoreBar
                        value={v.score}
                        tone={v.score >= 9.5 ? "rose" : v.score >= 8.5 ? "amber" : "blue"}
                      />
                      {v.rk <= 3 && (
                        <button className="handoff-btn" onClick={() => onHandoff(v)}>
                          <Icon name="flow" size={10} /> 交给 A2 排查
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginTop: 0 }}>
          <div className="ch">
            <div className="t">
              <Icon name="spark" size={13} />
              <span>后续动作建议</span>
            </div>
            <div className="m">
              <span className="dim2">{A1_NEXT_ACTIONS.length} 条</span>
            </div>
          </div>
          <div
            className="cb"
            style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}
          >
            {A1_NEXT_ACTIONS.map((a, i) => (
              <div key={i}>
                {i === 0 ? "①" : i === 1 ? "②" : "③"} {a}
              </div>
            ))}
          </div>
        </div>

        <div className="ops">
          <button className="gh" onClick={() => exportRankingCsv(ranked)}>
            <Icon name="export" size={12} /> 导出 csv
          </button>
          <button className="pr">
            <Icon name="jump" size={12} /> 跳转风险管理模块
          </button>
          <span className="sp" />
          <span className="meta">
            结构校验通过 · 覆盖率 {ranked.length}/{ranked.length} · 一致性 0 容忍通过 ·
            session mGqA-31f
          </span>
        </div>
      </div>
    </div>
  );
}
