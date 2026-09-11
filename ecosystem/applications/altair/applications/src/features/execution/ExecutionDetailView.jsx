import React, { useState } from "react";
import { XCircle, CheckCheck, AlertTriangle, RotateCcw } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { STATUS } from "../../domain/status";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { WorkflowPipeline, PipelineTextList } from "../../components/workflow/WorkflowPipeline";
import { EventTimeline } from "../../components/workflow/EventTimeline";
import { fmtTime } from "../../utils/datetime";

export function ExecutionDetailView({ id, navigate }) {
  const { getExecution, getWorkflow, approve, reject, retry, cancel, can } = useAltair();
  const ex = getExecution(id);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  if (!ex) return <EmptyState title="Execution not found" body="This execution ID doesn't exist in this workspace." />;
  const wf = getWorkflow(ex.workflowId);

  return (
    <div className="view">
      <ViewHead
        title={wf.name}
        subtitle={`${ex.id} · initiated by ${ex.initiator.name}`}
        right={<Badge status={ex.status} />}
      />

      <Panel title="Pipeline">
        <WorkflowPipeline workflow={wf} execution={ex} />
        <PipelineTextList workflow={wf} execution={ex} />
      </Panel>

      <div className="detail-grid">
        <Panel title="Execution">
          <dl className="def-list">
            <div><dt>Status</dt><dd><Badge status={ex.status} size="sm" /></dd></div>
            <div><dt>Started</dt><dd>{fmtTime(ex.startedAt)}</dd></div>
            <div><dt>Last updated</dt><dd>{fmtTime(ex.updatedAt)}</dd></div>
            <div><dt>Retry count</dt><dd>{ex.retryCount || 0}</dd></div>
          </dl>
        </Panel>

        <Panel title="Inputs provided">
          <div className="kv-grid">
            {Object.entries(ex.inputs).map(([k, v]) => (
              <React.Fragment key={k}><span className="mono">{k}</span><span>{v}</span></React.Fragment>
            ))}
          </div>
        </Panel>

        <Panel title="Approval">
          {!ex.approval ? (
            <p className="muted">This workflow does not require approval.</p>
          ) : (
            <dl className="def-list">
              <div><dt>Required role</dt><dd>{ex.approval.requiredRole}</dd></div>
              <div><dt>Decision</dt><dd className="capitalize">{ex.approval.decision}</dd></div>
              <div><dt>Decided by</dt><dd>{ex.approval.actor ? ex.approval.actor.name : "—"}</dd></div>
              {ex.approval.reason && <div><dt>Reason</dt><dd>{ex.approval.reason}</dd></div>}
            </dl>
          )}
        </Panel>
      </div>

      {ex.status === STATUS.pending_approval && (
        <Panel title="Your decision">
          {rejecting ? (
            <div className="reject-form">
              <label>
                Rejection reason <em>· required</em>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="reject-actions">
                <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
                <Button variant="danger" disabled={!reason.trim()} onClick={() => { reject(ex.id, reason.trim()); setRejecting(false); }}>Confirm rejection</Button>
              </div>
            </div>
          ) : (
            <div className="approval-card-actions">
              {can("approval:decide") && <>
                <Button variant="danger-outline" icon={XCircle} onClick={() => setRejecting(true)}>Reject</Button>
                <Button variant="primary" icon={CheckCheck} onClick={() => approve(ex.id)}>Approve</Button>
              </>}
            </div>
          )}
        </Panel>
      )}

      {ex.status === STATUS.failed && (
        <Panel title="Recover">
          <div className="consequence-box protected">
            <AlertTriangle size={16} />
            <p>This execution failed and is not automatically retrying. Retrying will resume from the failed step — it will not repeat already-completed steps or re-run side effects.</p>
          </div>
          {can("execution:retry") && <Button variant="primary" icon={RotateCcw} onClick={() => retry(ex.id)}>Retry from failed step</Button>}
          {can("execution:cancel") && !["completed", "failed", "timed_out", "cancelled", "rejected"].includes(ex.status) && <Button variant="ghost" onClick={() => cancel(ex.id)}>Cancel execution</Button>}
        </Panel>
      )}

      <Panel title="Timeline" subtitle="Complete state transition log for this execution">
        <EventTimeline events={ex.events} />
      </Panel>
    </div>
  );
}
