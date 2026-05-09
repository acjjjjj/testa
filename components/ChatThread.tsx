"use client";

import * as React from "react";
import { useDemoStore } from "@/lib/store";
import { defaultUserQueryFor } from "@/lib/workflowState";
import { Welcome } from "./Welcome";
import { LuiParamCardA1 } from "./LuiParamCardA1";
import { LuiParamCardA2 } from "./LuiParamCardA2";
import { RunningBubble } from "./RunningBubble";
import { LuiFollowupCard } from "./LuiFollowupCard";
import { RiskRankingResult } from "./RiskRankingResult";
import { RiskCompareResult } from "./RiskCompareResult";
import { AbnormalAlert } from "./AbnormalAlert";
import { HandoffBridge } from "./HandoffBridge";
import { WritebackDoneCard } from "./WritebackDoneCard";
import { useToast } from "./Toast";

/** 主对话区 — 根据 stage 渲染不同 bubble 序列 */
export function ChatThread() {
  const { state, setStage, set, openWriteback, handoffTo, startWithQuery, startAgent } =
    useDemoStore();
  const { stage, agent, abnormal, handoffVuln, userQuery } = state;
  const toast = useToast();

  // PRD § 3.2.4 步骤 9 写回幂等: 已有 task_id → 不再弹确认弹窗, toast 提示并跳到 writeback-done
  const handleWriteback = () => {
    if (state.writebackTaskId) {
      toast.show(
        `已写回 · task_id=${state.writebackTaskId} · 同 session 同结果集去重 (PRD § 3.2.4 步骤 9)`,
        "info"
      );
      setStage("writeback-done");
      return;
    }
    openWriteback();
  };

  /**
   * A1 → A2 串联: 把 handoffVuln 的信息真带进 A2
   * - userQuery 改成基于 cve 的描述, 进 LUI 的用户消息气泡
   * - paramsState 直接预填好, 不用再调 /api/extract-params
   * - assetScope 锁单资产 (handoff 场景就是定向排查, 不再扩展)
   */
  const handleHandoffContinue = () => {
    const v = handoffVuln;
    if (!v) {
      set({ agent: "a2", stage: "lui", abnormal: "none" });
      return;
    }
    const luiQuery = `针对 A1 排序结果 ${v.cve} (${v.name}) 在 ${v.asset} 上做多源漏洞比对, 结合补丁库判断处置可行性`;
    set({
      agent: "a2",
      stage: "lui",
      abnormal: "none",
      userQuery: luiQuery,
      paramsState: {
        kind: "done",
        params: {
          source: "ai",
          intent: "a2",
          confidence: 0.95,
          assetScope: v.asset,
          assetCount: 1,
          severity: "高危",
          timeWindow: "实时",
          businessTag: v.sceneTag,
          sceneWeight: v.sceneWeight,
          dataSources: ["内部漏洞库", "CVE", "威胁情报"],
          compareDims: ["cpe", "版本号", "组件指纹"],
          withPatch: true,
        },
      },
    });
    toast.show(
      `已带入 ${v.cve} 上下文到 Agent 2 · 资产锁定 ${v.asset} · 场景 ${v.sceneTag}`,
      "info"
    );
  };

  // 复用的 chat 气泡渲染 (welcome 与 非-welcome 都用)
  const renderChatBubbles = () => (
    <>
      {state.chatBubbles.map((b) =>
        b.role === "user" ? (
          <div key={b.id} className="msg user">
            <div className="av">An</div>
            <div className="body">
              <div className="who">
                <b>An</b>
                <span className="dim2">
                  {new Date(b.ts).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="text">{b.text}</div>
            </div>
          </div>
        ) : (
          <div key={b.id} className="msg agent">
            <div className="av">哨</div>
            <div className="body">
              <div className="who">
                <b>哨兵 AI 助手</b>
                {b.source === "ai" ? (
                  <span style={chatAiBadgeStyle}>DeepSeek 回复</span>
                ) : (
                  <span style={chatMockBadgeStyle}>mock 兜底</span>
                )}
                <span className="dim2">
                  {new Date(b.ts).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="text">{b.text}</div>
            </div>
          </div>
        )
      )}
      {state.classifying && (
        <div className="msg agent">
          <div className="av">哨</div>
          <div className="body">
            <div className="who">
              <b>哨兵 AI 助手</b>
              <span className="dim2">正在分析意图…</span>
            </div>
            <div
              className="text dim"
              style={{ fontStyle: "italic", color: "var(--fg-3)" }}
            >
              DeepSeek 正在判断这是任务请求还是一般对话…
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (stage === "welcome") {
    // 欢迎页: 有 chat 气泡 → 显示气泡; 否则 Welcome 卡
    const hasChat = state.chatBubbles.length > 0 || state.classifying;
    return (
      <div style={convAreaStyle}>
        <div style={convInnerStyle}>
          {hasChat ? (
            renderChatBubbles()
          ) : (
            <Welcome onPick={(a) => startAgent(a)} onAsk={(text) => startWithQuery(text, "a1")} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={convAreaStyle}>
      <div style={convInnerStyle}>
        {/* 用户消息 — 时间用当前时间, 跟下方 chat 气泡保持一致 (避免硬编码) */}
        <div className="msg user">
          <div className="av">An</div>
          <div className="body">
            <div className="who">
              <b>An</b>
              <span className="dim2">
                {new Date().toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="text">{userQuery || defaultUserQueryFor(agent)}</div>
          </div>
        </div>

        {/* LUI 参数卡片 */}
        {stage === "lui" &&
          (agent === "a1" ? (
            <LuiParamCardA1 onSubmit={() => setStage("running")} onCancel={() => setStage("welcome")} />
          ) : (
            <LuiParamCardA2 onSubmit={() => setStage("running")} onCancel={() => setStage("welcome")} />
          ))}

        {/* Running / reflect / followup → 头部气泡 */}
        {(stage === "running" || stage === "reflect" || stage === "followup") && (
          <RunningBubble agent={agent} stage={stage} />
        )}

        {/* 异常 banner */}
        {abnormal !== "none" &&
          (stage === "running" || stage === "reflect" || stage === "final") && (
            <AbnormalAlert kind={abnormal} />
          )}

        {/* Agent 2 LUI 反问 */}
        {stage === "followup" && agent === "a2" && abnormal === "none" && <LuiFollowupCard />}

        {/* 最终结果 */}
        {stage === "final" &&
          (agent === "a1" ? (
            <RiskRankingResult
              onHandoff={(v) => {
                handoffTo(v);
              }}
            />
          ) : (
            <RiskCompareResult
              partial={abnormal === "patch" || abnormal === "partial"}
              onWriteback={handleWriteback}
            />
          ))}

        {/* A1 → A2 串联 */}
        {stage === "handoff" && (
          <HandoffBridge
            vuln={
              handoffVuln ?? {
                rk: 1,
                cve: "CVE-2024-44308",
                name: "Apache OFBiz 反序列化 RCE",
                asset: "order-svc-prod-07 / 10.42.18.7",
                vptA: 8.6,
                vptV: 9.4,
                vptI: 9.1,
                base: 9.0,
                sceneWeight: 1.2,
                sceneTag: "红蓝对抗前",
                score: 10,
                desc: "公网可达, 已观察到 PoC 武器化, 红蓝对抗演练前重点处置",
              }
            }
            onContinue={handleHandoffContinue}
          />
        )}

        {/* 写回成功气泡 */}
        {stage === "writeback-done" && <WritebackDoneCard />}

        {/* 任意阶段: 中途插入的 chat 气泡 (用户在流程中问 chat-intent 问题, 不打断主流程) */}
        {(state.chatBubbles.length > 0 || state.classifying) && (
          <div style={chatSectionStyle}>
            <div style={chatSectionTitleStyle}>对话 · {state.chatBubbles.length} 条</div>
            {renderChatBubbles()}
          </div>
        )}
      </div>
    </div>
  );
}

const chatAiBadgeStyle: React.CSSProperties = {
  fontSize: 10.5,
  padding: "1px 6px",
  borderRadius: 999,
  background: "color-mix(in oklab, var(--mint) 22%, var(--bg-3))",
  color: "var(--mint)",
};

const chatMockBadgeStyle: React.CSSProperties = {
  fontSize: 10.5,
  padding: "1px 6px",
  borderRadius: 999,
  background: "color-mix(in oklab, var(--amber) 22%, var(--bg-3))",
  color: "var(--amber)",
};

const chatSectionStyle: React.CSSProperties = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px dashed var(--line-2)",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const chatSectionTitleStyle: React.CSSProperties = {
  fontSize: 10.5,
  textTransform: "uppercase",
  letterSpacing: ".1em",
  color: "var(--fg-3)",
};

const convAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 24px 24px",
  minHeight: 0,
};
const convInnerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 980,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 18,
  paddingBottom: 24,
};
