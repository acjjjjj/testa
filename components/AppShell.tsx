"use client";

import * as React from "react";
import { useDemoStore } from "@/lib/store";
import { showsRightPane } from "@/lib/workflowState";
import { Rail } from "./Rail";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ChatThread } from "./ChatThread";
import { BottomComposer } from "./BottomComposer";
import { WorkflowStatus } from "./WorkflowStatus";
import { WritebackConfirmDialog } from "./WritebackConfirmDialog";
import { ScenarioSwitcher } from "./ScenarioSwitcher";
import { HISTORY } from "@/data/assets.mock";
import { SORTED_VULNS, A1_NEXT_ACTIONS } from "@/data/ranking.mock";

/** 主壳子 — 4 列网格: Rail | Sidebar | Main | RightPane */
export function AppShell() {
  const { state, set, startWithQuery, resetSession } = useDemoStore();
  const { stage, agent } = state;
  const showRight = showsRightPane(stage);

  /**
   * 点击侧边栏历史对话:
   *
   * - item.live === true (进行中): 用 startWithQuery 重放完整流程 (会真调 AI 抽参 → LUI → workflow)
   * - 否则 (已完成的历史): 直接跳到 final 状态展示快照 mock 数据,
   *   不重新跑 AI (PRD 需求 12 真状态恢复留 v1.1, demo 用共享 mock 兜底)
   *
   * 这样点已完成历史 = 看结果, 不会被拉回 LUI 重新填参. 跟 PRD 主界面壳子一段
   * "v1.0 仅展示标题不支持完整状态恢复" 的用法一致 — 但展示当时的 final, 不是再跑一遍.
   */
  const replayHistory = (id: string) => {
    const item = state.dynamicHistory.find((h) => h.id === id) ?? HISTORY.find((h) => h.id === id);
    if (!item) return;
    const targetAgent = item.tag === "比对" ? "a2" : "a1";

    if (item.live) {
      startWithQuery(item.t, targetAgent, id);
      return;
    }

    // 已完成: 跳到 final 状态显示历史快照 (共享 mock, 仅 agent 不同)
    set({
      agent: targetAgent,
      stage: "final",
      abnormal: "none",
      userQuery: item.t,
      activeHistoryId: id,
      paramsState: { kind: "idle" },
      // A1 历史: 直接展示排序结果 + 后续动作 (不重新跑 AI)
      aiRanking:
        targetAgent === "a1"
          ? {
              kind: "done",
              source: "mock",
              summary: `历史快照: "${item.t}" 当时已完成排序, 综合排序分上限锁 10. 此处展示 mock 历史结果, v1 暂不支持真状态恢复 (PRD 需求 12 留 v1.1)`,
              ranked: SORTED_VULNS.slice(0, 10),
              elapsedSec: 11.9,
            }
          : { kind: "idle" },
      nextActions:
        targetAgent === "a1"
          ? { kind: "done", source: "mock", actions: A1_NEXT_ACTIONS }
          : { kind: "idle" },
      // A2 历史: 直接展示比对汇总 + reflection
      compareSummary:
        targetAgent === "a2"
          ? {
              kind: "done",
              source: "mock",
              summary: `历史快照: "${item.t}" 当时已对 64 个资产完成多源漏洞清洗合并, 共归集 590 条原始漏洞数据, 412 条首次命中, 128 条合并 (经反问确认 2 条), 36 条自动去重, 14 条跳过.`,
              reflection:
                "资产覆盖率 100% (64/64), 原始漏洞处理率 100% (590/590), 候选合并对处理率 100%, 一致性 0 容忍通过 (历史快照).",
              taskName: `${item.t.slice(0, 18)} 历史比对`,
            }
          : { kind: "idle" },
      abnormalNarration: { kind: "idle" },
      chatBubbles: [],
      classifying: false,
      mergeAnswers: {},
      pendingIdx: 0,
      writebackTaskId: null,
    });
  };

  return (
    <div className={`app-shell ${showRight ? "" : "no-rail"}`}>
      <Rail />
      <Sidebar
        activeId={state.activeHistoryId}
        dynamicHistory={state.dynamicHistory}
        onPick={replayHistory}
        onNew={resetSession}
      />
      <main style={mainStyle}>
        <TopBar agent={agent} stage={stage} />
        <ChatThread />
        <BottomComposer
          stage={stage}
          agent={agent}
          onPickAgent={(a) => set({ agent: a, stage: stage === "welcome" ? "welcome" : "lui" })}
          onSubmitQuery={(text, a) => startWithQuery(text, a)}
        />
      </main>
      {showRight && <WorkflowStatus />}
      <WritebackConfirmDialog />
      <ScenarioSwitcher />
    </div>
  );
}

const mainStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  background: "var(--bg-0)",
};
