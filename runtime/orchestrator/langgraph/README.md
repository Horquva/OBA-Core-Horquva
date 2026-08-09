# runtime/orchestrator/langgraph

| | |
|---|---|
| **Owner** | Saad Mehmood (meaning) · Ahmad Tanveer (running) |
| **Stage** | 1-3 |
| **Contract** | `applications/executive_workspace/integration/contracts/03_agent_contract.md` |

---

## Build for T1

Graph skeleton. State definition, first node and edge. Accepts a claim, returns the contracted output shape.

## Done when

The graph accepts input and returns the contracted output shape, carrying state through one pass.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Expose `/health` and `/ready`. See `applications/executive_workspace/integration/contracts/HEALTH.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

No voice-specific branch. Not in T1, not later.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
