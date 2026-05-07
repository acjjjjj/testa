import * as React from "react";

export type NodeStatus = "pending" | "active" | "done";

export interface DomainProps {
  name: string;
  ix: string;
  status?: "pending" | "active" | "done";
  children: React.ReactNode;
}

export function Domain({ name, ix, status, children }: DomainProps) {
  return (
    <div className="domain">
      <div className={`dh ${status === "active" ? "act" : ""}`}>
        <span className="ix">{ix}</span>
        <span>{name}</span>
        {status === "active" && <span className="live-dot" style={{ marginLeft: "auto" }} />}
      </div>
      <div className="nodes">{children}</div>
    </div>
  );
}

export interface NodeProps {
  status?: NodeStatus;
  tool?: boolean;
  meta?: React.ReactNode;
  children: React.ReactNode;
}

export function Node({ status = "pending", tool = false, meta, children }: NodeProps) {
  return (
    <div className={`node ${status} ${tool ? "tool" : ""}`}>
      <span className="marker" />
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {children}
      </span>
      {meta && <span className="meta">{meta}</span>}
    </div>
  );
}
