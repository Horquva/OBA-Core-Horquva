# Capability Validation Governance Standards

**Owner:** Zara Fatima — Capability Validation Platform
**Scope:** `services/validation-service/`
**Status:** Draft — implementation reference for Capability Validation Platform

## Purpose

This document governs *how* the Capability Validation Platform decides
whether a candidate capability is valuable, understandable, reusable,
evidence-backed, and ready to move forward — and defines the boundary
of what this platform can and cannot decide.

## Critical Boundary

> **Validation ≠ Approval.**
> This platform produces structured evidence and validation
> recommendations according to the criteria below. Final constitutional
> authority remains outside this platform's ownership.

## Validation Dimensions (governed criteria)

| Dimension | Weight | Minimum Passing Score |
|---|---|---|
| Organizational Value | 1.5 | 0.60 |
| Organizational Impact | 1.2 | 0.60 |
| Evidence Quality | 1.5 | 0.60 |
| Explainability | 1.0 | 0.60 |
| Reusability | 0.8 | 0.60 |
| Enterprise Readiness | 1.0 | 0.60 |
| Constitutional Alignment | 1.3 | 0.80 |
| OBA Compatibility | 0.7 | 0.60 |

These weights and thresholds are implemented in
`services/validation-service/app/models/validation_dimension.py` and must
stay in sync with this document. Any change to a threshold or weight
requires a corresponding update here.

## Decision State Model (governed)

```
SUBMITTED → INCOMPLETE → UNDER_REVIEW → REVISION_REQUIRED
→ VALIDATION_READY → VALIDATED / REJECTED
```

- **INCOMPLETE** — structurally required fields are missing; cannot proceed.
- **REJECTED** — overall score below rejection threshold (0.35).
- **REVISION_REQUIRED** — one or more dimensions failed, or information is missing.
- **VALIDATION_READY** — all dimensions passed, but overall score below the
  validation bar (0.70); awaiting reviewer sign-off.
- **VALIDATED** — all dimensions passed and overall score ≥ 0.70. This is a
  **recommendation**, not final constitutional approval.

## Evidence Standards

Every dimension finding must be traceable:

```
Criterion → Evidence → Assessment → Reasoning → Result
```

No automated result may be presented without:
1. The evidence used (or explicit note that no evidence was found),
2. A plain-language reasoning statement,
3. A named result state.

## Review & Audit

- All decisions are appended to an immutable per-capability history
  (`DecisionHistoryEntry`) — never overwritten.
- Revisions re-run the full assessment pipeline; prior history is preserved.
- AI-assisted analysis (draft findings, duplicate detection, summarization)
  is permitted, but does **not** independently decide constitutional
  approval or override this governance document.

## Non-Overlap Boundary

This platform does **not** own:
- Technology / organizational discovery
- Trust & governance research
- Enterprise validation
- Knowledge or capability operationalization
- Engineering operations / OBA constitutional ownership

See `Zara_Fatima_Capability_Validation_Roadmap` (Part-1 & non-overlap
table) for the authoritative boundary definition.
