"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type {
  AgentId,
  Stage,
  AbnormalKind,
  RankedVuln,
  MergeAnswer,
} from "@/types";
import { MERGE_PAIRS } from "@/data/compare.mock";
import { A1_RANK_INPUT } from "@/data/vulnerabilities.mock";
import { LUI_FOLLOWUP_BUDGET } from "@/lib/scoring";

/** A1 真 AI 排序的运行态 */
export type AiRankingState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; source: "ai" | "mock"; model?: string; summary: string; ranked: RankedVuln[] }
  | { kind: "error"; reason: string };

interface DemoState {
  agent: AgentId;
  stage: Stage;
  abnormal: AbnormalKind;
  /** 已确认合并条数 (用于 FinalA2 的"经反问确认"展示) */
  mergesConfirmed: number;
  /** LUI 反问当前指针 */
  pendingIdx: number;
  /** LUI 反问回答缓存 */
  mergeAnswers: Record<number, MergeAnswer>;
  /** 写回弹窗开关 */
  writebackOpen: boolean;
  /** A1 → A2 串联时引用的漏洞 */
  handoffVuln: RankedVuln | null;
  /** A1 真 AI 排序结果 */
  aiRanking: AiRankingState;
}

type Action =
  | { type: "set"; patch: Partial<DemoState> }
  | { type: "answerMerge"; pairId: number; answer: MergeAnswer }
  | { type: "resetFollowup" }
  | { type: "openWriteback" }
  | { type: "closeWriteback" }
  | { type: "writebackConfirm" }
  | { type: "handoff"; vuln: RankedVuln }
  | { type: "rankingState"; ranking: AiRankingState };

const askPairsCount = MERGE_PAIRS.filter((p) => p.action === "ask").length;

const initialState: DemoState = {
  agent: "a1",
  stage: "welcome",
  abnormal: "none",
  mergesConfirmed: 2,
  pendingIdx: 0,
  mergeAnswers: {},
  writebackOpen: false,
  handoffVuln: null,
  aiRanking: { kind: "idle" },
};

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "set":
      return { ...state, ...action.patch };
    case "answerMerge": {
      const next = { ...state.mergeAnswers, [action.pairId]: action.answer };
      const yesCount = Object.values(next).filter((v) => v === "yes").length;
      const isLast = state.pendingIdx + 1 >= askPairsCount;
      const overBudget = state.pendingIdx + 1 > LUI_FOLLOWUP_BUDGET;
      return {
        ...state,
        mergeAnswers: next,
        mergesConfirmed: yesCount,
        pendingIdx: isLast ? state.pendingIdx : state.pendingIdx + 1,
        stage: isLast ? "final" : state.stage,
        abnormal: overBudget ? "budget" : state.abnormal,
      };
    }
    case "resetFollowup":
      return {
        ...state,
        pendingIdx: 0,
        mergeAnswers: {},
        mergesConfirmed: 0,
        stage: "followup",
        agent: "a2",
        abnormal: "none",
      };
    case "openWriteback":
      return { ...state, writebackOpen: true };
    case "closeWriteback":
      return { ...state, writebackOpen: false };
    case "writebackConfirm":
      return { ...state, writebackOpen: false, stage: "writeback-done" };
    case "handoff":
      return { ...state, handoffVuln: action.vuln, stage: "handoff" };
    case "rankingState":
      return { ...state, aiRanking: action.ranking };
    default:
      return state;
  }
}

interface DemoCtx {
  state: DemoState;
  set: (patch: Partial<DemoState>) => void;
  setStage: (s: Stage) => void;
  setAgent: (a: AgentId) => void;
  setAbnormal: (k: AbnormalKind) => void;
  answerMerge: (pairId: number, answer: MergeAnswer) => void;
  resetFollowup: () => void;
  openWriteback: () => void;
  closeWriteback: () => void;
  writebackConfirm: () => void;
  handoffTo: (vuln: RankedVuln) => void;
}

const Ctx = createContext<DemoCtx | null>(null);

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stageRef = useRef(state.stage);
  stageRef.current = state.stage;

  // running → reflect → final 自动推进 (mock 异步流程)
  useEffect(() => {
    if (state.stage !== "running") return;
    const id = setTimeout(() => {
      if (stageRef.current === "running") {
        dispatch({ type: "set", patch: { stage: "reflect" } });
      }
    }, 2400);
    return () => clearTimeout(id);
  }, [state.stage]);

  // A1 进入 running 时, 后台调真 AI 做排序; UI 在 final 阶段消费结果
  useEffect(() => {
    if (state.stage !== "running" || state.agent !== "a1") return;
    let aborted = false;
    dispatch({ type: "rankingState", ranking: { kind: "loading" } });
    fetch("/api/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: "运营商核心业务 (业务上线前 + 红蓝对抗前)",
        items: A1_RANK_INPUT,
      }),
    })
      .then((r) => r.json())
      .then((d: { source: "ai" | "mock"; model?: string; summary?: string; ranked: RankedVuln[] }) => {
        if (aborted) return;
        if (!d.ranked || d.ranked.length === 0) {
          dispatch({ type: "rankingState", ranking: { kind: "error", reason: "empty" } });
          return;
        }
        dispatch({
          type: "rankingState",
          ranking: {
            kind: "done",
            source: d.source,
            model: d.model,
            summary: d.summary ?? "",
            ranked: d.ranked,
          },
        });
      })
      .catch((err: unknown) => {
        if (aborted) return;
        const reason = err instanceof Error ? err.message : "unknown";
        dispatch({ type: "rankingState", ranking: { kind: "error", reason } });
      });
    return () => {
      aborted = true;
    };
  }, [state.stage, state.agent]);

  useEffect(() => {
    if (state.stage !== "reflect") return;
    const id = setTimeout(() => {
      if (stageRef.current !== "reflect") return;
      const next: Stage =
        state.agent === "a2" && state.abnormal === "none" ? "followup" : "final";
      dispatch({ type: "set", patch: { stage: next } });
    }, 1600);
    return () => clearTimeout(id);
  }, [state.stage, state.agent, state.abnormal]);

  const set = useCallback((patch: Partial<DemoState>) => {
    dispatch({ type: "set", patch });
  }, []);

  const value = useMemo<DemoCtx>(
    () => ({
      state,
      set,
      setStage: (s) => dispatch({ type: "set", patch: { stage: s } }),
      setAgent: (a) => dispatch({ type: "set", patch: { agent: a } }),
      setAbnormal: (k) => dispatch({ type: "set", patch: { abnormal: k } }),
      answerMerge: (pairId, answer) =>
        dispatch({ type: "answerMerge", pairId, answer }),
      resetFollowup: () => dispatch({ type: "resetFollowup" }),
      openWriteback: () => dispatch({ type: "openWriteback" }),
      closeWriteback: () => dispatch({ type: "closeWriteback" }),
      writebackConfirm: () => dispatch({ type: "writebackConfirm" }),
      handoffTo: (vuln) => dispatch({ type: "handoff", vuln }),
    }),
    [state, set]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoStore(): DemoCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return v;
}
