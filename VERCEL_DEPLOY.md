# Vercel 部署指南 — 哨兵 AI 助手 v1.0 + DeepSeek 真接入

整套流程 **15 分钟** 跑完, 拿到一条 `https://xxx.vercel.app` 链接发给领导。

## 现状盘点

代码层面已完成:
- ✅ `next.config.mjs` 已切到动态部署 (去掉 `output: "export"`)
- ✅ `/api/similarity` Edge Function 接 DeepSeek-chat
- ✅ `LuiFollowupCard` 自动调真 AI, 失败时兜底 mock
- ✅ 本地 `npm run build` 通过
- ✅ 本地真 DeepSeek 调用验证通过 (返回 score 95-98 + 中文 reason)
- ✅ `.gitignore` 屏蔽 `.env.local`, `node_modules`, `release/`, `deploy-static/`
- ✅ git 仓库初始化完成, 1 commit, 远端指向 `https://github.com/acjjjjj/testa.git`

接下来你要做 3 件事:
1. push 代码到 GitHub
2. Vercel 连接仓库
3. Vercel 配环境变量 + 部署

## 第 1 步: push 到 GitHub

GitHub 的 `acjjjjj/testa` 仓库现在有一个老的 README, 需要被覆盖。打开终端:

```bash
cd ~/Desktop/学习/week3/哨兵-demo
git push -u origin main --force
```

第一次 push 会弹浏览器要 GitHub 登录, 授权一下就好。

> 用 `--force` 是因为我们的本地仓库是新初始化的, 跟远端那个旧 README 历史不通。这条仓库现在还没有任何有价值的内容, 覆盖掉没问题。

push 完成后浏览器打开 https://github.com/acjjjjj/testa 应该能看到所有源码。

## 第 2 步: Vercel 连接仓库

1. 打开 https://vercel.com → 用 **GitHub 账号登录** (推荐, 后面省事)
2. 顶部 **Add New** → **Project**
3. 列表里找到 `acjjjjj/testa` → 点 **Import**
4. 配置页面:

| 字段 | 值 |
| --- | --- |
| Project Name | `sentinel-ai-demo` (随便填, 决定子域名) |
| Framework Preset | Next.js (自动识别, 不用动) |
| Root Directory | `./` (默认) |
| Build Command | (留默认 `next build`) |
| Output Directory | (留默认) |
| Install Command | (留默认) |

**先别点 Deploy**, 滚到下面展开 **Environment Variables**:

## 第 3 步: 配 DeepSeek API Key

在 Environment Variables 区域:

| Key | Value | Environment |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | `sk-c7db79142a324d1c83e4d0fbaf2a1462` | All (Production / Preview / Development) 全勾 |

加完之后再点 **Deploy**。

> 这个 key 只存在 Vercel 的加密变量里, 不会出现在前端 bundle, F12 看不到。

## 第 4 步: 等部署 + 拿链接

第一次部署 ~90 秒。完成后会跳到 dashboard, 顶部出现你的 URL:

```
https://sentinel-ai-demo.vercel.app
       (或 sentinel-ai-demo-acjjjjj.vercel.app)
```

点击打开, 应该看到熟悉的深色工作台首页。

## 第 5 步: 验证真 AI 在跑

1. 进首页, 点左侧任何 Agent 2 历史, 或者顶部"智能风险排查比对"
2. 走完参数确认 → 等 workflow 推进 → 进 LUI 反问卡
3. **关键看点**: 候选合并对 #3 / #4 卡片右上角应该显示
   - 先 `大模型评估中…` (黄色 badge)
   - 1-3 秒后变成 `DeepSeek · score 96` (薄荷绿 badge)
   - 下方"AI 判断"行出现真模型给的中文理由

如果一直停在"大模型评估中"或者直接显示"conf 0.92" (mock 兜底), 说明环境变量没生效, 检查 Vercel → Settings → Environment Variables。

## 国内访问稳不稳

`xxx.vercel.app` 默认域名在国内**时通时不通**, 取决于网络环境。把链接发给领导前你自己用领导那边类似的网络 (移动 / 联通 / 公司网) 试一下。

打不开的兜底方案:

### 兜底 A: 自己买个域名挂 Cloudflare

1. 阿里云 / 腾讯云买一个 `.com` 域名 (大概 50 块/年)
2. 域名 NS 切到 Cloudflare (免费)
3. Vercel → Settings → Domains → Add Custom Domain
4. 按 Vercel 提示在 Cloudflare 加 CNAME 记录, 国内访问通过 Cloudflare 解析, 比 vercel.app 稳
5. 拿到 `https://demo.your-domain.com` 发给领导

### 兜底 B: 改部署到 Zeabur

Zeabur 是台湾团队做的 PaaS, 国内访问稳定, 部署体验跟 Vercel 一模一样:

1. 打开 https://zeabur.com → GitHub 登录
2. New Project → 选 `acjjjjj/testa` → Deploy
3. Variables 加 `DEEPSEEK_API_KEY`
4. 拿到 `https://xxx.zeabur.app` 链接

跟 Vercel 二选一 / 都搞都可以。

## 改完代码再发布

后续你改代码后:

```bash
cd ~/Desktop/学习/week3/哨兵-demo
git add -A
git commit -m "更新 xxx"
git push
```

Vercel **自动检测到 push, 自动重新构建部署**, 大概 1-2 分钟新版本就上线。不需要手动操作 Vercel 控制台。

## 排错速查

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| Vercel 部署失败 build error | 上次本地 build 通过, push 后又改坏了 | Vercel 控制台看 Build Logs, 一般是类型错 |
| 页面打开 500 | API 路径没部署成功 | 检查 Vercel Functions 标签, 看 `/api/similarity` 是否存在 |
| LUI 反问一直显示 mock | API key 没生效 | Settings → Environment Variables 确认 `DEEPSEEK_API_KEY` 三个环境都打勾, 重新 Redeploy |
| 国内打不开 | vercel.app 域名被防火墙波及 | 走兜底 A / B |
| 领导反馈 AI 评估时间太长 | DeepSeek 偶尔慢, 8 秒内没返回会兜底 mock | 改 `app/api/similarity/route.ts` 里 `AbortSignal.timeout(8000)` 调大 |

## 成本估算

DeepSeek `deepseek-chat` 输入约 0.14 元/百万 token, 输出约 2.19 元/百万 token (缓存命中更便宜)。

我们这个 demo 单次调用约 200 token 输入 + 50 token 输出, **每次 < 0.0002 元**。

领导点开演示一次大约会触发 2-4 次相似度调用 (LUI 反问的候选对), 不到 0.001 元。**充 10 块够用一万次**。

如果担心被刷 (公开链接), 可以在 `/api/similarity/route.ts` 里加一个简单的 IP rate limit, 或者用 Vercel 的 Rate Limit 配置。
