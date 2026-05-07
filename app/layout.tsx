import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "哨兵 AI 助手 v1.0",
  description: "鉴微 insight · 哨兵 AI 助手 — 智能风险排序 / 智能风险排查比对 演示原型",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
