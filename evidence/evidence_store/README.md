# evidence/evidence_store

| | |
|---|---|
| **Owner** | Janita Tahir |
| **Stage** | 2-3 |
| **Contract** | `applications/executive_workspace/integration/contracts/05_evidence_record.md` |

---

## Build for T1

Persist classified events with provenance and classification attached at write time. Queryable by `signal_id`.

## Done when

A record can be written and read back with provenance intact. Evidence is queryable.

## Required of this hop

- Preserve the trace envelope. `signal_id` is never regenerated. See `applications/executive_workspace/integration/contracts/ENVELOPE.md`.
- Log one structured line on entry and one on exit, both carrying `signal_id`. See `infrastructure/observability/README.md`.
- Fail loudly. A hop that cannot process a signal logs the reason and stops. It does not pass a partial payload downstream and does not substitute a default.

## Do not

Do not attach classification after the write. It is attached at write time.

---

Plan: `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md` · Boundaries: `docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`
