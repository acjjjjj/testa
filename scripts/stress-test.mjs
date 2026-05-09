#!/usr/bin/env node
/**
 * 100 CVE 压测 — 验证 demo1 (Agent 1 排序) 真接 DeepSeek, 不是 mock 过动画
 *
 * 用法: node scripts/stress-test.mjs
 *
 * 做法:
 *   - 100 条编造的 CVE 样本 (不是真实公开漏洞, 仅供压测; 名字 / 描述 / 资产
 *     都是模拟真实运营商内网的合理拼装, AI 看到也吃得下)
 *   - 100 次调用 /api/rank, 每次随机抽 5 条作为一个排序 batch
 *   - 期望: 100 次返回 source:"ai", 0 次 mock, 0 次 error
 *
 * 输出: AI / mock / error 计数 + 平均耗时
 *
 * 注意: 跑一次大概会消耗 deepseek 余额 ~¥1 (按 100 × ~2k token 估)
 */

const BASE = process.env.STRESS_BASE_URL || "https://testa-ashen.vercel.app";
const CONCURRENCY = 4; // 同时跑 4 个, 避开 Vercel / DeepSeek 上游限流
const TOTAL_CALLS = 100;
const BATCH_SIZE = 5; // 每次 rank 调用塞几条 CVE

const HEADERS = {
  "Content-Type": "application/json",
  Origin: BASE,
  Referer: BASE + "/",
};

// ── 100 条编造 CVE 样本 (组件 × 漏洞类型 × 资产 拼装, 全是假的, 仅做压测载荷) ──

const COMPONENTS = [
  "Apache Tomcat", "Apache Struts2", "Apache OFBiz", "Apache ActiveMQ",
  "Apache Kafka", "Apache Httpd", "Apache Solr", "Apache Druid",
  "Apache NiFi", "Apache Shiro", "Apache Log4j2", "Apache RocketMQ",
  "Apache ZooKeeper", "Spring Framework", "Spring Boot", "Spring Cloud Gateway",
  "Spring Security", "Atlassian Confluence", "Atlassian Jira", "Atlassian Bitbucket",
  "Microsoft Exchange", "Microsoft SharePoint", "Microsoft IIS", "Oracle WebLogic",
  "Oracle MySQL", "Cisco ASA", "Cisco IOS XE", "Fortinet FortiOS",
  "VMware vCenter", "VMware ESXi", "Citrix NetScaler", "Citrix ADC",
  "Jenkins Server", "GitLab CE", "Nginx", "Redis Server",
  "Elasticsearch", "Kibana", "Docker Engine", "Kubernetes kubelet",
  "Kubernetes API Server", "runc", "OpenSSH", "OpenSSL",
  "Fastjson", "Jackson", "Hibernate", "WebSphere",
  "JBoss EAP", "Tomcat AJP",
];

const VULN_TYPES = [
  "反序列化致 RCE", "路径遍历致 RCE", "SSRF 触发内网横移", "鉴权绕过",
  "权限提升至 root", "SQL 注入", "XXE 外部实体注入", "SSTI 服务端模板注入",
  "敏感信息泄露", "OGNL 表达式注入", "JNDI 注入", "命令注入",
  "容器逃逸", "任意文件读取", "任意文件写入", "原型链污染",
  "反序列化致 DoS", "管理接口未授权访问", "硬编码凭据", "内存破坏致 RCE",
];

const SEVERITIES = ["critical", "high", "high", "high", "medium"]; // 偏高, 演示场景偏多 critical/high

const ASSETS = [
  "order-svc-prod-07 / 10.42.18.7", "order-svc-prod-12 / 10.42.18.12",
  "crm-web-04 / 172.20.4.18", "crm-web-09 / 172.20.4.31",
  "edge-gw-bj-03 / 10.42.2.21", "edge-gw-sh-02 / 10.42.2.42",
  "k8s-node-prod-12 / 10.42.30.102", "k8s-node-prod-18 / 10.42.30.118",
  "k8s-master-bj-01 / 10.42.32.5", "jumphost-sh-01 / 10.42.0.19",
  "jumphost-bj-02 / 10.42.0.27", "cicd-jenkins-bj-02 / 10.42.40.28",
  "cicd-tc-prod-01 / 10.42.40.5", "mq-cluster-04 / 10.42.6.40",
  "mq-broker-09 / 10.42.6.61", "gw-mft-02 / 172.20.18.9",
  "wiki-conf-01 / 172.20.20.4", "redis-cluster-03 / 10.42.10.13",
  "redis-cache-prod-08 / 10.42.10.28", "es-data-prod-05 / 10.42.16.55",
  "es-master-bj-01 / 10.42.16.21", "vpn-gw-bj-01 / 10.42.99.11",
  "bastion-prod-03 / 10.42.0.33", "log-collector-07 / 10.42.20.7",
  "iam-svc-prod-02 / 10.42.50.12", "audit-svc-bj-01 / 10.42.50.21",
  "billing-svc-prod-04 / 10.42.18.44", "settle-svc-prod-09 / 10.42.18.49",
  "api-gw-prod-02 / 10.42.4.12", "api-gw-prod-08 / 10.42.4.18",
  "config-center-01 / 10.42.40.71", "registry-svc-04 / 10.42.40.84",
];

const DESC_TEMPLATES = [
  "公网可达, EXP 已公开, 业务核心命中",
  "供应链链路命中, 横向移动跳板风险",
  "内网暴露 + 鉴权弱, 红队利用价值高",
  "PoC 武器化, 勒索家族已使用",
  "命中堡垒机/跳板机, 失陷影响放大",
  "CICD 流水线节点, 污染产物风险",
  "公网门户, 默认配置可达",
  "管理面 API 暴露, 可创建管理员账号",
  "容器逃逸, 影响整个 k8s 节点",
  "0day 阶段, 暂无补丁仅可缓解",
  "组件指纹命中, 多业务线复用",
  "DMZ 区暴露, 与公网回连可建立",
];

const SCENARIOS = [
  "运营商核心业务 (业务上线前)",
  "运营商核心业务 (红蓝对抗前)",
  "订单中心 (业务上线前)",
  "CRM 系统 (合规审计前)",
  "Web 资产组 (供应链审计前)",
  "内网横向 (红蓝对抗前)",
  "DMZ 区 (夜间窗口)",
  "k8s 集群 (业务上线前)",
];

// 生成 100 条不重复 CVE
function buildCves() {
  const out = [];
  const usedIds = new Set();
  for (let i = 0; i < 100; i++) {
    // CVE 编号空间足够大避免碰撞
    let cveId;
    do {
      const year = 2020 + (i % 5);
      const num = 10000 + ((i * 137 + 11) % 50000);
      cveId = `CVE-${year}-${num}`;
    } while (usedIds.has(cveId));
    usedIds.add(cveId);

    const comp = COMPONENTS[i % COMPONENTS.length];
    const vt = VULN_TYPES[(i * 3) % VULN_TYPES.length];
    out.push({
      cve: cveId,
      name: `${comp} ${vt}`,
      severity: SEVERITIES[i % SEVERITIES.length],
      desc: DESC_TEMPLATES[i % DESC_TEMPLATES.length],
      asset: ASSETS[i % ASSETS.length],
    });
  }
  return out;
}

const CVES = buildCves();

// 100 个 batch, 每个 5 条 (从 100 池里轮转切片)
function buildBatches() {
  const batches = [];
  for (let i = 0; i < TOTAL_CALLS; i++) {
    const items = [];
    for (let k = 0; k < BATCH_SIZE; k++) {
      items.push(CVES[(i * BATCH_SIZE + k) % CVES.length]);
    }
    batches.push({
      scenario: SCENARIOS[i % SCENARIOS.length],
      items,
    });
  }
  return batches;
}

// ── 调度 ────────────────────────────────────────────────────────

const stats = { ai: 0, mock: 0, error: 0, totalMs: 0, errors: [] };

async function callRank(payload, idx) {
  const t0 = Date.now();
  try {
    const r = await fetch(BASE + "/api/rank", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(payload),
    });
    const ms = Date.now() - t0;
    stats.totalMs += ms;
    if (!r.ok) {
      stats.error++;
      stats.errors.push(`#${idx} HTTP ${r.status}`);
      return;
    }
    const data = await r.json();
    if (data.source === "ai") stats.ai++;
    else if (data.source === "mock") {
      stats.mock++;
      stats.errors.push(`#${idx} mock fallback (summary: ${String(data.summary || "").slice(0, 60)})`);
    } else {
      stats.error++;
      stats.errors.push(`#${idx} unknown source=${data.source}`);
    }
  } catch (e) {
    const ms = Date.now() - t0;
    stats.totalMs += ms;
    stats.error++;
    stats.errors.push(`#${idx} ${e.message}`);
  }
}

async function runWithConcurrency(tasks, concurrency) {
  let idx = 0;
  let done = 0;
  const total = tasks.length;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < tasks.length) {
      const myIdx = idx++;
      await tasks[myIdx]();
      done++;
      if (done % 10 === 0 || done === total) {
        process.stdout.write(
          `\r进度 ${done}/${total} (AI=${stats.ai} mock=${stats.mock} err=${stats.error})`
        );
      }
    }
  });
  await Promise.all(workers);
  process.stdout.write("\n");
}

async function main() {
  console.log("=".repeat(60));
  console.log("100 CVE 压测 — 验证 demo1 真接 DeepSeek");
  console.log("BASE:", BASE);
  console.log(`并发: ${CONCURRENCY}, 总调用: ${TOTAL_CALLS}, 每批 ${BATCH_SIZE} 条 CVE`);
  console.log("=".repeat(60));
  console.log("");

  const batches = buildBatches();
  const tasks = batches.map((b, i) => () => callRank(b, i));

  const t0 = Date.now();
  await runWithConcurrency(tasks, CONCURRENCY);
  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);

  // ── 结果 ──
  console.log("\n" + "=".repeat(60));
  console.log("结果");
  console.log("=".repeat(60));
  const total = stats.ai + stats.mock + stats.error;
  const aiRate = total > 0 ? ((stats.ai / total) * 100).toFixed(1) + "%" : "-";
  const avgMs = total > 0 ? Math.round(stats.totalMs / total) : 0;
  console.log(`AI 真调用: ${stats.ai}`);
  console.log(`mock 兜底: ${stats.mock}`);
  console.log(`error:     ${stats.error}`);
  console.log(`AI 命中率: ${aiRate}`);
  console.log(`平均耗时:  ${avgMs}ms`);
  console.log(`总耗时:    ${totalSec}s`);
  console.log("");

  if (stats.errors.length > 0) {
    console.log("─ 异常样本 (最多展示 10 条) ─");
    for (const e of stats.errors.slice(0, 10)) console.log("  " + e);
    if (stats.errors.length > 10) console.log(`  ... 还有 ${stats.errors.length - 10} 条`);
    console.log("");
  }

  console.log("→ 现在去 https://platform.deepseek.com/usage 看 token 消耗");
  console.log("=".repeat(60));

  // AI 命中率 < 95% 就 exit 1, 方便 CI/检查
  if (total === 0 || stats.ai / total < 0.95) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
