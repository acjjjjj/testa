import * as React from "react";

export interface ScoreBarProps {
  value: number;
  max?: number;
  tone?: "blue" | "amber" | "rose";
}

export function ScoreBar({ value, max = 10, tone = "blue" }: ScoreBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    tone === "rose"
      ? "color-mix(in oklch, var(--ac-rose) 70%, transparent)"
      : tone === "amber"
      ? "color-mix(in oklch, var(--ac-amber) 70%, transparent)"
      : "color-mix(in oklch, var(--ac-blue) 70%, transparent)";
  return (
    <div className="barwrap">
      <div className="bar">
        <i style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="num em">{value.toFixed(1)}</span>
    </div>
  );
}
