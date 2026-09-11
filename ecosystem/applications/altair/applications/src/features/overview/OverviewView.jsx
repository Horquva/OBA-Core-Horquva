import React from "react";
import { Activity, ShieldCheck, AlertTriangle, RotateCcw, Plus } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { STATUS, isActive } from "../../domain/status";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ExecutionRows } from "../../components/workflow/ExecutionRows";

export function OverviewView({ navigate }) {
  const { executions } = useAltair();
  const active = executions.filter((e) => isActive(e.status));
  const pendingApproval = executions.filter((e) => e.status === STATUS.pending_approval);
  const failed = executions.filter((e) => e.status === STATUS.failed);
  const retrying = executions.filter((e) => e.status === STATUS.retrying);
  const recentCompleted = executions.filter((e) => e.status === STATUS.completed).slice(0, 5);
  const longRunning = active.filter((e) => (Date.now() - new Date(e.startedAt)) / 60000 > 20);

  const stat = (label, value, tone, Icon, onClick) => (
    <button className={`stat-card tone-${tone}`} onClick={onClick}>
      <div className="stat-icon">
        <Icon size={16} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </button>
  );

  return (
    <div className="view">
      <ViewHead
        title="Command Center"
        subtitle="What is running, what needs you, and what broke — before anything else."
        right={<Button variant="primary" icon={Plus} onClick={() => navigate("builder", "new")}>Open builder</Button>}
      />

      <div className="stat-grid">
        {stat("Active workflows", active.length, "blue", Activity, () => navigate("operations"))}
        {stat("Pending your approval", pendingApproval.length, "purple", ShieldCheck, () => navigate("approvals"))}
        {stat("Failed", failed.length, "red", AlertTriangle, () => navigate("operations", null, { status: STATUS.failed }))}
        {stat("Retrying", retrying.length, "amber", RotateCcw, () => navigate("operations", null, { status: STATUS.retrying }))}
      </div>

      <div className="grid-2">
        <Panel title="Needs approval" subtitle="Waiting on a decision from an authorized approver" right={<Button size="sm" variant="ghost" onClick={() => navigate("approvals")}>Open Approval Center</Button>}>
          {pendingApproval.length === 0 ? (
            <EmptyState title="Nothing waiting" body="No executions are currently blocked on approval." />
          ) : (
            <ExecutionRows executions={pendingApproval} navigate={navigate} />
          )}
        </Panel>

        <Panel title="Failed &amp; retrying" subtitle="Needs investigation or has an automatic retry in flight" right={<Button size="sm" variant="ghost" onClick={() => navigate("operations")}>Open Operations Center</Button>}>
          {failed.length + retrying.length === 0 ? (
            <EmptyState title="No failures" body="Nothing has failed recently." />
          ) : (
            <ExecutionRows executions={[...failed, ...retrying]} navigate={navigate} showReason />
          )}
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Recently completed" right={<Button size="sm" variant="ghost" onClick={() => navigate("history")}>View history</Button>}>
          {recentCompleted.length === 0 ? <EmptyState title="Nothing yet" body="Completed executions will appear here." /> : <ExecutionRows executions={recentCompleted} navigate={navigate} />}
        </Panel>
        <Panel title="Long-running" subtitle="Active for longer than 20 minutes">
          {longRunning.length === 0 ? (
            <EmptyState title="All on schedule" body="No active execution has exceeded the long-running threshold." />
          ) : (
            <ExecutionRows executions={longRunning} navigate={navigate} />
          )}
        </Panel>
      </div>
    </div>
  );
}
