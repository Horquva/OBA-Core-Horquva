import React from "react";
import { ChevronRight } from "lucide-react";
import { WF } from "../../data/workflows";
import { Badge } from "../ui/Badge";
import { timeAgo } from "../../utils/datetime";

/** Compact clickable execution rows used by Overview, Workflow Detail, and Approval Center. */
export function ExecutionRows({ executions, navigate, showReason }) {
  return (
    <div className="row-list">
      {executions.map((ex) => {
        const wf = WF[ex.workflowId];
        const lastEvent = ex.events[ex.events.length - 1];
        return (
          <button key={ex.id} className="row" onClick={() => navigate("execution", ex.id)}>
            <div className="row-main">
              <span className="row-title">{wf.name}</span>
              <span className="row-sub">{ex.id} · initiated by {ex.initiator.name}</span>
              {showReason && lastEvent && <span className="row-reason">{lastEvent.message}</span>}
            </div>
            <div className="row-end">
              <Badge status={ex.status} size="sm" />
              <span className="row-time">{timeAgo(ex.updatedAt)}</span>
              <ChevronRight size={14} className="row-chevron" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
