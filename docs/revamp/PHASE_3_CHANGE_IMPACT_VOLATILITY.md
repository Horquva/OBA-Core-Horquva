# PHASE 3 — Feature 3: Change→Impact, Volatility, Executive Dependency Scan

> **Objective**: Make every structural mutation leave a causal record: what changed, what it cascades into downstream (Engine A), what it does to organizational health (ΔOHI), and how fragility is trending (volatility).
> **Exit criteria**: every mutation → `dependency_change_log` row + cascade record; weekly volatility briefing live; Executive Dependency Scan endpoint served.

## 3.1 The Mutation Layer (`backend/domain/mutations.js`)

**Research grounding**: event sourcing / change-data-capture practice. Debezium (full CDC) is explicitly *future hardening* — we don't need log-based CDC while every write flows through our API. Instead: **route-level event capture** (the mutation layer is the only write API) + a **Postgres trigger backstop** that records out-of-band SQL changes (trigger functions writing `mutation_type='OUT_OF_BAND'` rows on UPDATE/DELETE of entity tables — a standard Supabase/Postgres pattern, ~50 lines of SQL).

**Design — the single write path**:
```js
applyMutation(roots, orgId, { type, entityType, entityId, payload, actor, idempotencyKey })
```
- Supported `mutation_type`s (Blueprint Feature 3): `OWNER_REMOVED`, `OWNER_ASSIGNED`, `BACKUP_LOST`, `BACKUP_ASSIGNED`, `MODEL_SWAPPED`, `DEPENDENCY_ADDED`, `DEPENDENCY_BROKEN`, `STATUS_CHANGED`, `ENTITY_CREATED`, `ENTITY_DELETED`, `OUT_OF_BAND`.
- Flow: validate (entity exists, RBAC already checked at route) → capture **before/after snapshots** of the mutated row → apply through Supabase → append `dependency_change_log` row → invalidate per-org caches → trigger `changeImpact` computation → async graph reload (1.7).
- **Idempotency**: unique index on `(org_id, idempotency_key)`; retries replay the stored result instead of double-applying (fixes the audit's missed finding on the owner PATCH).

**Schema** (`backend/sql/22_change_log.sql`):
```sql
create table dependency_change_log (
  id uuid pk, org_id uuid not null, idempotency_key text,
  mutation_type text not null, target_type text not null, target_id uuid not null,
  actor_id text, before jsonb, after jsonb,
  blast_radius_score numeric, health_delta numeric,
  impacted_entities jsonb, mitigation jsonb,
  created_at timestamptz default now());
```
+ `(org_id, created_at desc)`, `(org_id, target_type, target_id)` indexes.

**Trigger backstop**: `backend/sql/23_out_of_band_triggers.sql` — AFTER UPDATE/DELETE triggers on entity tables writing `OUT_OF_BAND` rows (before/after only; no cascade computation — those get picked up on next org scan).

**Tests**: `mutations.unit.test.js` — before/after fidelity, idempotent retry, unknown entity → `ApiError`, trigger backstop fires on direct SQL (integration test), per-org isolation.

## 3.2 Change Impact Engine (`backend/domain/changeImpact.js`)

**Design** — for a mutation event M(v) on entity v:
1. **Steady-state forward cascade**: seed Engine A at v — `r = (1−α)Mr + αe_v` (the existing `riskEngine` solver; mutation *changes the graph first*, then the walk runs on the mutated topology, so the walk measures the *new* reality).
2. **Impacted set**: workflows/tools/agents with r_w ≥ 0.15 (authored threshold, honesty table) → `impacted_entities` jsonb `{workflows:[], agents:[], tools:[], customerFacing:[]}`.
3. **ΔOHI**: `cloneRoots(roots)` (existing helper in `simulations.js`) → apply the same mutation → `pillars()` before vs after → `health_delta = OHI_before − OHI_after` (reuses the simulation engine's health math — one definition of health, per Invariant 3).
4. **Mitigation recommendation**: rule-based, generated from the engine outputs themselves (e.g. `OWNER_REMOVED` + successor exists with low `successorConcentrationAfter` → recommend named reassignment; `MODEL_SWAPPED` + vendor HHI > 2500 → recommend fallback model config). No LLM in this path — deterministic and auditable.
5. Result written back to the `dependency_change_log` row (`blast_radius_score`, `health_delta`, `impacted_entities`, `mitigation`).

**Integration**: `mutations.js` calls it inline for interactive routes (small graphs, <5ms per Engine A solve); `simulate-reassignment`/`simulate-cascade` agent tools already produce compatible envelopes — they gain the same `health_delta` field for consistency.

**Tests**: `changeImpact.unit.test.js` — ΔOHI ≤ 0 for damage-only mutations; seeded walk mass concentrated downstream of v (monotone along dependency paths); impacted threshold boundaries; recommendation determinism.

## 3.3 Longitudinal Volatility (`backend/domain/volatility.js`)

**Research grounding**: Statistical Process Control — **EWMA** (exponentially-weighted moving average) and **CUSUM** control charts (NIST/SEMATECH e-Handbook of Statistical Methods, §6.3.2) are the standard instruments for detecting drift in a rate; dynamic-graph change-point detection (arXiv:2007.01229, *Laplacian Change Point Detection for Dynamic Graphs*) supplies the academic framing for "structural churn velocity". We implement EWMA/CUSUM (closed-form, no ML dependency) over the change log — defensible, explainable, cheap.

**Design**:
- **Churn velocity**: count of material mutations per day (weighted by `|health_delta|`), EWMA-smoothed (λ=0.3, authored) over rolling 7-day and 30-day windows; CUSUM flags sustained drift above the org's own baseline mean + k·σ (k=0.5, h=5 — standard SPC settings, documented).
- **Risk trajectory**: ΔOHI series from the change log; direction split (increases vs decreases in systemic exposure) exactly as the Blueprint's Weekly Briefing specifies ("4 changes increased systemic exposure (+12.4% net risk)").
- **Weekly Executive Dependency Briefing**: `routes/briefing/briefing.js` gains the volatility section — material changes count, net risk delta, critical event (largest single ΔOHI), velocity band (LOW/MODERATE/HIGH churn), P0 recommended action (top mitigation from the window's worst event). Dashboard card on `/dashboard`.

**Tests**: `volatility.unit.test.js` — EWMA known-answer tests, CUSUM fires on sustained shift and not on single spikes, empty-log → `insufficient_evidence` per the Ironclad rule.

## 3.4 Executive Dependency Scan (`GET /api/intelligence/dependency-scan`)

The commercial wedge (Blueprint §1.3) as one composite read-only endpoint:
- SPOFs (Engine A blast radius ranked, from 1.4), concentration chokepoints (2.2), knowledge vacuums (documentation coverage gaps), recent change alerts (3.1/3.2), headline ΔOHI trend (3.3).
- Board-ready payload: every section carries `evidence` + `provenance`; `insufficient_evidence` per section when backing rows are missing (a section never silently zeros).
- Optional export hook for the 48-hour scan deliverable (JSON now; PDF later).

**Tests**: composite assembly test (each section independently stubbed insufficient → per-section nulls), auth required.

---

## Phase 3 execution order
3.1 → 3.2 (impact reads the log) → 3.3 (volatility reads the log) → 3.4 (composites everything).
