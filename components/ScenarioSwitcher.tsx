"use client";

import * as React from "react";
import { useDemoStore } from "@/lib/store";
import type { AgentId, Stage, AbnormalKind } from "@/types";

const STAGES: Stage[] = [
  "welcome",
  "lui",
  "running",
  "reflect",
  "followup",
  "final",
  "handoff",
  "writeback-done",
];
const ABNORMALS: AbnormalKind[] = ["none", "timeout", "patch", "partial", "budget"];

/**
 * 场景跳转面板 — 替代原型里的 Tweaks 面板。
 * 默认关闭, 右下角 "场景" 按钮唤起。
 */
export function ScenarioSwitcher() {
  const [open, setOpen] = React.useState(false);
  const { state, set, openWriteback, resetFollowup } = useDemoStore();
  const { agent, stage, abnormal } = state;

  if (!open) {
    return (
      <button className="scn-fab" onClick={() => setOpen(true)} aria-label="场景跳转">
        场景
      </button>
    );
  }

  return (
    <div className="scn-panel">
      <div className="scn-hd">
        <b>场景跳转</b>
        <button className="scn-x" onClick={() => setOpen(false)} aria-label="关闭">
          ✕
        </button>
      </div>
      <div className="scn-body">
        <div className="scn-sect">场景</div>

        <div className="scn-row">
          <div className="scn-lbl">Agent</div>
          <select
            className="scn-field"
            value={agent}
            onChange={(e) => set({ agent: e.target.value as AgentId })}
          >
            <option value="a1">a1 · 智能风险排序</option>
            <option value="a2">a2 · 智能风险排查比对</option>
          </select>
        </div>

        <div className="scn-row">
          <div className="scn-lbl">阶段</div>
          <select
            className="scn-field"
            value={stage}
            onChange={(e) => set({ stage: e.target.value as Stage })}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="scn-row">
          <div className="scn-lbl">异常路径</div>
          <select
            className="scn-field"
            value={abnormal}
            onChange={(e) => set({ abnormal: e.target.value as AbnormalKind })}
          >
            {ABNORMALS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="scn-sect">快速场景</div>

        <button
          className="scn-btn"
          onClick={() => set({ agent: "a1", stage: "welcome", abnormal: "none" })}
        >
          ① 空主界面
        </button>
        <button
          className="scn-btn"
          onClick={() => set({ agent: "a1", stage: "lui", abnormal: "none" })}
        >
          ② A1 LUI 参数填写
        </button>
        <button
          className="scn-btn"
          onClick={() => set({ agent: "a1", stage: "running", abnormal: "none" })}
        >
          ③ A1 工作流推进中
        </button>
        <button
          className="scn-btn"
          onClick={() => set({ agent: "a1", stage: "final", abnormal: "none" })}
        >
          ④ A1 排序结果
        </button>
        <button className="scn-btn" onClick={resetFollowup}>
          ⑤ A2 LUI 反问
        </button>
        <button
          className="scn-btn"
          onClick={() => set({ agent: "a2", stage: "final", abnormal: "none" })}
        >
          ⑥ A2 比对结果
        </button>

        <div className="scn-sect">异常 / 边界</div>

        <button
          className="scn-btn secondary"
          onClick={() => set({ agent: "a2", stage: "final", abnormal: "partial" })}
        >
          ⑦ partial 异常 (写回置灰)
        </button>
        <button
          className="scn-btn secondary"
          onClick={() => set({ agent: "a2", stage: "final", abnormal: "patch" })}
        >
          ⑧ 补丁库不可用
        </button>
        <button
          className="scn-btn secondary"
          onClick={() =>
            set({
              agent: "a1",
              stage: "handoff",
              abnormal: "none",
              handoffVuln: {
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
              },
            })
          }
        >
          ⑨ A1 → A2 串联桥
        </button>
        <button
          className="scn-btn secondary"
          onClick={() => {
            set({ agent: "a2", stage: "final", abnormal: "none" });
            openWriteback();
          }}
        >
          ⑩ 写回确认弹窗
        </button>
        <button
          className="scn-btn secondary"
          onClick={() => set({ agent: "a2", stage: "writeback-done", abnormal: "none" })}
        >
          ⑪ 写回成功态
        </button>
      </div>
    </div>
  );
}
