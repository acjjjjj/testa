import type { RankedVuln } from "@/types";
import { computeFinalScore } from "@/lib/scoring";

/**
 * Agent 1 智能风险排序 — 输出 mock
 *
 * 基线分 base = (vptA + vptV + vptI) / 3 的近似值, 这里以策划好的演示数据为准。
 * 综合排序分 score = min(base × sceneWeight, 10)。
 */
const RAW: Omit<RankedVuln, "score">[] = [
  { rk: 1, cve: "CVE-2024-44308", name: "Apache OFBiz 反序列化 RCE",
    asset: "order-svc-prod-07 / 10.42.18.7",
    vptA: 8.6, vptV: 9.4, vptI: 9.1, base: 9.0, sceneWeight: 1.20, sceneTag: "红蓝对抗前",
    desc: "公网可达, 已观察到 PoC 武器化, 红蓝对抗演练前重点处置" },
  { rk: 2, cve: "CVE-2024-3094", name: "XZ Utils 后门 (liblzma)",
    asset: "edge-gw-bj-03 / 10.42.2.21",
    vptA: 8.2, vptV: 9.6, vptI: 8.8, base: 8.9, sceneWeight: 1.20, sceneTag: "红蓝对抗前",
    desc: "供应链投毒, sshd 链路命中, 必须立即下线或回滚" },
  { rk: 3, cve: "CVE-2023-50164", name: "Apache Struts2 路径遍历致 RCE",
    asset: "crm-web-04 / 172.20.4.18",
    vptA: 7.8, vptV: 9.2, vptI: 7.6, base: 8.2, sceneWeight: 1.20, sceneTag: "红蓝对抗前",
    desc: "公网暴露, 现成 EXP, 业务系统 CRM 关键资产" },
  { rk: 4, cve: "CVE-2024-21626", name: "runc 容器逃逸",
    asset: "k8s-node-prod-12 / 10.42.30.102",
    vptA: 7.2, vptV: 8.6, vptI: 6.4, base: 7.4, sceneWeight: 1.20, sceneTag: "红蓝对抗前",
    desc: "生产容器节点, 横向移动跳板, 红蓝对抗前优先" },
  { rk: 5, cve: "CVE-2024-6387", name: "OpenSSH regreSSHion 信号竞争",
    asset: "jumphost-sh-01 / 10.42.0.19",
    vptA: 8.4, vptV: 7.8, vptI: 7.2, base: 7.8, sceneWeight: 1.10, sceneTag: "业务上线前",
    desc: "堡垒机暴露 SSH, 利用复杂度高但价值大" },
  { rk: 6, cve: "CVE-2024-27198", name: "TeamCity 鉴权绕过",
    asset: "cicd-tc-prod-01 / 10.42.40.5",
    vptA: 6.6, vptV: 8.8, vptI: 7.2, base: 7.5, sceneWeight: 1.10, sceneTag: "业务上线前",
    desc: "CI/CD 平台, 一旦失陷影响构建链路" },
  { rk: 7, cve: "CVE-2023-46604", name: "ActiveMQ OpenWire 反序列化 RCE",
    asset: "mq-cluster-04 / 10.42.6.40",
    vptA: 6.8, vptV: 9.0, vptI: 6.4, base: 7.4, sceneWeight: 1.10, sceneTag: "业务上线前",
    desc: "消息队列被勒索软件利用过, 公开 EXP" },
  { rk: 8, cve: "CVE-2024-0204", name: "Fortra GoAnywhere 鉴权绕过",
    asset: "gw-mft-02 / 172.20.18.9",
    vptA: 7.4, vptV: 8.4, vptI: 5.8, base: 7.2, sceneWeight: 1.10, sceneTag: "业务上线前",
    desc: "文件传输网关, 可创建管理员账户" },
  { rk: 9, cve: "CVE-2024-23897", name: "Jenkins CLI 任意文件读取",
    asset: "cicd-jenkins-bj-02 / 10.42.40.28",
    vptA: 6.4, vptV: 7.6, vptI: 6.0, base: 6.7, sceneWeight: 1.10, sceneTag: "业务上线前",
    desc: "CI 节点配置文件可被读取, 凭据外泄链路" },
  { rk: 10, cve: "CVE-2023-22515", name: "Confluence 权限提升",
    asset: "wiki-conf-01 / 172.20.20.4",
    vptA: 5.8, vptV: 7.8, vptI: 6.2, base: 6.6, sceneWeight: 1.10, sceneTag: "业务上线前",
    desc: "内部文档系统, 已存在 admin 账号创建利用" },
];

export const SORTED_VULNS: RankedVuln[] = RAW.map((v) => ({
  ...v,
  score: computeFinalScore(v.base, v.sceneWeight),
}));

/** Agent 1 总样本量 (mock) */
export const A1_TOTAL = 142;

/** Agent 1 后续动作建议 */
export const A1_NEXT_ACTIONS: string[] = [
  "优先处置 前 10 条 (综合分 ≥ 7.3), 推送给 业务线 owner / 运维负责人",
  "按 vpt 三维 情报属性 维度分组复核, 关注 PoC 武器化条目",
  "跳转 风险管理 模块批量分配工单, 字段映射已对齐",
];
