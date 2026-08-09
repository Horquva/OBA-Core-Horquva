# 04 — API Contract

| | |
|---|---|
| **Owner** | Haroon (with Affan) |
| **Path** | `connectivity/api/`, `perception/api/` |
| **Stage** | 1 |
| **Blocks** | Everyone downstream |
| **Status** | Not started |

---

## What this contract defines

API path structure, response shape, and error shape. Also database connectivity and the service skeleton.

## Scope boundary

These paths are **transport and exposure only**. Domain logic stays with the capability owner. The API serves Saad's output shape without reshaping it.

## Required

- API path structure across `connectivity/api/` and `perception/api/`
- Response shape
- Error shape
- Database connectivity from dev
- Service skeleton

## Envelope obligations

- `signal_id` returned in every response that concerns a signal.
- Provenance served intact — the response identifies where the result came from.
- `classification` enforced on what is served.

See [`ENVELOPE.md`](ENVELOPE.md).

## To be defined by owner

**Paths:**

| Method | Path | Purpose | Returns |
|---|---|---|---|

**Response shape:**

```json

```

**Error shape:**

```json

```

**Status codes:**

| Code | Used when |
|---|---|

**Behaviour when a downstream capability is unavailable:**

## Database connectivity

Connection and migration conventions are defined in `infrastructure/databases/` (Janita, Affan). This contract records how services reach them.

| | |
|---|---|
| Connection source | |
| Pooling | |
| Failure behaviour | |

## Consumed by

| Consumer | Uses |
|---|---|
| Zoya — `executive_workspace/frontend/` | Renders this shape |
| Everyone downstream | Reaches databases through this skeleton |

## Change log

| Date | Change | Reason |
|---|---|---|

## Freeze

- [ ] **Haroon** — frozen for T1
- [ ] **Affan** — service boundaries and connectivity confirmed
