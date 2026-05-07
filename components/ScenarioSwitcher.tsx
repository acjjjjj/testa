"use client";

import * as React from "react";
import { useDemoStore } from "@/lib/store";

/**
 * 演示场景导览 (面向评审 / 领导)
 *
 * 这是给评审方一个全场景速览, 点击任意条目跳到对应 UI 状态查看,
 * 不是开发调试工具. 11 个场景里 5 个含 DeepSeek 实时调用, 标 [AI] 徽标.
 *
 * 默认关闭, 右下角 "演示导览" 按钮唤起.
 */
export function ScenarioSwitcher() {
  const [open, setOpen] = React.useState(false);
  const { set, openWriteback, resetFollowup } = useDemoStore();

  if (!open) {
    return (
      <button className="scn-fab" onClick={() => setOpen(true)} aria-label="演示导览">
        演示导览
      </button>
    );
  }

  return (
    <div className="scn-panel">
      <div className="scn-hd">
        <b>演示场景导览</b>
        <button className="scn-x" onClick={() => setOpen(false)} aria-label="关闭">
          ✕
        </button>
      </div>
      <div className="scn-body">
        <div className="scn-intro">
          v1 demo 覆盖 <b>11 个场景</b>, 其中 <b>5 个</b> 接通 DeepSeek 实时调用 (标
          <span className="scn-badge ai" style={{ marginLeft: 4 }}>
            AI
          </span>
          ). 点击查看对应 UI / AI 输出。
        </div>

        <div className="scn-sect">主流程</div>

        <button
          className="scn-btn"
          onClick={() => set({ agent: "a1", stage: "welcome", abnormal: "none" })}
        >
          <span>① 空主界面</span>
        </button>
        <button
          className="scn-btn"
          onClick={() => set({ agent: "a1", stage: "lui", abnormal: "none" })}
        >
          <span>② A1 LUI 参数填写</span>
          <span className="scn-badge ai">AI 抽参</span>
        </button>
        <button
          className="scn-btn"
          onClick={() => set({ agent: "a1", stage: "running", abnormal: "none" })}
        >
          <span>③ A1 工作流推进中</span>
        </button>
        <button
          className="scn-btn"
          onClick={() => set({ agent: "a1", stage: "final", abnormal: "none" })}
        >
          <span>④ A1 排序结果</span>
          <span className="scn-badge ai">AI × 2</span>
        </button>
        <button className="scn-btn" onClick={resetFollowup}>
          <span>⑤ A2 LUI 反问</span>
          <span className="scn-badge ai">AI 相似度</span>
        </button>
        <button
          className="scn-btn"
          onClick={() => set({ agent: "a2", stage: "final", abnormal: "none" })}
        >
          <span>⑥ A2 比对结果</span>
          <span className="scn-badge ai">AI × 2</span>
        </button>

        <div className="scn-sect">异常 / 边界</div>

        <button
          className="scn-btn secondary"
          onClick={() => set({ agent: "a2", stage: "final", abnormal: "partial" })}
        >
          <span>⑦ partial 异常 (写回置灰)</span>
        </button>
        <button
          className="scn-btn secondary"
          onClick={() => set({ agent: "a2", stage: "final", abnormal: "patch" })}
        >
          <span>⑧ 补丁库不可用</span>
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
          <span>⑨ A1 → A2 串联桥</span>
        </button>
        <button
          className="scn-btn secondary"
          onClick={() => {
            set({ agent: "a2", stage: "final", abnormal: "none" });
            openWriteback();
          }}
        >
          <span>⑩ 写回确认弹窗</span>
        </button>
        <button
          className="scn-btn secondary"
          onClick={() => set({ agent: "a2", stage: "writeback-done", abnormal: "none" })}
        >
          <span>⑪ 写回成功态</span>
        </button>
      </div>
    </div>
  );
}
