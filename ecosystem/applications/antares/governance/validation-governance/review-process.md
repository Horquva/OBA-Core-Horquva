# Capability Validation — Review Process

**Owner:** Zara Fatima — Capability Validation Platform

## Process Flow

```
Upstream Platform Output (Signal / Candidate Capability)
        │
        ▼
Capability Intake  (services/validation-service)
        │
        ▼
Completeness Check ── fails ──▶ INCOMPLETE (returned to submitter)
        │ passes
        ▼
Automated Assessment (8 dimensions, explainable)
        │
        ▼
Decision Engine ── low score ──▶ REJECTED
        │
        ├── failed dimension(s) ──▶ REVISION_REQUIRED ──▶ (loop back to Intake)
        │
        ▼
All dimensions pass
        │
   ┌────┴─────┐
   ▼          ▼
score ≥ 0.70   score < 0.70
VALIDATED      VALIDATION_READY (human reviewer sign-off)
        │
        ▼
Downstream Antares Platforms / Future OBA Consumption
```

## Reviewer Responsibilities

Human reviewers (not this platform) are responsible for:
- Final sign-off on `VALIDATION_READY` capabilities.
- Confirming constitutional alignment where the platform's automated
  check is inconclusive (score 0.5–0.79 on Constitutional Alignment).
- Resolving conflicting evidence flagged by the assessment engine.

## Escalation

Any capability where:
- Constitutional Alignment score < 0.5, or
- Evidence sources directly contradict one another,

must be escalated to Trust & Verification Engineering before a
VALIDATED state is issued downstream.

## Audit Trail

Every state transition is stored via `CapabilityDecisionRecord` in
`services/validation-service/app/engine/decision_engine.py` and is
queryable via `get_validation_history()`. History entries are never
deleted or overwritten — only appended.
