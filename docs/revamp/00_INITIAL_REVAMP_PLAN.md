# OBA CORE REVAMP — INITIAL ENGINEERING PLAN (PLAN OF RECORD)

> **Status**: Approved plan of record for the internal-feature completion build-out.
> **Supersedes**: the 30-day roadmap in `docs/EXPANDED_SYSTEM_AUDIT_AND_REVERSE_ENGINEERING.md` §8 (updated for verified current state).
> **Goal**: Complete every claimed feature with real (non-heuristic, non-skeleton) engineering, then leave the codebase ready for connector infrastructure (Jira, GitHub, Slack, Zapier, n8n, Agentforce, HR/Workday).
> **Date**: 2026-09-26

---

## 1. Verified Current State (Delta vs. the Audit)

The audit doc predates the (uncommitted) risk-engine rework. Verified state of the working tree:

### Already done (uncommitted — Phase 0 lands it)
| Item | Where |
|---|---|
| Engine A: eIRWR random walk (arXiv:2608.08073) | `backend/domain/riskEngine/eirwr.js` |
| Engine B: discrete BBN, 81-config CPT, counterfactual attribution | `backend/domain/riskEngine/bayes.js` |
| Two-engine pipeline wired into predictive risk | `backend/domain/derived.js:predictiveRisk` (~line 420) |
| Context builder, evidence extraction, acyclic org-scan seeds | `backend/domain/riskEngine/index.js` |
| Python reference + parity/benchmark suite (pgmpy/scipy) | `backend/risk_engine/` |
| D-70 succession core: `employeeLeavesWithSuccessor` | `backend/domain/simulations.js:248` |
| Tests: `riskEngine.unit.test.js`, `simulationsReassign.unit.test.js`, `simulateReassignment.unit.test.js` | `backend/tests/` |
| `audit_log` table + RLS + helper | `backend/sql/17_audit_log.sql` |

### Still open (the work of Phases 1–4)
| # | Gap | Verified location |
|---|---|---|
| 1 | `humanDependencyRisk` linear heuristic constants 27/30 | `backend/domain/derived.js:589–631` |
| 2 | `agent-spofs` route uses unweighted BFS `cascadeReach` | `backend/routes/dependencies.js:109` |
| 3 | Frontend evidence-gate bypass `evidenceGate(agents, () => true)` | `frontend/lib/riskIntelligence.ts:240` |
| 4 | Risk page/map page filter to agent–agent edges only (ID-collision workaround) | `frontend/app/risk/page.tsx`, `frontend/app/map/page.tsx` |
| 5 | No `POST /api/simulations/reassign` route; simulation UI is 3 hardcoded buttons | `backend/routes/simulations/`, `frontend/app/simulation/page.tsx` |
| 6 | Replaceability Index: 0% built | — |
| 7 | Unified multi-entity Concentration engine: absent (HHI only over `knowledge_assets`) | `backend/routes/knowledge/intelligence.js:105` |
| 8 | Change→Impact + Longitudinal Volatility: 0% (no change log, no diff, no ΔOHI) | — |
| 9 | Spec 1 persistence: no `score_history` / `evidence_records` tables | — |
| 10 | API 98% read-only: exactly one domain write route (`PATCH /api/agents/:id/owner`) | `backend/routes/agents.js:119` |
| 11 | No ingestion staging (`raw_vendor_payloads`, `identity_bridge`), no webhook receiver | — |
| 12 | No prompt caching; volatile per-turn block inside `systemInstruction` | `backend/agent/loop.js:105–142` |
| 13 | SERIAL ID space collisions across entity tables (root cause of #4) | `backend/sql/01_schema_migration.sql` |
| 14 | Zero multi-tenancy (`org` only on `app_users`; `orgGuard` exits if >1 org) | `backend/lib/orgGuard.js` |
| 15 | Graph singleton frozen at boot, name-keyed identity, boot race → 503 until restart | `backend/brain/index.js`, `backend/brain/knowledge/graphLoader.js` |

---

## 2. User-Confirmed Architectural Decisions

1. **Full UUID migration** — migrate entity tables to UUID primary keys (root-cause fix for ID collisions), not a layer-2 workaround.
2. **Land the pending risk-engine rework as a PR first** — Phase 0, before any new work.
3. **Include RLS multi-tenancy in this build-out** — not deferred.

---

## 3. Integration Contract (how every new module connects)

Derived from the graphify knowledge graph (2,985 nodes / 5,181 edges / 193 communities, **zero import cycles**) plus direct code reading:

- **Domain reception desk**: new engines live in `backend/domain/`, exported through `backend/domain/index.js`, consume the `loadRoots` roots bundle (Door 2), and reuse `definitions.js` helpers — `entityCriticality` (κ weights) and `atOrAbove()` (21 dependents; never invent criticality comparisons). All graph/topology quantities come from `riskEngine.buildEngine(roots)` — never a private adjacency walk.
- **Routes**: mounted in `backend/index.js` under the existing prefixes (`/api/intelligence/*`, `/api/simulations/*`, new `/api/ingest/*`). Shared error contract `ApiError` (31 dependents). RBAC via `requireRole`/`requireAdmin`; every state mutation writes `audit_log`.
- **Frontend**: API clients in `frontend/lib/api.ts` via the shared `request()` helper (42 dependents); every new metric is documented in `backend/domain/metricGlossary.js`; pages/components under `frontend/app/`, `frontend/components/`.
- **Evidence**: every score ships a glass-box envelope (`evidence` + `provenance()` helpers in `derived.js`); `insufficient_evidence` + `null` score when backing rows are missing — no exceptions.
- **Tests**: `backend/tests/<module>.unit.test.js` registered in `backend/tests/run-all.js`; mathematical parity ground truth in `backend/risk_engine/` (Python).

---

## 4. Phase Overview

| Phase | Theme | Key outputs |
|---|---|---|
| **0** | Land pending work | Risk-engine rework committed + PR; suites green |
| **1** | Foundation | UUID PKs everywhere; RLS multi-tenancy; evidence-gate fix; Engine A SPOF route; Engine B human risk; D-70 route + UI; graph loader resilience |
| **2** | Features 1 & 2 + Spec 1 | Replaceability engine (K_i, 2×2 matrix); unified Concentration engine (multi-class HHI); `score_history` + `evidence_records` |
| **3** | Feature 3 + Volatility | `mutations.js` single write path; `dependency_change_log`; `changeImpact.js` (seeded eIRWR + ΔOHI); `volatility.js` (EWMA/CUSUM); Executive Dependency Scan |
| **4** | Ingestion staging | `raw_vendor_payloads` + `identity_bridge`; CRUD + RBAC + idempotency; HMAC webhook receiver; CSV importer; agent prompt caching |

Per-phase briefs: `PHASE_0_LAND_PENDING_WORK.md` … `PHASE_4_INGESTION_STAGING.md`.
Research index (papers/repos/libraries): `RESEARCH_INDEX.md`.

---

## 5. Verification Strategy

- Backend `npm test` (51+ suites) green after every phase; Python parity suite `python backend/risk_engine/test_risk_engines.py` green.
- **Monotonicity property tests** (new): adding a backup lowers P(Critical); increasing concentration raises HHI; removing an owner yields ΔOHI ≤ 0 for damage-only events; evidence coverage ≤ 100% always.
- UUID/RLS regression: cross-org reads/writes denied; no numeric IDs leak into API responses.
- API smoke: `/api/predictive-risk`, `/api/simulations/reassign`, `/api/intelligence/replaceability`, `/api/intelligence/concentration`, `/api/intelligence/dependency-scan`, `/api/ingest/webhook/:source` dry-runs.
- Graphify re-run after Phases 1 and 4 to verify the refactor blast radius (expect: no import cycles remain, domain fan-out grows along the reception desk, not around it).

---

## 6. Out of Scope (documented, deferred)

- **Connector adapters themselves** (Jira/Slack/GitHub/Zapier/n8n/Agentforce pull & push workers) — next engagement, after staging lands. This plan delivers the staging they plug into.
- **Redis rate limiting** — single-instance deployment; `node-rate-limiter-flexible` with a Postgres store is available if scaling starts.
- **Continuous CDC (Debezium-style)** — route-level capture via `mutations.js` suffices while all writes flow through the API; Postgres trigger backstop covers out-of-band SQL.
- **Splitting the polymorphic `dependencies` table** into typed edge tables — UUIDs + mutation-layer cleanup remove the acute orphaning pain; schema split is a later hardening.

---

## 7. Execution Notes

- Background/parallel agents fail in this environment — run strictly one at a time, or not at all.
- Branch `ocos/develop`; PRs target `main` per repo convention.
- Authored constants (weights, thresholds, bands) get honesty-table documentation in each engine module, following the precedent in `backend/domain/riskEngine/bayes.js` and `docs/risk_engine_research/`.
