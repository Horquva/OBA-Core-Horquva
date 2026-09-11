import React, { useState } from "react";
import { Search, Info, Download } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { WF } from "../../data/workflows";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EVENT_ICON } from "../../components/workflow/EventTimeline";
import { fmtTime } from "../../utils/datetime";

export function AuditView({ navigate }) {
  const { executions, auditEvents } = useAltair();
  const [q, setQ] = useState("");

  const executionById = Object.fromEntries(executions.map((ex) => [ex.id, ex]));
  const allEvents = auditEvents
    .map((ev) => ({ ...ev, execution: executionById[ev.executionId] }))
    .filter((ev) => ev.execution || ev.workflowId)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .filter((ev) => !q || ev.message.toLowerCase().includes(q.toLowerCase()) || (ev.workflowId && WF[ev.workflowId]?.name.toLowerCase().includes(q.toLowerCase())) || ev.actor?.name.toLowerCase().includes(q.toLowerCase()));


  function exportAudit() {
    const header = ["Event ID", "Time", "Workflow", "Actor", "Message"].join(",");
    const body = allEvents.map((ev) => [ev.id, ev.at, ev.workflowId || "system", ev.actor?.name || "system", ev.message].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "altair-audit-log.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="view">
      <ViewHead title="Audit Timeline" subtitle="Who initiated what, who approved it, and what happened — as structured events, not raw logs." right={<Button variant="primary" icon={Download} onClick={exportAudit}>Export audit log</Button>} />

      <div className="toolbar">
        <div className="search-box">
          <Search size={14} />
          <input placeholder="Search by workflow, actor, or event…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Panel subtitle={`${allEvents.length} audited events across ${executions.length} executions`}>
        <ol className="timeline audit">
          {allEvents.slice(0, 100).map((ev) => {
            const Icon = EVENT_ICON[ev.type] || Info;
            return (
              <li key={ev.id}>
                <div className="tl-dot"><Icon size={12} /></div>
                <div className="tl-body">
                  <div className="tl-head">
                    <span className="tl-msg">{ev.message}</span>
                    <span className="tl-time">{fmtTime(ev.at)}</span>
                  </div>
                  <div className="tl-actor muted">
                    {ev.execution ? <><button className="link" onClick={() => navigate("execution", ev.execution.id)}>{WF[ev.execution.workflowId]?.name || ev.workflowId}</button>
                    {" · "}{ev.execution.id}</> : <span>{ev.workflowId || "system"}</span>} · {ev.actor?.name}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}
