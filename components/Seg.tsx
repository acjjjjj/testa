"use client";

import * as React from "react";

export interface SegProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

export function Seg({ options, value, onChange }: SegProps) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o} className={value === o ? "on" : ""} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
