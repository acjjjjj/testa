"use client";

import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { useDemoStore } from "@/lib/store";
import { COMPARE_STATS } from "@/data/compare.mock";

/** 写回二次确认弹窗 — 任务名称由 /api/compare-summary 实时生成, 兜底用静态文案 */
export function WritebackConfirmDialog() {
  const { state, closeWriteback, writebackConfirm } = useDemoStore();
  if (!state.writebackOpen) return null;

  // PRD § 3.2.4 字段映射: 任务名称由 lui 卡片参数自动生成 (compare-summary 端点已生成)
  // 后缀加日期由前端拼 (PRD 没锁日期格式, 用本地 YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);
  const aiTaskName = state.compareSummary.kind === "done" ? state.compareSummary.taskName : null;
  const taskName = aiTaskName ? `${aiTaskName} · ${today}` : `订单中心 多源漏洞清洗 · ${today}`;
  const isAi = state.compareSummary.kind === "done" && state.compareSummary.source === "ai";

  return (
    <div className="modal-mask" onClick={closeWriteback}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <Icon name="pin" size={14} />
          <span>确认写回风险排查模块?</span>
        </div>
        <div className="modal-bd">
          <p className="dim2" style={{ fontSize: 12, marginBottom: 14 }}>
            哨兵 AI 助手默认只读, 仅在你手动确认后写入鉴微 insight · 风险排查 模块。 写入字段口径与 7.4 节截图 3 模块字段对齐。
          </p>
          <div className="kv">
            <div className="r">
              <span className="k">任务名称</span>
              <span className="v" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <b>{taskName}</b>
                {isAi && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: "color-mix(in oklab, var(--mint) 22%, var(--bg-3))",
                      color: "var(--mint)",
                    }}
                  >
                    AI 命名
                  </span>
                )}
              </span>
            </div>
            <div className="r">
              <span className="k">任务类型</span>
              <span className="v">智能风险排查比对 (Agent 2)</span>
            </div>
            <div className="r">
              <span className="k">匹配漏洞数</span>
              <span className="v">
                <b className="em mono">{COMPARE_STATS.added}</b> · 含 {COMPARE_STATS.merged} 条合并记录
              </span>
            </div>
            <div className="r">
              <span className="k">状态</span>
              <span className="v">
                <Badge tone="amber" dot={false}>
                  待确认
                </Badge>
              </span>
            </div>
            <div className="r">
              <span className="k">创建人</span>
              <span className="v">An</span>
            </div>
            <div className="r">
              <span className="k">数据来源</span>
              <span className="v" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <Badge tone="blue" dot={false}>
                  内部漏洞库
                </Badge>
                <Badge tone="violet" dot={false}>
                  威胁情报
                </Badge>
                <Badge tone="mint" dot={false}>
                  CVE
                </Badge>
                <Badge tone="mute" dot={false}>
                  + 补丁库
                </Badge>
              </span>
            </div>
            <div className="r">
              <span className="k">描述</span>
              <span className="v" style={{ lineHeight: 1.55 }}>
                内部漏洞库 / 威胁情报 / CVE 数据源比对完成, 含 {COMPARE_STATS.merged} 条合并记录 (其中{" "}
                {state.mergesConfirmed} 条经 LUI 反问确认), {COMPARE_STATS.dup} 条自动去重, {COMPARE_STATS.skip}{" "}
                条进入跳过清单。
              </span>
            </div>
          </div>
          <div className="modal-tip">
            <Icon name="cog" size={11} />
            <span>本次写入为单次 idempotent 操作, 同一 session 重复点击不会产生新任务。</span>
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn gh" onClick={closeWriteback}>
            取消
          </button>
          <button className="btn pr danger" onClick={writebackConfirm}>
            <Icon name="pin" size={12} /> 确认写回
          </button>
        </div>
      </div>
    </div>
  );
}
