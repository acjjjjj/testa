# 哨兵 AI 助手 v1.0 — Demo

鉴微 insight 之上的「哨兵 AI 助手」工作台前端 Demo, 把 Claude Design handoff bundle 实现成一个可本地运行、可点击演示、可部署的 Next.js 项目。

## 项目是什么

「哨兵」是鉴微 insight 安全运营平台第八个模块, 提供两个 agent:

- **Agent 1 · 智能风险排序**
  在用户给定的局部漏洞数据范围里, 按 VPT 三维基线分 + 场景权重, 输出带场景识别的优先级列表。
  综合排序分 = `min(VPT 基线分 × 场景权重, 10)`。

- **Agent 2 · 智能风险排查比对**
  给定资产范围, 跑资产指纹与多源漏洞库比对、相似度去重、补丁库联动, 结果支持用户手动写回风险排查模块。

技术栈: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS。

## 如何启动

```bash
cd 哨兵-demo
npm install
npm run dev
# 浏览器打开 http://localhost:3000
```

可用脚本:

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 (默认端口 3000) |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 跑 ESLint (Next 内置) |

## 演示路径

启动后可按以下路径手动演示完整流程:

1. **首屏** — 哨兵 AI 助手主界面, 双 agent 卡片 + 示例。
2. **Agent 1 主链路** — 点击 A1 卡片 → LUI 参数确认 → 点 "确认参数, 开始执行" → 自动推进 running → reflect → final → 展示前 10 / 142 排序结果。
3. **Agent 2 主链路** — 同上但选 A2, 在 running → reflect 后会触发 LUI 反问。
4. **LUI 反问** — 在反问气泡里点 "合并 / 不合并 / 加入待审核", 队列走完后进入 final 比对结果。
5. **A1 → A2 双 agent 串联** — 在 A1 排序结果前 3 行点 "交给 A2 排查" → handoff 桥接卡片 → 启动 Agent 2。
6. **写回流程** — A2 final 点 "存为风险排查任务" → 二次确认弹窗 → 写回成功气泡。
7. **partial / 异常** — 右下角"场景"按钮 → 选 "partial 异常" / "补丁库不可用", 写回按钮置灰, 仅允许导出 CSV。

右下角的「场景」按钮是 demo 用的状态跳转面板, 可一键跳到任意 scene (替代真实流程里的导航), 真实部署时移除即可。

## 文件结构

```
app/
  globals.css        所有设计 token (CSS 变量) + 组件样式 (从原型继承)
  layout.tsx         根 layout
  page.tsx           入口, 挂 DemoStoreProvider + AppShell

components/
  AppShell.tsx                  4 列网格主壳
  Rail.tsx                      鉴微 insight 主导航 (左 56px)
  Sidebar.tsx                   历史对话侧栏
  TopBar.tsx                    顶部面包屑 + session 状态
  ChatThread.tsx                主对话区调度器
  BottomComposer.tsx            输入框 + 引用资产 / agent 切换
  Welcome.tsx                   欢迎页 (双 agent 卡片 + 示例)

  LuiParamCardA1.tsx            A1 LUI 参数确认卡 (4 字段)
  LuiParamCardA2.tsx            A2 LUI 参数确认卡 (4 字段)
  RunningBubble.tsx             running / reflect / followup 头部气泡
  WorkflowStatus.tsx            右侧 6 域 workflow 状态可视化

  RiskRankingResult.tsx         A1 final response — Top 10 排序
  RiskCompareResult.tsx         A2 final response — 比对统计 + 命中表 + 合并记录
  LuiFollowupCard.tsx           A2 LUI 反问卡

  AbnormalAlert.tsx             timeout / patch / partial / budget 4 种异常 banner
  HandoffBridge.tsx             A1 → A2 串联桥接卡
  WritebackConfirmDialog.tsx    写回二次确认弹窗
  WritebackDoneCard.tsx         写回成功气泡

  ScenarioSwitcher.tsx          右下角场景跳转面板 (替代原型 Tweaks)
  Icon.tsx Badge.tsx ScoreBar.tsx Seg.tsx WorkflowInline.tsx Domain.tsx
                                小型可复用 UI primitives

data/
  assets.mock.ts            资产清单 + 历史对话 + 主导航
  vulnerabilities.mock.ts   漏洞清单
  ranking.mock.ts           Agent 1 排序结果 fixture
  compare.mock.ts           Agent 2 比对统计 / 合并对 / 命中补丁
  workflow.mock.ts          各阶段步骤 / 工具调用 / 运行日志

lib/
  scoring.ts                computeFinalScore + mergeActionFor + 阈值常量
  workflowState.ts          stage → phase / inline step 索引映射
  exportCsv.ts              CSV 导出 (浏览器 blob 下载)
  store.tsx                 全局状态 (React Context + useReducer)

types/
  index.ts                  共享类型定义
```

组件按职责拆分, 没有任何文件超过 300 行。

## 哪些数据是 mock

**所有数据**都是 mock, 不调用任何真实接口:

| 模块 | mock 文件 | 说明 |
| --- | --- | --- |
| 资产清单 | `data/assets.mock.ts` `ASSETS` | 10 条演示资产, 涵盖 OFBiz / SSH / Struts / 容器 / DevOps |
| 历史对话 | `data/assets.mock.ts` `HISTORY` | 7 条历史会话 |
| 漏洞清单 | `data/vulnerabilities.mock.ts` `VULNERABILITIES` | 真实 CVE 编号 + 演示描述 |
| Agent 1 排序结果 | `data/ranking.mock.ts` `SORTED_VULNS` | 10 条预排序漏洞, score 通过 `computeFinalScore` 计算 |
| Agent 2 比对统计 | `data/compare.mock.ts` `COMPARE_STATS` | 新增 / 合并 / 去重 / 跳过 |
| Agent 2 合并对 | `data/compare.mock.ts` `MERGE_PAIRS` | 5 对候选, 覆盖 auto / ask / no 三档 |
| Agent 2 命中补丁 | `data/compare.mock.ts` `PATCH_HITS` | 8 条命中漏洞 + 补丁状态 |
| Workflow 步骤 | `data/workflow.mock.ts` | 各阶段步骤 / 工具调用 / 运行时 log |

Workflow 推进 (`running → reflect → final` / `followup`) 由 `lib/store.tsx` 里的 `setTimeout` 驱动, 没有真实异步任务。

## 真实上线需要接入哪些接口

下面这些是 demo 里**纯前端 mock**的接口, 真实接入时需替换:

| 区块 | mock 现状 | 真实需要 |
| --- | --- | --- |
| 主控大模型 query 解析 | LUI 参数卡的字段值是写死的 | 调主控大模型 NLU 接口, 返回抽取的 4 个参数 + 置信度 |
| 鉴微 insight 数据接口 | `data/*.mock.ts` 静态数据 | `insight.vulns.list` / `insight.assets.fingerprint` 等 OpenAPI |
| VPT 算法服务 | `lib/scoring.ts → computeFinalScore` 仅做最终公式 | 后端的三维基线分服务, 接收资产 + 漏洞返回 vptA/V/I |
| 大模型场景识别 / 相似度判断 | running log 里写死的字符串 | 问津大模型推理接口, 异步返回流式 token |
| 多源漏洞库 | `MERGE_PAIRS` 静态 | 内部漏洞库 / 威胁情报 / CVE / CNNVD 各自的 fetch + 归一化 |
| 补丁库 cve 等值查询 | `PATCH_HITS.patch` 静态 | `patch.cve.lookup` 接口, 失败时触发 patch 异常路径 |
| LUI 反问预算控制 | `LUI_FOLLOWUP_BUDGET = 5` 常量 | 后端会话状态里的预算计数器 + 超限事件 |
| 写回风险排查模块 | 写回弹窗确认后只切 stage | 调 `risk.task.create` 写回 + idempotent key |
| CSV 导出 | 前端 blob 下载 | 后端流式生成 + 大数据量分页 |
| 历史对话 | `HISTORY` 静态 | 鉴微 insight 会话存储, 含完整状态恢复 (PRD 需求 12, v1.1) |

主要 hook 点都集中在 `data/*.mock.ts` 和 `lib/store.tsx`, 接入时替换 fetcher 即可, 不需要重写组件。

## 当前 Demo 的功能范围

✅ 已实现:

- 主壳子 (Rail / Sidebar / TopBar / ChatThread / BottomComposer)
- 双 agent 完整链路 (welcome → lui → running → reflect → followup → final)
- A1 排序结果 (含 vpt 三维 / 场景权重 / 综合排序分 / 后续动作建议 / CSV 导出)
- A2 比对结果 (含统计 / 补丁可行性 / 去重合并记录 / CSV 导出)
- A2 LUI 反问 (单对确认 + 队列预览 + 合并 / 不合并 / 加入待审核)
- 写回二次确认弹窗 + 写回成功态
- A1 → A2 双 agent 串联桥接
- 4 种异常路径 (timeout / patch / partial / budget) banner + 行为门禁 (partial 写回置灰)
- 右侧 6 域 Workflow 状态可视化 + 工具调用记录
- 响应式收缩: 1500/1300/1100 三档断点, 窄屏自动隐藏右侧 / 历史侧栏
- 深色 SOC 主题 (oklch 同色族强调色)

⏳ 未实现 (留 v1.1):

- 历史对话点击恢复完整状态 (PRD 需求 12)
- agent 入口悬浮按钮形态
- workflow 节点 tools 调用展开详情面板
- 真实流式响应动画 (现在是 setTimeout 假推进)

## 设计来源

- Claude Design handoff bundle: `untitled/项目/哨兵 AI 助手 v1.0.html` 等 JSX 原型
- PRD v0.5 + 阶段泳道图 (agent 1 / agent 2)
- 颜色 / 排版 / 间距 1:1 还原 Claude Design 的深色 SOC 工作台风格

## License

内部演示用, 未授权对外。
