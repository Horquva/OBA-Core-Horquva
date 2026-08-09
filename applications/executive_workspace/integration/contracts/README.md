# Integration Contracts — T1

**Path owner:** Affan Ahmed Khan — `applications/executive_workspace/integration/contracts/` (T1–T7, per frozen tree)

---

## What this folder is

The place where the contracts between OCOS capabilities are written down, frozen for T1, and checked against each other.

## What integration owns, and what it does not

| Integration (Affan) owns | Domain owner owns |
|---|---|
| The **envelope** — fields that must travel every hop so a signal can be traced | The **semantics** — what a field means, what values are valid, how it is derived |
| Verifying two adjacent contracts are **compatible** | Deciding what their capability produces |
| The freeze process and sign-off record | The content of their own contract |

Integration does not define domain shapes. Where a contract file below has a `TO BE DEFINED BY OWNER` section, that section stays empty until its owner fills it. A contract written by anyone other than its owner is not a contract — it is an assumption, and it will break at wire-up.

## T1 contract set

T1 runs in stages (see §2.1 of the [integration map](../../../../docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md)). Stage 1 contracts block everything after them; Stage 2 shapes depend on Stage 1 landing first.

### Stage 1 — these block everyone

| File | Contract | Owner | Blocks |
|---|---|---|---|
| [`ENVELOPE.md`](ENVELOPE.md) | Trace envelope — carried by every hop | Affan | Everyone |
| [`01_event_contract.md`](01_event_contract.md) | Event: source, type, timestamp, actor, external ID | Umer | Janita, Maaz |
| [`02_classification_contract.md`](02_classification_contract.md) | Classification categories + metadata shape | Maaz | Janita, Haroon |
| [`03_agent_contract.md`](03_agent_contract.md) | Agent input/output: finding, confidence, evidence_ids, severity, classification, reasoning | Saad | Tanveer, Jawad |
| [`04_api_contract.md`](04_api_contract.md) | API path structure + response shape; DB connectivity + service skeleton | Haroon (with Affan) | Everyone downstream |

### Stage 2 — shapes that depend on Stage 1

| File | Contract | Owner | Depends on |
|---|---|---|---|
| [`05_evidence_record.md`](05_evidence_record.md) | Evidence record: people, teams, repositories, work items, relationships, provenance | Janita | Umer, Maaz |
| [`06_belief_record.md`](06_belief_record.md) | Belief record: claim, assessment, confidence, evidence both ways, timestamp, freshness, version, reason for last update | Bisma | Janita |

### Integration standards — apply to everyone, no sign-off required

| File | Covers |
|---|---|
| [`ENVELOPE.md`](ENVELOPE.md) | Fields every hop carries and preserves |
| [`HEALTH.md`](HEALTH.md) | `/health` and `/ready` on every service |
| [`../../../../infrastructure/observability/README.md`](../../../../infrastructure/observability/README.md) | Structured logging |
| [`../../../../docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md`](../../../../docs/executive_workspace/T1_T7/T1_SERVICE_BOUNDARIES.md) | What each path may and may not do |

### Not contracts, but Stage 1 deliverables

Zoya's design tokens (`applications/executive_workspace/frontend/design_system/tokens/`) and UI specification (`docs/executive_workspace/ui_specification/`), and Fatima's interaction specification (`docs/executive_workspace/interaction_specification/`). These are committed as code and spec, not as shapes here — but they block Mushtaq and Fatima the same way a contract does.

## What "done" means for a T1 contract

1. Its **shape is written down** in its file.
2. It is **circulated** to the owners of the adjacent contracts (see the compatibility chain below).
3. Its owner has **signed the freeze line** at the bottom of the file.

Not: implemented. Not: tested. A contract is a shape on paper. The shape existing is the deliverable.

## What "frozen for T1" means

Once signed, the shape does not change until the T1 gate closes. If wire-up reveals a contract is wrong:

- The change is made by the **contract owner**, not by whoever hit the problem.
- It is recorded in the *Change log* section of that file with the reason.
- The owners of adjacent contracts are told directly — not left to notice.

A contract quietly changed mid-T1 is the most likely single cause of the gate failing to close.

## Compatibility chain

Adjacent contracts must agree on the fields that cross between them. Integration checks this, and it is the one place integration will push back on a domain owner:

```
Event (Umer)           ──▶  Classification (Maaz)     Maaz consumes Umer's event fields
Classification (Maaz)  ──▶  Evidence (Janita)         classification attached at write time
Evidence (Janita)      ──▶  Claim (Jawad)             claim carries the evidence ID back
Claim (Jawad)          ──▶  Agent input (Saad)        Saad's evidence_ids resolve in Janita's store
Agent output (Saad)    ──▶  API (Haroon)              Haroon serves Saad's shape without reshaping it
API (Haroon)           ──▶  Frontend (Zoya)           Zoya renders Haroon's shape
```

If two adjacent contracts disagree, the fix belongs at the boundary and the two owners settle it together. Integration convenes it; integration does not decide it.

## The one field the gate depends on

`evidence_ids` on Saad's finding is what makes the gate's *"structured, evidence-linked result"* real rather than asserted. It must resolve against records Janita actually stored, for the same `signal_id` that entered at ingestion.

If that link is broken, every other contract can be individually correct and the gate still fails. It is the first thing integration checks at wire-up.
