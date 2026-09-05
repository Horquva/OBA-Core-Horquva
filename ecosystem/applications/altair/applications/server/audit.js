import { id, updateStore } from "./store.js";

export function audit({ actor, type, message, executionId = null, workflowId = null, meta = null }) {
  const event = {
    id: id("audit"),
    type,
    message,
    actor: actor ? { id: actor.id, name: actor.name, role: actor.role } : { id: "system", name: "Altair", role: "system" },
    at: new Date().toISOString(),
    executionId,
    workflowId,
    meta,
  };
  updateStore((state) => {
    state.audit.unshift(event);
    if (executionId) {
      const ex = state.executions.find((e) => e.id === executionId);
      if (ex) ex.events.push(event);
    }
    return state;
  });
  return event;
}
