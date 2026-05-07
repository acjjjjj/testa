import * as React from "react";

export type IconName =
  | "asset" | "expose" | "risk" | "detect" | "ticket" | "report" | "config" | "sentry"
  | "plus" | "send" | "search" | "arrow" | "export" | "jump" | "check" | "x" | "spark"
  | "shield" | "cog" | "caret" | "down" | "pin" | "note" | "wand" | "flow";

export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
}

/** Inline SVG icon set ported from the prototype's <Ico/> */
export function Icon({ name, size = 16, stroke = 1.5 }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "asset":
      return <svg {...props}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h2M7 14h2M13 10h4M13 14h4" /></svg>;
    case "expose":
      return <svg {...props}><circle cx="12" cy="12" r="4" /><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /></svg>;
    case "risk":
      return <svg {...props}><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>;
    case "detect":
    case "search":
      return <svg {...props}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>;
    case "ticket":
      return <svg {...props}><path d="M4 7v10l3-2 3 2 3-2 3 2 3-2 1 2V5l-1 2-3-2-3 2-3-2-3 2-3-2z" /></svg>;
    case "report":
      return <svg {...props}><path d="M5 4h11l4 4v12H5z" /><path d="M16 4v4h4M9 13h7M9 17h7M9 9h2" /></svg>;
    case "config":
    case "cog":
      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9A7 7 0 0 0 14 5.3L13.5 3h-3L10 5.3a7 7 0 0 0-2.5 1.4l-2.4-.9-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2.5 1.4l.5 2.3h3l.5-2.3a7 7 0 0 0 2.5-1.4l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></svg>;
    case "sentry":
    case "shield":
      return <svg {...props}><path d="M12 3l8 4v6c0 4.5-3.5 7.5-8 8-4.5-.5-8-3.5-8-8V7z" /><path d="M9 12l2 2 4-4" /></svg>;
    case "plus":
      return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "send":
      return <svg {...props}><path d="M5 12l16-8-7 18-2-8z" /></svg>;
    case "arrow":
      return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case "export":
      return <svg {...props}><path d="M12 4v12M7 11l5 5 5-5" /><path d="M5 20h14" /></svg>;
    case "jump":
      return <svg {...props}><path d="M14 5h5v5" /><path d="M19 5l-9 9" /><path d="M5 5h5v3M5 19h14v-5" /></svg>;
    case "check":
      return <svg {...props}><path d="M5 12l5 5 9-11" /></svg>;
    case "x":
      return <svg {...props}><path d="M6 6l12 12M6 18L18 6" /></svg>;
    case "spark":
      return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" /></svg>;
    case "caret":
      return <svg {...props}><path d="M9 6l6 6-6 6" /></svg>;
    case "down":
      return <svg {...props}><path d="M6 9l6 6 6-6" /></svg>;
    case "pin":
      return <svg {...props}><path d="M12 2v8M5 22l7-12 7 12" /></svg>;
    case "note":
      return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h6M8 17h4" /></svg>;
    case "wand":
      return <svg {...props}><path d="M4 20l11-11M14 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" /></svg>;
    case "flow":
      return <svg {...props}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="6" cy="18" r="2" /><path d="M8 6h2a4 4 0 0 1 4 4v0M8 18h2a4 4 0 0 0 4-4v0" /></svg>;
    default:
      return null;
  }
}
