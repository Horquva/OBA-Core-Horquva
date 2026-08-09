# testing/validation

| | |
|---|---|
| **Owner** | Aleesha Manahil |
| **Stage** | 3 |
| **Contract** | `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` |

---

## Build for T1

Executable scenario covering the T1 gate path.

## Done when

The gate passes or fails on its own, without a person interpreting the result.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

A passing scenario over stubbed stages is not a passing gate.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
