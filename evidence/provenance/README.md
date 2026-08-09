# evidence/provenance

| | |
|---|---|
| **Owner** | Janita Tahir |
| **Stage** | 2-3 |
| **Contract** | `applications/executive_workspace/integration/contracts/05_evidence_record.md` |

---

## Build for T1

Provenance on every evidence record: source, actor, timestamps.

## Done when

Provenance survives read-back and survives every transformation downstream.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

Provenance is never reconstructed later. It is written with the record.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
