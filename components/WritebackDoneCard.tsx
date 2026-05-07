import * as React from "react";
import { Badge } from "./Badge";
import { Icon } from "./Icon";

/** 写回成功气泡 */
export function WritebackDoneCard() {
  return (
    <div className="msg agent a2">
      <div className="av">A2</div>
      <div className="body">
        <div className="who">
          <b>智能风险排查比对</b>
          <Badge tone="mint">已写回</Badge>
          <span className="dim2 mono">task_id risk-task-2026050401</span>
        </div>
        <div className="text">
          已写回 <b>鉴微 insight · 风险排查</b> 模块, 任务 ID{" "}
          <span className="mono em">risk-task-2026050401</span>, 状态 <span className="em">待确认</span>, 7 字段映射全部命中。
        </div>
        <div className="card">
          <div className="ch">
            <div className="t">
              <Icon name="pin" size={13} />
              <span>写回结果</span>
            </div>
            <div className="m">
              <Badge tone="mint" dot={false}>
                insight 已接收
              </Badge>
            </div>
          </div>
          <div className="cb" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="dim2">任务名称</span>
              <span className="mono em">订单中心 多源漏洞清洗 · 2026-05-04</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="dim2">匹配漏洞数</span>
              <span className="mono em">412</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="dim2">状态</span>
              <span>
                <Badge tone="amber" dot={false}>
                  待确认
                </Badge>
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="dim2">创建时间</span>
              <span className="mono">2026-05-04 10:43:21</span>
            </div>
          </div>
        </div>
        <div className="ops">
          <button className="pr">
            <Icon name="jump" size={12} /> 跳转 风险排查 模块查看任务
          </button>
          <span className="sp" />
          <span className="meta">单次 idempotent · 重复点击不产生新任务</span>
        </div>
      </div>
    </div>
  );
}
