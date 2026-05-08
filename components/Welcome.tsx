"use client";

import * as React from "react";
import { Icon } from "./Icon";
import type { AgentId } from "@/types";

export interface WelcomeProps {
  onPick: (a: AgentId) => void;
  onAsk: (text: string) => void;
}

/** 主界面欢迎页 — 显示双 agent 卡片 + 示例 */
export function Welcome({ onPick, onAsk }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="greet">
        早上好, <span className="accent">An</span>
        <div className="sub">把人工跑 SQL / Excel 的事交给 agent。 用自然语言描述目标, 选一个能力开始。</div>
      </div>

      <div className="agents">
        <div className="acard a1" onClick={() => onPick("a1")}>
          <div className="head">
            <div className="ico">A1</div>
            <div>
              <h3>智能风险排序</h3>
              <div className="tag-l">局部数据 · vpt 三维加权 · 场景识别</div>
            </div>
          </div>
          <p>
            在用户给定的局部漏洞数据范围里, 按 vpt 三维做智能加权排序, 输出带场景权重的细粒度优先级列表。
          </p>
          <div className="params">
            <span className="p">资产范围</span>
            <span className="p">漏洞等级</span>
            <span className="p">时间窗口</span>
            <span className="p">特殊业务标签</span>
          </div>
          <div className="cta">
            <span className="ex">P95 ≤ 30s · 输入 ≤ 1000 条</span>
            <span className="go">
              开始 <Icon name="arrow" size={12} />
            </span>
          </div>
        </div>

        <div className="acard a2" onClick={() => onPick("a2")}>
          <div className="head">
            <div className="ico">A2</div>
            <div>
              <h3>智能风险排查比对</h3>
              <div className="tag-l">资产指纹 × 多源漏洞库 · 去重 · 补丁联动</div>
            </div>
          </div>
          <p>
            给定资产范围, 自动完成多源数据归集 + 指纹 × 漏洞库碰撞 + 去重清洗 + 补丁可行性提示, 一键写回风险排查模块。
          </p>
          <div className="params">
            <span className="p">资产范围</span>
            <span className="p">数据源选择</span>
            <span className="p">比对维度</span>
            <span className="p">是否结合补丁库</span>
          </div>
          <div className="cta">
            <span className="ex">P95 ≤ 60s · 资产 ≤ 100 / 候选对 ≤ 500</span>
            <span className="go">
              开始 <Icon name="arrow" size={12} />
            </span>
          </div>
        </div>
      </div>

      <div className="examples">
        <button
          className="example-btn"
          onClick={() => onAsk("排序 运营商核心业务线在重要业务上线前的所有高危漏洞")}
        >
          <span className="k">示例 · 排序</span>
          排序 运营商核心业务线在重要业务上线前的所有高危漏洞
        </button>
        <button
          className="example-btn"
          onClick={() =>
            onAsk("对 192.168.1.1 资产或组织结构 A 下的所有资产的不同来源漏洞进行清洗合并")
          }
        >
          <span className="k">示例 · 比对</span>
          对 192.168.1.1 资产或组织结构 A 下所有资产的多源漏洞清洗合并
        </button>
        <button
          className="example-btn"
          onClick={() => onAsk("红蓝对抗前需要紧急处置的互联网暴露资产 0day")}
        >
          <span className="k">示例 · 排序</span>
          红蓝对抗前需要紧急处置的互联网暴露资产 0day
        </button>
      </div>

      {/* chat 引导: 让 chat 端点有曝光, 不然领导基本不会去戳 */}
      <div className="welcome-chat-hint">
        <span className="k">提示</span>
        也可以直接问哨兵, 例如{" "}
        <button className="hint-pill" onClick={() => onAsk("什么是 VPT 三维加权?")}>
          &quot;什么是 VPT?&quot;
        </button>{" "}
        <button className="hint-pill" onClick={() => onAsk("哨兵 AI 助手能干啥?")}>
          &quot;哨兵能干啥?&quot;
        </button>{" "}
        <button className="hint-pill" onClick={() => onAsk("帮我介绍一下 v1 demo 的 AI 接通范围")}>
          &quot;介绍一下 demo&quot;
        </button>
      </div>
    </div>
  );
}
