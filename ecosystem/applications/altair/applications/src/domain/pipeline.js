/**
 * Derives the Trigger → Steps → Approval → Execution → Result node sequence
 * for a workflow definition. Pure domain logic — no React, no rendering.
 *
 * Consumed by:
 *  - data/executions.js        (to compute seeded execution progress)
 *  - context/AltairContext.jsx (to advance a live execution through nodes)
 *  - components/workflow/WorkflowPipeline.jsx (to render the visualization)
 */
export function buildPipeline(workflow) {
  const trigger = { id: "trigger", kind: "trigger", name: workflow.trigger.type };
  const processing = workflow.steps.filter((s) => s.phase === "processing").map((s) => ({ ...s, kind: "step" }));
  const approval = workflow.approval.required ? { id: "approval", kind: "approval", name: "Approval" } : null;
  const execution = workflow.steps.filter((s) => s.phase === "execution").map((s) => ({ ...s, kind: "step" }));
  const result = { id: "result", kind: "result", name: "Result" };
  return [trigger, ...processing, ...(approval ? [approval] : []), ...execution, result];
}
