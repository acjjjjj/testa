import type { Vulnerability } from "@/types";

/** Mock 漏洞清单 — 子集 */
export const VULNERABILITIES: Vulnerability[] = [
  { cve: "CVE-2024-44308", name: "Apache OFBiz 反序列化 RCE", severity: "critical", desc: "公网可达, 已观察到 PoC 武器化, 红蓝对抗演练前重点处置" },
  { cve: "CVE-2024-3094", name: "XZ Utils 后门 (liblzma)", severity: "critical", desc: "供应链投毒, sshd 链路命中, 必须立即下线或回滚" },
  { cve: "CVE-2023-50164", name: "Apache Struts2 路径遍历致 RCE", severity: "critical", desc: "公网暴露, 现成 EXP, 业务系统 CRM 关键资产" },
  { cve: "CVE-2024-21626", name: "runc 容器逃逸", severity: "high", desc: "生产容器节点, 横向移动跳板, 红蓝对抗前优先" },
  { cve: "CVE-2024-6387", name: "OpenSSH regreSSHion 信号竞争", severity: "high", desc: "堡垒机暴露 SSH, 利用复杂度高但价值大" },
  { cve: "CVE-2024-27198", name: "TeamCity 鉴权绕过", severity: "high", desc: "CI/CD 平台, 一旦失陷影响构建链路" },
  { cve: "CVE-2023-46604", name: "ActiveMQ OpenWire 反序列化 RCE", severity: "high", desc: "消息队列被勒索软件利用过, 公开 EXP" },
  { cve: "CVE-2024-0204", name: "Fortra GoAnywhere 鉴权绕过", severity: "high", desc: "文件传输网关, 可创建管理员账户" },
  { cve: "CVE-2024-23897", name: "Jenkins CLI 任意文件读取", severity: "high", desc: "CI 节点配置文件可被读取, 凭据外泄链路" },
  { cve: "CVE-2023-22515", name: "Confluence 权限提升", severity: "high", desc: "内部文档系统, 已存在 admin 账号创建利用" },
];
