import React, { useState } from "react";
import { Search, Play } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { STATUS, isActive } from "../../domain/status";
import { WF } from "../../data/workflows";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { ExecutionTable } from "../../components/workflow/ExecutionTable";

const OPS_TABS = [
  { id: "active", label: "Active", match: (e) => [STATUS.initiated, STATUS.processing, STATUS.executing].includes(e.status) },
  { id: "queued", label: "Queued", match: (e) => e.status === STATUS.queued },
  { id: "pending_approval", label: "Pending Approval", match: (e) => e.status === STATUS.pending_approval },
  { id: "retrying", label: "Retrying", match: (e) => e.status === STATUS.retrying },
  { id: "failed", label: "Failed", match: (e) => e.status === STATUS.failed },
  { id: "completed", label: "Completed", match: (e) => e.status === STATUS.completed },
  { id: "long_running", label: "Long-running", match: (e) => isActive(e.status) && (Date.now() - new Date(e.startedAt)) / 60000 > 20 },
];

export function OperationsCenterView({ navigate, initialFilters }) {
  const { executions, metrics, workflows } = useAltair();
  const [tab, setTab] = useState(initialFilters?.status ? OPS_TABS.find((t) => t.match({ status: initialFilters.status }))?.id || "active" : "active");
  const [q, setQ] = useState("");

  const activeTab = OPS_TABS.find((t) => t.id === tab);
  const runnableWorkflow = workflows.find((w) => w.availability === "available") || workflows[0];
  const rows = executions.filter(activeTab.match).filter((e) => !q || WF[e.workflowId].name.toLowerCase().includes(q.toLowerCase()) || e.id.includes(q));

  return (
    <div className="view">
      <ViewHead title="Operations Center" subtitle="Everything currently moving through the system, grouped by operational state." right={<Button variant="primary" icon={Play} disabled={!runnableWorkflow} onClick={() => runnableWorkflow && navigate("initiate", runnableWorkflow.id)}>Run workflow</Button>} />

      {metrics && (
        <div className="detail-grid ops-metrics">
          <Panel title="Requests"><strong>{metrics.httpRequests}</strong><span className="muted">API requests</span></Panel>
          <Panel title="Started"><strong>{metrics.executionsStarted}</strong><span className="muted">executions</span></Panel>
          <Panel title="Completed"><strong>{metrics.executionsCompleted}</strong><span className="muted">completed</span></Panel>
          <Panel title="Failed"><strong>{metrics.executionsFailed}</strong><span className="muted">failed</span></Panel>
        </div>
      )}

      <div className="toolbar">
        <div className="chip-row" role="tablist">
          {OPS_TABS.map((t) => (
            <button key={t.id} className={`chip ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label} <span className="chip-count">{executions.filter(t.match).length}</span>
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={14} />
          <input placeholder="Search by workflow or execution ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Nothing here" body={`No executions currently match "${activeTab.label}".`} />
        ) : (
          <ExecutionTable rows={rows} navigate={navigate} />
        )}
      </Panel>
    </div>
  );
}
