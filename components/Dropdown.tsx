"use client";

import * as React from "react";

export interface DropdownOption {
  /** 主标题 (粗体) */
  label: string;
  /** 副标题 / 详情 (灰色小字) */
  hint?: string;
  /** 内部值, onPick 回传 */
  value: string;
  /** 左侧 icon (可选, 由调用方传 ReactNode) */
  icon?: React.ReactNode;
}

export interface DropdownProps {
  /** 触发器 (button) 的子元素 */
  children: React.ReactNode;
  /** 候选项 */
  options: DropdownOption[];
  /** 当前选中 value, 用于高亮 */
  value?: string;
  /** 选中回调 */
  onPick: (value: string) => void;
  /** 触发器额外样式 (覆盖 button 默认) */
  triggerStyle?: React.CSSProperties;
  /** 触发器 className (复用 demo 的 .ctrl 样式) */
  triggerClassName?: string;
  /** 菜单宽度 (默认跟着 trigger 宽度), 也支持 'auto' */
  menuWidth?: number | "auto" | "100%";
  /** 弹出方向: top → 向上展开, bottom (默认) → 向下 */
  placement?: "top" | "bottom";
  /** 标题 (可选) — 显示在菜单顶部 */
  title?: string;
}

/**
 * 通用下拉菜单 — 暗色主题, 跟 demo 视觉一致
 *
 * 用法:
 *   <Dropdown options={[{label:'近 7 天', value:'7d'}]} value={tw} onPick={setTw}>
 *     <span>近 7 天</span><Icon name="caret" />
 *   </Dropdown>
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
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [triggerW, setTriggerW] = React.useState<number>(0);

  // 打开时记录 trigger 宽度
  React.useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerW(triggerRef.current.offsetWidth);
    }
  }, [open]);

  // 点击外部 / 按 Escape 关闭
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const computedMenuWidth =
    menuWidth === "100%" ? triggerW : menuWidth === "auto" ? undefined : menuWidth;

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
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
      {open && (
        <div
          role="listbox"
          style={{
            ...menuStyle,
            ...(placement === "top" ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }),
            width: computedMenuWidth,
            minWidth: 200,
          }}
        >
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
                style={{
                  ...itemStyle,
                  ...(isActive ? activeItemStyle : null),
                }}
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
        </div>
      )}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  position: "relative",
  display: "block",
  width: "100%",
};

const defaultTriggerStyle: React.CSSProperties = {
  width: "100%",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  background: "var(--bg-2)",
  border: "1px solid var(--line-2)",
  borderRadius: 10,
  padding: 4,
  boxShadow: "0 8px 30px rgba(0,0,0,.42), 0 2px 6px rgba(0,0,0,.3)",
  zIndex: 60,
  display: "flex",
  flexDirection: "column",
  gap: 1,
  maxHeight: 320,
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
