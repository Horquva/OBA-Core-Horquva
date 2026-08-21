import { WORKFLOWS } from "../src/data/workflows.js";

function event(id, type, message, actor, executionId, workflowId, at) {
  return { id, type, message, actor, at, executionId, workflowId, meta: null };
}

export function seedExecutions() {
  const now = Date.now();
  const selected = WORKFLOWS.slice(0, 6);
  return selected.map((workflow, index) => {
    const executionId = `seed-ex-${String(index + 1).padStart(4, "0")}`;
    const startedAt = new Date(now - (index + 1) * 86_400_000).toISOString();
    const actor = workflow.owner;
    const needsApproval = workflow.approval.required;
    const status = needsApproval && index === 0 ? "pending_approval" : "completed";
    const events = [
      event(`${executionId}-1`, "workflow.initiated", `${actor.name} initiated ${workflow.name}.`, actor, executionId, workflow.id, startedAt),
      ...(needsApproval ? [event(`${executionId}-2`, status === "pending_approval" ? "approval.requested" : "approval.completed", status === "pending_approval" ? `Approval requested from ${workflow.approval.approverRole}.` : `Approval completed by ${workflow.approval.approverRole}.`, actor, executionId, workflow.id, new Date(now - (index + 1) * 86_400_000 + 300_000).toISOString())] : []),
      ...(status === "completed" ? [event(`${executionId}-3`, "workflow.completed", "Execution completed successfully.", { id: "sys-altair", name: "Altair", role: "system" }, executionId, workflow.id, new Date(now - (index + 1) * 86_400_000 + 900_000).toISOString())] : []),
    ];
    return {
      id: executionId,
      workflowId: workflow.id,
      status,
      initiator: actor,
      startedAt,
      updatedAt: events.at(-1).at,
      currentNodeId: status === "completed" ? "result" : "approval",
      inputs: Object.fromEntries(workflow.inputs.required.map((input) => [input.name, "demo-value"])),
      approval: needsApproval ? { id: `${executionId}-approval`, requiredRole: workflow.approval.approverRole, actor: status === "completed" ? actor : null, decision: status === "completed" ? "approved" : "pending", reason: null, decidedAt: status === "completed" ? events[1]?.at : null } : null,
      events,
      retryCount: 0,
      cancelRequested: false,
      nextStepIndex: 0,
      maxAttempts: 3,
    };
  });
}
