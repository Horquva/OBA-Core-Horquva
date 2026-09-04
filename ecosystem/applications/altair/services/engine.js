import { buildPipeline } from "../src/domain/pipeline.js";
import { id, readStore, updateStore } from "./store.js";
import { audit } from "./audit.js";
import { IntegrationAdapterRegistry, adapterForStep } from "./adapters.js";
import { publish } from "./realtime.js";
import { config } from "./config.js";
import { inc } from "./metrics.js";

const adapters = new IntegrationAdapterRegistry();

function eventFor(executionId, workflowId, type, message, actor = { id: "sys-altair", name: "Altair", role: "system" }, meta = null) {
  if (type === "workflow.initiated") inc("executionsStarted");
  if (type === "workflow.completed") inc("executionsCompleted");
  if (type === "workflow.failed") inc("executionsFailed");
  if (type === "workflow.retried" || type === "workflow.retry_scheduled") inc("retries");
  const event = {
    id: id("ev"),
    type,
    message,
    actor,
    at: new Date().toISOString(),
    meta,
    executionId,
    workflowId,
  };
  updateStore((state) => {
    const ex = state.executions.find((e) => e.id === executionId);
    if (ex) ex.events.push(event);
    state.audit.unshift(event);
    if (["approval.requested", "workflow.completed", "workflow.failed", "workflow.retry_scheduled", "workflow.cancelled"].includes(type)) {
      const titleMap = {
        "approval.requested": "Approval required",
        "workflow.completed": "Workflow completed",
        "workflow.failed": "Workflow failed",
        "workflow.retry_scheduled": "Workflow retry scheduled",
        "workflow.cancelled": "Workflow cancelled",
      };
      state.notifications.unshift({
        id: id("n"),
        type: type.replace("workflow.", "workflow_").replace("approval.", "approval_"),
        title: titleMap[type],
        message,
        at: event.at,
        read: false,
        link: { view: "execution", id: executionId },
      });
    }
    return state;
  });
  publish("workflow.event", event);
  return event;
}

function updateExecution(idValue, patch) {
  let result;
  updateStore((state) => {
    const ex = state.executions.find((e) => e.id === idValue);
    if (!ex) return state;
    Object.assign(ex, patch, { updatedAt: new Date().toISOString() });
    result = structuredClone(ex);
    return state;
  });
  publish("execution.updated", result);
  return result;
}

export function queueExecution(executionId, stepIndex = 0, attempt = 1) {
  updateStore((state) => {
    const duplicate = state.jobs.find((j) => j.executionId === executionId && j.status === "queued" && j.stepIndex === stepIndex);
    if (!duplicate) state.jobs.push({ id: id("job"), executionId, stepIndex, attempt, status: "queued", availableAt: Date.now(), createdAt: new Date().toISOString() });
    return state;
  });
}

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Step timed out");
      error.code = "timeout";
      reject(error);
    }, ms);
  });
  try { return await Promise.race([promise, timeout]); } finally { clearTimeout(timer); }
}

export async function processNextJob() {
  const state = readStore();
  const job = state.jobs.find((j) => j.status === "queued" && j.availableAt <= Date.now());
  if (!job) return false;
  updateStore((next) => {
    const current = next.jobs.find((j) => j.id === job.id);
    if (current) current.status = "running";
    return next;
  });

  const state2 = readStore();
  const ex = state2.executions.find((e) => e.id === job.executionId);
  const wf = state2.workflows.find((w) => w.id === ex?.workflowId);
  if (!ex || !wf) return true;

  if (ex.cancelRequested) {
    updateExecution(ex.id, { status: "cancelled" });
    eventFor(ex.id, ex.workflowId, "workflow.cancelled", "Execution cancelled before the next step.");
    finishJob(job.id, "completed");
    return true;
  }

  const pipeline = buildPipeline(wf);
  const node = pipeline[job.stepIndex];
  if (!node) {
    updateExecution(ex.id, { status: "completed", currentNodeId: "result" });
    eventFor(ex.id, ex.workflowId, "workflow.completed", "Execution completed successfully.");
    finishJob(job.id, "completed");
    return true;
  }

  if (node.kind === "trigger") {
    updateExecution(ex.id, { status: "processing", currentNodeId: node.id });
    eventFor(ex.id, ex.workflowId, "workflow.triggered", `Trigger accepted: ${node.name}.`);
    finishJob(job.id, "completed");
    queueExecution(ex.id, job.stepIndex + 1, 1);
    return true;
  }

  if (node.kind === "approval") {
    updateExecution(ex.id, { status: "pending_approval", currentNodeId: node.id });
    eventFor(ex.id, ex.workflowId, "approval.requested", `Approval requested from ${wf.approval.approverRole}.`);
    finishJob(job.id, "completed");
    return true;
  }

  if (node.kind === "result") {
    updateExecution(ex.id, { status: "completed", currentNodeId: "result" });
    eventFor(ex.id, ex.workflowId, "workflow.completed", "Execution completed successfully.");
    finishJob(job.id, "completed");
    return true;
  }

  updateExecution(ex.id, {
    status: node.phase === "execution" ? "executing" : "processing",
    currentNodeId: node.id,
  });
  eventFor(ex.id, ex.workflowId, "workflow.step_started", `Started: ${node.name}.`, undefined, { stepId: node.id, attempt: job.attempt });

  try {
    const adapterName = adapterForStep(node);
    const adapter = adapters.get(adapterName);
    const result = await withTimeout(adapter.execute({ action: node.name, input: ex.inputs, timeoutMs: config.stepTimeoutMs }), config.stepTimeoutMs);
    updateExecution(ex.id, { lastStepResult: result, lastError: null });
    eventFor(ex.id, ex.workflowId, "workflow.step_completed", `Completed: ${node.name}.`, undefined, { stepId: node.id, adapter: adapterName, attempt: job.attempt });
    finishJob(job.id, "completed");
    queueExecution(ex.id, job.stepIndex + 1, 1);
  } catch (error) {
    const retryable = job.attempt < (ex.maxAttempts || 3) && error.code !== "integration_not_configured";
    const status = error.code === "timeout" ? "timed_out" : "failed";
    updateExecution(ex.id, { status, lastError: { code: error.code || "execution_failed", message: error.message } });
    eventFor(ex.id, ex.workflowId, "workflow.failed", `${node.name} failed: ${error.message}`, undefined, { stepId: node.id, retryable, attempt: job.attempt });
    finishJob(job.id, "failed");
    if (retryable) {
      const backoffMs = Math.min(30_000, 1000 * 2 ** job.attempt);
      updateStore((next) => {
        next.jobs.push({ id: id("job"), executionId: ex.id, stepIndex: job.stepIndex, attempt: job.attempt + 1, status: "queued", availableAt: Date.now() + backoffMs, createdAt: new Date().toISOString() });
        return next;
      });
      updateExecution(ex.id, { status: "retrying" });
      eventFor(ex.id, ex.workflowId, "workflow.retry_scheduled", `Retry ${job.attempt + 1} scheduled after ${backoffMs}ms.`);
    }
  }
  return true;
}

function finishJob(jobId, status) {
  updateStore((state) => {
    const job = state.jobs.find((j) => j.id === jobId);
    if (job) { job.status = status; job.finishedAt = new Date().toISOString(); }
    return state;
  });
}

export function cancelExecution(executionId) {
  return updateExecution(executionId, { cancelRequested: true });
}

export function approveExecution(executionId, actor) {
  const state = readStore();
  const ex = state.executions.find((e) => e.id === executionId);
  if (!ex || ex.status !== "pending_approval") return null;
  updateExecution(executionId, {
    status: "approved",
    approval: { ...ex.approval, actor, decision: "approved", decidedAt: new Date().toISOString() },
  });
  eventFor(executionId, ex.workflowId, "approval.completed", `${actor.name} approved the request.`, actor);
  const pipeline = buildPipeline(state.workflows.find((w) => w.id === ex.workflowId));
  const idx = pipeline.findIndex((n) => n.kind === "approval");
  queueExecution(executionId, idx + 1, 1);
  return readStore().executions.find((e) => e.id === executionId);
}

export function rejectExecution(executionId, actor, reason) {
  const state = readStore();
  const ex = state.executions.find((e) => e.id === executionId);
  if (!ex || ex.status !== "pending_approval" || !reason?.trim()) return null;
  updateExecution(executionId, {
    status: "rejected",
    approval: { ...ex.approval, actor, decision: "rejected", reason: reason.trim(), decidedAt: new Date().toISOString() },
  });
  eventFor(executionId, ex.workflowId, "approval.completed", `${actor.name} rejected the request — ${reason.trim()}.`, actor);
  return readStore().executions.find((e) => e.id === executionId);
}

export function retryExecution(executionId) {
  const state = readStore();
  const ex = state.executions.find((e) => e.id === executionId);
  if (!ex || !["failed", "timed_out"].includes(ex.status)) return null;
  const job = state.jobs.find((j) => j.executionId === executionId && j.status === "failed");
  if (!job) return null;
  updateExecution(executionId, { status: "retrying", retryCount: (ex.retryCount || 0) + 1, cancelRequested: false });
  eventFor(executionId, ex.workflowId, "workflow.retried", `Manual retry requested (attempt ${(ex.retryCount || 0) + 1}).`);
  queueExecution(executionId, job.stepIndex, (ex.retryCount || 0) + 1);
  return readStore().executions.find((e) => e.id === executionId);
}

