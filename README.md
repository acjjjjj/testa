# 哨兵 AI 助手 v1.0 — Demo

鉴微 insight 之上的「哨兵 AI 助手」工作台前端 Demo, 把 PRD v0.9 + 全场景原型实现成一个**真接通 DeepSeek**的 Next.js 项目。

> **在线访问** (推荐给领导看): https://testa-ashen.vercel.app
>
> 5 个 AI 端点真接 DeepSeek-chat, 不是 mock。

## 项目是什么

「哨兵」是鉴微 insight 安全运营平台第八个模块, 提供两个 agent:

- **Agent 1 · 智能风险排序**
  在用户给定的局部漏洞数据范围里, 按 VPT 三维基线分 + 场景权重, 输出带场景识别的优先级列表。
  综合排序分 = `min(VPT 基线分 × 场景权重, 10)`。

- **Agent 2 · 智能风险排查比对**
  给定资产范围, 跑资产指纹与多源漏洞库比对、AI 相似度去重、补丁库联动, 结果支持用户手动写回风险排查模块 (PRD § 3.2.4 步骤 9 锁: 同 session 同结果集幂等返回 task_id, 不重建)。

技术栈: **Next.js 14** (App Router) · React 18 · TypeScript · Tailwind CSS · **DeepSeek (OpenAI 兼容协议) 通过 Vercel Edge Function 转发**。

## 在线 Demo / 本地启动

### 在线 (Vercel, 已接通 DeepSeek)

直接访问 **https://testa-ashen.vercel.app** — 全功能, 5 个 AI 端点都在跑。

### 本地开发

```bash
cd 哨兵-demo
npm install
cp .env.example .env.local       # 填 DEEPSEEK_API_KEY (可选, 不填会自动 mock 兜底)
npm run dev                       # http://localhost:3000
```

可用脚本:

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 (默认 3000) |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 跑 ESLint |

## AI 接入版图 (5 个真端点)

所有 AI 调用走 Vercel Edge Function 转发到 `api.deepseek.com`, API key 只在服务端环境变量, 前端拿不到。

| 端点 | 替换的 mock | 触发时机 | 输出 |
| --- | --- | --- | --- |
| **POST `/api/extract-params`** | LUI 参数卡死值 + 意图分类 | 用户提交 query | `{ intent: a1\|a2\|chat, ...params }`. chat 时直接给中文 reply, 不进 LUI 流程 |
| **POST `/api/rank`** | A1 排序结果 + 中文 summary | A1 stage=running | top 5 CVE 的 vptA/V/I + 场景权重 + 综合分 + 中文排序原因, 加整体策略 summary |
| **POST `/api/next-actions`** | A1 后续动作建议 3 条死文案 | A1 排序完成后 | 基于实际排序结果的 3 条针对性建议 (PRD § 3.1.2 步骤 f: 优先处置 / vpt 维度复核 / 跳转批量分配) |
| **POST `/api/similarity`** | LUI 反问候选对静态 conf | A2 LUI 反问每张候选卡 | 0-100 相似度分 + 中文判断理由 |
| **POST `/api/compare-summary`** | A2 比对开篇 + reflection 报告 | A2 stage=final | 80-120 字汇总段落 + PRD § 2.3 三层口径 reflection 报告 (资产覆盖率/原始漏洞处理率/候选对处理率) |

**所有端点都有 mock 兜底**: 无 API key / 上游超时 / JSON 解析失败时, 自动返回结构化 mock 数据, demo 永不翻车。前端 UI 通过 badge 颜色区分:
- 🟢 绿色 (mint) = AI 真跑
- 🟡 黄色 (amber) = mock 兜底

## 演示路径 (给领导看的 13 个场景)

启动后右下角 **「演示导览」** 按钮一键跳转 13 个场景 (按 PRD 全场景原型 1:1 还原):

**主流程 6 个**
1. 空主界面 (双 agent 入口 + 示例 chip)
2. A1 LUI 参数填写  `[AI 抽参]`
3. A1 工作流推进中
4. A1 排序结果  `[AI × 2 = 排序 + 后续动作]`
5. A2 LUI 反问  `[AI 相似度]`
6. A2 比对结果  `[AI × 2 = 汇总 + reflection]`

**异常 / 边界 7 个**
7. 数据源超时 (timeout)
8. 补丁库不可用 (写回置灰)
9. partial 异常 (写回置灰)
10. 反问预算超额 (budget)
11. A1 → A2 串联桥
12. 写回确认弹窗
13. 写回成功态

**特殊 chat 演示** (PRD 范围外, demo 增强)
- 输入 `你好` / `什么是 vpt` / `哨兵能干啥` → 不弹 LUI 卡, AI 直接给中文回复气泡
- 触发逻辑: `/api/extract-params` 第一步分类 intent, 非任务 query 走 chat 分支

## 文件结构

```
app/
  api/
    rank/route.ts                 A1 排序端点
    extract-params/route.ts       LUI 参数抽取 + 意图分类
    next-actions/route.ts         A1 后续动作建议
    similarity/route.ts           A2 LUI 反问相似度
    compare-summary/route.ts      A2 比对汇总 + reflection 报告
  globals.css                     设计 token (CSS 变量) + 组件样式
  layout.tsx                      根 layout (含 ToastProvider)
  page.tsx                        入口

components/
  AppShell.tsx                    4 列网格主壳 (Rail / Sidebar / Main / RightPane)
  Rail.tsx                        鉴微 insight 主导航 (8 模块, hover 解释 + click toast)
  Sidebar.tsx                     历史对话 (mock + 动态新增) + 真实搜索过滤
  TopBar.tsx                      面包屑 + session + 配置中心入口
  ChatThread.tsx                  主对话区调度
  BottomComposer.tsx              输入框 + 发送 (Enter) + agent 切换 + 引用资产 popover
  Welcome.tsx                     欢迎页 (双 agent 卡 + 3 示例 chip)

  LuiParamCardA1.tsx              A1 LUI (4 字段 + Dropdown 切换)
  LuiParamCardA2.tsx              A2 LUI (4 字段 + Dropdown 切换)
  RunningBubble.tsx               running / reflect / followup 头部气泡
  WorkflowStatus.tsx              右侧 6 域 workflow 可视化 + 工具调用记录

  RiskRankingResult.tsx           A1 final — top N 排序 + AI 后续建议 + CSV 导出 + 跳转 url (vuln_ids + lui_params)
  RiskCompareResult.tsx           A2 final — AI 汇总段 + 比对统计 + 命中表 + 合并记录
  LuiFollowupCard.tsx             A2 LUI 反问 (含 DeepSeek 真相似度评估)

  AbnormalAlert.tsx               4 种异常 banner (timeout / patch / partial / budget)
  HandoffBridge.tsx               A1 → A2 串联桥
  WritebackConfirmDialog.tsx      写回二次确认
  WritebackDoneCard.tsx           写回成功态 (动态 task_id, 幂等)

  ConfigPanel.tsx                 配置中心 modal (5 段 18 项 PRD 阈值)
  ScenarioSwitcher.tsx            演示导览面板 (13 场景, 5 个标 [AI])
  Dropdown.tsx                    通用下拉 (React Portal + position:fixed 避免 .card.lui overflow:hidden 裁剪)
  Toast.tsx                       全局 toast (右下角 2.5s 自动消失)
  Icon Badge ScoreBar Seg WorkflowInline Domain  primitives

data/
  assets.mock.ts            10 资产 + 7 历史对话 + 8 主导航
  vulnerabilities.mock.ts   10 真实公开 CVE 编号
  ranking.mock.ts           A1 排序兜底 fixture (AI 失败时用)
  compare.mock.ts           A2 比对统计 / 5 合并对 / 8 命中补丁
  workflow.mock.ts          workflow 步骤 / 工具调用 (含 deepseek.chat.infer)

lib/
  scoring.ts                computeFinalScore + 阈值常量 (LUI_FOLLOWUP_BUDGET 等)
  workflowState.ts          stage → phase / inline step 索引映射
  exportCsv.ts              CSV 导出 (PRD § 3.2.2 锁前 5 列: cve / vpt 三维 / final_score / source / patch_status)
  store.tsx                 全局状态 (Context + useReducer + AI 端点 useEffect 钩子)

types/
  index.ts                  共享类型
```

## 哪些是 AI 真跑的, 哪些是 mock

### 🟢 真接入 AI (DeepSeek)

| 区块 | 端点 | 说明 |
| --- | --- | --- |
| LUI 参数智能抽取 | `/api/extract-params` | 含意图分类 + 5 类业务场景 + 别名表 (PRD § 3.1.2 锁) |
| A1 VPT 三维评分 + 场景识别 + 排序 + 中文 summary | `/api/rank` | 真按 PRD 公式 `min(base × sceneWeight, 10)` |
| A1 后续动作建议 | `/api/next-actions` | 基于实际排序结果生成 3 条针对性建议 |
| A2 LUI 反问相似度判断 | `/api/similarity` | 给 0-100 分 + 中文理由 |
| A2 比对汇总 + reflection 报告 | `/api/compare-summary` | PRD § 2.3 三层口径 |
| 闲聊 / 一般问题 | `/api/extract-params` (chat 分支) | 用户输入"你好"/"什么是 vpt" 等非任务 query 时, AI 直接给中文回复 |

### 🟡 仍是 mock (产品边界 — AI 不该解的事)

| 区块 | mock 文件 | 真实上线接什么 |
| --- | --- | --- |
| 资产清单 | `data/assets.mock.ts` ASSETS | `insight.assets.fingerprint` 等 |
| 历史对话 | `data/assets.mock.ts` HISTORY | 鉴微 insight 会话存储, 含完整状态恢复 (PRD 需求 12, 留 v1.1) |
| 漏洞数据 | `data/vulnerabilities.mock.ts` | `insight.vulns.list` |
| A2 比对统计数字 | `data/compare.mock.ts` COMPARE_STATS | 后端 join 计数, **不是 AI 该解的事** |
| A2 候选合并对 / 命中补丁表 | `data/compare.mock.ts` MERGE_PAIRS / PATCH_HITS | 数据 join, 不是 AI |
| 用户身份 "An" | 写死 | 鉴微 insight SSO |
| Workflow 推进时序 | `lib/store.tsx` setTimeout 2.4s+1.6s | UI 动画, 真实场景由后端 SSE / WebSocket 流式推 |
| Workflow 节点的 tool call 数字 | `data/workflow.mock.ts` | mock 让面板"有内容", 真接入时换成 OpenTelemetry trace |
| 主控大模型路由层 | **未接入** | PRD § 4.4.3 提到问津大模型 + embedding 余弦匹配, v1 demo 直连 DeepSeek 子任务模型, 主控层 v1.x 评估接入 |
| CSV 导出 | 前端 blob 下载 | 后端流式生成 + 分页 |
| 写回风险排查 | `risk.task.create` mock + 幂等 task_id 在 store 里 | 真 OpenAPI + idempotent key 在数据库 |

## 真实上线还需要的工程依赖 (PRD § 4.4)

| 依赖 | 现状 | 需求 |
| --- | --- | --- |
| 4.4.1 鉴微 insight 后端数据接口 | mock | OpenAPI 契约 + 鉴权 + qps 上限 |
| 4.4.2 配置中心运行时阈值 | demo 内常量 + 配置中心 modal 只读展示 | 热改不重启, 字段范围校验 |
| 4.4.3 主控大模型语义匹配 | 未接入 (前端 keyword 启发) | embedding 余弦匹配 + 路由 |
| 4.4.4 问津大模型推理 | 用 DeepSeek 替代 | 端到端 P95 ≤ 30s (A1) / ≤ 60s (A2) |
| 4.4.5 风险排查模块写接口 | mock + 幂等 task_id 在前端 | 真 `risk.task.create` |
| 4.4.6 VPT 算法服务 | demo 内 `min(base × weight, 10)` | 独立服务返回三维原始分 + 基线分 |
| 4.4.7 补丁库 cve 查询 | mock `PATCH_HITS.patch` | 真 cve 等值查询 |

## 当前 Demo 已实现 / 未实现

### ✅ 已实现 (v1.0)

- **主壳子完整** (Rail 8 模块带 hover + click toast / Sidebar 含真搜索过滤 / TopBar 含配置中心 modal)
- **双 agent 完整链路** (welcome → lui → running → reflect → followup → final)
- **5 个 AI 端点真接入 DeepSeek** + mock 兜底
- **chat 意图分类** (闲聊不强制弹 LUI)
- **A1**: VPT 三维评分 / 场景权重 / 综合排序分 / AI 后续动作建议 / CSV 导出 (PRD § 3.2.2 锁 5 列) / 跳转 url (vuln_ids + lui_params)
- **A2**: AI 比对汇总 / 三层口径 reflection 报告 / 命中补丁表 / 5 候选合并对 / 写回幂等 (PRD § 3.2.4 步骤 9)
- **LUI 反问** (单对确认 + 队列 + 合并/不合并/加入待审核 + DeepSeek 真相似度)
- **A1 → A2 串联桥**
- **4 种异常路径** (timeout / patch / partial / budget) + 行为门禁 (partial 写回置灰)
- **演示导览** (13 场景, 5 个 [AI] 徽标)
- **配置中心 modal** (5 段 18 项 PRD 阈值只读展示)
- **响应式** (1500/1300/1100 三档)

### ⏳ 未实现 (留 v1.x)

- 历史对话点击恢复完整状态 (PRD 需求 12, 仅展示标题)
- workflow 节点 tool call 展开详情面板 (现仅汇总)
- 流式响应 (现 setTimeout 假推进)
- 主控大模型 embedding 路由 (PRD § 4.4.3, 现 keyword 启发)
- 真 OpenTelemetry trace 替换 mock 工具调用记录

## PRD 对齐 (v0.9)

完整审计在 commit history (搜 `prd-align`)。核心硬约束已对齐:

- 场景权重表 (业务上线前 1.15 / 夜间窗口 1.05 / 合规审计前 1.10 / 红蓝对抗前 1.20 / 未识别 1.00)
- 场景词别名表 (数据库上线/发版前/护网/等保/夜间变更等)
- 综合排序分 = `min(base × sceneWeight, 10)`
- LUI 反问双阈值 95/90 + 预算 5 次
- reflection_retry_limit = 3
- A2 写回 7 字段映射 + 幂等
- A1 跳转 url 锁定 vuln_ids + lui_params
- CSV 锁前 5 列 (cve / vpt 三维基线分 / 综合分 / 数据来源 / 补丁状态)
- 主控大模型 v1 不接入 (现状如实声明, 不假装)

## 部署

详见 [`DEPLOY_STATIC.md`](./DEPLOY_STATIC.md)。

**Vercel** (推荐, 当前生产部署): GitHub auto-deploy, 设环境变量 `DEEPSEEK_API_KEY` 即可。
**静态导出** (无后端环境): 改 `next.config.mjs` 加 `output: 'export'`, 但 AI 端点失效, 仅展示 mock UI。

## License

内部演示用, 未授权对外。
