# 部署 — 哨兵 AI 助手 v1.0 Demo

> **当前生产部署走 Vercel 动态托管**, 是这个 demo 的唯一推荐部署方式.
> 静态导出方案 (这份文档原版) 已被废弃, 因为 6 个 AI 端点 (extract-params /
> rank / similarity / next-actions / compare-summary / abnormal-narrate)
> 必须 server runtime, 静态包没有这个能力.

## 推荐: Vercel 动态部署 (当前生效)

**生产链接**: https://testa-ashen.vercel.app

**部署流程** (已自动化):

1. GitHub 仓库: `acjjjjj/testa`
2. Vercel 项目连接到仓库, 监听 `main` 分支
3. 推 commit → Vercel 自动 build + deploy (~90 秒)
4. 环境变量 `DEEPSEEK_API_KEY` 在 Vercel project settings 里配置
   (Production + Preview 都要勾, Development 是 sensitive 不允许)

**重新部署**: 直接 push 到 main, 或在 Vercel UI 手动 Redeploy
(必须勾 "Use existing Build Cache: 取消", 否则环境变量改动不生效)

## 已知限制

- **Vercel Hobby plan Edge Function 上限 25s**, AI 端点都设了 22s 上游超时 + 28s 客户端兜底
- 单 IP 单分钟 20 次 API 调用 (`app/api/_lib/guard.ts`),
  超额返回 429. 防止外部扫描烧 DeepSeek 余额
- API 端点检 Origin / Referer, 只接受来自 `*.vercel.app` 或 `localhost` 的请求.
  非本站直接 curl 会 403

## 静态导出 (废弃, 仅作存档)

`release/哨兵AI助手-v1.0-static-site.zip` 是早期版本的静态导出快照,
**不包含**后期接通的 6 个 AI 端点. 仅在以下场景有用:

- 内网完全无法访问 Vercel 时, 拿来本地 `python3 -m http.server` 看 UI 静态结构
- 不要拿这个 zip 给领导评审, 演示效果跟 mock UI 一样, 显不出 AI 接通

如果未来要做"内网部署 + 自托管"版本, 推荐路径:

1. 改用 **腾讯云 EdgeOne Pages** / **阿里云 Serverless** 托管 Next.js
2. 把 DeepSeek 调用替换成内网大模型网关
3. 不要回到静态导出

## 真接入鉴微 insight 后的部署改动 (留 v1.x)

| 当前 | 真接入 |
| --- | --- |
| Vercel + DeepSeek | 鉴微 insight 内网 K8s + 问津大模型 |
| `_lib/guard.ts` 简单 origin 检查 | 鉴微 insight SSO + 用户 session |
| 单 IP 20 次/min | 接 Redis / Vercel KV 严格限速 |
| `data/*.mock.ts` | `insight.vulns.list` / `insight.assets.fingerprint` 等真接口 |

详见 `README.md` 的 "真实上线还需要的工程依赖 (PRD § 4.4)" 表格.
