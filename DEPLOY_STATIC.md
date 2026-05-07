# 静态站点部署 — 哨兵 AI 助手 v1.0 Demo

本项目用 **Next.js 14 静态导出** (`output: "export"`) 把整个 demo 编译成纯静态站点, 不需要 Node.js 运行时, 不需要后端, 可以扔到任何静态托管服务上。

## 一行命令构建

```bash
cd 哨兵-demo
npm install        # 第一次需要
npm run build      # 输出在 out/
```

构建产物在 `out/` 目录, 同时仓库里也保留了一份 `deploy-static/` (本次构建的快照)。

## 三种部署方式

### 方式 A: Netlify Drop (最快, 不需要账号)

1. 浏览器打开 https://app.netlify.com/drop
2. 把 `deploy-static/` 整个文件夹**拖到**上传区
3. Netlify 自动分配一个 `https://xxxxx.netlify.app` 网址
4. 把网址发给领导

> 临时链接 24 小时后可能回收, 想保留请用 Netlify 账号绑定。

### 方式 B: Cloudflare Pages

**Output directory** 应该填 `out` (从仓库 build 时) 或者直接上传 `deploy-static/`。

#### B-1. 直接上传 (Direct Upload)

1. https://dash.cloudflare.com → **Pages** → **Create a project** → **Direct Upload**
2. 项目名随意, 例如 `sentinel-ai-demo`
3. **拖入 `deploy-static/`** 整个文件夹
4. 部署完成拿到 `https://sentinel-ai-demo.pages.dev` 网址

#### B-2. 连接 Git 自动 CI

| 字段 | 值 |
| --- | --- |
| **Framework preset** | `Next.js (Static HTML Export)` |
| **Build command** | `npm run build` |
| **Build output directory** | `out` |
| **Root directory** | 仓库根 (如果项目在子目录则填 `哨兵-demo`) |
| **Node version** | `20` 或 `22` |

每次 git push 自动重新构建。

### 方式 C: 公司 nginx / 静态服务器

#### 部署在域名根路径

把 `deploy-static/` 下**所有文件 + 子目录**上传到 nginx 静态目录 (例如 `/var/www/sentinel-demo/`)。

最小 nginx 配置:

```nginx
server {
    listen 80;
    server_name sentinel.your-company.com;

    root /var/www/sentinel-demo;
    index index.html;

    location /_next/static/ {
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo nginx -t && sudo nginx -s reload
```

#### 部署在子路径 (例如 `https://your-company.com/sentinel-demo/`)

需要重新构建。编辑 `next.config.mjs`, 加 `basePath` 和 `assetPrefix`:

```js
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: "/sentinel-demo",
  assetPrefix: "/sentinel-demo",
};
```

```bash
rm -rf .next out deploy-static
npm run build
cp -r out deploy-static
```

nginx 侧:

```nginx
location /sentinel-demo/ {
    alias /var/www/sentinel-demo/;
    try_files $uri $uri/ /sentinel-demo/index.html;
}
```

## 上传哪些文件

`deploy-static/` 目录下**全部**:

```
deploy-static/
├── index.html              ← 首页 (默认入口)
├── 404.html                ← 错误页
├── 404/index.html          ← Next 内部目录形式
├── index.txt               ← 可保留也可删, 不影响功能
├── _next/                  ← 必须! 所有 JS / CSS / chunk 在这里
│   └── static/
│       ├── css/*.css
│       ├── chunks/*.js
│       └── ...
└── README_部署说明.md
```

**不要上传**:
- `node_modules/` (本目录里没有, 只是提醒)
- 项目源码 (`app/` `components/` 等不需要)
- `.next/` (构建中间产物)

## 已知静态导出限制

| 限制 | 当前 Demo 是否触及 |
| --- | --- |
| 不能用 Server Actions | ❌ 没用, 全前端 mock |
| 不能用 API Routes (`/api/*`) | ❌ 没用 |
| 不能用 ISR / 动态 SSR | ❌ 没用 |
| `next/image` 必须 `unoptimized: true` | ✅ 已配 |
| middleware / rewrites 不生效 | ❌ 没用 |
| 子路径部署需要 basePath | ⚠️ 仅当部署到 `/foo/` 子目录时需要 |

本 Demo 是纯客户端 React + mock 数据, 上述限制都不影响功能。

## 已验证

- `npm run build` ✓ 通过, 产生 `out/index.html` (21 KB)
- `python3 -m http.server -d deploy-static` ✓ 本地起 HTTP 200
- CSS chunk (29 KB) 和 JS chunk (70 KB) 都正确加载
- 关键字符串 ("智能风险排序" / "智能风险排查比对" / "LUI 反问" / "partial 结果仅供排查" / "CVE-2024-44308") 全部命中 JS 包

## Mock 数据 / 真实接入清单

见同包 `release/项目说明.md` 第 3 / 第 4 节。一句话:

- **所有数据**都是 mock, 关页面就清空
- 真实上线需替换 `data/*.mock.ts` 里的静态数据 + `lib/store.tsx` 里的 setTimeout 推进, 接鉴微 insight 的数据接口、问津大模型推理、补丁库 cve 查询、风险排查模块写回等

## 下线 / 更新

- Netlify / Cloudflare Pages: 控制台直接删除项目 / 重新拖拽更新
- 公司 nginx: 替换 `/var/www/sentinel-demo/` 内容 → 浏览器强刷

页面侧 cache 是 `_next/static/` 长期缓存 + 入口 HTML 不缓存, 重新部署后强刷即可看到最新版本。
