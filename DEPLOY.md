# 部署指南 — 哨兵 AI 助手 v1.0 Demo

本 Demo 有 3 种交付方式, 按需选用:

| 方式 | 用途 | 给到对方的东西 |
| --- | --- | --- |
| ① 离线单文件 HTML | 最简单, 领导本地双击就能看 | `release/哨兵AI助手-v1.0-demo.html` 一个文件 (≈ 240 KB) |
| ② Release zip | 带使用说明, 适合微信 / 邮件发送 | `release/哨兵AI助手-v1.0-release.zip` (≈ 74 KB) |
| ③ 在线链接 | 适合多人评审 / 投屏 / 分享链接 | Vercel / Netlify / Cloudflare Pages 部署后的 URL |

本文档讲 ③ 在线链接的部署。

---

## 推荐: Vercel 一键部署 (5 分钟)

Next.js 是 Vercel 自家产品, 部署最顺。

### 步骤

1. 把 `哨兵-demo/` 目录推到 GitHub / GitLab / Bitbucket 任意一个仓库 (私有 / 公开都行)
2. 浏览器打开 https://vercel.com → 用 GitHub 账号登录
3. 点 **Add New → Project** → 选你的仓库 → **Import**
4. 配置面板里:
   - **Framework Preset**: 自动识别为 Next.js (默认即可)
   - **Root Directory**: 如果仓库根就是 `哨兵-demo/` 内容, 留空; 否则填 `哨兵-demo`
   - **Build Command / Output Directory**: 留默认
5. 点 **Deploy** → 等 1-2 分钟构建完成
6. 拿到形如 `https://sentinel-ai-demo-xxxx.vercel.app` 的链接, 直接给领导发

### Vercel CLI 路线 (不想接 GitHub)

```bash
cd 哨兵-demo
npx vercel login          # 一次性, 浏览器弹出登录
npx vercel --prod         # 直接部署到生产环境
```

CLI 会问几个问题, 全部按默认即可。最后输出生产 URL。

### 关键配置

- **不需要任何环境变量** — 本 Demo 全部 mock 数据
- **不需要数据库 / Redis / 存储** — 纯前端
- **不需要付费** — Vercel Hobby 免费额度足够评审用

---

## 备选 1: 静态导出 + 任意静态托管

如果不想用 Vercel, 把 Next 项目导出成静态文件然后托管。

### 添加静态导出

编辑 `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',          // 加这一行
  images: { unoptimized: true },
};
export default nextConfig;
```

然后:

```bash
npm run build
# 输出在 哨兵-demo/out/
```

`out/` 整个目录就是静态站点, 上传到任意静态托管即可:

| 平台 | 操作 |
| --- | --- |
| **Netlify** | netlify.com → Add new site → Deploy manually → 拖 `out/` 目录到上传区 |
| **Cloudflare Pages** | dash.cloudflare.com → Pages → Create → Upload assets → 选 `out/` |
| **GitHub Pages** | 把 `out/` 内容推到 `gh-pages` 分支 |
| **公司内网 nginx** | 把 `out/` 拷到 nginx 静态目录, 配置 `try_files $uri $uri/ /index.html;` |
| **七牛 / 阿里云 OSS / S3** | 上传 `out/` 内容, 设默认入口 `index.html` |

### 注意

- 静态导出后 **路由不走 Next 服务端**, 任何 ISR / Server Action / API Route 都不能用 — 我们没用这些, 没问题
- 子路径部署 (例如 `https://example.com/sentinel/`) 需要在 `next.config.mjs` 加 `basePath: '/sentinel'`

---

## 备选 2: 把单文件 HTML 直接挂上去

最快路径: 把 `release/哨兵AI助手-v1.0-demo.html` 上传到任意能托管单文件的地方:

- 微信群文件 / 钉钉群文件
- 公司 OA 附件
- GitHub Gist (raw 链接需要加 ?raw=1)
- 任意支持 HTML 直链的 OSS (七牛 / 阿里云 OSS / Cloudflare R2)
- 公司自有 nginx, 直接拷到 webroot

这是 **最便宜、最快、不需要任何构建** 的路径, 适合 "领导问我要 demo, 给个链接" 场景。

---

## 验收清单

部署完后, 在线打开链接确认:

- [ ] 首屏看到 "早上好, An" + 双 agent 卡片
- [ ] 点 A1 卡片可进入 LUI 参数确认
- [ ] 点 "确认参数, 开始执行" 后能自动推进到排序结果
- [ ] 点 A2 卡片走流程能触发 LUI 反问
- [ ] 反问点 "合并 / 不合并 / 加入待审核" 后能进入比对结果
- [ ] 比对结果点 "存为风险排查任务" 能弹二次确认弹窗
- [ ] 右下角 "场景" 按钮能跳转所有边界状态 (partial / 写回成功 / handoff 等)
- [ ] 浏览器宽度 1200 / 1000 / 800 都不破版

---

## 不要踩的坑

- **不要接真实 API**: 本 Demo 是评审产物, 不是 staging 环境。需要 staging 时另起项目接鉴微 insight 后端
- **不要把生产数据放进来**: 如果要用真实演示数据, 替换 `data/*.mock.ts` 即可, 但务必脱敏
- **不要在公网长期挂着**: 评审完建议下线 / 加密访问, 避免 mock 数据外泄给外部对手判断产品形态
- **不要 commit `.env` / `node_modules`**: `.gitignore` 已配好, 别手动覆盖

---

## 安全提示

`npm audit` 会报 Next.js 14.2.15 的安全公告 (`npm warn deprecated next@14.2.15`)。

这是 Next.js 自身的安全更新, 影响的是 SSR 路径 — 我们做的是评审用 mock demo, 不接真实后端, 实际利用面为零。如果上线 staging / prod, 需要执行:

```bash
npm install next@latest
npm run build
```

升级到最新 patched 版本。
