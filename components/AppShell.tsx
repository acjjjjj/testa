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

/** 主壳子 — 4 列网格: Rail | Sidebar | Main | RightPane */
export function AppShell() {
  const { state, setStage, set, startWithQuery, resetSession } = useDemoStore();
  const { stage, agent } = state;
  const showRight = showsRightPane(stage);

  return (
    <div className={`app-shell ${showRight ? "" : "no-rail"}`}>
      <Rail />
      <Sidebar
        activeId={stage === "welcome" ? null : "h1"}
        onPick={() => setStage("final")}
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
