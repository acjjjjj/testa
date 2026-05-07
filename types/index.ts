export type AgentId = "a1" | "a2";

export type Stage =
  | "welcome"
  | "lui"
  | "running"
  | "reflect"
  | "followup"
  | "final"
  | "handoff"
  | "writeback-done";

/** Result quality state for agent 2 */
export type ResultState = "normal" | "partial" | "failed";

/** Abnormal scenarios (mapped onto banners + behavior gates) */
export type AbnormalKind = "none" | "timeout" | "patch" | "partial" | "budget";

export interface Asset {
  id: string;
  ip: string;
  group: string;
  fingerprint: string;
}

export interface Vulnerability {
  cve: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  desc: string;
}

export interface RankedVuln {
  rk: number;
  cve: string;
  name: string;
  asset: string;
  /** VPT 三维基线分 */
  vptA: number; // 资产属性
  vptV: number; // 漏洞属性
  vptI: number; // 情报属性
  /** VPT 基线分 */
  base: number;
  /** 场景权重 */
  sceneWeight: number;
  /** 命中场景标签 */
  sceneTag: string;
  /** 综合排序分 = min(base * sceneWeight, 10) */
  score: number;
  desc: string;
}

export type DataSource = "内部漏洞库" | "威胁情报" | "CVE" | "CNNVD";

export type MergeAction = "auto" | "ask" | "no";
export type MergeAnswer = "yes" | "no" | "queue";

export interface MergeSide {
  src: DataSource;
  id: string;
  nm: string;
}

export interface MergePair {
  id: number;
  /** 相似度 0..1 */
  conf: number;
  action: MergeAction;
  a: MergeSide;
  b: MergeSide;
}

export interface PatchHit {
  cve: string;
  name: string;
  asset: string;
  /** 命中维度: cpe / 版本号 / 组件指纹 */
  dim: string;
  /** 命中置信度 */
  conf: number;
  patch: "已有补丁" | "待发布" | "暂无";
  src: DataSource[];
}

export interface CompareStats {
  added: number;
  merged: number;
  dup: number;
  skip: number;
}

export interface HistoryItem {
  id: string;
  t: string;
  m: string;
  tag: "排序" | "比对";
  live?: boolean;
}

export interface WorkflowToolCall {
  tn: string;
  ar: string;
  rt: string;
}
