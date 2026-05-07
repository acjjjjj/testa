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

/** 主壳子 — 4 列网格: Rail | Sidebar | Main | RightPane */
export function AppShell() {
  const { state, set, startWithQuery, resetSession } = useDemoStore();
  const { stage, agent } = state;
  const showRight = showsRightPane(stage);

  // 点击侧边栏历史对话: 用其标题作为 query 重放整个 agent 流程 (含真 AI 抽参)
  // 显式带上 historyId, store 会把它写进 activeHistoryId 让侧边栏高亮跟手
  const replayHistory = (id: string) => {
    const item = HISTORY.find((h) => h.id === id);
    if (!item) return;
    const targetAgent = item.tag === "比对" ? "a2" : "a1";
    startWithQuery(item.t, targetAgent, id);
  };

  return (
    <div className={`app-shell ${showRight ? "" : "no-rail"}`}>
      <Rail />
      <Sidebar
        activeId={state.activeHistoryId}
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
