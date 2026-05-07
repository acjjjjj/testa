/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ── 默认: 动态部署 (Vercel) ─────────────────────────────────
  // 支持 API Route → /api/similarity 真接 DeepSeek 大模型
  //
  // 如需重新生成纯静态包 (上传 nginx / Cloudflare Pages 等无后端环境):
  //   1. 临时打开下面 3 行
  //   2. npm run build → 输出 out/
  //   3. 静态版本不能调 AI, 会自动 fallback 到 mock 数据
  //
  // output: "export",
  // trailingSlash: true,
  // images: { unoptimized: true },
};

export default nextConfig;
