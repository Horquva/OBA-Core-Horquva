# Trace Envelope

**Owner:** Affan Ahmed Khan (integration)
**Status:** Draft — frozen once the T1 contracts are signed
**Applies to:** every hop in the T1 signal path

---

## Why this exists

The T1 chain has eight hops, so it can stall in eight places. When a signal stops moving, the first question is always *"where did it stop?"* — and without a shared identifier that survives every hop, answering it means reading eight sets of logs and guessing.

The envelope is the minimum set of fields that must travel with a signal from ingestion to screen. It is not domain data. It carries no meaning about the organization. It exists so that failures are **observable and assignable to the correct boundary**.

This is the one contract integration writes rather than convenes.

---

## The fields

Every hop accepts these, preserves them unchanged, and passes them on.

| Field | Type | Set by | Rule |
|---|---|---|---|
| `signal_id` | string (UUID) | Ingestion, once | **Immutable.** Never regenerated, never reused. The same value appears at every hop and in every log line for this signal. |
| `occurred_at` | ISO 8601 UTC | Ingestion | When the event happened **at the source** — not when we received it. |
| `received_at` | ISO 8601 UTC | Ingestion | When it entered OCOS. |
| `source` | string | Ingestion | Which connector produced it. T1: `github`. |
| `hop` | string | Each hop | The capability currently holding the signal, e.g. `perception.ingestion`, `evidence.classification`. Overwritten at each hop — the only mutable field. |
| `schema_version` | string | Each contract owner | Version of the contract this payload conforms to. T1: `1.0` everywhere. |

### Carried once classification has run

| Field | Type | Set by | Rule |
|---|---|---|---|
| `classification` | enum | `evidence/classification/` (Maaz) | One of the categories in [`02_classification_contract.md`](02_classification_contract.md). Once set, downstream hops **preserve it** — no hop may widen it. |

---

## Rules

**1. `signal_id` is generated exactly once, at ingestion.**
Not at classification. Not at persistence. If a hop finds itself generating a `signal_id`, that hop received a signal without one — a defect at the previous boundary, not something to paper over by minting a new one.

**2. Every hop logs one structured line on entry and one on exit**, both carrying `signal_id` and `hop`. This is what makes a stalled signal traceable to a boundary in one query instead of seven.

**3. `classification` may be narrowed, never widened.**
If Maaz classifies a signal `Restricted`, no downstream capability may treat it as something less restrictive. Narrowing is always safe; widening is a security defect.

**4. A hop that cannot process a signal fails loudly.**
It logs with `signal_id`, records the reason, and stops. It does **not** pass a partial payload downstream and it does **not** substitute a default. A signal that stops must be visible as stopped — per the hard gate rule that no fake downstream result may be used to claim end-to-end success.

**5. The envelope is additive.**
A hop may add its own fields. It may never remove or rewrite an envelope field it did not set.

---

## Worked example — one signal, the full chain

```
signal_id  = 9f2c...a41        (set once, at ingestion, never changes)

hop = connectivity.github            Umer    → raw GitHub payload received
hop = perception.ingestion           Umer    → normalized, signal_id assigned
hop = evidence.classification        Maaz    → classification assigned, safety action recorded
hop = evidence.evidence_store        Janita  → persisted with provenance, queryable
hop = understanding.organizational   Jawad   → structured claim extracted, evidence ID attached
hop = runtime.orchestrator           Saad    → finding produced, evidence_ids linked back
hop = connectivity.api               Haroon  → served with provenance intact
hop = executive_workspace.frontend   Zoya    → rendered to screen
```

The T1 gate is demonstrated when one `signal_id` can be shown at every hop, in order, from real logs and real storage.

That is also the **trace evidence** deliverable. If you can produce this table for a real signal with real timestamps, the gate is closed and the evidence artifact is the same query.

---

## What this does not cover

- **Authentication and authorization.** The frozen tree places `infrastructure/identity/` and `infrastructure/secrets/` at T3. T1 boundaries are unauthenticated **within dev only**. This must not reach staging.
- **Retries, ordering, idempotency.** `runtime/queues/` and `runtime/messaging/` are RESERVED. T1 is synchronous, at-most-once, in-process. A dropped signal is dropped — acceptable for T1, not acceptable beyond it.
- **PII handling.** Belongs to `evidence/governance/` (Maaz, T3).

---

## Change log

| Date | Change | Reason |
|---|---|---|
| — | Initial draft | T1 |

## Freeze

- [ ] **Affan** — envelope frozen for T1
