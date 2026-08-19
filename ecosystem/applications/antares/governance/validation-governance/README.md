# Validation Governance

**Owner:** Zara Fatima — Capability Validation Platform

This folder contains the governance documents that the
`services/validation-service/` implementation must stay consistent with.

| File | Purpose |
|---|---|
| `validation-standards.md` | Dimensions, weights, thresholds, decision states, evidence standards |
| `review-process.md` | End-to-end review flow, reviewer responsibilities, escalation, audit trail |

Any change to scoring logic or state transitions in
`services/validation-service/app/engine/` must be reflected here first.
