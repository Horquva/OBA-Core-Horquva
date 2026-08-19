# Capability Validation Platform — Integration Contract

Owner: Zara Fatima
Purpose: Tells other Antares platforms exactly what this service expects
as input and what it returns as output — so Zeeshan's capability
pipeline (upstream) and Ammara's Knowledge Operationalization platform
(downstream) can integrate without guessing field names.

Position in the lifecycle:
`... → Capability Engineering (Zeeshan) → Enterprise/Capability
Validation (Zara — this service) → Knowledge Operationalization
(Ammara) → OBA`

---

## 1. Two ways to call this service

| Mode | When to use |
|---|---|
| Python import (`CapabilityValidationService`) | Same process / same repo import |
| HTTP API (`app/api.py`, FastAPI) | Separate service/process — see README for run instructions |

Both expose the identical operations below.

## 2. Input — what upstream must send (`POST /capabilities`)

Required fields (missing any of these → capability is marked `INCOMPLETE`
and never proceeds to review):

| Field | Type | Meaning |
|---|---|---|
| `capability_name` | string | Short name of the capability |
| `description` | string | What it does |
| `organizational_problem` | string | Problem it solves |
| `target_organization` | string | Who it's for |
| `expected_value` | string | Business value claim |
| `expected_outcome` | string | Measurable outcome |

Optional fields: `source_platform`, `submitted_by`, `dependencies` (list),
`risks` (list), `evidence_references` (list of `{evidence_id, source,
description, url_or_locator}`), `initial_readiness`, `constitutional_notes`,
`oba_compatibility_notes`.

**Action needed from Zeeshan's team:** confirm their `capability-service`
output uses these exact field names, or tell Zara what their actual field
names are so a mapping layer can be added.

## 3. Output — what downstream (Ammara) receives

`POST /capabilities/{id}/validate` returns a `ValidationResult`:

```json
{
  "capability_id": "CAP-XXXXXXXXXX",
  "state": "VALIDATED | REJECTED | REVISION_REQUIRED | INCOMPLETE | UNDER_REVIEW",
  "overall_score": 0.0,
  "dimension_results": [
    {"dimension": "...", "score": 0.0, "passed": true, "reasoning": "..."}
  ],
  "missing_information": [],
  "recommendation": "human-readable explanation"
}
```

Ammara's Knowledge Operationalization platform should only pull
capabilities where `state == "VALIDATED"`.

## 4. Known integration gap (must resolve before production use)

This service currently stores everything **in-memory only** — data does
not persist across restarts and is not shared across processes. If
Zeeshan's service and this service run as separate processes, they
cannot share state yet. This must be replaced with the shared Antares
`data/` layer (or whatever persistence Abbas's Integration & Ecosystem
platform standardizes on) before this is wired into the real pipeline.

## 5. Status

- [x] Assessment + decision engine implemented and unit-tested
- [x] HTTP interface available
- [ ] Verified against Zeeshan's real capability-service output
- [ ] Verified against Ammara's real ingestion format
- [ ] Shared/persistent data layer decided and wired in
