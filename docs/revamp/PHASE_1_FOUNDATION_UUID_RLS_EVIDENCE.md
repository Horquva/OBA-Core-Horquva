# PHASE 1 — Foundation: Identity, Tenancy, Evidence Integrity

> **Objective**: Fix the structural root causes every later phase depends on — ID collisions (UUID migration), absent tenancy (RLS + org scoping), the evidence-gate bypass, the two remaining legacy heuristics, the missing D-70 HTTP surface, and graph-loader fragility.
> **Exit criteria**: collision-free UUIDs end-to-end; tenant-isolated queries with RLS; honest evidence coverage; `agent-spofs` served by Engine A; `humanDependencyRisk` computed by Engine B; `POST /api/simulations/reassign` live with UI; graph loader survives transient DB failures.

## 1.1 UUID Migration

**Problem**: `agents.id`, `workflows.id`, `ai_platforms.id`, `employees.id` all use independent `SERIAL 1..N`, so node `1` is simultaneously an agent, a workflow, a platform and an employee. The frontend throws away all cross-type edges to avoid walking IDs across tables (`frontend/app/risk/page.tsx` ~47–61, `app/map/page.tsx` same fix) — the Risk Dashboard is blind to workflows, tools and platforms. Connectors would inherit the same trap immediately.

**Approach — mapping-based backfill migration** (`backend/sql/19_uuid_primary_keys.sql`), safe at current data scale (~157 nodes):

1. `create extension if not exists pgcrypto` (Supabase ships it) — `gen_random_uuid()` available.
2. Per entity table (`agents`, `workflows`, `ai_platforms`, `employees`, plus any other SERIAL-keyed entity tables found in `01_schema_migration.sql`):
   - `alter table t add column new_id uuid not null default gen_random_uuid()`;
   - persist old→new mapping into a temp `id_map_<t>(old_id int primary key, new_id uuid)`;
   - update referencing FKs through the mapping: `owners.employee_id`, `tool_ownership.(platform_id, employee_id)`, `tool_backups.primary_platform`, `workflow_runbooks.(workflow_id, owner_id)`, `agent_platform.(agent_id, platform_id)`, `workflow_tool_dependencies.(workflow_id, tool_id)`, `agents.owner_id`, `app_users.employee_id` (verify exact FK set against `backend/sql/05_foreign_keys.sql` + `06_missing_columns.sql`).
   - polymorphic edges: `dependencies.(source_id, target_id)` and `knowledge_assets.asset_id` are remapped **per `*_type` discriminator** (join `id_map_<source_type>`); rows with unknown types are surfaced in a verification report rather than silently dropped.
   - swap PK: drop old PK/default, `new_id` becomes `id`, reset dependent sequences.
3. **Code sweep** (backend): IDs become opaque strings. Audit every place that assumes numeric IDs — `dependencyIndex` keying in `derived.js`, `simulations.js` index maps, `riskEngine` graph keys, `graphLoader` entity keys, routes' `parseInt(req.params.id)` calls (grep `parseInt` across `backend/routes/`), JSON where clauses. Graph nodes become keyed `type:<uuid>` — this also retires the name-based identity problem (graph entities currently keyed by `name` via `employeeByName` etc.).
4. **Code sweep** (frontend): drop the agent-only edge filters in `app/risk/page.tsx` and `app/map/page.tsx` (the comment documenting the collision becomes obsolete); `normalize.ts` keeps stringifying IDs; the full cross-type dependency graph is restored to both pages.
5. **Seed/demo data** (`backend/sql/02_seed_data.sql`, `data/company.json`, `graphSeeder.js`): regenerated through the same mapping so the demo org stays coherent.
6. **Transition policy**: clean cutover (pre-launch, single pilot org) — no dual-read compatibility layer. One PR, backend + frontend together.

**Research/libraries**: Postgres `gen_random_uuid()`/`pgcrypto` (Supabase built-in); `crypto.randomUUID()` (Node built-in, no npm dep); UUIDv7 considered and rejected for now (time-sortability only matters for high-volume inserts; `timestamptz` columns already carry ordering).

**Integration (graphify)**: `dependencyIndex`/`atOrAbove()`-adjacent helpers in `domain/` are the single choke point most ID flows pass through (atOrAbove: 21 dependents); fixing keying in `derived.js` + `riskEngine/index.js` + `graphLoader.js` covers ~all consumers. No import cycles exist, so the sweep cannot create them.

**Tests**: new `backend/tests/uuidMigration.unit.test.js` (mapping round-trip, polymorphic remap per type, orphan detection); regression: `graph.unit.test.js`, `derived.unit.test.js`, `simulations.unit.test.js` green with string IDs; frontend risk/map pages render cross-type edges (manual + component test).

## 1.2 RLS Multi-Tenancy

**Problem**: `org` exists only on `app_users`; not one business table has `org_id`; `orgGuard.js` hard-exits (`process.exit(1)`) if >1 org exists. Marketing sells multi-tenant SaaS.

**Approach**:
1. `backend/sql/20_multi_tenancy.sql`: `orgs` table (id uuid pk, name, slug, created_at); bootstrap org inserted; `org_id uuid not null references orgs(id)` added to **every business table** (agents, workflows, ai_platforms, employees, owners, dependencies, knowledge_assets, workflow_runbooks, tool_ownership, tool_backups, agent_platform, workflow_tool_dependencies, policies, incidents, app_users.org→org_id FK, etc.); existing data assigned to the bootstrap org; replace hot single-column indexes with `(org_id, …)` composites.
2. **RLS policies (defense-in-depth)**: `alter table … enable row level security; create policy tenant_isolation using (org_id = current_setting('app.current_org', true)::uuid)`. The backend uses the service-role key (bypasses RLS), so the **primary enforcement is app-level scoping** — every Supabase query in `graphLoader.js`, `domain/derived.js:loadRoots`, and route handlers gains `eq('org_id', ctx.orgId)`; `loadRoots(supabase, orgId)` and `graphLoader` load per org. Per request, auth middleware resolves the caller's org (from `app_users`) and `set_config('app.current_org', …, true)` is applied on any direct-Postgres path.
3. **`orgGuard` rewrite**: from boot-time `process.exit(1)` to a per-request tenant resolver (`requireTenant` middleware): token ↔ org mismatch → 403; unknown org → 401. Multi-org data now *works* instead of crashing the process.
4. **Cache/graph invalidation**: the in-memory graph and `loadRoots` results become **per-org** — namespace the graph singleton (`Map<orgId, KnowledgeGraph>`) and memoized roots; `POST /api/intelligence/prediction/graph/reload` takes an org scope.
5. Every new write route (Phase 4) records `org_id` + writes `audit_log` with org context.

**Research/libraries**: Supabase RLS + custom-claim/GUC patterns (Supabase docs are the canonical implementation reference); the per-request `set_config(..., true)` transaction-local pattern from PostgreSQL docs (current_setting).

**Tests**: `backend/tests/multiTenancy.unit.test.js` — two synthetic orgs; assert cross-org reads return empty, cross-org writes rejected, token/org mismatch → 403, per-org graph cache isolation; update `orgGuard.unit.test.js`.

## 1.3 Evidence-Gate Bypass Fix

**Problem**: `frontend/lib/riskIntelligence.ts:240` — `evidenceGate(agents, () => true)` fabricates 100% evidence coverage; the Glass-Box promise breaks whenever the backing rows are missing.

**Fix**: replace with the factual predicate the gate always needed: an agent is *covered* when it has an owner row, ≥1 knowledge-asset link, and ≥1 dependency row (matching what `predictiveRisk`'s O/D/U variables actually read). Render the true coverage percentage; `UnavailableBanner` returns for genuinely under-evidenced agents. Coordinate with the backend: `predictiveRisk` already returns per-agent `evidence` states — prefer consuming those server-computed states over re-deriving client-side (single source of truth; frontend gate becomes a display of backend evidence, not a second calculator, per Invariant 3).

**Tests**: `frontend` unit test — empty-evidence agent → banner; fully-backed agent → 100% coverage; mixed population → exact percentage.

## 1.4 SPOF Route → Engine A

**Problem**: `backend/routes/dependencies.js:109` still scores agent SPOFs with unweighted BFS `cascadeReach` — ignores edge criticality, attenuation, anomaly damping; Engine A exists precisely for this and is already imported by `domain/derived.js`.

**Fix**: the route computes `riskEngine.buildEngine(roots)` once, then serves per-agent `blastRadius` (continuous 0–100) **alongside** the retained `cascadeReach` transitive count — the count stays because "largest downstream chain" is a *different true statement* (the codebase's own rationale in `derived.js` ~441). Response shape: additive fields only (`blastRadius`, `blastRadiusEvidence`), so existing consumers don't break.

**Tests**: extend `graphRoutes.test.js`/`derived.unit.test.js` — blast radius monotone in downstream criticality; criticality-weighted path outranks equally-long unweighted path; count unchanged from before.

## 1.5 `humanDependencyRisk` → Engine B Portfolio Expectation

**Problem**: `backend/domain/derived.js:589–631` adds a calibrated Bayesian mean to two crude ratios × authored constants (`WORKFLOW_EXPOSURE_SCALE = 27`, `TOOL_EXPOSURE_SCALE = 30`) — the exact heuristic pattern the rework condemned elsewhere.

**Fix**: employee risk becomes a **portfolio-level posterior from Engine B**, not a linear add:
- Per employee, aggregate their owned assets' evidence into a portfolio evidence tuple: ownership O = worst-case share of unbacked assets (portfolio-weighted), documentation D = verified-coverage-weighted, runtime S = status-weighted; upstream cascade U = Engine A org-scan exposure averaged over their asset set (already memoized in `riskEngine/index.js`).
- Extend `riskEngine/bayes.js` with `scoreEmployee(portfolioEvidence)` reusing the same 81-config CPT (no new authored tables — the same causal model, evaluated at the person level).
- Output contract preserved (`totalRiskScore`, `tier`, per-employee profile fields); delete constants 27/30; update `metricGlossary.js` definition; update `derived.unit.test.js` expectations (which currently encode the 27/30 arithmetic).
- Workflow-backup double-count guard (documented in the current code) is preserved: portfolio O reads the agent-level ownership evidence that already prices backups in.

**Tests**: monotonicity (adding an unbacked critical workflow to an employee's portfolio strictly raises their score); equity (an employee with all-backed assets cannot out-score one with none); parity spot-check against `backend/risk_engine/bbn_model.py` for the portfolio aggregation.

## 1.6 D-70 Succession Route + UI

**Problem**: `employeeLeavesWithSuccessor` (domain) + `simulateReassignment` tool exist and are tested, but no HTTP route exists; the simulation UI auto-picks the top owner across 3 hardcoded scenario buttons.

**Fix**:
- `backend/routes/simulations/reassign.js` → `POST /api/simulations/reassign` body `{ employeeId, successorId, assetFilter? }`; wraps the domain function; `requireRole(['ADMIN','OPERATOR'])`; `audit_log` entry; `ApiError` for unknown employee/successor.
- Frontend `app/simulation/page.tsx` + `components/simulation/ScenarioSandbox.tsx`: employee picker + successor picker (both populated from `/api/employees`), run comparison view: leave-only vs reassign (`residualRisk`, `assetsWithoutBackup`, `successorConcentrationAfter`, `successorBecomesSpof` already returned by the domain core).
- API client added to `lib/api.ts` via shared `request()`.

**Tests**: `simulationRoutes.test.js` extension (auth required, 404s, envelope shape); UI component test for the picker flow.

## 1.7 Graph Loader Resilience

**Problem**: boot runs 13 un-batched Supabase queries; any transient failure locks the brain at 503 until manual restart; mutations don't trigger reload (multi-instance drift acknowledged as out of scope, but single-instance staleness is fixable now).

**Fix**:
- Boot retry with exponential backoff + jitter (bounded, e.g. 5 attempts), and a Nodeshift **opossum** (1.7k★, mature) circuit breaker around `loadFromSupabase` so a down DB fails fast with a clear `source.error` instead of hanging requests.
- After any successful mutation through the (Phase 3) `mutations.js` path or the existing owner PATCH, fire an async `loadGraph()` refresh (already atomic-swap safe in `brain/index.js`); keep `POST /api/intelligence/prediction/graph/reload` for manual control.
- With 1.2, all of this becomes per-org.

**Tests**: `brain.smoke.test.js` extension — failed boot then recovery; reload-after-mutation observed; breaker opens under repeated failure and half-opens after cooldown.

---

## Phase 1 execution order
1.1 → 1.2 (both schema-level, land together) → 1.4 → 1.5 → 1.3 (frontend consumes final evidence shapes) → 1.6 → 1.7. Each step keeps `npm test` green.
