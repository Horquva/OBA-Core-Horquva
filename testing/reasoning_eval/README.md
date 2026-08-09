# testing/reasoning_eval

| | |
|---|---|
| **Owner** | Ahmed Abubakar |
| **Stage** | 3 |
| **Contract** | `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` |

---

## Build for T1

Golden fixture set: expected evidence, claims, uncertainty, and known bad outputs.

## Done when

The suite runs against extraction output.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

Known bad outputs matter as much as good ones. Include them.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
