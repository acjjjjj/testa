"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export interface DropdownOption {
  /** 主标题 (粗体) */
  label: string;
  /** 副标题 / 详情 (灰色小字) */
  hint?: string;
  /** 内部值, onPick 回传 */
  value: string;
  /** 左侧 icon (可选) */
  icon?: React.ReactNode;
}

export interface DropdownProps {
  children: React.ReactNode;
  options: DropdownOption[];
  value?: string;
  onPick: (value: string) => void;
  triggerStyle?: React.CSSProperties;
  triggerClassName?: string;
  /** 菜单宽度: 数字 / 'auto' / '100%' (跟 trigger 一致) */
  menuWidth?: number | "auto" | "100%";
  placement?: "top" | "bottom";
  title?: string;
}

/**
 * 下拉菜单 — 用 React Portal 挂到 document.body 上,
 * position:fixed 计算坐标, 避免被 .card.lui {overflow:hidden} 这类父容器裁剪
 */
export function Dropdown({
  children,
  options,
  value,
  onPick,
  triggerStyle,
  triggerClassName,
  menuWidth = "100%",
  placement = "bottom",
  title,
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // SSR 安全 — 仅客户端 mount 后才允许 portal
  React.useEffect(() => setMounted(true), []);

  // 打开时记录 trigger 位置
  React.useEffect(() => {
    if (open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
  }, [open]);

  // 点击外部 / Esc / 滚动 / resize 都关闭
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  // 计算菜单坐标
  const menuPosition: React.CSSProperties = React.useMemo(() => {
    if (!rect) return { visibility: "hidden" };
    const computedW =
      menuWidth === "100%"
        ? rect.width
        : menuWidth === "auto"
        ? undefined
        : menuWidth;
    if (placement === "top") {
      return {
        position: "fixed",
        left: rect.left,
        bottom: window.innerHeight - rect.top + 4,
        width: computedW,
        minWidth: 220,
      };
    }
    return {
      position: "fixed",
      left: rect.left,
      top: rect.bottom + 4,
      width: computedW,
      minWidth: 220,
    };
  }, [rect, menuWidth, placement]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        style={{ ...defaultTriggerStyle, ...triggerStyle }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {children}
      </button>
      {mounted &&
        open &&
        createPortal(
          <div ref={menuRef} role="listbox" style={{ ...menuStyle, ...menuPosition }}>
            {title && <div style={menuTitleStyle}>{title}</div>}
            {options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onPick(opt.value);
                    setOpen(false);
                  }}
                  style={{ ...itemStyle, ...(isActive ? activeItemStyle : null) }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--bg-3)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {opt.icon && <span style={iconColStyle}>{opt.icon}</span>}
                  <span style={textColStyle}>
                    <span style={labelStyle}>{opt.label}</span>
                    {opt.hint && <span style={hintStyle}>{opt.hint}</span>}
                  </span>
                  {isActive && <span style={checkStyle}>✓</span>}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

// ── styles ────────────────────────────────────────────────────────────

const defaultTriggerStyle: React.CSSProperties = {
  width: "100%",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
};

const menuStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line-2)",
  borderRadius: 10,
  padding: 4,
  boxShadow: "0 8px 30px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.4)",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: 1,
  maxHeight: 360,
  overflowY: "auto",
};

const menuTitleStyle: React.CSSProperties = {
  padding: "6px 10px 4px",
  fontSize: 10.5,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color: "var(--fg-3)",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 7,
  background: "transparent",
  border: 0,
  color: "var(--fg)",
  font: "inherit",
  cursor: "pointer",
  textAlign: "left",
  transition: "background 90ms",
};

const activeItemStyle: React.CSSProperties = {
  background: "color-mix(in oklab, var(--blue) 18%, var(--bg-3))",
};

const iconColStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  color: "var(--fg-2)",
  flexShrink: 0,
};

const textColStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 1,
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--fg)",
  fontWeight: 500,
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--fg-3)",
};

const checkStyle: React.CSSProperties = {
  color: "color-mix(in oklab, var(--blue) 80%, white)",
  fontSize: 12,
};
