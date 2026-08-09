# world_model/beliefs

| | |
|---|---|
| **Owner** | Bisma Nadeem |
| **Stage** | 2 |
| **Contract** | `applications/executive_workspace/integration/contracts/06_belief_record.md` |

---

## Build for T1

Belief record shape, defined and versionable. **Shape only for T1** — not implemented.

## Done when

The shape is defined and versionable.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

Prior beliefs are versioned, never overwritten.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
