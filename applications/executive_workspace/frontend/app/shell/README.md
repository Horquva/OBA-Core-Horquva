# applications/executive_workspace/frontend/app/shell

| | |
|---|---|
| **Owner** | Zoya Khaliq |
| **Stage** | 3 |
| **Contract** | `applications/executive_workspace/integration/contracts/04_api_contract.md` |

---

## Build for T1

App shell with loading, error, empty and unavailable states.

## Done when

The shell renders every state without a backend.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

The UI never turns uncertain into certain, stale into fresh, or failed into successful.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
