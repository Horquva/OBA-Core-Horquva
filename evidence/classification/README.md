# evidence/classification

| | |
|---|---|
| **Owner** | Maaz Khan |
| **Stage** | 1-2 |
| **Contract** | `applications/executive_workspace/integration/contracts/02_classification_contract.md` |

---

## Build for T1

Classify into Public, Internal, Restricted, Sensitive or Secret. Record the safety action: detect, classify, quarantine or redact, audit, block.

## Done when

Each action produces a structured record, and classification metadata is attached to the signal.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Expose `/health` and `/ready`. See `applications/executive_workspace/integration/contracts/HEALTH.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

Never log the sensitive payload to prove it was caught.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
