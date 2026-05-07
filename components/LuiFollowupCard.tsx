"use client";

import * as React from "react";
import { useDemoStore } from "@/lib/store";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { MERGE_PAIRS } from "@/data/compare.mock";
import { LUI_FOLLOWUP_BUDGET } from "@/lib/scoring";

/** /api/similarity 返回的形状 */
type SimilarityEval = {
  score: number;
  reason: string;
  source: "ai" | "mock";
  model?: string;
};

type EvalState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; data: SimilarityEval };

/** Agent 2 LUI 反问卡 — 中置信单对确认 + 队列预览 + 真 AI 相似度判断 */
export function LuiFollowupCard() {
  const { state, answerMerge } = useDemoStore();
  const askPairs = MERGE_PAIRS.filter((p) => p.action === "ask");
  const cur = askPairs[state.pendingIdx];
  const queueRest = askPairs.slice(state.pendingIdx + 1);

  // 每对的 AI 评估缓存, key = pair.id
  const [evals, setEvals] = React.useState<Record<number, EvalState>>({});
  const curEval: EvalState = cur ? evals[cur.id] ?? { kind: "idle" } : { kind: "idle" };

  // 当前对切换时, 自动触发一次 AI 评估
  React.useEffect(() => {
    if (!cur) return;
    if (evals[cur.id]) return; // 已经评估过 / 正在评估
    runEval(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id]);

  async function runEval(pair: typeof MERGE_PAIRS[number], force = false) {
    if (!force && evals[pair.id]?.kind === "loading") return;
    setEvals((s) => ({ ...s, [pair.id]: { kind: "loading" } }));
    try {
      const res = await fetch("/api/similarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          a: pair.a,
          b: pair.b,
          fallbackScore: Math.round(pair.conf * 100),
        }),
      });
      const data = (await res.json()) as SimilarityEval;
      setEvals((s) => ({ ...s, [pair.id]: { kind: "done", data } }));
    } catch {
      // 网络层面挂了, 兜底显示 mock 分
      setEvals((s) => ({
        ...s,
        [pair.id]: {
          kind: "done",
          data: {
            score: Math.round(pair.conf * 100),
            reason: "前端兜底: 厂商名 / cpe / 版本号交集命中",
            source: "mock",
          },
        },
      }));
    }
  }

  if (!cur) return null;

  // 渲染分数: 优先用 AI 结果, 否则用 mock conf
  const displayScore =
    curEval.kind === "done" ? curEval.data.score : Math.round(cur.conf * 100);
  const displayReason =
    curEval.kind === "done"
      ? curEval.data.reason
      : "厂商名归一化 ✓ · cpe 匹配 ✓ · 版本号交集 ✓";
  const isAi = curEval.kind === "done" && curEval.data.source === "ai";
  const isLoading = curEval.kind === "loading";

  return (
    <div className="msg agent a2">
      <div className="av">A2</div>
      <div className="body">
        <div className="who">
          <b>智能风险排查比对</b>
          <Badge tone="amber">LUI 反问 · 中置信合并</Badge>
          <span className="dim2">
            {state.pendingIdx + 1} / {askPairs.length} · 预算 {LUI_FOLLOWUP_BUDGET} 次
          </span>
        </div>
        <div className="text dim">
          命中相似度落 <span className="mono em">90% ~ 95%</span>, 需要你确认是否合并。
          <span className="mono"> ≥ 95%</span> 自动合并,
          <span className="mono"> &lt; 90%</span> 不合并。
        </div>

        <div className="card">
          <div className="ch">
            <div className="t">
              <Icon name="flow" size={13} />
              <span>候选合并对 #{cur.id}</span>
            </div>
            <div className="m">
              {isLoading ? (
                <Badge tone="amber">大模型评估中…</Badge>
              ) : isAi ? (
                <Badge tone="mint">DeepSeek · score {displayScore}</Badge>
              ) : (
                <Badge tone="amber">conf {(displayScore / 100).toFixed(2)}</Badge>
              )}
            </div>
          </div>
          <div className="cb">
            <div className="mpair">
              <div className="col">
                <div className="src">{cur.a.src}</div>
                <div className="id">{cur.a.id}</div>
                <div className="nm">{cur.a.nm}</div>
              </div>
              <div className="arr">⇄</div>
              <div className="col">
                <div className="src">{cur.b.src}</div>
                <div className="id">{cur.b.id}</div>
                <div className="nm">{cur.b.nm}</div>
              </div>
            </div>

            <div className="ask">
              <div className="q">
                <b>是否确认合并?</b> 合并相似度{" "}
                <span className="mono em">{displayScore}%</span>, 落{" "}
                <span className="mono">90% ~ 95%</span> 中置信区间 (
                <span className="mono">risk_dedupe_threshold</span>)
              </div>
              <div className="actions">
                <button className="" onClick={() => answerMerge(cur.id, "no")}>
                  不合并
                </button>
                <button className="q" onClick={() => answerMerge(cur.id, "queue")}>
                  加入待审核
                </button>
                <button className="y" onClick={() => answerMerge(cur.id, "yes")}>
                  合并
                </button>
              </div>
            </div>

            <div className="dim2" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.6 }}>
              <span className="mono">
                {isAi ? "AI 判断" : isLoading ? "AI 调用中" : "命中依据"}
              </span>{" "}
              ·{" "}
              {isLoading ? (
                <span>正在调用 DeepSeek 大模型对漏洞描述做语义相似度判断…</span>
              ) : (
                <>
                  <span>{displayReason}</span>
                  {!isAi && curEval.kind === "done" && (
                    <button
                      type="button"
                      onClick={() => runEval(cur, true)}
                      style={{
                        marginLeft: 8,
                        padding: "2px 8px",
                        fontSize: 10.5,
                        background: "transparent",
                        border: "1px solid var(--line)",
                        borderRadius: 999,
                        color: "var(--fg-2)",
                        cursor: "pointer",
                      }}
                    >
                      重新评估
                    </button>
                  )}
                </>
              )}
            </div>

            {queueRest.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
                <div
                  className="dim2"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}
                >
                  待确认队列 · {queueRest.length} 对
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {queueRest.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 10px",
                        background: "var(--bg-3)",
                        border: "1px solid var(--line)",
                        borderRadius: 7,
                        fontSize: 11.5,
                      }}
                    >
                      <span className="mono dim">#{p.id}</span>
                      <span className="mono em">{p.a.id}</span>
                      <span className="dim2">⇄</span>
                      <span className="mono em">{p.b.id}</span>
                      <span style={{ marginLeft: "auto" }}>
                        <Badge tone="amber" dot={false}>
                          conf {(p.conf * 100).toFixed(0)}%
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
