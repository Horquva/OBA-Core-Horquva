# PHASE 2 — Feature 1 (Replaceability), Feature 2 (Concentration), Spec 1 Persistence

> **Objective**: Build the two missing MVP intelligence engines (Criticality×Replaceability 2×2; multi-entity Dependency Concentration) and the Spec 1 score/evidence ledger.
> **Exit criteria**: K_i scored for every entity with glass-box evidence; multi-class HHI live with chokepoint alerts; every predictive score persisted with its proof and replayable.

## 2.1 Feature 1 — Criticality & Replaceability Engine

**Research grounding**
- **Bus factor** literature supplies the bench-depth math: arXiv:2202.01523 (*Bus Factor in Practice* — how BF behaves in real projects), arXiv:2403.08038 (*Bus Factor Explorer* — the minimal-hitter-set algorithm + tool), arXiv:2508.09828 (*Fast and Accurate Heuristics for Bus-Factor Estimation* — BF is NP-hard under the standard formalization; validated fast heuristics exist). We adopt the minimal-hitter-set heuristic, not raw backup counts.
- Criticality κ is already principled (`definitions.entityCriticality`, consumed by Engine A).

**Design — `backend/domain/replaceability.js`**

$$K_i = 0.40 \cdot S_{doc}(i) + 0.30 \cdot S_{alt}(i) + 0.30 \cdot S_{bench}(i)$$

- **S_doc ∈ [0,100]**: runbook presence (0.5) + verified knowledge-asset coverage (0.5) — reads `workflow_runbooks`, `knowledge_assets.is_documented` (same facts Engine B's D variable reads; no new tables).
- **S_alt ∈ [0,100]**: drop-in alternative availability — for tools/platforms: hot backup in `tool_backups` (100) / documented vendor alternative (partial, authored evidence rows) / none (0); for agents: commodity model family (100) vs proprietary fine-tune (authored low score); for workflows: fully-automated vs manual-tribal.
- **S_bench ∈ [0,100]**: **bus-factor heuristic** over the owner–asset bipartite graph: compute the minimal set of people whose loss leaves asset i unowned-or-unrunnable (greedy maximal-cover heuristic per arXiv:2508.09828); bench score = min(100, 50·named_backups + 25·validated cross-trained peers − penalty if i itself appears in multiple minimal hitting sets).
- Category banding: `EASY` / `MODERATE` / `DIFFICULT` / `IRREPLACEABLE` (authored thresholds, honesty table in module header).
- 2×2 quadrant assignment: criticality from Engine A blast radius + κ (high ≥ 60), replaceability K_i (high ≥ 50) → VULNERABLE_CORE / REPLACEABLE_CRITICALITY / NICHE_DEPENDENCY / COMMODITY_UTILITY.

**Integration (graphify-informed)**: exports via `domain/index.js`; consumes `loadRoots` roots + `riskEngine.buildEngine` blast radii (never re-walks the graph); every component score carries evidence rows (`sourceTable`, `rowId`, weight) per the Ironclad Evidence Rule; metric documented in `metricGlossary.js`.

**API + UI**: `GET /api/intelligence/replaceability` (`routes/intelligence/replaceability.js`, mounted in `backend/index.js`); new `ReplaceabilityMatrix` component (2×2 quadrant chart) on `frontend/app/risk/page.tsx`; client added to `lib/api.ts` via `request()`.

**Tests**: `replaceability.unit.test.js` — component decomposition (K_i changes only when its evidence changes), quadrant assignment boundaries, bench-depth heuristic matches brute force on small graphs, `insufficient_evidence` when ownership+docs+deps rows are all missing.

## 2.2 Feature 2 — Unified Dependency Concentration Engine

**Research grounding**
- **HHI** bands (1500/2500) come from the DOJ/FTC *Horizontal Merger Guidelines* — the standard concentration instrument, already specified in the Blueprint §9.2.
- Secondary metrics: **Gini coefficient** + **Shannon entropy** over the same exposure distribution (reported, not banded — they surface different shapes: HHI is dominated by top shares, Gini by spread).
- Class modeling follows the supply-chain knowledge-graph resilience framing of arXiv:2305.08506 (a KG perspective on where systemic fragility concentrates).

**Design — `backend/domain/concentration.js`**

For each class C ∈ {humans, models, vendors/platforms}:
1. **Weighted exposure** E(v) = Σ_{u∈InNeighbors(v)} κ(u)·λ(uv) — read from the Engine A weighted graph (edge strengths λ already normalized there); no private traversal.
2. **Share** s(v) = E(v)/ΣE; **HHI_C** = Σ(100·s(v))² → bands: <1500 DISTRIBUTED, 1500–2500 MODERATE, >2500 CRITICAL_CHOKEPOINT.
3. **Chokepoint alerts**: nodes with E(v) > τ (authored, honesty table) AND zero backups/alternates → typed alerts (KEY_PERSON / MODEL_CHOKEPOINT / VENDOR_CHOKEPOINT) with evidence rows.

**Silo deprecation map** (the four fragmented heuristics get absorbed, then deleted):
| Silo | Today | Becomes |
|---|---|---|
| `routes/ownership.js:78` | `agentCount >= 4 → 'high'` | reads HHI_humans + KEY_PERSON alerts |
| `routes/decisionIntelligence.js:64` | `PENALTY_CONCENTRATION = 20` | reads chokepoint alert severity |
| `routes/knowledge/intelligence.js:105` | HHI over knowledge_assets only | delegates to unified engine (knowledge class) |
| `routes/accountability/accountability.js:158` | RACI link counts | RACI counts stay (different question) but its "concentration" framing delegates |

**API + UI**: `GET /api/intelligence/concentration` returning per-class `{hhi, band, gini, entropy, topNodes[], alerts[]}`; dashboard cards (`Model & Vendor Chokepoint`, `Key-Person Chokepoint`) on `frontend/app/dashboard/page.tsx`; metric glossary entries.

**Tests**: `concentration.unit.test.js` — HHI edge cases (single node = 10000; uniform N nodes = 10000/N), monotonicity (merging two nodes' exposure raises HHI), alert firing requires zero-backup condition, evidence rows present on every alert.

## 2.3 Spec 1 — Score History & Evidence Ledger

**Schema** (`backend/sql/21_score_history.sql` — number assigned after Phase 1's 22/23):
```sql
create table score_history (
  id uuid pk default gen_random_uuid(), org_id uuid not null,
  entity_type text not null, entity_id uuid not null,
  score numeric, threat_level text, model_version text not null,
  recorded_at timestamptz not null default now());
create table evidence_records (
  id uuid pk default gen_random_uuid(), org_id uuid not null,
  score_history_id uuid references score_history(id),
  fact text not null, source_table text not null,
  source_row_id text, weight numeric,
  verified boolean not null default true);
```
+ `(org_id, entity_type, entity_id, recorded_at desc)` index; nightly retention (e.g. keep 180 days) via `pg_cron` if enabled, else documented manual job.

**Wiring**: `predictiveRisk()` and the Phase 2 engines return envelopes; a `persistScoreRun()` helper (domain layer, best-effort with audit-log fallback note) writes the ledger after each org scan — never blocking or failing the read path (persistence failure → logged + surfaced in `provenance`, scores still served from calculation per Invariant 1).

**Tests**: ledger round-trip (score + exact evidence rows retrievable), replay (recomputing from stored evidence reproduces the score), RLS isolation, best-effort failure path doesn't 500 the read route.

---

## Phase 2 execution order
2.2 → 2.1 (replaceability's quadrant uses Engine A criticality and benefits from concentration's evidence plumbing) → 2.3 (persists all three engines' outputs).
