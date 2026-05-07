"use client";

import * as React from "react";

export interface ToastItem {
  id: number;
  text: string;
  tone?: "info" | "warn";
}

interface ToastApi {
  show: (text: string, tone?: ToastItem["tone"]) => void;
}

const Ctx = React.createContext<ToastApi | null>(null);

let nextId = 1;

/** 简单全局 toast: 右下角 2.5s 自动消失 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const show = React.useCallback((text: string, tone: ToastItem["tone"] = "info") => {
    const id = nextId++;
    setItems((arr) => [...arr, { id, text, tone }]);
    setTimeout(() => setItems((arr) => arr.filter((x) => x.id !== id)), 2500);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div style={wrapStyle}>
        {items.map((t) => (
          <div key={t.id} style={toastStyle(t.tone)}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = React.useContext(Ctx);
  // 没接入 provider 时返回 noop, 避免组件单测炸
  return v ?? { show: () => {} };
}

const wrapStyle: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  zIndex: 9999,
  pointerEvents: "none",
};

function toastStyle(tone: ToastItem["tone"]): React.CSSProperties {
  const accent =
    tone === "warn"
      ? "color-mix(in oklab, var(--amber) 55%, var(--bg-2))"
      : "color-mix(in oklab, var(--blue) 35%, var(--bg-2))";
  return {
    background: "var(--bg-2)",
    color: "var(--fg)",
    border: `1px solid ${accent}`,
    padding: "9px 14px",
    borderRadius: 8,
    fontSize: 12.5,
    boxShadow: "0 8px 24px rgba(0,0,0,.4)",
    minWidth: 200,
    maxWidth: 360,
    animation: "fadeIn .15s ease-out",
    pointerEvents: "auto",
  };
}
