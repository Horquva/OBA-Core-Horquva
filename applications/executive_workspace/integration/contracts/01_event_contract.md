# 01 — Event Contract

| | |
|---|---|
| **Owner** | Umer |
| **Path** | `connectivity/connector_platform/github/` → `perception/ingestion/` |
| **Stage** | 1 |
| **Blocks** | Janita, Maaz |
| **Status** | Not started |

---

## What this contract defines

The shape of an event as it leaves the GitHub connector and enters ingestion. Every downstream hop reads this shape.

## Required fields

The contract must define all of these:

- `source`
- `type`
- `timestamp`
- `actor`
- `external_id`

## Envelope obligations

Ingestion is where the envelope starts. It sets:

| Field | Value |
|---|---|
| `signal_id` | New UUID. Generated here, once. Never regenerated downstream. |
| `occurred_at` | When the event happened at GitHub. |
| `received_at` | When it entered OCOS. |
| `source` | `github` |
| `hop` | `perception.ingestion` |
| `schema_version` | `1.0` |

See [`ENVELOPE.md`](ENVELOPE.md).

## To be defined by owner

| Field | Type | Allowed values | Notes |
|---|---|---|---|
| `source` | | | |
| `type` | | | |
| `timestamp` | | | |
| `actor` | | | |
| `external_id` | | | |

Add rows for any additional fields the connector produces.

**Example payload:**

```json

```

## Consumed by

| Consumer | Uses |
|---|---|
| Maaz — `evidence/classification/` | Classifies against these fields |
| Janita — `evidence/evidence_store/` | Persists the event and references `external_id` |

## Change log

| Date | Change | Reason |
|---|---|---|

## Freeze

- [ ] **Umer** — frozen for T1
