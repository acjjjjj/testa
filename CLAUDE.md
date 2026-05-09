# 哨兵 AI 助手 v1.0 — Claude Code 接手须知

> 这份文档是给新会话的 Claude 看的, 让你不用问 An 一堆基础问题就能直接干活.
> An 已经知道这些, 不要再问她.

---

## 1. 项目是什么

**鉴微 insight 哨兵 AI 助手 v1.0** — 给长亭 (鉴微 insight) 做的内部演示前端 demo.
- 给领导评审用, 不是真上线产品
- 6 个 AI 端点真接 DeepSeek (deepseek-chat), 其余 mock
- 演示链接 `https://testa-ashen.vercel.app`

## 2. 技术栈 + 部署

- **Framework**: Next.js 14 (app router) + TypeScript + Tailwind CSS
- **AI**: DeepSeek API (OpenAI 兼容协议), 模型 `deepseek-chat`
- **部署**: Vercel (动态, 不是静态), main 分支 push 自动 deploy ~90s
- **GitHub**: `acjjjjj/testa` (公开仓库)
- **环境变量**: `DEEPSEEK_API_KEY` 已配在 Vercel Production + Preview (Development 是 sensitive 不允许)
- **本地开发**: `cd 哨兵-demo && npm install && npm run dev` (端口 3000)

## 3. 6 个 AI 端点 (全部真接 DeepSeek)

| 端点 | 用途 | 触发时机 | 平均耗时 |
| --- | --- | --- | --- |
| `/api/extract-params` | LUI 参数抽取 + 意图分类 (a1/a2/chat) | 用户从底部输入框发任意 query | 2.7s |
| `/api/rank` | A1 排序 + 中文 summary + 排序原因 | A1 进入 running 阶段 | 12.0s |
| `/api/similarity` | A2 LUI 反问相似度 + 中文理由 | LUI 反问候选对挂件 mount | 1.7s |
| `/api/next-actions` | A1 后续动作建议 (3 条) | A1 排序 done 后异步触发 | 3.3s |
| `/api/compare-summary` | A2 比对汇总 + reflection 报告 + taskName | A2 进入 final 阶段 | 4.1s |
| `/api/abnormal-narrate` | 异常 banner 实时叙事 (4 类) | state.abnormal 切非-none | 2.8s |

**验证**: 500 样本压测 99.4% AI 命中率 (commit `4df568e`, 见 `scripts/stress-test.mjs`).

## 4. 关键技术决定 (不要重新议)

### 4.1 Vercel Edge Function 限制
- Hobby plan **硬上限 25s**
- 所有端点 `AbortSignal.timeout(22000)` + `maxDuration = 25`
- 之前 timeout 设 8-15s 经常超时走 mock 兜底, 必须保持 22+

### 4.2 不假装"问津大模型"接入
- PRD § 4.4.4 提到主控大模型 = 问津, **demo 没接**
- 配置中心 modal 明确标 "主控未接入"
- 输入框底部 "v1 demo · 直连 DeepSeek · 主控未接入"
- 工具调用记录不能出现 `wenjin.llm.infer`, 应该是 `deepseek.chat.infer`

### 4.3 静态导出方案已废弃
- `next.config.mjs` 里 `output: "export"` 已注释掉
- API Route 必须 server runtime, 静态包没法接 AI
- `release/哨兵AI助手-v1.0-static-site.zip` 只是早期 UI 快照
- **不要回到静态导出**

### 4.4 Rate limit
- `app/api/_lib/guard.ts`: 单 IP 100/min (per Edge instance, best-effort)
- 之前 20/min 太严, 自己压测都被卡; 100 对正常用户 0 影响
- Origin 检查白名单: `*.vercel.app` / `*.zeabur.app` / `*.zeabur.cn` / localhost

### 4.5 PRD v0.9 锁定值 (硬要求)
- `LUI_FOLLOWUP_BUDGET = 5` (反问预算)
- `reflection_retry_limit = 3`
- 去重阈值: ≥95% 自动合并 / 90-95% 反问 / <90% 不合并
- 综合排序分上限: `min(base × weight, 10)`
- 场景权重表 v1 锁 5 类: 业务上线前 1.15 / 夜间窗口 1.05 / 合规审计前 1.10 / 红蓝对抗前 1.20 / 未识别 1.00
- CSV 5 列固定: 漏洞 id / vpt 三维基线分 / 综合排序分 / 数据来源 / 补丁状态

## 5. 文件结构 (关键路径)

```
哨兵-demo/
├── app/
│   ├── api/
│   │   ├── _lib/guard.ts                  # Origin + rate limit
│   │   ├── extract-params/route.ts        # AI 端点 1
│   │   ├── rank/route.ts                  # AI 端点 2
│   │   ├── similarity/route.ts            # AI 端点 3
│   │   ├── next-actions/route.ts          # AI 端点 4
│   │   ├── compare-summary/route.ts       # AI 端点 5
│   │   └── abnormal-narrate/route.ts      # AI 端点 6
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── AppShell.tsx                       # 主壳子 + 历史回放逻辑
│   ├── ChatThread.tsx                     # 主对话区 + chat 气泡渲染
│   ├── BottomComposer.tsx                 # 底部输入框 + 发送 + 引用资产
│   ├── LuiParamCardA1.tsx / A2.tsx        # LUI 参数确认卡
│   ├── RiskRankingResult.tsx              # A1 排序结果
│   ├── RiskCompareResult.tsx              # A2 比对结果
│   ├── LuiFollowupCard.tsx                # A2 反问卡 (含 similarity)
│   ├── AbnormalAlert.tsx                  # 异常 banner (含 abnormal-narrate)
│   ├── WorkflowStatus.tsx                 # 右侧工作流面板
│   ├── ScenarioSwitcher.tsx               # 演示导览 (右下角, 13 场景)
│   ├── Sidebar.tsx                        # 历史对话列表
│   ├── Rail.tsx                           # 最左侧 8 图标导航
│   ├── ConfigPanel.tsx                    # 顶部配置中心 modal
│   ├── Dropdown.tsx                       # 通用下拉 (用 Portal + position:fixed)
│   ├── Toast.tsx                          # 全局 toast
│   └── ...
├── data/
│   ├── assets.mock.ts                     # 资产清单 + 历史对话 + Rail
│   ├── vulnerabilities.mock.ts            # 10 条真实公开 CVE
│   ├── ranking.mock.ts                    # A1 排序兜底 + 后续动作兜底
│   ├── compare.mock.ts                    # A2 比对统计 + 候选对 + 命中表
│   └── workflow.mock.ts                   # workflow 阶段标签 + 工具调用记录
├── lib/
│   ├── store.tsx                          # 全局状态 (useReducer + Context) + AI 副作用
│   ├── scoring.ts                         # PRD 锁定常量
│   ├── workflowState.ts                   # stage 推进状态机
│   └── exportCsv.ts                       # CSV 导出 (5 列固定)
├── types/index.ts                         # 共享类型
├── scripts/
│   └── stress-test.mjs                    # 500 样本压测脚本
├── next.config.mjs                        # output:export 已注释
├── package.json
├── README.md
├── DEPLOY_STATIC.md                       # 标记静态方案废弃
└── CLAUDE.md                              # 本文件
```

## 6. 当前状态

- 主分支 commit: 看 `git log -1 --oneline`
- 部署: `https://testa-ashen.vercel.app` 实时跟随 main
- AI 接通验证: 500 样本压测 99.4% AI 率 (`scripts/stress-test.mjs` 可重跑)
- 已发给领导: An 已经/即将把链接发出去评审

## 7. Demo 范围 (mock vs AI)

详见 `README.md`. 简版:

**真 AI** (6 处):
1. LUI 参数抽取 (A1/A2 卡的所有字段值)
2. A1 排序 (前 5 行 + summary + desc)
3. A1 后续动作建议 (3 条)
4. A2 LUI 反问相似度 (单对 score + 中文理由)
5. A2 比对汇总 + reflection 报告
6. 异常 banner 文案 (4 类)
7. 意图分类 (a1/a2/chat 路由, chat 直接回复)

**Mock 数据** (PRD 范围外, 真上线接鉴微 insight):
- 资产清单 / 历史对话 / 用户身份 An / session id
- A2 比对统计数字 (412/128/36/14, deterministic 计数 AI 不该算)
- A2 候选合并对内容 (5 对, 但 similarity 是 AI)
- A2 命中补丁表 (8 条)
- Workflow 推进时序 (setTimeout 2.4s/1.6s)
- Workflow 阶段标签 + 工具调用记录死字符串
- Rail 8 图标 + 配置中心 modal 内容
- 异常 banner 触发 (UI 触发 mock, 但文案 AI)

## 8. 已经讨论过 + 决定不做的事 (不要再提议)

| 事 | 决定 | 理由 |
| --- | --- | --- |
| workflow-narrate (右侧节点点开看 AI 描述) | **不做** | 工作量 60-90min, 演示路径里领导未必看 |
| 流式响应 (token 一字一字蹦) | **不做** | 用户已习惯, 不是亮点; 流式 JSON 解析风险高 |
| 历史状态恢复 (PRD 需求 12) | **不做** | PRD 自己 defer 到 v1.1, localStorage 跨版本兼容麻烦 |
| 1000 样本压测 | **不做** | 500 样本已证明 AI 接通, 多跑只是烧钱 |
| 接腾讯云 EdgeOne / 阿里 FC | **不做** | 演示用 Vercel 够, 长期上线该走长亭内网 |
| Zeabur | **暂不** | Zeabur 改了商业模式, 现在要买服务器, 不再是免费 PaaS |
| 备案 + 国内服务器 | **不做** | 评审 demo 短期, 备案 7-20 天不值得 |
| 假装接入问津大模型 | **绝对不做** | 配置中心明确标"主控未接入" |
| 重新启用 output:export 静态导出 | **绝对不做** | API Route 必须 server runtime |

## 9. 跟 An 沟通时的注意

- **她叫 An** (注意大小写)
- **用中文回复**, 直接, 不要 AI 感 (skill `an-writing-style` 已加载会自动应用)
- **不要问太多决定**, 给 1-2 个选项让她选, 不要列 5 个
- **不要给时间估算** (skill 里禁用了)
- **不要假装文件读过了**, 实际读再说 (skill `source-faithfulness`)
- 任何代码改动前先 read 文件, 不要凭印象改
- 推 commit 之前先 `npm run build` 验证不挂

## 10. 常用命令

```bash
# 本地开发
cd /Users/acj/Desktop/学习/week3/哨兵-demo
npm run dev                       # 起本地服务

# 验证 build (push 之前必跑)
npm run build

# 推送 (Vercel 自动 deploy)
git add -A && git commit -m "..." && git push

# 跑 500 样本压测
node scripts/stress-test.mjs

# 单端点 curl 验证
curl -X POST https://testa-ashen.vercel.app/api/extract-params \
  -H "Content-Type: application/json" \
  -H "Origin: https://testa-ashen.vercel.app" \
  -H "Referer: https://testa-ashen.vercel.app/" \
  -d '{"query":"排序订单中心高危漏洞"}'
```

## 11. 紧急情况处理

**AI 调用全部走 mock 了 (用户报怨)**:
1. curl 检查 source 字段
2. 如果是 `"网络异常 timeout"` → DeepSeek 中美延迟, 已经设到 22s, 检查是不是被改回 12s
3. 如果是 `"no-key"` → Vercel env var 没了, 让 An 去 Vercel UI 重加 + Redeploy (uncheck Build Cache)
4. 如果是 `"upstream HTTP 401"` → API key 过期, An 去 platform.deepseek.com 看

**Vercel build 失败**:
1. 看 build log
2. 多半是 TS 报错 — 修了再 push
3. 不要用 `--no-verify` 跳过

**领导打不开链接**:
1. 国内访问 vercel.app 偶尔不通 — 让他换 4G / VPN 试
2. 不要急着切 Zeabur (现在要钱) / 不要急着备案
