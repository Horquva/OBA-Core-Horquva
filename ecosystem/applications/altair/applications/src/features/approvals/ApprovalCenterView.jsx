import React, { useMemo, useState } from "react";
import { XCircle, CheckCheck, Plus } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { STATUS } from "../../domain/status";
import { WF } from "../../data/workflows";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { CategoryTag } from "../../components/ui/CategoryTag";
import { Badge } from "../../components/ui/Badge";
import { timeAgo } from "../../utils/datetime";

export function ApprovalCenterView({ navigate }) {
  const { executions, approve, reject, can } = useAltair();
  const pending = executions.filter((e) => e.status === STATUS.pending_approval);
  const decided = executions.filter((e) => e.approval && e.approval.decision !== "pending" && [STATUS.approved, STATUS.rejected, STATUS.executing, STATUS.completed, STATUS.failed, STATUS.retrying].includes(e.status));
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");
  const requestWorkflow = useMemo(() => Object.values(WF).find((w) => w.approval?.required) || Object.values(WF)[0], []);

  return (
    <div className="view">
      <ViewHead title="Approval Center" subtitle="Decisions here gate protected engineering actions. Review context before approving." right={<Button variant="primary" icon={Plus} onClick={() => requestWorkflow && navigate("initiate", requestWorkflow.id)}>Request approval</Button>} />

      <Panel title={`Pending your decision (${pending.length})`}>
        {pending.length === 0 ? (
          <EmptyState title="Queue is clear" body="No workflows are currently waiting on approval." />
        ) : (
          <div className="approval-list">
            {pending.map((ex) => {
              const wf = WF[ex.workflowId];
              return (
                <div key={ex.id} className="approval-card">
                  <div className="approval-card-head">
                    <div>
                      <button className="link" onClick={() => navigate("execution", ex.id)}>{wf.name}</button>
                      <div className="row-sub">{ex.id} · requested by {ex.initiator.name} ({ex.initiator.role}) · {timeAgo(ex.startedAt)}</div>
                    </div>
                    <CategoryTag category={wf.category} />
                  </div>

                  <div className="approval-card-body">
                    <div>
                      <p className="label-caps">Requested action</p>
                      <p>{wf.description}</p>
                    </div>
                    <div>
                      <p className="label-caps">Inputs</p>
                      <div className="kv-grid">
                        {Object.entries(ex.inputs).map(([k, v]) => (
                          <React.Fragment key={k}><span className="mono">{k}</span><span>{v}</span></React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="label-caps">Required approver</p>
                      <p>{ex.approval.requiredRole}{wf.approval.protected && <span className="protected-note"> · protected action</span>}</p>
                    </div>
                  </div>

                  {rejectingId === ex.id ? (
                    <div className="reject-form">
                      <label>
                        Rejection reason <em>· required</em>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this request doesn't proceed…" />
                      </label>
                      <div className="reject-actions">
                        <Button variant="ghost" onClick={() => { setRejectingId(null); setReason(""); }}>Cancel</Button>
                        <Button variant="danger" disabled={!reason.trim()} onClick={() => { reject(ex.id, reason.trim()); setRejectingId(null); setReason(""); }}>Confirm rejection</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="approval-card-actions">
                      <Button variant="ghost" onClick={() => navigate("execution", ex.id)}>View details</Button>
                      {can("approval:decide") && <>
                        <Button variant="danger-outline" icon={XCircle} onClick={() => setRejectingId(ex.id)}>Reject</Button>
                        <Button variant="primary" icon={CheckCheck} onClick={() => approve(ex.id)}>Approve</Button>
                      </>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Recently decided">
        {decided.length === 0 ? (
          <EmptyState title="No decisions yet" body="Approved and rejected requests will appear here." />
        ) : (
          <div className="row-list">
            {decided.slice(0, 8).map((ex) => (
              <button key={ex.id} className="row" onClick={() => navigate("execution", ex.id)}>
                <div className="row-main">
                  <span className="row-title">{WF[ex.workflowId].name}</span>
                  <span className="row-sub">
                    {ex.approval.decision === "approved" ? "Approved" : "Rejected"} by {ex.approval.actor?.name} · {ex.id}
                  </span>
                </div>
                <div className="row-end">
                  <Badge status={ex.status} size="sm" />
                  <span className="row-time">{timeAgo(ex.approval.decidedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
