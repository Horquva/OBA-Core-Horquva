import React from "react";
import { Play, Loader2, CheckCircle2, Clock, ShieldCheck, AlertTriangle, RotateCcw, Info } from "lucide-react";
import { fmtTime } from "../../utils/datetime";

/** Shared event-type → icon mapping. Exported so AuditView can reuse it for its aggregated feed. */
export const EVENT_ICON = {
  "workflow.initiated": Play,
  "workflow.step_started": Loader2,
  "workflow.step_completed": CheckCircle2,
  "approval.requested": Clock,
  "approval.completed": ShieldCheck,
  "workflow.completed": CheckCircle2,
  "workflow.failed": AlertTriangle,
  "workflow.retried": RotateCcw,
};

export function EventTimeline({ events }) {
  return (
    <ol className="timeline">
      {events.map((ev) => {
        const Icon = EVENT_ICON[ev.type] || Info;
        return (
          <li key={ev.id}>
            <div className="tl-dot"><Icon size={12} /></div>
            <div className="tl-body">
              <div className="tl-head">
                <span className="tl-msg">{ev.message}</span>
                <span className="tl-time">{fmtTime(ev.at)}</span>
              </div>
              <div className="tl-actor muted">{ev.actor?.name} · {ev.type}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
