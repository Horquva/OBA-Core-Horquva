# Capability Validation Service

**Owner:** Zara Fatima — Capability Validation Platform
**Platform:** Antares → Capability Validation Platform
**Governance:** see `governance/validation-governance/`

## What This Service Does

Receives candidate capabilities from upstream Antares platforms
(Technology Intelligence / Organizational Futures / Trust & Verification),
runs them through an explainable, evidence-based assessment across 8
validation dimensions, and produces a machine-readable, traceable
validation decision.

**Validation ≠ Approval.** Final constitutional authority remains outside
this platform's ownership (see `governance/validation-governance/validation-standards.md`).

## Structure

```
services/validation-service/
├── app/
│   ├── models/
│   │   ├── capability.py            # Capability intake schema (PART-2)
│   │   ├── validation_dimension.py  # 8 governed validation dimensions (PART-2)
│   │   └── assessment.py            # Findings + ValidationResult + state enum (PART-3/4)
│   ├── engine/
│   │   ├── assessment_engine.py     # Runs all 8 dimension assessments (PART-3)
│   │   ├── decision_engine.py       # State machine + revision history (PART-4)
│   │   └── comparison_engine.py     # Comparison + portfolio intelligence (PART-6)
│   └── services/
│       └── validation_service.py    # Public service interface (PART-5)
└── tests/
    ├── test_assessment_engine.py
    └── test_validation_service_integration.py
```

## Public Interface

All external interaction should go through `CapabilityValidationService`
(`app/services/validation_service.py`):

| Method | Purpose |
|---|---|
| `submit_capability(capability)` | Capability submission |
| `initiate_validation(capability_id)` | Runs assessment + decision |
| `get_assessment(capability_id)` | Retrieve full assessment result |
| `get_status(capability_id)` | Current validation state |
| `get_decision_reasoning(capability_id)` | Full explainable trace |
| `get_validation_history(capability_id)` | Traceable decision history |
| `submit_evidence(capability_id, evidence_ref)` | Attach evidence |
| `request_revision(capability_id, updated_fields)` | Revise + reassess |
| `get_validation_report(capability_id)` | Human-readable summary |

## Example Usage

```python
from app.models.capability import Capability, EvidenceReference
from app.services.validation_service import CapabilityValidationService

service = CapabilityValidationService()

capability = Capability(
    capability_name="Automated Meeting Intelligence",
    description="...",
    organizational_problem="...",
    target_organization="...",
    expected_value="...",
    source_platform="Organizational Futures",
    evidence_references=[
        EvidenceReference(evidence_id="EV-001", source="research-artifact-registry",
                           description="Pilot study")
    ],
)

service.submit_capability(capability)
result = service.initiate_validation(capability.capability_id)

print(result.state)          # e.g. ValidationState.VALIDATED
print(result.recommendation) # plain-language explanation
```

## HTTP Service Interface (cross-platform integration)

`CapabilityValidationService` is a Python class, so it only works
in-process. For other Antares platforms running as separate services
(e.g. Ammara's Enterprise Validation, Abbas's Integration & Ecosystem
platform), `app/api.py` exposes the same operations over HTTP as a thin
FastAPI wrapper — no logic lives in the API layer itself.

```bash
pip install -r requirements.txt
uvicorn app.api:app --reload --port 8000
```

| Method & Path | Purpose |
|---|---|
| `POST /capabilities` | Capability submission |
| `POST /capabilities/{id}/validate` | Runs assessment + decision |
| `GET /capabilities/{id}/assessment` | Full explainable trace |
| `GET /capabilities/{id}/status` | Current validation state |
| `GET /capabilities/{id}/history` | Traceable decision history |
| `POST /capabilities/{id}/evidence` | Attach evidence |
| `POST /capabilities/{id}/revise` | Revise + reassess |
| `GET /capabilities/{id}/report` | Human-readable summary |
| `GET /health` | Liveness check |

Unknown `capability_id` returns `404`, not a silent failure — important
for downstream platforms polling status.

## Running Tests

```bash
pip install -r requirements.txt
cd services/validation-service
python -m pytest tests/ -v
```

## Non-Overlap Boundary

This service does **not**: perform discovery, operationalize validated
capabilities, or grant constitutional/OBA approval. See the roadmap's
non-overlap table for the full boundary.
