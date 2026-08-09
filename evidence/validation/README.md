# evidence/validation

| | |
|---|---|
| **Owner** | Muhammad Ahmed |
| **Stage** | 3 |
| **Contract** | `applications/executive_workspace/integration/contracts/05_evidence_record.md` |

---

## Build for T1

Validation suite for extraction. Check every claim carries evidence ID, source, timestamp, entity reference, confidence, classification.

## Done when

The suite fails a claim missing any of those.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

The suite fails loudly. It does not warn and pass.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
