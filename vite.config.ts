import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 离线单文件 build 配置 — 把整个 Next.js demo 重新打包成一个可双击打开的 HTML。
 *
 * - root 指到 vite/, 那里有专属的 index.html + main.tsx
 * - 所有组件 / 数据 / 样式 都通过 @ 别名复用 Next 项目本体, 不重复维护
 * - vite-plugin-singlefile 把 JS/CSS 全部 inline 到 HTML 里
 */
export default defineConfig({
  root: path.resolve(__dirname, "vite"),
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "release/_offline-build"),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
});
