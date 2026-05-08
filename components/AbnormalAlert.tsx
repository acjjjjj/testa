"use client";

import * as React from "react";
import { useDemoStore } from "@/lib/store";
import type { AbnormalKind } from "@/types";

/** PRD § 4.6 锁定的基线文案 (AI 失败 / 加载中的兜底) */
const FALLBACK: Record<Exclude<AbnormalKind, "none">, { tone: "warn" | "danger"; t: string; p: string; x: string }> = {
  timeout: {
    tone: "warn",
    t: "数据接口超时, 已重试 3 次仍失败",
    p: "鉴微 insight 数据接口连续 3 次返回 timeout, 当前工作流已中止. 已保留你的 query 与 LUI 参数, 可点击稍后重试.",
    x: "api_retry_limit = 3 · trace_id 7d2-4ab9",
  },
  patch: {
    tone: "warn",
    t: "补丁库接口暂不可用, 已降级跳过",
    p: '本次结果不含补丁状态字段, 命中漏洞补丁状态统一填 "未查询". 主流程继续, 不阻塞比对结果.',
    x: "4.4.7 降级 · patch_unavailable=true",
  },
  partial: {
    tone: "warn",
    t: "反思校验 3 次未达标, 输出 partial 结果",
    p: "已处理 134 / 142 条, 8 条进入跳过清单 (无访问权限 5 / 接口失败 3). 结果仅供排查, 不允许写回风险排查模块.",
    x: "reflection_retry_limit = 3 · partial=true",
  },
  budget: {
    tone: "warn",
    t: "反问预算已用完, 剩余进入待审核清单",
    p: "本轮 5 次 LUI 反问已用完, 后续 3 对中置信命中不再弹窗, 已统一进入待审核清单, 等待你手动复核.",
    x: "lui_followup_budget = 5 · queued = 3",
  },
};

export interface AbnormalAlertProps {
  kind: AbnormalKind;
}

/** 异常路径降级反馈卡片 — 用 store.abnormalNarration 拿 AI 实时叙事, 兜底用 PRD 锁定文案 */
export function AbnormalAlert({ kind }: AbnormalAlertProps) {
  const { state } = useDemoStore();
  if (kind === "none") return null;

  const fb = FALLBACK[kind];
  const narr = state.abnormalNarration;
  const isLoading = narr.kind === "loading";
  const isAi = narr.kind === "done" && narr.source === "ai";

  // 优先用 AI 叙事, fallback 到 PRD 锁定文案
  const t = narr.kind === "done" ? narr.title : fb.t;
  const p = narr.kind === "done" ? narr.body : fb.p;
  const x = narr.kind === "done" ? narr.footnote : fb.x;

  return (
    <div className={`alert ${fb.tone === "warn" ? "warn" : ""}`}>
      <div className="ic">!</div>
      <div className="body-text">
        <div className="t" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>{t}</span>
          {isLoading && <span style={badgeAmberStyle}>AI 生成中…</span>}
          {isAi && <span style={badgeMintStyle}>AI 实时叙事</span>}
          {narr.kind === "done" && narr.source === "mock" && (
            <span style={badgeAmberStyle}>PRD 兜底</span>
          )}
        </div>
        <p>{p}</p>
        <div className="x">{x}</div>
      </div>
    </div>
  );
}

const badgeMintStyle: React.CSSProperties = {
  fontSize: 10.5,
  padding: "1px 6px",
  borderRadius: 999,
  background: "color-mix(in oklab, var(--mint) 22%, var(--bg-3))",
  color: "var(--mint)",
};

const badgeAmberStyle: React.CSSProperties = {
  fontSize: 10.5,
  padding: "1px 6px",
  borderRadius: 999,
  background: "color-mix(in oklab, var(--amber) 22%, var(--bg-3))",
  color: "var(--amber)",
};
