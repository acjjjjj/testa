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
  | {
      kind: "done";
      source: "ai" | "mock";
      model?: string;
      summary: string;
      ranked: RankedVuln[];
      /** 真实耗时(秒), 用于 UI 显示 "AI 实时打分 · 用时 X.Xs" */
      elapsedSec?: number;
    }
  | { kind: "error"; reason: string };

/** LUI 参数智能抽取 (A1 / A2 共用) 的运行态 */
export type ExtractedParams = {
  source: "ai" | "mock";
  model?: string;
  confidence: number;
  assetScope: string;
  assetCount?: number;
  severity: "高危" | "中危" | "低危";
  timeWindow: string;
  businessTag: string;
  sceneWeight: number;
  dataSources?: string[];
  compareDims?: string[];
  withPatch?: boolean;
};
export type ParamsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; params: ExtractedParams }
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
  /** 用户在底部输入框 / 示例 chip 输入的原始 query */
  userQuery: string;
  /** AI 解析后的 LUI 参数 */
  paramsState: ParamsState;
  /** 侧边栏当前高亮的历史对话 id (null = 没选中, 显示首页) */
  activeHistoryId: string | null;
}

type Action =
  | { type: "set"; patch: Partial<DemoState> }
  | { type: "answerMerge"; pairId: number; answer: MergeAnswer }
  | { type: "resetFollowup" }
  | { type: "openWriteback" }
  | { type: "closeWriteback" }
  | { type: "writebackConfirm" }
  | { type: "handoff"; vuln: RankedVuln }
  | { type: "rankingState"; ranking: AiRankingState }
  | { type: "paramsState"; params: ParamsState }
  | { type: "queryStart"; query: string; agent: AgentId; historyId?: string | null }
  | { type: "resetSession" };

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
  userQuery: "",
  paramsState: { kind: "idle" },
  activeHistoryId: null,
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
    case "paramsState":
      return { ...state, paramsState: action.params };
    case "queryStart":
      return {
        ...state,
        userQuery: action.query,
        agent: action.agent,
        stage: "lui",
        abnormal: "none",
        // 清掉之前的 AI 抽取 / 排序结果, 触发重新跑
        paramsState: { kind: "loading" },
        aiRanking: { kind: "idle" },
        // 显式传 historyId (侧边栏点击) 才高亮; 底部输入框 / chip 启动 → 清空高亮
        activeHistoryId: action.historyId ?? null,
      };
    case "resetSession":
      return {
        ...state,
        stage: "welcome",
        abnormal: "none",
        userQuery: "",
        paramsState: { kind: "idle" },
        aiRanking: { kind: "idle" },
        mergeAnswers: {},
        pendingIdx: 0,
        handoffVuln: null,
        activeHistoryId: null,
      };
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
  /** 带 query 启动一个 agent: 推进 stage→lui + 后台调 /api/extract-params
   *  historyId 可选 — 由侧边栏点击重放时传入, 用于高亮当前历史项 */
  startWithQuery: (query: string, agent: AgentId, historyId?: string | null) => void;
  /** 直接进 LUI (老路径, 没有用户 query) — 跳过 AI 参数抽取, 用默认值 */
  startAgent: (agent: AgentId) => void;
  /** 重置回欢迎页 */
  resetSession: () => void;
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
  //
  // 关键: 不能在 useEffect cleanup 里 abort fetch.
  // workflow 推进 (running→reflect→final) 会触发 deps 变化并执行 cleanup,
  // 如果在 cleanup 里 abort, 真 AI 调用会在 2.4s 时被自杀, 永远进不到 .then 分支
  useEffect(() => {
    if (state.stage !== "running" || state.agent !== "a1") return;
    // 去重: 同一次会话只发起一次, 避免重复触发
    if (state.aiRanking.kind === "loading" || state.aiRanking.kind === "done") return;

    dispatch({ type: "rankingState", ranking: { kind: "loading" } });
    const ctrl = new AbortController();
    const startedAt = Date.now();
    // 28s 客户端兜底 (Vercel Edge 25s 之外的安全网)
    const timeoutId = setTimeout(() => ctrl.abort(), 28000);

    fetch("/api/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: "运营商核心业务 (业务上线前 + 红蓝对抗前)",
        // 只送前 5 条做真 AI 排序, 控制在 Vercel Edge 25s 内稳定完成
        // (10 条平均 ~20s 容易卡 Vercel timeout)
        items: A1_RANK_INPUT.slice(0, 5),
      }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return (await r.json()) as {
          source: "ai" | "mock";
          model?: string;
          summary?: string;
          ranked: RankedVuln[];
        };
      })
      .then((d) => {
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        // eslint-disable-next-line no-console
        console.log(`[a1 ranking] ${d.source} ok, ${elapsed}s, ${d.ranked?.length ?? 0} items`);
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
            elapsedSec: Number(elapsed),
          },
        });
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : "unknown";
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        // eslint-disable-next-line no-console
        console.warn(`[a1 ranking] fallback to mock after ${elapsed}s:`, reason);
        dispatch({ type: "rankingState", ranking: { kind: "error", reason } });
      })
      .finally(() => clearTimeout(timeoutId));

    // 注意: 这里不返回 cleanup 函数, 让 fetch 跑完它自己的生命周期 (28s 超时 / 完成 / 失败)
    // 即使 stage 推进到 reflect/final, 这个请求也继续在背后跑
  }, [state.stage, state.agent, state.aiRanking.kind]);

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

  const startWithQuery = useCallback(
    (query: string, agent: AgentId, historyId?: string | null) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      dispatch({ type: "queryStart", query: trimmed, agent, historyId });

    // 后台调 /api/extract-params 把 query → 结构化参数
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 12000);

    fetch("/api/extract-params", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed, agent }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return (await r.json()) as ExtractedParams;
      })
      .then((params) => {
        // eslint-disable-next-line no-console
        console.log(`[extract-params] ${params.source} ok, conf=${params.confidence}`);
        dispatch({ type: "paramsState", params: { kind: "done", params } });
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : "unknown";
        // eslint-disable-next-line no-console
        console.warn("[extract-params] failed:", reason);
        dispatch({ type: "paramsState", params: { kind: "error", reason } });
      })
      .finally(() => clearTimeout(timeoutId));
    },
    []
  );

  const startAgent = useCallback((agent: AgentId) => {
    // 走老路径: 不带 query, 直接进 LUI 卡, params 用默认 mock
    dispatch({
      type: "set",
      patch: {
        agent,
        stage: "lui",
        abnormal: "none",
        userQuery: "",
        paramsState: { kind: "idle" },
        aiRanking: { kind: "idle" },
      },
    });
  }, []);

  const resetSession = useCallback(() => {
    dispatch({ type: "resetSession" });
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
      startWithQuery,
      startAgent,
      resetSession,
    }),
    [state, set, startWithQuery, startAgent, resetSession]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoStore(): DemoCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return v;
}
