import React, { useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { WF } from "../../data/workflows";
import { STATUS_META } from "../../domain/status";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ExecutionTable } from "../../components/workflow/ExecutionTable";

export function HistoryView({ navigate, initialFilters }) {
  const { executions, workflows } = useAltair();
  const [q, setQ] = useState("");
  const [wfFilter, setWfFilter] = useState(initialFilters?.workflowId || "all");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = executions
    .filter((e) => wfFilter === "all" || e.workflowId === wfFilter)
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .filter((e) => !q || WF[e.workflowId].name.toLowerCase().includes(q.toLowerCase()) || e.id.includes(q) || e.initiator.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));


  function exportHistory() {
    const header = ["Execution ID", "Workflow", "Status", "Initiator", "Started At"].join(",");
    const body = rows.map((e) => [e.id, WF[e.workflowId]?.name || e.workflowId, STATUS_META[e.status]?.label || e.status, e.initiator?.name || "", e.startedAt].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "altair-execution-history.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="view">
      <ViewHead title="Execution History" subtitle="Every workflow run in this workspace — searchable and filterable." right={<Button variant="primary" icon={Download} onClick={exportHistory}>Export history</Button>} />

      <div className="toolbar">
        <div className="search-box">
          <Search size={14} />
          <input placeholder="Search executions, workflows, or people…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={wfFilter} onChange={(e) => setWfFilter(e.target.value)} className="select">
          <option value="all">All workflows</option>
          {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select">
          <option value="all">All statuses</option>
          {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
      </div>

      <Panel subtitle={`${rows.length} execution${rows.length === 1 ? "" : "s"}`}>
        {rows.length === 0 ? <EmptyState icon={Filter} title="No matches" body="Adjust your search or filters." /> : <ExecutionTable rows={rows} navigate={navigate} />}
      </Panel>
    </div>
  );
}
