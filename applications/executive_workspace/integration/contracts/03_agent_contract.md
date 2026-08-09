# 03 — Agent Contract

| | |
|---|---|
| **Owner** | Saad |
| **Path** | `runtime/orchestrator/langgraph/` |
| **Stage** | 1 |
| **Blocks** | Tanveer, Jawad |
| **Status** | Not started |

---

## What this contract defines

What the orchestration graph accepts, and what it returns.

## Required fields — output

The contract must define all of these:

- `finding`
- `confidence`
- `evidence_ids`
- `severity`
- `classification`
- `reasoning`

## Required — input

What the graph accepts from `understanding/organizational/` (Jawad's claim).

## Envelope obligations

- `signal_id` preserved from the incoming claim.
- `hop` becomes `runtime.orchestrator`.
- `classification` preserved from the incoming record. May be narrowed, never widened.

See [`ENVELOPE.md`](ENVELOPE.md).

## `evidence_ids` — gate requirement

`evidence_ids` must resolve against records Janita stored, for the same `signal_id` that entered at ingestion. This is what makes the result evidence-linked rather than asserted, and it is checked first at wire-up.

## To be defined by owner

**Input:**

| Field | Type | Required | Notes |
|---|---|---|---|

**Output:**

| Field | Type | Allowed values | Notes |
|---|---|---|---|
| `finding` | | | |
| `confidence` | | | |
| `evidence_ids` | | | |
| `severity` | | | |
| `classification` | | | |
| `reasoning` | | | |

**Example output:**

```json

```

**Behaviour when the graph cannot produce a finding:**

## Transport

`runtime/orchestrator/langgraph/` runs as a separate Python service. The API layer reaches it over HTTP.

| | |
|---|---|
| Endpoint | |
| Method | |
| Timeout | |

## Consumed by

| Consumer | Uses |
|---|---|
| Tanveer — graph state | Builds state definition against this shape |
| Jawad — `understanding/organizational/` | Produces the input shape |
| Haroon — `connectivity/api/` | Serves the output without reshaping it |

## Change log

| Date | Change | Reason |
|---|---|---|

## Freeze

- [ ] **Saad** — frozen for T1
