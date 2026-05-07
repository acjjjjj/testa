import type { CompareStats, MergePair, PatchHit } from "@/types";

/** Agent 2 比对统计 (mock) */
export const COMPARE_STATS: CompareStats = {
  added: 412,
  merged: 128,
  dup: 36,
  skip: 14,
};

/** Agent 2 总样本量 (mock) — 共 590 = added + merged + dup + skip */
export const A2_TOTAL_RAW = COMPARE_STATS.added + COMPARE_STATS.merged + COMPARE_STATS.dup + COMPARE_STATS.skip;

/** Agent 2 资产数 (mock) */
export const A2_ASSET_COUNT = 64;

/**
 * 候选合并对 — action 由 conf 阈值决定:
 *   conf ≥ 0.95 → auto
 *   0.90 ≤ conf < 0.95 → ask (LUI 反问)
 *   conf < 0.90 → no
 *
 * 见 lib/scoring.ts → mergeActionFor()
 */
export const MERGE_PAIRS: MergePair[] = [
  { id: 1, conf: 0.97, action: "auto",
    a: { src: "内部漏洞库", id: "INT-2024-08-1124", nm: "Apache Struts2 OGNL RCE" },
    b: { src: "CVE",        id: "CVE-2023-50164", nm: "Apache Struts S2-066 路径遍历致 RCE" } },
  { id: 2, conf: 0.96, action: "auto",
    a: { src: "威胁情报",   id: "TI-2024-03-2188", nm: "XZ Utils 5.6.0/5.6.1 后门" },
    b: { src: "CVE",        id: "CVE-2024-3094",   nm: "XZ Utils malicious code in upstream tarballs" } },
  { id: 3, conf: 0.92, action: "ask",
    a: { src: "CNNVD",      id: "CNNVD-202401-2914", nm: "OpenSSH 远程代码执行漏洞" },
    b: { src: "CVE",        id: "CVE-2024-6387",     nm: "OpenSSH server (sshd) signal handler race" } },
  { id: 4, conf: 0.91, action: "ask",
    a: { src: "内部漏洞库", id: "INT-2024-04-0307", nm: "Confluence 数据中心权限提升" },
    b: { src: "CVE",        id: "CVE-2023-22515",   nm: "Atlassian Confluence Broken Access Control" } },
  { id: 5, conf: 0.78, action: "no",
    a: { src: "威胁情报",   id: "TI-2024-05-3019", nm: "Apache OFBiz 反序列化" },
    b: { src: "CVE",        id: "CVE-2024-44308",  nm: "Apache OFBiz Insecure deserialization in screen rendering" } },
];

/** 命中漏洞 · 补丁可行性 */
export const PATCH_HITS: PatchHit[] = [
  { cve: "CVE-2024-44308", name: "Apache OFBiz 反序列化", asset: "order-svc-prod-07", dim: "cpe + 版本号", conf: 0.94, patch: "已有补丁", src: ["内部漏洞库", "CVE"] },
  { cve: "CVE-2024-3094",  name: "XZ Utils 后门",         asset: "edge-gw-bj-03",     dim: "组件指纹",     conf: 0.91, patch: "已有补丁", src: ["威胁情报", "CVE"] },
  { cve: "CVE-2024-6387",  name: "OpenSSH regreSSHion",   asset: "jumphost-sh-01",    dim: "cpe + 版本号", conf: 0.86, patch: "已有补丁", src: ["内部漏洞库", "CVE", "CNNVD"] },
  { cve: "CVE-2024-21626", name: "runc 容器逃逸",         asset: "k8s-node-prod-12",  dim: "组件指纹",     conf: 0.83, patch: "已有补丁", src: ["CVE"] },
  { cve: "CVE-2023-50164", name: "Struts2 路径遍历",      asset: "crm-web-04",        dim: "cpe",          conf: 0.82, patch: "已有补丁", src: ["内部漏洞库", "CVE"] },
  { cve: "CVE-2023-22515", name: "Confluence 权限提升",   asset: "wiki-conf-01",      dim: "版本号",       conf: 0.76, patch: "已有补丁", src: ["内部漏洞库", "CVE"] },
  { cve: "CVE-2024-27198", name: "TeamCity 鉴权绕过",     asset: "cicd-tc-prod-01",   dim: "cpe + 版本号", conf: 0.71, patch: "待发布",   src: ["威胁情报", "CVE"] },
  { cve: "CVE-2024-23897", name: "Jenkins 任意文件读",    asset: "cicd-jenkins-bj-02", dim: "版本号",       conf: 0.68, patch: "暂无",     src: ["CVE"] },
];
