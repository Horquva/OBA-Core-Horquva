# 06 — Belief Record

| | |
|---|---|
| **Owner** | Bisma |
| **Path** | `world_model/beliefs/`, `evidence/confidence/` |
| **Stage** | 2 |
| **Depends on** | 05 (Janita) |
| **Status** | Not started |

---

## What this contract defines

The belief record shape, and how a belief is versioned.

## Required fields

- `claim`
- `assessment`
- `confidence`
- evidence **both ways** — evidence supporting and evidence contradicting
- `timestamp`
- `freshness`
- `version`
- reason for last update

## Done when

The shape is defined and versionable.

## Envelope obligations

- Evidence references resolve against Janita's evidence store (05).
- `classification` inherited from the underlying evidence. May be narrowed, never widened.

See [`ENVELOPE.md`](ENVELOPE.md).

## To be defined by owner

| Field | Type | Required | Notes |
|---|---|---|---|
| `claim` | | | |
| `assessment` | | | |
| `confidence` | | | |
| `evidence_for` | | | |
| `evidence_against` | | | |
| `timestamp` | | | |
| `freshness` | | | |
| `version` | | | |
| `last_update_reason` | | | |

**Versioning** — what creates a new version, and what is retained:

**Freshness** — how it is calculated and when a belief is considered stale:

**Example record:**

```json

```

## Change log

| Date | Change | Reason |
|---|---|---|

## Freeze

- [ ] **Bisma** — frozen for T1
