#!/usr/bin/env node
/**
 * 500 样本压力测试 — 验证所有 6 个 AI 端点真接 DeepSeek
 *
 * 用法: node scripts/stress-test.mjs
 *
 * 分布:
 *   /api/extract-params  — 200 calls (主入口, query 多样化)
 *   /api/similarity      — 100 calls (LUI 反问相似度)
 *   /api/next-actions    —  60 calls (A1 后续动作)
 *   /api/compare-summary —  60 calls (A2 比对汇总)
 *   /api/abnormal-narrate — 50 calls (异常叙事)
 *   /api/rank            —  30 calls (重端点, 跑少点)
 *
 * 输出: 每个端点 AI / mock / error 计数 + 总 token 估算 + 总耗时
 */

const BASE = process.env.STRESS_BASE_URL || "https://testa-ashen.vercel.app";
const CONCURRENCY = 4; // 同时跑 4 个, 避免 Vercel / DeepSeek rate limit

const HEADERS = {
  "Content-Type": "application/json",
  Origin: BASE,
  Referer: BASE + "/",
};

// ── 测试样本数据 ──────────────────────────────────────────────

// 200 个 extract-params query (任务 + chat 各种意图)
const EXTRACT_QUERIES = [
  // 任务 a1 (60)
  "排序订单中心高危漏洞", "排序运营商核心业务线漏洞", "排序 CRM 系统所有 RCE",
  "VPT 加权排序前 10 条漏洞", "业务上线前重点处置高危漏洞",
  "排序 192.168.1.0/24 网段高危", "盘点 web 资产组高危漏洞",
  "红蓝对抗演练前优先处置", "护网期间紧急排序",
  "供应链审计漏洞优先级", "数据库上线前漏洞优先级",
  "夜间变更窗口前漏洞排序", "等保审计前高危盘点",
  "排序订单中心 PoC 武器化漏洞", "排序公网暴露资产高危",
  "盘点 0day 互联网暴露资产", "VPT 三维加权排序",
  "排序运营商业务线中危漏洞", "排序生产环境补丁缺失",
  "排序 jumphost 跳板机漏洞", "排序边缘网关暴露面",
  "盘点核心业务高危补丁", "排序 k8s 节点容器逃逸",
  "排序 CICD 流水线漏洞", "盘点 Jenkins 暴露漏洞",
  "排序数据库中危漏洞", "排序运营商内网横向移动",
  "排序 CRM 暴露面 PoC", "VPT 加权 web 资产排序",
  "排序运维系统漏洞", "盘点 SSO 系统漏洞",
  "排序日志系统高危", "排序消息队列漏洞",
  "排序对象存储暴露面", "盘点容器仓库漏洞",
  "排序 API 网关高危", "盘点配置中心暴露",
  "排序服务网格漏洞", "排序服务发现组件",
  "盘点缓存集群漏洞", "排序搜索集群高危",
  "排序文件存储漏洞", "盘点备份系统漏洞",
  "排序网络设备漏洞", "盘点防火墙暴露",
  "排序 WAF 系统漏洞", "排序 IDS 漏洞",
  "排序终端管理漏洞", "盘点办公系统漏洞",
  "排序 OA 系统暴露面", "盘点视频会议系统漏洞",
  "排序 VPN 系统高危", "盘点零信任组件漏洞",
  "排序堡垒机暴露", "盘点跳板机漏洞",
  "排序 IAM 系统漏洞", "盘点权限系统暴露",
  "排序审计系统漏洞", "盘点 SIEM 高危",
  "排序漏洞扫描器漏洞", "盘点资产管理系统",
  // 任务 a2 (60)
  "对 192.168.1.1 多源漏洞清洗", "组件 log4j 命中范围",
  "和 CNNVD 对比", "去重订单中心多源漏洞",
  "比对内部库 + CVE", "组件指纹 × 漏洞库碰撞",
  "多源漏洞合并 192.168.0.0/24", "去重清洗组织结构 A",
  "排查订单中心补丁缺失", "比对运营商业务线 CVE 命中",
  "组件 spring 命中范围", "组件 fastjson 影响排查",
  "组件 shiro 漏洞范围", "组件 struts2 暴露面",
  "组件 weblogic 命中", "组件 tomcat 漏洞排查",
  "组件 nginx 暴露面", "组件 apache httpd 命中",
  "组件 redis 漏洞排查", "组件 mysql 漏洞范围",
  "组件 mongodb 漏洞", "组件 elasticsearch 暴露",
  "组件 kafka 暴露面", "组件 rabbitmq 漏洞",
  "组件 docker 命中范围", "组件 kubernetes 漏洞",
  "组件 jenkins 暴露", "组件 gitlab 漏洞",
  "组件 confluence 命中", "组件 jira 漏洞排查",
  "组件 openssh 范围排查", "组件 xz utils 命中",
  "组件 openssl 漏洞", "组件 curl 漏洞范围",
  "组件 sudo 漏洞排查", "组件 polkit 暴露",
  "排查 cve-2024-44308 影响范围", "排查 cve-2024-3094 命中",
  "排查 cve-2023-50164 影响", "排查 cve-2024-6387 范围",
  "10.42.0.0/16 多源漏洞清洗", "10.42.18.7 漏洞排查",
  "172.20.4.18 漏洞命中", "对组织结构 A 多源比对",
  "对组织结构 B 漏洞清洗", "对边缘网关 03 多源排查",
  "对生产环境 多源比对", "对测试环境漏洞清洗",
  "对预发环境漏洞排查", "对 DMZ 区漏洞清洗",
  "对运维区漏洞比对", "对管理区漏洞排查",
  "对开发区漏洞清洗", "对核心业务多源排查",
  "对运营商网络漏洞清洗", "对二级业务系统排查",
  "对子公司漏洞清洗", "对合作伙伴接入区排查",
  "对外网门户多源比对", "对内网管理多源排查",
  // chat 闲聊 (40)
  "你好", "hi", "在吗", "哨兵能干啥",
  "什么是 VPT", "什么是 vpt 三维加权",
  "怎么用这个 demo", "demo 介绍",
  "AI 能力清单", "agent 1 干什么的", "agent 2 干什么的",
  "什么是反思校验", "什么是 LUI 反问",
  "rate limit 是多少", "Vercel 部署稳定吗",
  "支持哪些大模型", "哨兵 AI 助手是啥",
  "鉴微 insight 是什么", "问津大模型是啥",
  "v1.0 接通了哪些 AI", "5 个 AI 端点都是什么",
  "如何添加新业务场景", "如何调权重",
  "怎么扩展 agent", "demo 数据是真的吗",
  "可以接真实业务吗", "支持私有部署吗",
  "今天天气如何", "你叫什么名字",
  "我是谁", "我的工号是啥",
  "帮我总结昨天的对话", "把这个对话存档",
  "为啥这个排序结果不对", "为啥这条没合并",
  "可以反问几次", "反问预算是多少",
  "如何导出结果", "csv 字段有哪些",
  // 边界 query (40)
  "1", "?", "测试", "test", "abc",
  "排序", "排查", "漏洞", "上线", "高危",
  "中危低危排序", "排序中危业务", "排序低危资产",
  "实时排序", "近 7 天漏洞", "近 14 天漏洞",
  "近 30 天漏洞", "近 90 天漏洞",
  "实时排序公网暴露", "实时盘点 0day",
  "实时排查 PoC 武器化", "实时多源比对",
  "夜间窗口排序", "合规审计前盘点",
  "等保检查前清单", "监管检查前漏洞",
  "供应链审计前盘点", "红蓝对抗中处置",
  "攻防演练前清零", "护网期间应急",
  "业务发版前清单", "数据库上线前盘点",
  "系统上线前优先级", "重要业务上线高危",
  "排序 + 后续动作建议", "比对 + 写回风险排查",
  "排序导出 csv", "比对导出 csv",
  "排序 + 跳转风险管理", "排序 + 交给 a2 排查",
];

// 100 组 similarity 测试对
const SIMILARITY_PAIRS = generateSimilarityPairs();

// 30 组 rank 测试 (rank 慢, 数量少)
const RANK_BATCHES = generateRankBatches();

// 60 组 next-actions 测试
const NEXT_ACTIONS_BATCHES = generateNextActionsBatches();

// 60 组 compare-summary 测试
const COMPARE_SUMMARY_BATCHES = generateCompareSummaryBatches();

// 50 组 abnormal-narrate 测试
const ABNORMAL_BATCHES = generateAbnormalBatches();

// ── 调度器 ────────────────────────────────────────────────────

const stats = {
  byEndpoint: {}, // { endpoint: { ai, mock, error, totalMs } }
  startedAt: Date.now(),
};

function recordResult(endpoint, source, ms) {
  if (!stats.byEndpoint[endpoint]) {
    stats.byEndpoint[endpoint] = { ai: 0, mock: 0, error: 0, totalMs: 0 };
  }
  const s = stats.byEndpoint[endpoint];
  if (source === "ai") s.ai++;
  else if (source === "mock") s.mock++;
  else s.error++;
  s.totalMs += ms;
}

async function callEndpoint(path, body, label) {
  const start = Date.now();
  try {
    const r = await fetch(BASE + path, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    const ms = Date.now() - start;
    if (!r.ok) {
      recordResult(path, "error", ms);
      return { source: "error", status: r.status, ms };
    }
    const data = await r.json();
    const source = data.source === "ai" ? "ai" : data.source === "mock" ? "mock" : "error";
    recordResult(path, source, ms);
    return { source, ms, label };
  } catch (e) {
    const ms = Date.now() - start;
    recordResult(path, "error", ms);
    return { source: "error", err: e.message, ms };
  }
}

// 简单并发限制
async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  let idx = 0;
  let done = 0;
  const total = tasks.length;

  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < tasks.length) {
      const myIdx = idx++;
      const t = tasks[myIdx];
      const r = await t();
      results[myIdx] = r;
      done++;
      if (done % 20 === 0 || done === total) {
        process.stdout.write(`\r进度 ${done}/${total} (AI=${countSource("ai")} mock=${countSource("mock")} err=${countSource("error")})`);
      }
    }
  });
  await Promise.all(workers);
  process.stdout.write("\n");
  return results;
}

function countSource(src) {
  return Object.values(stats.byEndpoint).reduce((a, b) => a + b[src], 0);
}

// ── 主流程 ────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("500 样本压力测试 — 验证 AI 真接通");
  console.log("BASE:", BASE);
  console.log("并发:", CONCURRENCY);
  console.log("=".repeat(60));
  console.log("");

  const tasks = [];

  // 200 extract-params
  for (const q of EXTRACT_QUERIES) {
    tasks.push(() => callEndpoint("/api/extract-params", { query: q }, q.slice(0, 20)));
  }

  // 100 similarity
  for (const p of SIMILARITY_PAIRS) {
    tasks.push(() => callEndpoint("/api/similarity", p, p.a.id));
  }

  // 30 rank
  for (const b of RANK_BATCHES) {
    tasks.push(() => callEndpoint("/api/rank", b, b.scenario));
  }

  // 60 next-actions
  for (const b of NEXT_ACTIONS_BATCHES) {
    tasks.push(() => callEndpoint("/api/next-actions", b, b.scenario));
  }

  // 60 compare-summary
  for (const b of COMPARE_SUMMARY_BATCHES) {
    tasks.push(() => callEndpoint("/api/compare-summary", b, b.scenario));
  }

  // 50 abnormal-narrate
  for (const b of ABNORMAL_BATCHES) {
    tasks.push(() => callEndpoint("/api/abnormal-narrate", b, b.kind));
  }

  console.log(`总任务数: ${tasks.length}\n`);
  const t0 = Date.now();
  await runWithConcurrency(tasks, CONCURRENCY);
  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);

  // ── 结果输出 ──
  console.log("\n" + "=".repeat(60));
  console.log("结果汇总");
  console.log("=".repeat(60));

  const cols = ["endpoint", "ai", "mock", "error", "avg ms", "ai率"];
  console.log(cols.map((c) => c.padEnd(22)).join(""));
  console.log("-".repeat(132));

  let totalAi = 0, totalMock = 0, totalError = 0;
  for (const [path, s] of Object.entries(stats.byEndpoint)) {
    const total = s.ai + s.mock + s.error;
    const aiRate = total > 0 ? ((s.ai / total) * 100).toFixed(1) + "%" : "-";
    const avgMs = total > 0 ? Math.round(s.totalMs / total) : 0;
    console.log(
      [
        path.padEnd(22),
        String(s.ai).padEnd(22),
        String(s.mock).padEnd(22),
        String(s.error).padEnd(22),
        (avgMs + "ms").padEnd(22),
        aiRate.padEnd(22),
      ].join("")
    );
    totalAi += s.ai;
    totalMock += s.mock;
    totalError += s.error;
  }
  console.log("-".repeat(132));
  const totalCalls = totalAi + totalMock + totalError;
  const totalAiRate = totalCalls > 0 ? ((totalAi / totalCalls) * 100).toFixed(1) + "%" : "-";
  console.log(
    [
      "TOTAL".padEnd(22),
      String(totalAi).padEnd(22),
      String(totalMock).padEnd(22),
      String(totalError).padEnd(22),
      "-".padEnd(22),
      totalAiRate.padEnd(22),
    ].join("")
  );

  console.log("");
  console.log(`总耗时: ${totalSec}s`);
  console.log(`AI 真调用率: ${totalAiRate}`);
  console.log("");
  console.log("→ 现在去 https://platform.deepseek.com/usage 看 token 消耗");
  console.log("=".repeat(60));
}

// ── 数据生成 helpers ──────────────────────────────────────────

function generateSimilarityPairs() {
  const VULN_PAIRS = [
    [["CNNVD-202401-2914", "OpenSSH 远程代码执行漏洞"], ["CVE-2024-6387", "OpenSSH server signal handler race"]],
    [["INT-2024-04-0307", "Confluence 数据中心权限提升"], ["CVE-2023-22515", "Atlassian Confluence Broken Access Control"]],
    [["TI-2024-03-2188", "XZ Utils 5.6.0/5.6.1 后门"], ["CVE-2024-3094", "XZ Utils malicious code in upstream tarballs"]],
    [["TI-2024-05-3019", "Apache OFBiz 反序列化"], ["CVE-2024-44308", "Apache OFBiz Insecure deserialization in screen rendering"]],
    [["INT-2024-06-1102", "Spring Framework 路径遍历"], ["CVE-2024-22243", "Spring Framework UriComponentsBuilder Open Redirect"]],
    [["CNNVD-202402-1156", "Fastjson 反序列化"], ["CVE-2022-25845", "Fastjson autoType Bypass"]],
    [["TI-2024-07-2204", "Log4j2 RCE 武器化"], ["CVE-2021-44228", "Apache Log4j2 JNDI Injection"]],
    [["INT-2024-08-3315", "Shiro 权限绕过"], ["CVE-2023-46749", "Apache Shiro PathMatching Bypass"]],
    [["CNNVD-202404-2245", "Tomcat Information Disclosure"], ["CVE-2024-21733", "Apache Tomcat HTTP Request Smuggling"]],
    [["TI-2024-09-4426", "Struts2 OGNL 注入"], ["CVE-2023-50164", "Apache Struts2 Path Traversal RCE"]],
  ];

  const pairs = [];
  for (let i = 0; i < 100; i++) {
    const p = VULN_PAIRS[i % VULN_PAIRS.length];
    pairs.push({
      a: { src: i % 3 === 0 ? "CNNVD" : i % 3 === 1 ? "内部漏洞库" : "威胁情报", id: p[0][0], nm: p[0][1] },
      b: { src: "CVE", id: p[1][0], nm: p[1][1] },
      fallbackScore: 92,
    });
  }
  return pairs;
}

function generateRankBatches() {
  const SCENARIOS = [
    "运营商核心业务 (业务上线前)",
    "运营商核心业务 (红蓝对抗前)",
    "订单中心 (业务上线前)",
    "CRM 系统 (合规审计前)",
    "Web 资产组 (供应链审计前)",
    "内网横向 (红蓝对抗前)",
  ];

  const SAMPLE_VULNS = [
    { cve: "CVE-2024-44308", name: "Apache OFBiz 反序列化 RCE", asset: "order-svc-prod-07 / 10.42.18.7", desc: "公网可达, 已观察到 PoC 武器化", severity: "critical" },
    { cve: "CVE-2024-3094", name: "XZ Utils 后门 (liblzma)", asset: "edge-gw-bj-03 / 10.42.2.21", desc: "供应链投毒, sshd 链路命中", severity: "critical" },
    { cve: "CVE-2023-50164", name: "Apache Struts2 路径遍历 RCE", asset: "crm-web-04 / 172.20.4.18", desc: "公网暴露, 现成 EXP", severity: "critical" },
    { cve: "CVE-2024-21626", name: "runc 容器逃逸", asset: "k8s-node-prod-12 / 10.42.5.31", desc: "生产容器节点, 横向移动跳板", severity: "high" },
    { cve: "CVE-2024-6387", name: "OpenSSH regreSSHion 信号竞争", asset: "jumphost-sh-01 / 10.42.0.19", desc: "堡垒机暴露 SSH, 利用复杂", severity: "high" },
  ];

  const batches = [];
  for (let i = 0; i < 30; i++) {
    batches.push({
      scenario: SCENARIOS[i % SCENARIOS.length],
      items: SAMPLE_VULNS,
    });
  }
  return batches;
}

function generateNextActionsBatches() {
  const RANKED_SAMPLE = [
    { cve: "CVE-2024-44308", name: "OFBiz RCE", vptA: 9.0, vptV: 9.5, vptI: 9.2, score: 10, sceneTag: "业务上线前", desc: "公网可达, PoC 武器化" },
    { cve: "CVE-2024-3094", name: "XZ Utils 后门", vptA: 8.5, vptV: 9.7, vptI: 9.8, score: 10, sceneTag: "供应链审计前", desc: "sshd 链路命中, 必须立即下线或回滚" },
    { cve: "CVE-2023-50164", name: "Struts2 RCE", vptA: 9.2, vptV: 9.4, vptI: 8.6, score: 9.8, sceneTag: "业务上线前", desc: "现成 EXP, 业务系统 CRM" },
  ];

  const SCENARIOS = ["业务上线前", "红蓝对抗前", "合规审计前", "夜间窗口", "供应链审计前", "0day 应急"];

  const batches = [];
  for (let i = 0; i < 60; i++) {
    batches.push({
      scenario: SCENARIOS[i % SCENARIOS.length],
      ranked: RANKED_SAMPLE,
    });
  }
  return batches;
}

function generateCompareSummaryBatches() {
  const SCENARIOS = ["订单中心 多源漏洞清洗", "运营商业务线 多源比对", "组织结构 A 漏洞清洗", "Web 资产组 多源去重", "DMZ 区漏洞排查", "核心业务多源比对"];
  const batches = [];
  for (let i = 0; i < 60; i++) {
    batches.push({
      scenario: SCENARIOS[i % SCENARIOS.length],
      assetScope: ["订单中心业务线", "运营商核心业务线", "组织结构 A", "运营商 Web 资产组"][i % 4],
      assetCount: [64, 142, 48, 86][i % 4],
      totalRaw: 590 + (i * 7) % 200,
      stats: { added: 412 + (i % 20), merged: 128, dup: 36, skipped: 14 },
      mergesConfirmed: 2 + (i % 3),
      partial: i % 7 === 0,
      hits: [
        { cve: "CVE-2024-44308", name: "OFBiz RCE", patch: "available" },
        { cve: "CVE-2024-3094", name: "XZ Utils 后门", patch: "rollback" },
        { cve: "CVE-2024-6387", name: "OpenSSH regreSSHion", patch: "available" },
      ],
    });
  }
  return batches;
}

function generateAbnormalBatches() {
  const KINDS = ["timeout", "patch", "partial", "budget"];
  const SCENARIOS = ["业务上线前", "红蓝对抗前", "合规审计前", "夜间窗口", "供应链审计前"];
  const SCOPES = ["订单中心业务线", "运营商核心业务线", "组织结构 A", "Web 资产组", "DMZ 区"];

  const batches = [];
  for (let i = 0; i < 50; i++) {
    batches.push({
      kind: KINDS[i % KINDS.length],
      agent: i % 2 === 0 ? "a1" : "a2",
      scenario: SCENARIOS[i % SCENARIOS.length],
      assetScope: SCOPES[i % SCOPES.length],
      assetCount: 30 + (i * 17) % 200,
    });
  }
  return batches;
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
