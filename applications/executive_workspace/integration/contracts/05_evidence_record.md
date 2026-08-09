# 05 — Evidence Record

| | |
|---|---|
| **Owner** | Janita |
| **Path** | `evidence/evidence_store/`, `evidence/provenance/` |
| **Stage** | 2 |
| **Depends on** | 01 (Umer), 02 (Maaz) |
| **Status** | Not started |

---

## What this contract defines

The evidence record shape, and the canonical structures the record references.

## Required

**Record shape**, with provenance.

**Canonical structures:**

- people
- teams
- repositories
- work items
- relationships
- provenance

## Done when

A record can be written and read back with provenance intact, and evidence is queryable by `signal_id`.

## Envelope obligations

- `signal_id` stored on the record and queryable.
- `classification` from 02 attached **at write time**, not added later.
- `hop` becomes `evidence.evidence_store`.

See [`ENVELOPE.md`](ENVELOPE.md).

## To be defined by owner

**Evidence record:**

| Field | Type | Required | Notes |
|---|---|---|---|

**Canonical structures:**

| Structure | Fields | Identity | Notes |
|---|---|---|---|
| person | | | |
| team | | | |
| repository | | | |
| work item | | | |
| relationship | | | |

**Provenance:**

| Field | Type | Notes |
|---|---|---|

**Query interface** — how a caller retrieves evidence by `signal_id` and by entity:

**Example record:**

```json

```

## Consumed by

| Consumer | Uses |
|---|---|
| Jawad — `understanding/organizational/` | Reads evidence, carries the evidence ID into the claim |
| Saad — `runtime/orchestrator/langgraph/` | `evidence_ids` on the finding must resolve against these records |
| Bisma — belief record | References evidence in both directions |

## Change log

| Date | Change | Reason |
|---|---|---|

## Freeze

- [ ] **Janita** — frozen for T1
