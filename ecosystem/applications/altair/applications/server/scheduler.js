import { readStore } from "./store.js";
import { queueExecution } from "./engine.js";

let lastMinute = -1;

export function runScheduledTriggers() {
  const now = new Date();
  if (now.getUTCMinutes() === lastMinute) return;
  lastMinute = now.getUTCMinutes();
  const state = readStore();
  for (const workflow of state.workflows) {
    if (!String(workflow.trigger?.type || "").toLowerCase().includes("scheduled")) continue;
    const already = state.executions.some((e) => e.workflowId === workflow.id && new Date(e.startedAt).toDateString() === now.toDateString());
    if (already) continue;
    const id = `sch-${workflow.id}-${now.toISOString().slice(0, 10)}`;
    // The scheduler creates the durable execution record in the API layer via
    // a small internal helper to keep trigger semantics identical.
    if (state.executions.some((e) => e.id === id)) continue;
    import("./app.js").then(({ createTriggeredExecution }) => {
      const execution = createTriggeredExecution(workflow.id, {}, { id: "scheduler", name: "Altair Scheduler", role: "system" }, id);
      if (execution) queueExecution(execution.id, 0, 1);
    });
  }
}
