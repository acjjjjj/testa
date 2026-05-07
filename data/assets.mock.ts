import type { Asset, HistoryItem } from "@/types";

/** Mock 资产清单 — 子集, 仅用于 demo 展示 */
export const ASSETS: Asset[] = [
  { id: "order-svc-prod-07", ip: "10.42.18.7", group: "运营商核心业务线 / 订单中心", fingerprint: "Apache OFBiz 18.12.x" },
  { id: "edge-gw-bj-03", ip: "10.42.2.21", group: "运营商核心业务线 / 边缘网关", fingerprint: "OpenSSH + xz-utils 5.6.0" },
  { id: "crm-web-04", ip: "172.20.4.18", group: "运营商核心业务线 / CRM", fingerprint: "Apache Struts 2.5.x" },
  { id: "k8s-node-prod-12", ip: "10.42.30.102", group: "运营商核心业务线 / 容器", fingerprint: "containerd / runc 1.1.11" },
  { id: "jumphost-sh-01", ip: "10.42.0.19", group: "运营商核心业务线 / 堡垒机", fingerprint: "OpenSSH 9.7p1" },
  { id: "cicd-tc-prod-01", ip: "10.42.40.5", group: "运营商核心业务线 / DevOps", fingerprint: "TeamCity 2023.05" },
  { id: "mq-cluster-04", ip: "10.42.6.40", group: "运营商核心业务线 / 消息队列", fingerprint: "ActiveMQ 5.17" },
  { id: "gw-mft-02", ip: "172.20.18.9", group: "运营商核心业务线 / 文件传输", fingerprint: "GoAnywhere MFT 7.4" },
  { id: "cicd-jenkins-bj-02", ip: "10.42.40.28", group: "运营商核心业务线 / DevOps", fingerprint: "Jenkins LTS 2.426" },
  { id: "wiki-conf-01", ip: "172.20.20.4", group: "运营商核心业务线 / 内部文档", fingerprint: "Confluence DC 8.4" },
];

export const HISTORY: HistoryItem[] = [
  { id: "h1", t: "排序运营商业务线高危漏洞", m: "2 分钟前", tag: "排序", live: true },
  { id: "h2", t: "192.168.1.1 多源漏洞清洗合并", m: "今天 10:42", tag: "比对" },
  { id: "h3", t: "红蓝对抗前 web 资产高危盘点", m: "今天 09:15", tag: "排序" },
  { id: "h4", t: "订单中心 cve 影响范围排查", m: "昨天", tag: "比对" },
  { id: "h5", t: "合规审计前 0day 列表", m: "昨天", tag: "排序" },
  { id: "h6", t: "核心组件 log4j2 资产命中", m: "05-02", tag: "比对" },
  { id: "h7", t: "生产环境补丁状态盘点", m: "05-01", tag: "比对" },
];

export const NAV: Array<{ k: string; l: string; active?: boolean }> = [
  { k: "asset", l: "资产" },
  { k: "expose", l: "暴露面" },
  { k: "risk", l: "风险" },
  { k: "detect", l: "检测" },
  { k: "ticket", l: "工单" },
  { k: "report", l: "报告" },
  { k: "config", l: "配置" },
  { k: "sentry", l: "哨兵", active: true },
];
