import { STATUS, isTerminal } from "../domain/status";
import { buildPipeline } from "../domain/pipeline";
import { ACTORS } from "./actors";
import { WF } from "./workflows";

/**
 * Seed data + generators for workflow executions (instances). `seedExecution`
 * fabricates a plausible event history for a given target status so the
 * Operations Center / History / Audit views have real-looking data on load.
 *
 * `mkEvent`, `sampleInputValue`, and `buildPipeline` (re-exported from
 * domain/pipeline) are also used by context/AltairContext.jsx when creating
 * *new* executions at runtime, so the shapes here match exactly.
 */

function ts(daysAgo, hour = 9, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

export function mkEvent(type, message, actor, at, meta) {
  return { id: `ev-${Math.random().toString(36).slice(2, 9)}`, type, message, actor, at, meta: meta || null };
}

// Seed a set of historical + live executions across the full status range.
function seedExecution({ id, workflowId, status, initiator, daysAgo, currentNodeId, note, retryCount = 0 }) {
  const wf = WF[workflowId];
  const pipeline = buildPipeline(wf);
  const events = [mkEvent("workflow.initiated", `${initiator.name} initiated ${wf.name}`, initiator, ts(daysAgo, 9, 0))];
  let approvalRecord = null;

  const stepIdx = Math.max(0, pipeline.findIndex((n) => n.id === currentNodeId));
  for (let i = 1; i < stepIdx; i++) {
    const n = pipeline[i];
    if (n.kind === "step") events.push(mkEvent("workflow.step_completed", `Completed: ${n.name}`, ACTORS.system, ts(daysAgo, 9, 5 + i * 5)));
    if (n.kind === "approval") {
      approvalRecord = {
        id: `ap-${id}`,
        requiredRole: wf.approval.approverRole,
        actor: initiator.id === ACTORS.jordan.id ? ACTORS.sam : ACTORS.jordan,
        decision: "approved",
        reason: null,
        decidedAt: ts(daysAgo, 9, 40),
      };
      events.push(mkEvent("approval.requested", `Approval requested from ${wf.approval.approverRole}`, ACTORS.system, ts(daysAgo, 9, 35)));
      events.push(mkEvent("approval.completed", `${approvalRecord.actor.name} approved the request`, approvalRecord.actor, ts(daysAgo, 9, 40)));
    }
  }

  if (status === STATUS.pending_approval) {
    approvalRecord = { id: `ap-${id}`, requiredRole: wf.approval.approverRole, actor: null, decision: "pending", reason: null, decidedAt: null };
    events.push(mkEvent("approval.requested", `Approval requested from ${wf.approval.approverRole}`, ACTORS.system, ts(daysAgo, 9, 35)));
  }
  if (status === STATUS.rejected) {
    if (!approvalRecord) {
      approvalRecord = { id: `ap-${id}`, requiredRole: wf.approval.approverRole, actor: null, decision: "pending", reason: null, decidedAt: null };
      events.push(mkEvent("approval.requested", `Approval requested from ${wf.approval.approverRole}`, ACTORS.system, ts(daysAgo, 9, 35)));
    }
    const decidingActor = approvalRecord.actor || (initiator.id === ACTORS.jordan.id ? ACTORS.sam : ACTORS.jordan);
    approvalRecord.actor = decidingActor;
    approvalRecord.decision = "rejected";
    approvalRecord.reason = note || "Does not meet policy requirements.";
    approvalRecord.decidedAt = ts(daysAgo, 9, 42);
    events.push(mkEvent("approval.completed", `${decidingActor.name} rejected the request — ${approvalRecord.reason}`, decidingActor, ts(daysAgo, 9, 42)));
  }
  if (status === STATUS.failed) {
    events.push(mkEvent("workflow.failed", note || "Step failed with a non-retryable error.", ACTORS.system, ts(daysAgo, 9, 55)));
  }
  if (status === STATUS.retrying) {
    events.push(mkEvent("workflow.failed", note || "Transient error contacting downstream service.", ACTORS.system, ts(daysAgo, 9, 50)));
    events.push(mkEvent("workflow.retried", `Retry ${retryCount} scheduled`, ACTORS.system, ts(daysAgo, 9, 51)));
  }
  if (status === STATUS.completed) {
    events.push(mkEvent("workflow.completed", "Execution completed successfully.", ACTORS.system, ts(daysAgo, 9, 58)));
  }

  return {
    id,
    workflowId,
    status,
    initiator,
    startedAt: ts(daysAgo, 9, 0),
    updatedAt: events[events.length - 1].at,
    currentNodeId: isTerminal(status) ? "result" : currentNodeId,
    inputs: Object.fromEntries(wf.inputs.required.map((i) => [i.name, sampleInputValue(i)])),
    approval: approvalRecord,
    events,
    retryCount,
  };
}

export function sampleInputValue(input) {
  const samples = {
    release_tag: "v3.4.0-rc2",
    target_environment: "production",
    repository: "altair/payments-service",
    access_level: "write",
    endpoint: "/v1/legacy-search",
    sunset_date: "2026-11-15",
    service: "checkout-api",
    board: "PLAT-Q3",
    sprint_id: "SPR-2026-31",
    issue_id: "ISS-40921",
    database: "orders-prod-replica",
    justification: "Investigating checkout latency incident INC-1183",
    incident_id: "INC-1183",
    message: "Elevated checkout latency, mitigation in progress.",
    source_ref: "main@2f9a1c3",
    team: "platform-oncall",
  };
  return samples[input.name] ?? "—";
}

export const INITIAL_EXECUTIONS = [
  seedExecution({ id: "ex-9001", workflowId: "wf-promote-rc", status: STATUS.pending_approval, initiator: ACTORS.wei, daysAgo: 0, currentNodeId: "approval" }),
  seedExecution({ id: "ex-9002", workflowId: "wf-db-access", status: STATUS.pending_approval, initiator: ACTORS.you, daysAgo: 0, currentNodeId: "approval" }),
  seedExecution({ id: "ex-9003", workflowId: "wf-archive-repo", status: STATUS.pending_approval, initiator: ACTORS.lena, daysAgo: 1, currentNodeId: "approval" }),
  seedExecution({ id: "ex-9004", workflowId: "wf-rotate-creds", status: STATUS.retrying, initiator: ACTORS.sam, daysAgo: 0, currentNodeId: "s2", retryCount: 1, note: "Timed out writing to secret store." }),
  seedExecution({ id: "ex-9005", workflowId: "wf-close-stale", status: STATUS.executing, initiator: ACTORS.you, daysAgo: 0, currentNodeId: "s2" }),
  seedExecution({ id: "ex-9006", workflowId: "wf-publish-docs", status: STATUS.completed, initiator: ACTORS.lena, daysAgo: 1, currentNodeId: "result" }),
  seedExecution({ id: "ex-9007", workflowId: "wf-broadcast-incident", status: STATUS.completed, initiator: ACTORS.lena, daysAgo: 1, currentNodeId: "result" }),
  seedExecution({ id: "ex-9008", workflowId: "wf-repo-access", status: STATUS.failed, initiator: ACTORS.jordan, daysAgo: 2, currentNodeId: "s3", note: "Policy service returned 503 while checking repository policy." }),
  seedExecution({ id: "ex-9009", workflowId: "wf-escalate-bug", status: STATUS.completed, initiator: ACTORS.you, daysAgo: 2, currentNodeId: "result" }),
  seedExecution({ id: "ex-9010", workflowId: "wf-sprint-retro", status: STATUS.completed, initiator: ACTORS.jordan, daysAgo: 3, currentNodeId: "result" }),
  seedExecution({ id: "ex-9011", workflowId: "wf-oncall-sync", status: STATUS.rejected, initiator: ACTORS.jordan, daysAgo: 3, currentNodeId: "approval", note: "Restricted workflow — requester lacks coordination-admin role." }),
  seedExecution({ id: "ex-9012", workflowId: "wf-deprecate-endpoint", status: STATUS.completed, initiator: ACTORS.sam, daysAgo: 4, currentNodeId: "result" }),
  seedExecution({ id: "ex-9013", workflowId: "wf-db-access", status: STATUS.completed, initiator: ACTORS.lena, daysAgo: 5, currentNodeId: "result" }),
  seedExecution({ id: "ex-9014", workflowId: "wf-promote-rc", status: STATUS.completed, initiator: ACTORS.wei, daysAgo: 6, currentNodeId: "result" }),
  seedExecution({ id: "ex-9015", workflowId: "wf-repo-access", status: STATUS.completed, initiator: ACTORS.you, daysAgo: 6, currentNodeId: "result" }),
];
