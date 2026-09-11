import { STATUS } from "../domain/status";
import { WF } from "./workflows";

/**
 * Derives the initial notification feed from a set of executions. Used once
 * at startup by context/AltairContext.jsx to seed state; new notifications
 * after that are pushed directly by the context as actions occur.
 */
export function buildNotifications(executions) {
  const items = [];
  executions.forEach((ex) => {
    const wf = WF[ex.workflowId];
    if (ex.status === STATUS.pending_approval) {
      items.push({ id: `n-${ex.id}-approve`, type: "approval_required", title: "Approval required", message: `${wf.name} initiated by ${ex.initiator.name} is waiting on ${wf.approval.approverRole}.`, at: ex.updatedAt, read: false, link: { view: "execution", id: ex.id } });
    }
    if (ex.status === STATUS.failed) {
      items.push({ id: `n-${ex.id}-fail`, type: "workflow_failed", title: "Workflow failed", message: `${wf.name} (${ex.id}) failed.`, at: ex.updatedAt, read: false, link: { view: "execution", id: ex.id } });
    }
    if (ex.status === STATUS.retrying) {
      items.push({ id: `n-${ex.id}-retry`, type: "workflow_retried", title: "Workflow retrying", message: `${wf.name} (${ex.id}) is retrying after a transient error.`, at: ex.updatedAt, read: false, link: { view: "execution", id: ex.id } });
    }
    if (ex.status === STATUS.completed && ex.workflowId !== "wf-close-stale") {
      items.push({ id: `n-${ex.id}-done`, type: "workflow_completed", title: "Workflow completed", message: `${wf.name} (${ex.id}) completed successfully.`, at: ex.updatedAt, read: true, link: { view: "execution", id: ex.id } });
    }
    if (ex.status === STATUS.rejected) {
      items.push({ id: `n-${ex.id}-rej`, type: "status_changed", title: "Request rejected", message: `${wf.name} (${ex.id}) was rejected by ${ex.approval.actor.name}.`, at: ex.updatedAt, read: true, link: { view: "execution", id: ex.id } });
    }
  });
  return items.sort((a, b) => new Date(b.at) - new Date(a.at));
}
