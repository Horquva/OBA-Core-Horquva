# Capability Record — Data Model & Foundation Flow

## Core Fields

Every capability record tracked by this platform must include:

| Field | Purpose |
|---|---|
| **Identity** | Unique ID and name for the capability |
| **Metadata** | Description, owner, capability type |
| **Versioning** | Version number and change history |
| **Provenance** | Validation reference — report ID, validator, date |
| **Dependency Declarations** | What the capability depends on (systems, data, other capabilities) |
| **Readiness State** | Current status (e.g. Ready / Conditionally Ready / Blocked / Dependency Missing / Validation Reference Missing / Requires Revision) |
| **Lifecycle Transitions** | Log of status changes over time, with timestamps |

## Foundation Flow

A minimal end-to-end path every capability moves through:

1. **Submit** — A validated capability is submitted to the platform (from `01-incoming-validated-capabilities/`).
2. **Register** — The capability is assigned a unique ID and initial metadata is recorded.
3. **Persist** — The capability record is saved into the repo structure (`03-operationalization-records/`), following the standard template.
4. **Retrieve** — The record can be looked up and pulled back by its ID at any point.

## Test Plan

Run one real or sample capability through Submit → Register → Persist → Retrieve manually to confirm the flow works end-to-end before building the full 8-step pipeline in Days 3–4.

**Example test record:**
- Submit: Automated Compliance Risk Scoring (from existing sample)
- Register: Assign ID `COP-0001`
- Persist: Save to `03-operationalization-records/automated-compliance-risk-scoring.md`
- Retrieve: Confirm the record can be found and read back using `COP-0001`
