# OCOS T1 — Integration Map

**Owner:** Affan Ahmed Khan — Integration, Platform & Production Readiness
**Source of truth:** `Horquva_OCOS_Repository_Tree.pdf` (frozen OCOS repository tree)
**Status:** Active

---

## 1. What T1 delivers

One real organizational signal from GitHub enters the running development system, is ingested and persisted, becomes queryable evidence, reaches the orchestration layer, produces a structured evidence-linked result, and that result is observable through the interface.

The signal must be real. No stage may substitute a fixture, a default, or a stubbed response for a stage that has not been built.

T1 is complete when one `signal_id` can be traced through every hop below, in order, from real logs and real storage.

---

## 2. The signal path

```
GitHub
   │
   ▼
connectivity/connector_platform/github/      Umer      a real event arrives
   │
   ▼
perception/ingestion/                        Umer      normalized, signal_id assigned
   │
   ▼
evidence/classification/                     Maaz      classified, safety action recorded
   │
   ▼
evidence/evidence_store/ + provenance/       Janita    persisted as queryable evidence
   │
   ▼
understanding/organizational/                Jawad     structured claim extracted
   │
   ▼
runtime/orchestrator/langgraph/              Saad      structured evidence-linked finding
   │
   ▼
connectivity/api/ · perception/api/          Haroon    served with provenance intact
   │
   ▼
applications/executive_workspace/frontend/   Zoya      rendered to screen
```

`infrastructure/databases/` (Janita + Affan) provides connection and migrations to every persisting hop.
The trace envelope (Affan) carries `signal_id` across all eight hops.

---

## 3. Ownership

Build in your assigned path. Do not create capability directories outside the frozen tree.

| Path | Owner |
|---|---|
| `connectivity/connector_platform/github/` | Umer |
| `perception/ingestion/` | Umer, Maaz |
| `evidence/classification/` | Maaz |
| `evidence/evidence_store/`, `evidence/provenance/` | Janita |
| `understanding/organizational/` | Jawad |
| `runtime/orchestrator/langgraph/` | Saad, Tanveer |
| `connectivity/api/`, `perception/api/` | Haroon |
| `infrastructure/databases/` | Janita, Affan |
| `applications/executive_workspace/frontend/design_system/tokens/` | Zoya |
| `applications/executive_workspace/frontend/app/`, `layout/`, `workspace/` | Zoya |
| `applications/executive_workspace/frontend/components/`, `states/` | Mushtaq |
| `applications/executive_workspace/frontend/oba/` | Fatima |
| `applications/executive_workspace/integration/contracts/` | Affan |
| `docs/executive_workspace/ui_specification/`, `design_tokens/` | Zoya |
| `docs/executive_workspace/interaction_specification/` | Fatima |
| `docs/executive_workspace/experience_foundation/`, `T1_T7/` | Affan |
| `testing/validation/` | Aleesha |
| `testing/reasoning_eval/` | Ahmed Abubakar |
| `.github/workflows/ci.yml` | Affan |

You own the contract for your path. Nobody else writes it, and nobody else changes it.

---

## 4. Stages

The stages are sequential. Each one unblocks the next. Do not start Stage 2 work before the Stage 1 contract you depend on is signed.

### Stage 1 — contracts

Everyone listed blocks somebody. Everyone not listed reads contracts and sets up locally.

| Person | Deliverable | Done when | Blocks |
|---|---|---|---|
| **Affan** | Repo structure, dev + staging, CI, service boundaries, logging, health endpoints | Any engineer can clone, build, and deploy to dev | Everyone |
| Umer | Event contract: source, type, timestamp, actor, external ID | Shape written down and circulated | Janita, Maaz |
| Maaz | Classification categories and metadata shape | Shape written down and circulated | Janita, Haroon |
| Saad | Agent input/output: finding, confidence, evidence_ids, severity, classification, reasoning | Contract frozen | Tanveer, Jawad |
| Zoya | Design tokens: typography, spacing, cards, badges, status and confidence indicators | Tokens committed and importable | Mushtaq, Fatima |
| Haroon | Database connectivity, service skeleton, API path structure (with Affan) | Services reach the databases from dev | Everyone downstream |

### Stage 2 — shapes

| Person | Deliverable | Done when | Depends on |
|---|---|---|---|
| Janita | Evidence record shape: people, teams, repositories, work items, relationships, provenance | A record can be written and read back with provenance intact | Umer, Maaz |
| Umer | Connector build: webhooks or polling, secure source auth | Connector authenticates against the real source | Credentials |
| Tanveer | Graph state definition, first node and edge | Skeleton executes and carries state through one pass | Saad |
| Fatima | Frontend state vocabulary in code: idle, listening, processing, considering, responding, interrupted, error, reconnecting | Vocabulary exists as code and the shell can drive it | Zoya |
| Mushtaq | Base components against tokens, every state rendered including empty and error | No component missing a defined state | Zoya |
| Bisma | Belief record shape: claim, assessment, confidence, evidence both ways, timestamp, freshness, version, reason for last update | Shape defined and versionable | Janita |
| Maaz | Action model wired: detect, classify, quarantine or redact, audit, block | Each action produces a structured record | — |

### Stage 3 — first real output

| Person | Deliverable | Done when | Depends on |
|---|---|---|---|
| Jawad | Extraction: a real event becomes a structured claim carrying entity, timestamp, source, evidence ID, confidence | A claim comes out of a real event with its evidence attached | Janita |
| Saad | Prototype adapted to the frozen contracts, LangGraph skeleton standing | Graph accepts input and returns the contracted output shape | Tanveer |
| Janita | Evidence store accepting writes with provenance and classification attached at write time | Evidence is queryable | Own Stage 2 work |
| Zoya | App shell with loading, error, empty, and unavailable states | Shell renders every state without a backend | Own tokens |
| Muhammad Ahmed | Validation suite for extraction | Suite fails a claim missing evidence ID, source, timestamp, entity reference, confidence, or classification | Jawad |
| Ahmed Abubakar | Golden fixture set: expected evidence, claims, uncertainty, known bad outputs | Suite runs against extraction output | Jawad |
| Aleesha | Executable scenario covering the gate path | The gate passes or fails on its own | The chain existing |

### Stage 4 — wire-up

The chain runs end to end. Everyone in the chain is on call for the person after them.

---

## 5. Contracts

All contracts live in `applications/executive_workspace/integration/contracts/`.

| File | Contract | Owner |
|---|---|---|
| `ENVELOPE.md` | Trace envelope | Affan |
| `01_event_contract.md` | Event | Umer |
| `02_classification_contract.md` | Classification categories and metadata | Maaz |
| `03_agent_contract.md` | Agent input and output | Saad |
| `04_api_contract.md` | API paths and response shape | Haroon |
| `05_evidence_record.md` | Evidence record | Janita |
| `06_belief_record.md` | Belief record | Bisma |

**Rules:**

1. Write your shape in your file. Do not write in anyone else's.
2. Circulate to the people listed under *Blocks* in §4. Circulated means they have seen it, not that it was committed.
3. Sign the freeze line at the bottom of your file.
4. Once signed, the shape does not change until the gate closes. To change it: you make the change, you record it in the file's change log with the reason, and you tell the adjacent owners directly.

**Compatibility:**

```
Event (Umer)          ──▶  Classification (Maaz)
Classification (Maaz) ──▶  Evidence (Janita)        classification attached at write time
Evidence (Janita)     ──▶  Claim (Jawad)            claim carries the evidence ID back
Claim (Jawad)         ──▶  Agent input (Saad)       evidence_ids resolve in Janita's store
Agent output (Saad)   ──▶  API (Haroon)             served without reshaping
API (Haroon)          ──▶  Frontend (Zoya)
```

Where two adjacent contracts disagree, the two owners settle it. Integration convenes the conversation and does not decide the outcome.

`evidence_ids` on Saad's finding must resolve against records Janita stored, for the same `signal_id` that entered at ingestion. This is checked first at wire-up.

---

## 6. Envelope rules

Full specification: [`ENVELOPE.md`](../../../applications/executive_workspace/integration/contracts/ENVELOPE.md). Every hop follows these.

1. `signal_id` is a UUID, generated once at ingestion, never regenerated and never reused.
2. Every hop preserves `signal_id`, `occurred_at`, `received_at`, `source`, and `schema_version` unchanged. Only `hop` is overwritten.
3. Every hop logs one structured line on entry and one on exit, both carrying `signal_id` and `hop`.
4. `classification` may be narrowed, never widened.
5. A hop that cannot process a signal logs the reason with `signal_id` and stops. It does not pass a partial payload downstream and does not substitute a default.

---

## 7. Integration matrix

Status: ⬜ not started · 🟨 in progress · ✅ verified with a real signal

| # | Producer | Consumer | Contract | Transport | Status | Owner |
|---|---|---|---|---|---|---|
| 1 | GitHub | `connectivity/connector_platform/github/` | GitHub webhook / REST | HTTPS | ⬜ | Umer |
| 2 | `connector_platform/github/` | `perception/ingestion/` | 01 | in-process | ⬜ | Umer |
| 3 | `perception/ingestion/` | `evidence/classification/` | 01 | in-process | ⬜ | Umer → Maaz |
| 4 | `evidence/classification/` | `evidence/evidence_store/` | 02 | SQL | ⬜ | Maaz → Janita |
| 5 | `evidence/evidence_store/` | `understanding/organizational/` | 05 | SQL | ⬜ | Janita → Jawad |
| 6 | `understanding/organizational/` | `runtime/orchestrator/langgraph/` | 03 | HTTP | ⬜ | Jawad → Saad |
| 7 | `runtime/orchestrator/langgraph/` | `connectivity/api/` | 03 | HTTP | ⬜ | Saad → Haroon |
| 8 | `connectivity/api/` | `executive_workspace/frontend/` | 04 | HTTP/JSON | ⬜ | Haroon → Zoya |
| — | `infrastructure/databases/` | all persisting hops | Connection + migrations | — | ⬜ | Janita, Affan |

A row moves to ✅ only when a real signal has crossed it. Passing unit tests does not move a row.

---

## 8. Environment

**Dev database:** PostgreSQL in Docker. No hosted account required. Any engineer clones the repository and starts it with one command.

**Staging database:** hosted PostgreSQL on a Horquva-owned account.

**Migrations:** live in `infrastructure/databases/`, run identically against dev and staging.

**Secrets:** never committed. Each engineer keeps their own `.env`, created from `.env.example`.

**Authentication:** T1 boundaries are unauthenticated within dev. `infrastructure/identity/` and `infrastructure/secrets/` are T3. Do not deploy T1 boundaries to staging without them.

**Delivery:** T1 is synchronous and in-process between hops. `runtime/queues/` and `runtime/messaging/` are RESERVED and are not used in T1.

Setup and run instructions are delivered with `infrastructure/databases/` and are the acceptance test for Stage 1: any engineer clones, builds, and deploys to dev by following them.

---

## 9. Current state

No capability path in §3 contains code. All eight hops in §2 are to be built.

The existing `backend/`, `frontend/`, `modules/`, `horquva_modules_py/` and `main.py` are the OBA Core MVP. They are not part of the T1 signal path and are not modified by T1 work.

---

## 10. Decisions required

| ID | Decision | Owner |
|---|---|---|
| B | For each capability the frozen tree marks T2/T3 — evidence store, provenance, extraction, belief record, component states — what the T1 version contains, and what is deferred. | Affan with each owner |
| C | Where Tanveer's graph state work lives. | Affan, Saad |
| D | Locate the locked OCOS constitution (`constitution/`, marked FROZEN — immutable) and confirm it imposes no additional contract requirements. | Affan |

**Decided:**

| Decision | Outcome |
|---|---|
| Repository | OCOS is built in this repository. The frozen tree structure is created alongside the existing OBA Core MVP. CI enforces that no new top-level directory appears outside the tree. |
| Scope | T1 only. Nothing beyond the T1 gate is built or planned in code. |
| Source connector | GitHub, per the frozen tree (`connectivity/connector_platform/github/`). Polling with a read-only token for T1; webhooks are not used. |
| Dev and staging databases | PostgreSQL in Docker for dev; hosted PostgreSQL (Supabase) for staging, connected as plain PostgreSQL rather than through the Supabase client. Migrations in `infrastructure/databases/`. The existing Supabase project is not used and its data is not migrated. |
| LangGraph transport | `runtime/orchestrator/langgraph/` runs as a separate Python service. The API layer reaches it over HTTP. |

### Coexistence with the OBA Core MVP

`backend/`, `frontend/`, `modules/`, `horquva_modules_py/`, `main.py` and `data/` are the OBA Core MVP. They are **not modified by T1 work** and are **not part of the T1 signal path**.

Where a name appears twice, the OCOS path is the one in §3. The workspace UI is `applications/executive_workspace/frontend/` — never the root `frontend/`.
