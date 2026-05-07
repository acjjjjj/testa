import * as React from "react";

export interface WorkflowInlineProps {
  steps: string[];
  current: number;
  finished?: boolean;
}

export function WorkflowInline({ steps, current, finished }: WorkflowInlineProps) {
  return (
    <div className="wf-inline" role="status">
      {steps.map((s, i) => {
        const cls = finished ? "done" : i < current ? "done" : i === current ? "active" : "";
        return (
          <React.Fragment key={s}>
            <div className={`step ${cls}`}>
              <span className="d" />
              <span>{s}</span>
            </div>
            {i < steps.length - 1 && <span className="arr">›</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
