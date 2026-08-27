# Capability Validation Platform — Interface Freeze

**Purpose:** Document the real, existing interface exactly as implemented, with no new schema introduced. This is the contract other Antares platforms may build against.

**Source of truth:** `app/services/validation_service.py` (in-process interface) and `app/api.py` (HTTP transport layer, a thin wrapper with no independent logic).

---

## 1. Service Boundary

As stated directly in the source code:

> Zara's boundary (enforced here): Accepts capability objects from upstream discovery platforms. Does NOT perform discovery. Does NOT operationalize validated capabilities. Returns machine-readable, explainable results only.

This platform validates. It does not discover candidates and does not act on validated results — those are other platforms' responsibilities.

---

## 2. HTTP Endpoints (frozen, as implemented)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/capabilities` | Submit a capability for validation |
| `POST` | `/capabilities/{id}/validate` | Run assessment + decision pipeline |
| `GET` | `/capabilities/{id}/assessment` | Full explainable assessment trace |
| `GET` | `/capabilities/{id}/status` | Current validation state only |
| `GET` | `/capabilities/{id}/history` | All recorded state transitions, oldest to newest |
| `POST` | `/capabilities/{id}/evidence` | Attach an additional evidence reference |
| `POST` | `/capabilities/{id}/revise` | Update fields and re-run the pipeline |
| `GET` | `/capabilities/{id}/report` | Human-readable summary report |
| `GET` | `/health` | Liveness check |

All `{id}`-scoped read/write endpoints return **HTTP 404** for an unknown `capability_id` — confirmed live (see evidence log). This is a hard contract guarantee: no endpoint returns a default or empty object in place of a real result.

---

## 3. Request Schema — `POST /capabilities`

```json
{
  "capability_name": "string",
  "description": "string",
  "organizational_problem": "string",
  "target_organization": "string",
  "expected_value": "string",
  "expected_outcome": "string",
  "source_platform": "string",
  "submitted_by": "string",
  "dependencies": ["string"],
  "risks": ["string"],
  "evidence_references": [
    {
      "evidence_id": "string",
      "source": "string",
      "description": "string",
      "url_or_locator": "string | null"
    }
  ],
  "initial_readiness": "EARLY_SIGNAL | ... (ReadinessLevel enum)",
  "constitutional_notes": "string | null",
  "oba_compatibility_notes": "string | null"
}
```
All fields are optional at the transport layer (defaults to empty string / empty list). Completeness is enforced by the assessment engine, not by request validation — an incomplete submission is accepted and then scored down, not rejected at intake. This is intentional and is how the honest-failure behavior is achieved.

## 4. Response Schema — Validation Result

```json
{
  "capability_id": "string",
  "assessed_at": "ISO-8601 timestamp",
  "overall_score": "float, 0.0–1.0",
  "state": "INCOMPLETE | UNDER_REVIEW | REVISION_REQUIRED | VALIDATED | REJECTED",
  "recommendation": "string, human-readable",
  "risks": ["string"],
  "missing_information": ["string"],
  "reviewer_notes": ["string"],
  "findings": [
    {
      "dimension": "one of the 8 governance dimensions",
      "score": "float, 0.0–1.0",
      "passed": "boolean",
      "reasoning": "string",
      "evidence_used": ["string"],
      "strengths": ["string"],
      "weaknesses": ["string"],
      "missing_information": ["string"]
    }
  ]
}
```

## 5. Decision States (frozen, matches governance)

`SUBMITTED → INCOMPLETE → UNDER_REVIEW → REVISION_REQUIRED → VALIDATION_READY → VALIDATED / REJECTED`

- **SUBMITTED**: the `ValidationState` a `Capability` is created with in code (`app/models/assessment.py`), before any assessment runs. Confirmed live: it is never itself written to `CapabilityDecisionRecord.history` — the first entry a caller actually observes via `GET /capabilities/{id}/history` is `UNDER_REVIEW`. Listed here for completeness against the governance document, not because a caller will ever see it as a history entry.
- **VALIDATED**: overall score ≥ 0.70 and no missing required information.
- **REJECTED**: overall score < 0.35.
- Everything between: **REVISION_REQUIRED**, with the specific weak dimensions and missing fields itemized in the response — never a bare pass/fail with no explanation.

## 6. What Is Explicitly Not Part of This Interface

- No authentication/authorization layer exists at the API level today. Any caller with network access to the service can submit and read.
- No persistence — the interface contract above is accurate for a running process, but nothing survives a restart. Any platform integrating today must not assume durability.
- No rate limiting, pagination, or batch endpoints exist. Each call operates on one capability.

This document freezes the interface as it exists. It intentionally does not add fields, endpoints, or states that the code does not already have.
