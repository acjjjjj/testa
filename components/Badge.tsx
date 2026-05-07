import * as React from "react";

export type BadgeTone = "blue" | "violet" | "mint" | "amber" | "rose" | "mute";

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
}

export function Badge({ tone = "mute", dot = true, children }: BadgeProps) {
  return (
    <span className={`badge b-${tone}`}>
      {dot && <span className="d" />}
      {children}
    </span>
  );
}
