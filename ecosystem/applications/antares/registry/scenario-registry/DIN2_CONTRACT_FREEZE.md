# Din 2 — Real Contract Freeze
## Ammara Nasir — "Enterprise Validation Platform" (running code: Day8 production engine)
**Rule followed: no new design.** Every field, check, and status code below is taken directly from `part8_production_antres_platform.py` (Day8) — the file Din 1 identified as the actual single-source-of-truth, gated, superseding engine that Day9/Day10 build on. Everything here was re-confirmed live in this session (not just read from code) — see the reproduction calls in the notes.

---

## 1. Input Contract

**Endpoint:** `POST /api/v8/production/ingest`
**Optional header:** `X-Idempotency-Key: <string>`

```
{
  "id": str,                          # required, unique knowledge object ID
  "title": str,                       # required, min_length=3
  "description": str,                 # required, min_length=10
  "category": str,                    # required, MUST be one of:
                                       #   "Capability" | "Technology" |
                                       #   "Organizational Future" | "Governance Pattern"
  "provenance": {
    "source_platform": str,           # required, non-empty (e.g. "Capability Validation (Zara)")
    "author_id": str,                 # required, non-empty
    "source_reference_id": str        # required
  },
  "validation": {
    "validated_by": str,              # required
    "validation_status": str,         # required, MUST equal "APPROVED" exactly (case-sensitive)
    "confidence_score": float,        # required, 0.0 <= x <= 1.0
    "constitutional_check_passed": bool  # required, MUST be true
  },
  "capabilities": [str],              # optional, default []
  "technologies": [str],              # optional, default []
  "dependencies": [str],              # optional, default []
  "version": int,                     # optional, default 1
  "previous_version_id": str | null,  # optional
  "audit_notes": str | null           # optional
}
```

**Confirmed live:** invalid `category` → 422; `confidence_score=1.5` → 422; `validation_status="approved"` (lowercase) → 400, not 422 — the APPROVED check is manual code inside the engine, not a Pydantic enum, so it's a 400 business-rule rejection, not a schema error.

## 2. Evidence Contract

What the caller must supply as *proof* that a knowledge object is admissible — this is the `validation` + `provenance` block above, evaluated by `ProductionAntresEngine.operationalize_knowledge()`:

- `constitutional_check_passed == True` **and** `validation_status == "APPROVED"` (exact string) — both required together, checked with `if not X or Y != "APPROVED"`. Either one failing → rejection.
- `provenance.source_platform` and `provenance.author_id` must both be non-empty (truthy) strings — checked explicitly as a second, separate gate.
- **No cryptographic, signed, or externally-verifiable evidence is required or checked.** The engine trusts these fields as asserted by the caller. There is no call-back to Kanwal's Trust & Governance service or anyone else to independently confirm the claim — the "evidence" is self-reported by whoever calls the endpoint.

## 3. AI/ML Semantic Mapping

**There is none — confirmed in Din 1 and re-confirmed here: freezing "no mapping exists" as the current real contract, not inventing one.** `confidence_score`, `validation_status`, and `constitutional_check_passed` are opaque pass-through values the caller provides; nothing in Day8 computes, scores, or semantically interprets them. If an AI/ML semantic mapping is expected to exist per the original task spec, that is a **missing** capability, not a hidden implementation — flag for Din 4 (full path) and Din 5 (unified consumption), since Kamil's unified app cannot get an AI/ML-derived signal from this platform today, only whatever the caller already decided.

## 4. Result Contract

**Success response** (`HTTP 201`):
```
{
  "status": "SUCCESS",
  "message": "Knowledge successfully operationalized and integrated into Antres production layer.",
  "data": {
    "platform_layer": "Antres Knowledge Operationalization Platform (Production v8.0)",
    "object_identity": {
      "id": str, "version": int, "previous_version_id": str|null,
      "lifecycle_state": str,      # "PRODUCTION_ACTIVE_OPERATIONALIZED" | "PRODUCTION_SUPERSEDED_ARCHIVED"
      "is_active": bool
    },
    "content": { "title": str, "description": str, "category": str },
    "cross_team_provenance": {
      "source_platform": str, "author_id": str,
      "source_reference_id": str, "ingested_at": iso8601 str
    },
    "governance_and_validation": {
      "validated_by": str, "validation_status": str,
      "confidence_score": float, "constitutional_check_passed": bool
    },
    "graph_relationships_and_dependencies": {
      "capabilities": [str], "technologies": [str], "dependencies": [str]
    },
    "audit_trail": { "notes": str|null, "owner": str }  # "owner" is a hardcoded literal, see §6
  }
}
```

**Retrieval:** `GET /api/v8/production/knowledge/{id}` → same `data` object shape (not wrapped in status/message), only for `is_active=true` records. `GET /api/v8/production/traverse/{id}` → reduced shape: `{object_id, source_platform, relationship_graph: {capabilities, technologies, dependencies}}`.

## 5. Failure Contract

| Condition | Status | Note |
|---|---|---|
| Pydantic schema violation (missing field, `min_length`, `confidence_score` out of 0–1, bad type) | `422` | Standard FastAPI/Pydantic error body |
| `category` not in the 4 allowed values | `422` | Enforced by a custom field_validator, same 422 channel |
| `constitutional_check_passed == False` **or** `validation_status != "APPROVED"` | `400` | `"Production Rejection: Unconstitutional or unapproved knowledge cannot enter the Antres live system."` |
| `provenance.source_platform` or `provenance.author_id` empty | `400` | `"Production Rejection: Missing provenance metadata is strictly prohibited."` |
| `version <= existing_active.version` for same `id` | `409` | `"Version Conflict: New version (...) must exceed current active version (...)."` |
| `id` not found (retrieve/traverse) or found but `is_active=false` | `404` | |
| Same `X-Idempotency-Key` reused | `201` (not an error) | **Known gap, confirmed live**: returns the *original* stored record silently, with no check that the new payload matches the old one. A caller can send a different `id`/`title`/`category` under a reused key and get back someone else's old record with a 201, no warning. Freezing this as the *current* documented behavior, not fixing it — this is a Din 6/7 candidate. |

## 6. Traceability

Fields carried on every record for provenance/audit purposes:
- `source_platform`, `author_id`, `source_reference_id`, `ingested_at` — who/what/when it came from
- `id` + `version` (composite primary key) + `previous_version_id` — version lineage; superseding a version flips the old row's `lifecycle_state` to `PRODUCTION_SUPERSEDED_ARCHIVED` and `is_active=False` rather than deleting it, so history is retained in the same table
- `audit_notes` — free-text, defaults to a generic success message if the caller doesn't supply one
- `"owner": "Laiba Mahboob (Backend & Knowledge Infrastructure Engineer)"` in every response's `audit_trail` — **this is a hardcoded literal string, not derived from the record.** Worth flagging: it's not really traceability data (it doesn't vary per object), it's a static ownership credit baked into the code. Not changing it under Din 2 (no new design), just noting it as-is.
- Traversal endpoint (`/traverse/{id}`) exposes the relationship graph (`capabilities`/`technologies`/`dependencies`) keyed by `source_platform`, which is the mechanism other platforms would use to trace what an object is linked to.

---

## Carried forward to Din 3

Din 3 needs a real approved input through a real running Antares chain (no fake/static input). Per §2 above, "real" here can only mean a **syntactically well-formed, self-asserted APPROVED+constitutional_check_passed payload** — there is no external verifier this engine calls to confirm the claim is genuine. Flagging this now so Din 3 isn't built on a false expectation of independently-verified input.
