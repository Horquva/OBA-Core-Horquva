# 02 — Classification Contract

| | |
|---|---|
| **Owner** | Maaz |
| **Path** | `evidence/classification/` |
| **Stage** | 1 |
| **Blocks** | Janita, Haroon |
| **Status** | Not started |

---

## What this contract defines

The classification categories, and the metadata shape attached to every signal once it has been classified.

## Required

**Categories.** Public, Internal, Restricted, and Sensitive or Secret.

**Metadata shape.** The structure carried alongside the category.

## Envelope obligations

Classification sets `classification` on the envelope. Once set:

- Downstream hops preserve it.
- It may be narrowed, never widened.
- `hop` becomes `evidence.classification`.

See [`ENVELOPE.md`](ENVELOPE.md).

## To be defined by owner

**Categories:**

| Category | Definition | Downstream handling |
|---|---|---|
| Public | | |
| Internal | | |
| Restricted | | |
| Sensitive / Secret | | |

**Classification metadata:**

| Field | Type | Allowed values | Notes |
|---|---|---|---|

**Example:**

```json

```

## Action model — Stage 2

Detect, classify, quarantine or redact, audit, block. Each action produces a structured record. Define that record here when Stage 2 begins.

| Action | Record shape |
|---|---|
| detect | |
| classify | |
| quarantine / redact | |
| audit | |
| block | |

## Consumed by

| Consumer | Uses |
|---|---|
| Janita — `evidence/evidence_store/` | Attaches classification at write time |
| Haroon — `connectivity/api/` | Enforces category on what is served |

## Change log

| Date | Change | Reason |
|---|---|---|

## Freeze

- [ ] **Maaz** — frozen for T1
