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
  HistoryItem,
  NextActionsResponse,
  CompareSummaryResponse,
  AbnormalNarrateResponse,
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

/** A1 后续动作建议 (3 条) 的运行态 */
export type NextActionsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; source: "ai" | "mock"; actions: string[] }
  | { kind: "error"; reason: string };

/** A2 比对汇总段落 + reflection 报告 + 写回 task 名称的运行态 */
export type CompareSummaryState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "done";
      source: "ai" | "mock";
      summary: string;
      reflection: string;
      /** 写回风险排查模块的任务名称 (PRD § 3.2.4 字段映射要求由 lui 卡片参数自动生成) */
      taskName: string;
    }
  | { kind: "error"; reason: string };

/** 异常 banner AI 实时叙事的运行态 */
export type AbnormalNarrationState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "done";
      source: "ai" | "mock";
      title: string;
      body: string;
      footnote: string;
    }
  | { kind: "error"; reason: string };

/** LUI 参数智能抽取 (A1 / A2 共用) 的运行态 */
export type ExtractedParams = {
  source: "ai" | "mock";
  model?: string;
  intent: "a1" | "a2" | "chat";
  reply?: string; // chat 模式专用
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

/** 聊天气泡 (chat 意图时累积) */
export type ChatBubble = {
  id: string;
  role: "user" | "agent";
  text: string;
  ts: number;
  source?: "ai" | "mock";
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
  /** 写回任务 id (PRD § 3.2.4 步骤 9 锁: 同 session 同结果集重复点击返回已创建 task_id, 不重建) */
  writebackTaskId: string | null;
  /** A1 → A2 串联时引用的漏洞 */
  handoffVuln: RankedVuln | null;
  /** A1 真 AI 排序结果 */
  aiRanking: AiRankingState;
  /** A1 真 AI 后续动作建议 (排序完后异步生成) */
  nextActions: NextActionsState;
  /** A2 真 AI 比对汇总 + reflection + taskName (final 阶段异步生成) */
  compareSummary: CompareSummaryState;
  /** 异常 banner AI 实时叙事 (state.abnormal 切非-none 时异步生成) */
  abnormalNarration: AbnormalNarrationState;
  /** 用户在底部输入框 / 示例 chip 输入的原始 query */
  userQuery: string;
  /** AI 解析后的 LUI 参数 */
  paramsState: ParamsState;
  /** 侧边栏当前高亮的历史对话 id (null = 没选中, 显示首页) */
  activeHistoryId: string | null;
  /** 用户运行时新建的对话条目 (从底部输入框 / 示例 chip 启动的, 不含 mock HISTORY) */
  dynamicHistory: HistoryItem[];
  /** 聊天气泡 (intent=chat 时累积) — 跟 LUI / workflow 流程互斥, 走"对话模式" */
  chatBubbles: ChatBubble[];
  /** 是否正在做意图分类 (extract-params 调用中, 但还没确定走 task / chat) */
  classifying: boolean;
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
  | { type: "nextActionsState"; nextActions: NextActionsState }
  | { type: "compareSummaryState"; compareSummary: CompareSummaryState }
  | { type: "abnormalNarrationState"; abnormalNarration: AbnormalNarrationState }
  | { type: "paramsState"; params: ParamsState }
  | { type: "queryStart"; query: string; agent: AgentId; historyId?: string | null }
  | {
      type: "taskClassified";
      params: ExtractedParams;
      agent: AgentId;
      query: string;
      historyId?: string | null;
    }
  | { type: "chatPush"; bubble: ChatBubble }
  | { type: "classifyDone" }
  | { type: "resetSession" };

const askPairsCount = MERGE_PAIRS.filter((p) => p.action === "ask").length;

const initialState: DemoState = {
  agent: "a1",
  stage: "welcome",
  abnormal: "none",
  // PRD § 当前 mock 数据中 ask 类候选对数量见 askPairsCount, 反问预算 LUI_FOLLOWUP_BUDGET=5
  mergesConfirmed: 0,
  pendingIdx: 0,
  mergeAnswers: {},
  writebackOpen: false,
  writebackTaskId: null,
  handoffVuln: null,
  aiRanking: { kind: "idle" },
  nextActions: { kind: "idle" },
  compareSummary: { kind: "idle" },
  abnormalNarration: { kind: "idle" },
  userQuery: "",
  paramsState: { kind: "idle" },
  activeHistoryId: null,
  dynamicHistory: [],
  chatBubbles: [],
  classifying: false,
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
    case "writebackConfirm": {
      // PRD § 3.2.4 步骤 9 幂等: 已有 task_id 不重建, 直接返回 (同 session 同结果集)
      if (state.writebackTaskId) {
        return { ...state, writebackOpen: false, stage: "writeback-done" };
      }
      // 生成 task_id: RT-{YYYYMMDD}-{session 后 6 位}-{随机 3 位}
      const d = new Date();
      const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const seq = String(Math.floor(Math.random() * 900) + 100);
      const newId = `RT-${yyyymmdd}-mGqA31f-${seq}`;
      return {
        ...state,
        writebackOpen: false,
        stage: "writeback-done",
        writebackTaskId: newId,
      };
    }
    case "handoff":
      return { ...state, handoffVuln: action.vuln, stage: "handoff" };
    case "rankingState":
      return { ...state, aiRanking: action.ranking };
    case "nextActionsState":
      return { ...state, nextActions: action.nextActions };
    case "compareSummaryState":
      return { ...state, compareSummary: action.compareSummary };
    case "abnormalNarrationState":
      return { ...state, abnormalNarration: action.abnormalNarration };
    case "paramsState":
      return { ...state, paramsState: action.params };
    case "queryStart": {
      // 推一个 user bubble + classifying=true. 不碰主流程的 stage/agent/userQuery/paramsState.
      // 等 extract-params 返回:
      //   - intent=chat: 推 agent reply bubble, classifyDone, 主流程一点不动 (用户能边看结果边问问题)
      //   - intent=task: taskClassified action 全权重置 (跨 stage 也会重置)
      const userBubble: ChatBubble = {
        id: `u-${Date.now()}`,
        role: "user",
        text: action.query,
        ts: Date.now(),
      };
      return {
        ...state,
        chatBubbles: [...state.chatBubbles, userBubble],
        classifying: true,
      };
    }
    case "chatPush":
      return {
        ...state,
        chatBubbles: [...state.chatBubbles, action.bubble],
      };
    case "classifyDone":
      return { ...state, classifying: false };
    case "taskClassified": {
      // 意图分类完成且是任务 → 推进到 LUI 流程, 全量重置主流程状态 (跨 stage 重新发任务也对)
      const isReplay = action.historyId != null;
      let nextDynamic = state.dynamicHistory;
      let nextActiveId = action.historyId ?? state.activeHistoryId;
      if (!isReplay) {
        const newId = `dyn-${Date.now()}`;
        const title = action.query.length > 28 ? action.query.slice(0, 28) + "…" : action.query;
        const newItem: HistoryItem = {
          id: newId,
          t: title,
          tag: action.agent === "a2" ? "比对" : "排序",
          m: "刚刚",
          live: true,
        };
        nextDynamic = [
          newItem,
          ...state.dynamicHistory.map((h) => (h.live ? { ...h, live: false } : h)),
        ];
        nextActiveId = newId;
      }
      return {
        ...state,
        agent: action.agent,
        stage: "lui",
        abnormal: "none",
        userQuery: action.query,
        classifying: false,
        paramsState: { kind: "done", params: action.params },
        // 重置上一轮 task 的产物, 让新任务从干净状态开始
        aiRanking: { kind: "idle" },
        nextActions: { kind: "idle" },
        compareSummary: { kind: "idle" },
        abnormalNarration: { kind: "idle" },
        mergeAnswers: {},
        pendingIdx: 0,
        writebackTaskId: null,
        activeHistoryId: nextActiveId,
        dynamicHistory: nextDynamic,
      };
    }
    case "resetSession":
      // "新对话": 清掉当前会话状态, 把上一个 live 条目沉淀成"已结束"
      // (不清 dynamicHistory, 用户之前发起的对话历史保留)
      return {
        ...state,
        stage: "welcome",
        abnormal: "none",
        userQuery: "",
        paramsState: { kind: "idle" },
        aiRanking: { kind: "idle" },
        nextActions: { kind: "idle" },
        compareSummary: { kind: "idle" },
        abnormalNarration: { kind: "idle" },
        mergeAnswers: {},
        pendingIdx: 0,
        handoffVuln: null,
        writebackTaskId: null,
        activeHistoryId: null,
        dynamicHistory: state.dynamicHistory.map((h) => (h.live ? { ...h, live: false } : h)),
        chatBubbles: [],
        classifying: false,
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

  // A1 排序完成 → 后台调 /api/next-actions 拿 3 条针对性建议
  // 触发条件: aiRanking.kind 转成 done 后 (不管 source 是 ai 还是 mock 都要)
  useEffect(() => {
    if (state.aiRanking.kind !== "done") return;
    if (state.nextActions.kind === "loading" || state.nextActions.kind === "done") return;

    const top = state.aiRanking.ranked.slice(0, 5).map((r) => ({
      cve: r.cve,
      name: r.name,
      vptA: r.vptA,
      vptV: r.vptV,
      vptI: r.vptI,
      score: r.score,
      sceneTag: r.sceneTag,
      desc: r.desc,
    }));

    dispatch({ type: "nextActionsState", nextActions: { kind: "loading" } });
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 18000);

    fetch("/api/next-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: "运营商核心业务 (业务上线前 + 红蓝对抗前)",
        ranked: top,
      }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return (await r.json()) as NextActionsResponse;
      })
      .then((d) => {
        // eslint-disable-next-line no-console
        console.log(`[next-actions] ${d.source} ok, ${d.actions?.length ?? 0} items`);
        if (!d.actions || d.actions.length === 0) {
          dispatch({ type: "nextActionsState", nextActions: { kind: "error", reason: "empty" } });
          return;
        }
        dispatch({
          type: "nextActionsState",
          nextActions: { kind: "done", source: d.source, actions: d.actions },
        });
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : "unknown";
        // eslint-disable-next-line no-console
        console.warn(`[next-actions] fallback:`, reason);
        dispatch({ type: "nextActionsState", nextActions: { kind: "error", reason } });
      })
      .finally(() => clearTimeout(timeoutId));
  }, [state.aiRanking.kind, state.nextActions.kind]);

  // A2 进 final → 后台调 /api/compare-summary 拿汇总段落 + reflection 报告
  useEffect(() => {
    if (state.stage !== "final" || state.agent !== "a2") return;
    if (state.compareSummary.kind === "loading" || state.compareSummary.kind === "done") return;

    dispatch({ type: "compareSummaryState", compareSummary: { kind: "loading" } });
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 18000);

    // 从 mock 数据拿 stats 和 hits — A2 比对统计本身是 deterministic 数据 join, 不用 AI 算
    // 这里只让 AI 做 "语义化解读 + 反思校验报告" 这两段中文
    import("@/data/compare.mock")
      .then(({ COMPARE_STATS, A2_TOTAL_RAW, A2_ASSET_COUNT, PATCH_HITS }) =>
        fetch("/api/compare-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario: "组织结构 · 订单中心 多源漏洞清洗",
            assetScope: "组织结构 · 订单中心",
            assetCount: A2_ASSET_COUNT,
            totalRaw: A2_TOTAL_RAW,
            stats: COMPARE_STATS,
            mergesConfirmed: state.mergesConfirmed,
            partial: state.abnormal === "patch" || state.abnormal === "partial",
            hits: PATCH_HITS.map((h) => ({ cve: h.cve, name: h.name, patch: h.patch })),
          }),
          signal: ctrl.signal,
        })
      )
      .then(async (r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return (await r.json()) as CompareSummaryResponse;
      })
      .then((d) => {
        // eslint-disable-next-line no-console
        console.log(`[compare-summary] ${d.source} ok, taskName="${d.taskName ?? "(none)"}"`);
        if (!d.summary || !d.reflection) {
          dispatch({
            type: "compareSummaryState",
            compareSummary: { kind: "error", reason: "missing fields" },
          });
          return;
        }
        dispatch({
          type: "compareSummaryState",
          compareSummary: {
            kind: "done",
            source: d.source,
            summary: d.summary,
            reflection: d.reflection,
            taskName: d.taskName ?? "多源漏洞清洗比对",
          },
        });
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : "unknown";
        // eslint-disable-next-line no-console
        console.warn(`[compare-summary] fallback:`, reason);
        dispatch({ type: "compareSummaryState", compareSummary: { kind: "error", reason } });
      })
      .finally(() => clearTimeout(timeoutId));
  }, [state.stage, state.agent, state.compareSummary.kind, state.mergesConfirmed, state.abnormal]);

  // 异常 banner AI 实时叙事: state.abnormal 切到非-none 时调 /api/abnormal-narrate
  // 替代 AbnormalAlert.tsx 里 4 类的 MAP 死值 (PRD § 4.6 文案锁定要求作为 system prompt 基线)
  useEffect(() => {
    if (state.abnormal === "none") return;
    if (state.abnormalNarration.kind === "loading" || state.abnormalNarration.kind === "done") return;

    dispatch({ type: "abnormalNarrationState", abnormalNarration: { kind: "loading" } });
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 13000);

    // 拿当前 LUI 抽取的资产范围作为 context, 让叙事更具体
    const params = state.paramsState.kind === "done" ? state.paramsState.params : null;
    fetch("/api/abnormal-narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: state.abnormal,
        agent: state.agent,
        scenario: params?.businessTag ?? "未指定场景",
        assetScope: params?.assetScope,
        assetCount: params?.assetCount,
      }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return (await r.json()) as AbnormalNarrateResponse;
      })
      .then((d) => {
        // eslint-disable-next-line no-console
        console.log(`[abnormal-narrate] ${d.source} ok for kind=${state.abnormal}`);
        if (!d.title || !d.body || !d.footnote) {
          dispatch({
            type: "abnormalNarrationState",
            abnormalNarration: { kind: "error", reason: "missing fields" },
          });
          return;
        }
        dispatch({
          type: "abnormalNarrationState",
          abnormalNarration: {
            kind: "done",
            source: d.source,
            title: d.title,
            body: d.body,
            footnote: d.footnote,
          },
        });
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : "unknown";
        // eslint-disable-next-line no-console
        console.warn(`[abnormal-narrate] fallback:`, reason);
        dispatch({ type: "abnormalNarrationState", abnormalNarration: { kind: "error", reason } });
      })
      .finally(() => clearTimeout(timeoutId));
  }, [state.abnormal, state.agent, state.abnormalNarration.kind, state.paramsState]);

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
        console.log(`[extract-params] ${params.source} intent=${params.intent} conf=${params.confidence}`);
        if (params.intent === "chat") {
          // chat 分支: 推一个 agent reply bubble, 不走 LUI 流程
          dispatch({
            type: "chatPush",
            bubble: {
              id: `a-${Date.now()}`,
              role: "agent",
              text: params.reply ?? "我没太明白, 试试发个具体任务。",
              ts: Date.now(),
              source: params.source,
            },
          });
          dispatch({ type: "classifyDone" });
          return;
        }
        // task 分支 (a1 / a2): 用 AI 分类的 intent 覆盖前端启发式的 agent
        dispatch({
          type: "taskClassified",
          params,
          agent: params.intent,
          query: trimmed,
          historyId,
        });
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : "unknown";
        // eslint-disable-next-line no-console
        console.warn("[extract-params] failed:", reason);
        // 失败兜底: 按前端启发式当任务跑 (老路径)
        dispatch({ type: "paramsState", params: { kind: "error", reason } });
        dispatch({
          type: "set",
          patch: { stage: "lui", classifying: false },
        });
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
