# HORQUVA OBA CORE — COMPREHENSIVE SYSTEM AUDIT & REVERSE-ENGINEERING REPORT

> **Scope**: Full 360-degree forensic analysis of the Horquva OBA Core codebase (`D:\OBA-Core-Horqu`), evaluating the completed architecture revamp (Phases 0–4, PR #199, and branch `feat/uuid-primary-keys` through commit `538e573`).
> **Audit Modalities**: Reverse-Engineering (`/reverse-engineer`), Code Review (`/code-reviewer`), Knowledge Graph Analysis (`/graphify`), DevSecOps Security Audit (`/security-auditor`), and Vibe-Code Structural Analysis (`/vibe-code-auditor`).
> **Date**: 2026-09-28
> **Branch**: `feat/uuid-primary-keys` (HEAD: `538e573`)
> **Sign-Off Posture**: Objective evaluation with exact reproduction details, empirical benchmarks, and production-ready remediation diffs.

---

## 1. Executive Verdict & System Health Scorecard

The revamp of Horquva OBA Core successfully transitions the platform from a fragile, 98% read-only prototype with hardcoded linear heuristics into a hardened, mathematically grounded organizational intelligence system. 

### Key Accomplishments Verified
1. **Mathematical Grounding**: Replaced arbitrary linear scoring constants (such as `27` and `30` in `humanDependencyRisk`) with published, peer-reviewed engines:
   - **Engine A**: Enhanced Iterative Random Walk with Restart (eIRWR, [arXiv:2608.08073](https://arxiv.org/abs/2608.08073)) for root-cause exposure.
   - **Transposed Personalized PageRank**: Personalized PageRank on the inverted, $\lambda$-weighted topology (`impactPagerank.js`) for blast-radius impact and victim cascades.
   - **Engine B**: Discrete Bayesian Belief Network with an 81-configuration CPT ([arXiv:0906.3968](https://arxiv.org/abs/0906.3968), [arXiv:2505.06281](https://arxiv.org/abs/2505.06281)).
2. **Identity & Collision-Free Graph**: Resolved serial integer collisions across disparate entity tables (`agents`, `workflows`, `ai_platforms`, `employees`, `systems`, `external_entities`) by migrating to UUID primary keys (`backend/sql/19_uuid_primary_keys.sql`).
3. **Three-Layer Multi-Tenancy**: Implemented tenant isolation via `org_id` foreign keys on 58 tables, Row-Level Security (RLS) policies on 58 business tables, and `AsyncLocalStorage` request-scoped tenant resolution (`backend/lib/tenant.js`) that fails closed.
4. **Single Write Gateway**: Created `backend/domain/mutations.js`, channeling all 23 write endpoints through an idempotent, audited path that records mutations to `dependency_change_log` (`backend/sql/22_change_log.sql`) and evaluates $\Delta\text{OHI}$ and downstream cascade impact (`backend/domain/changeImpact.js`).
5. **Connector Ingestion Runway**: Built raw payload staging (`backend/sql/24_ingestion_staging.sql`), HMAC-verified webhook ingestion (supporting GitHub, Slack, and Standard Webhooks), CSV roster import, and identity bridging.
6. **Provider Prompt Caching**: Separated static constitution prefixes from dynamic message suffixes in `backend/agent/loop.js`, enabling context caching across Gemini and Anthropic.

### Automated Verification Status
- **Backend Unit & Integration Suite**: **1,169 automated checks across 51 suites passed (0 failures)** (`node backend/tests/run-all.js`).
- **Mathematical & Scientific Parity**: **243/243 CPT tensor entries exact match between Python (`pgmpy`) and JavaScript (`bayes.js`) to $2.78 \times 10^{-17}$**; power iteration parity $0.00$ (`python backend/risk_engine/test_risk_engines.py`).
- **Whole-App Smoke Harness**: **24 out of 24 routes passed** (`node backend/risk_engine/audit_smoke_harness.js`).
- **Next.js Frontend Build**: **24 out of 24 routes prerendered cleanly** with 0 TypeScript or lint errors (`npm run build` in `frontend/`).
- **Database Static Schema Validator**: 70 declared tables analyzed, 60 active tables verified, 0 foreign key type mismatches.

---

## 2. Comparative Codebase Metrics

A direct comparison across the three architectural epochs of the repository:

| Metric | Layer 1: Heuristics (`1aa0828`) | Layer 2: Engines (PR #199) | Layer 3: Revamp (`538e573`) |
|---|---|---|---|
| **Domain & Lib LOC** | 3,992 | 4,766 (+19%) | **6,502 (+36% over L2)** |
| **Routes LOC** | 9,316 | 9,336 | **10,145 (+8.6%)** |
| **Total Write Endpoints** | 10 | 10 | **23** |
| **Graph-Mutating Endpoints** | 1 (owner `PATCH`) | 1 | **12 (via `mutations.js`) + 2 staging** |
| **Test Suites / Total Checks** | 45 / ~900 | 46 / ~920 | **51 suites / 1,169 checks (100% green)** |
| **Database Schema** | 42 tables, SERIAL PKs, 0 orgs, 0 RLS | Same | **60 active tables, UUID PKs, 58 with `org_id`, 58 with RLS** |
| **Risk Calculation** | Linear table (35/30/27/18/25) + BFS | Engine A/B (isolated) | **Engine A/B + Transposed PPR wired everywhere** |
| **Change Capture** | None | None | **`dependency_change_log` + DB triggers + Score Ledger** |
| **Ingestion Infrastructure**| None | None | **Staging + Identity Bridge + Webhook Receiver** |

---

## 3. Forensic Database & Migration Audit

Our automated migration analyzer ([backend/risk_engine/audit_db_migrations.js](file:///d:/OBA-Core-Horqu/backend/risk_engine/audit_db_migrations.js)) parsed and cross-validated all 27 migration files in [backend/sql/](file:///d:/OBA-Core-Horqu/backend/sql/).

### 3.1 Migration Execution Order Vulnerability (`auth_schema.sql`)
> **Severity**: **HIGH** (Deployment-breaking on clean database installs)  
> **Affected File**: [backend/run_migrations.js](file:///d:/OBA-Core-Horqu/backend/run_migrations.js#L29-L42), [backend/sql/auth_schema.sql](file:///d:/OBA-Core-Horqu/backend/sql/auth_schema.sql)

- **The Defect**: `run_migrations.js` discovers migration files via:
  ```javascript
  fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  ```
  In standard alphabetical sorting, `auth_schema.sql` sorts **after** all numbered migrations (`01_...` through `24_...`).
- **The Failure Mode**:
  1. `12_consolidate_single_tenant.sql` executes at index 12 and runs:
     ```sql
     update public.app_users set org = 'horquva' where org <> 'horquva';
     ```
  2. `20_multi_tenancy.sql` executes at index 20 and runs:
     ```sql
     alter table public.app_users add column if not exists org_id uuid references public.orgs(id);
     alter table public.app_users enable row level security;
     create policy tenant_isolation on public.app_users ...;
     ```
  3. On a fresh, empty Postgres database, `app_users` **does not exist yet** because `auth_schema.sql` has not run. Both migration 12 and migration 20 will abort with:
     ```text
     ERROR: relation "public.app_users" does not exist
     ```
- **Historical Context**: In development, `auth_schema.sql` was pasted manually into the Supabase SQL editor before running migrations. In CI/CD or automated staging provisioning, `node run_migrations.js` will fail.
- **Recommended Remediation**: Rename `backend/sql/auth_schema.sql` to `backend/sql/00_auth_schema.sql` or update `migrationFiles()` in [backend/run_migrations.js](file:///d:/OBA-Core-Horqu/backend/run_migrations.js#L29-L42) to explicitly load `auth_schema.sql` prior to numbered migrations.

### 3.2 UUID Primary Key Twin-Swap Validation (`sql/19_uuid_primary_keys.sql`)
> **Status**: **VERIFIED COMPLETE & CONSISTENT**

- All 6 entity tables (`employees`, `ai_platforms`, `agents`, `workflows`, `systems`, `external_entities`) properly instantiate `new_id uuid default gen_random_uuid()`.
- Twin referencing columns across all foreign key tables are populated via indexed joins against old integer IDs.
- Polymorphic joins on `dependencies.(source_id, target_id)` and `knowledge_assets.asset_id` accurately map across `source_type`/`target_type` and `asset_type`.
- Foreign key constraints are dropped dynamically from `pg_constraint`, preventing constraint violation lockups.
- Primary key constraints are cleanly swapped, and legacy serial sequences (`employees_id_seq`, etc.) are dropped.
- Foreign keys are re-declared against UUID targets using the PostgREST-compliant constraint naming convention (`<table>_<column>_fkey`).

### 3.3 Multi-Tenancy & Row-Level Security (`sql/20_multi_tenancy.sql`)
> **Status**: **VERIFIED COMPLETE (58/58 tables)**

- Bootstrap organization `00000000-0000-4000-8000-000000000001` (`horquva`) provides deterministic idempotency.
- All 58 active business tables have `org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id)`.
- The dynamic PL/pgSQL DO block enables RLS and creates policy `tenant_isolation using (org_id = current_setting('app.current_org', true)::uuid)` on all 58 tables.
- `app_users` table is hardened with RLS and permissions revoked from `anon` and `authenticated` roles (`sql/20` lines 184–188).
- Composite indexes `(org_id, ...)` are established across all tables.

### 3.4 Append-Only Tables & Trigger Backstops (`sql/21` – `sql/24`)
- **`score_history` & `evidence_records` (`sql/21`)**: Append-only audit ledger with RLS.
- **`dependency_change_log` (`sql/22`)**: Unique constraint on `(org_id, idempotency_key)` guarantees exactly-once mutation semantics.
- **`trg_out_of_band` (`sql/23`)**: PL/pgSQL dynamic trigger attached to all 12 core tables catches direct SQL updates/deletions and logs them with `mutation_type = 'OUT_OF_BAND'`.
- **`raw_vendor_payloads` & `identity_bridge` (`sql/24`)**: Complete staging schema with unique constraint on `(org_id, external_system, external_user_id)`.

---

## 4. Mathematical & Scientific Engine Audit

### 4.1 Resolution of Defect F-1 (Transposed Personalized PageRank)
- **Defect**: In previous iterations, `blastRadius()` erroneously invoked `eirwr.js` (Engine A). Because eIRWR scales transitions by belief column $C$ to trace root causes *upstream*, passing a hub node resulted in mass collapsing at the seed ($0/100$), whereas a pure leaf node with 0 dependents scored $100/100$.
- **Resolution**: [backend/domain/riskEngine/impactPagerank.js](file:///d:/OBA-Core-Horqu/backend/domain/riskEngine/impactPagerank.js) implements Personalized PageRank with restart on the **transposed, row-normalized, $\lambda$-weighted dependency graph**:
  $$r = (1 - \alpha) \cdot M^T \cdot r + \alpha \cdot e_{seed}$$
  where $\alpha = 0.15$ and convergence tolerance $\epsilon = 10^{-6}$.
- **Normalization**: Rather than raw unnormalized mass (which clamps at 100 for any hub), blast radius computes **failure-mass-weighted average criticality of the downstream estate**:
  $$\text{blastRadius}(v) = \frac{\sum_{j \neq v} r_j \cdot \kappa_j}{\sum_{j \neq v} r_j} \times 100$$
- **Verification**: In `benchmark_layered_comparison.js`:
  - Hub with 2 critical dependents: **56 / 100**
  - Spoke with 0 dependents: **0.0 / 100**
  - Edge sensitivity: Weakening workflow edge strength ($95 \to 20$) smoothly shifts hub blast radius ($56 \to 47$).

### 4.2 Engine B (Discrete Bayesian Network & Portfolio Posteriors)
- **Axiomatic Grounding**: Implemented in [backend/domain/riskEngine/bayes.js](file:///d:/OBA-Core-Horqu/backend/domain/riskEngine/bayes.js) based on ordered-logit conditional probability distributions over four evidence variables:
  - $O \in \{0, 1, 2\}$: Ownership (Unowned, Single Owner, Owner + Backup)
  - $D \in \{0, 1, 2\}$: Documentation (Undocumented, Partial, Documented)
  - $S \in \{0, 1, 2\}$: Runtime State (Failed, Inactive, Active)
  - $U \in \{0, 1, 2\}$: Upstream Cascade Distress (Severe, Elevated, Protected)
- **Non-Linear Compounding**:
  - Unowned ($O=0$) + Undocumented ($D=0$): Compounding posterior score of **92** ($P(\text{Critical}) = 0.88$), eliminating the flawed linear arithmetic ($35 + 18 = 53$) of legacy heuristics.
- **Portfolio Expectation**: [backend/domain/riskEngine/index.js](file:///d:/OBA-Core-Horqu/backend/domain/riskEngine/index.js#L140-L249) computes `scoreEmployee` over an individual's asset portfolio using the same 81-config CPT, eliminating legacy scaling constants `27` and `30`.

### 4.3 Replaceability Engine ($K_i$)
- Implemented in [backend/domain/replaceability.js](file:///d:/OBA-Core-Horqu/backend/domain/replaceability.js):
  $$K_i = 0.40 \cdot S_{doc}(i) + 0.30 \cdot S_{alt}(i) + 0.30 \cdot S_{bench}(i)$$
- Bench score $S_{bench}$ accurately applies the minimal-hitter bus-factor heuristic ([arXiv:2508.09828](https://arxiv.org/abs/2508.09828)). If an asset has no owner, $S_{bench} = 0$, preventing bench score inflation.
- 2×2 quadrant mapping combines Engine A downstream blast radius with $K_i$:
  - `VULNERABLE_CORE`: High Criticality ($\ge 60$) & Low Replaceability ($< 50$)
  - `REPLACEABLE_CRITICALITY`: High Criticality ($\ge 60$) & High Replaceability ($\ge 50$)
  - `NICHE_DEPENDENCY`: Low Criticality ($< 60$) & Low Replaceability ($< 50$)
  - `COMMODITY_UTILITY`: Low Criticality ($< 60$) & High Replaceability ($\ge 50$)

### 4.4 Unified Concentration Engine
- Implemented in [backend/domain/concentration.js](file:///d:/OBA-Core-Horqu/backend/domain/concentration.js):
  - Evaluates Herfindahl-Hirschman Index ($\text{HHI} = \sum (100 \cdot s_i)^2$) across humans, models, and vendor platforms.
  - Aligned with DOJ/FTC Horizontal Merger Guidelines: `< 1500` DISTRIBUTED, `1500–2500` MODERATE, `> 2500` CRITICAL_CHOKEPOINT.
  - Computes complementary Gini coefficient and normalized Shannon entropy ($H / \log_2 N$).
  - Fires chokepoint alerts when entity exposure exceeds 25% with zero backups.

---

## 5. Security & DevSecOps Audit

### 5.1 Express Webhook Mounting Order (Resolution of F-2)
- In [backend/index.js](file:///d:/OBA-Core-Horqu/backend/index.js#L54-L62), `/api/ingest` mounts **before** `app.use(express.json())`.
- Handlers in [backend/routes/ingest/webhook.js](file:///d:/OBA-Core-Horqu/backend/routes/ingest/webhook.js) maintain raw payload byte streams (`express.raw()`), ensuring cryptographic HMAC signatures verify accurately across GitHub, Slack, and Standard Webhooks.
- Signature checking uses `crypto.timingSafeEqual` with byte-length validation, preventing timing side-channel attacks.

### 5.2 Multi-Tenancy Scoping Gaps in Secondary Logging Routes
> **Severity**: **MEDIUM** (Tenant cross-pollution in non-critical log tables)  
> **Affected Files**:
> - [backend/routes/voice/voice.js](file:///d:/OBA-Core-Horqu/backend/routes/voice/voice.js#L417)
> - [backend/routes/executive/executive.js](file:///d:/OBA-Core-Horqu/backend/routes/executive/executive.js#L300)
> - [backend/routes/briefing/briefing.js](file:///d:/OBA-Core-Horqu/backend/routes/briefing/briefing.js#L182)
> - [backend/routes/knowledge/gaps.js](file:///d:/OBA-Core-Horqu/backend/routes/knowledge/gaps.js#L11)

- **The Issue**: When `20_multi_tenancy.sql` added `org_id` to `voice_history`, `executive_sessions`, and `executive_briefings`, it set `default '00000000-0000-4000-8000-000000000001'` (the bootstrap org).
- In `routes/voice/voice.js` line 417, `routes/executive/executive.js` line 300, and `routes/briefing/briefing.js` line 182, rows are inserted without supplying `org_id: currentOrgId()`. Consequently, for any secondary tenant, voice queries, executive chat sessions, and cached briefing summaries are saved under the bootstrap tenant (`horquva`).
- In [backend/routes/knowledge/gaps.js](file:///d:/OBA-Core-Horqu/backend/routes/knowledge/gaps.js#L11), the `fetchByIds()` helper queries `agents`, `workflows`, and `ai_platforms` using `supabase.from(table).select(cols).in('id', ids)` directly without `applyOrgScope()`.
- **Recommended Remediation**: Provide `org_id: currentOrgId() || undefined` on inserts and wrap `fetchByIds()` in `applyOrgScope()`.

### 5.3 RBAC & Write Surface Protection
- All 12 CRUD routes in [backend/routes/crud/crud.js](file:///d:/OBA-Core-Horqu/backend/routes/crud/crud.js#L19) and succession route [backend/routes/simulations/reassign.js](file:///d:/OBA-Core-Horqu/backend/routes/simulations/reassign.js#L27) enforce `requireRole('admin', 'executive')`.
- Member roles receive an HTTP 403 Forbidden with structured reason logging in `audit_log`.
- All writes honor `Idempotency-Key` headers, replaying prior results on duplicate submissions.

---

## 6. 7-Dimension Vibe-Code & Architecture Audit

### 6.1 Architecture & Design
- **Separation of Concerns**: Clean boundaries between HTTP layer (`routes/`), business domain logic (`domain/`), and database clients (`supabase.js`, `lib/tenant.js`).
- **No Import Cycles**: Graphify confirms 0 circular dependencies across the entire 2,985-node graph.

### 6.2 Consistency & Maintainability
- Consistent usage of `applyMutation()` as the single write path.
- Minor code redundancy: [backend/domain/riskEngine/impactPagerank.js](file:///d:/OBA-Core-Horqu/backend/domain/riskEngine/impactPagerank.js#L84-L85) contains a redundant `if (rowIdx[i] === undefined)` check.

### 6.3 Robustness & Error Handling
- Fail-closed tenant resolution: Unknown orgs yield HTTP 403; transient DB errors yield HTTP 503 instead of falling open.
- Score ledger writes are non-blocking and best-effort; database hiccups do not fail risk queries.

### 6.4 Production Risks
- In-memory rate limiting in `routes/ingest/webhook.js`: Sufficient for single-instance deployments, but needs Redis (`node-rate-limiter-flexible`) if horizontally scaled.
- `run_migrations.js` execution order on fresh databases (detailed in §3.1).

### 6.5 Security & Safety
- Parameterized Supabase queries prevent SQL injection.
- Security headers (HSTS, CSP, X-Content-Type-Options) applied globally before CORS evaluation.

### 6.6 Dead / Inert Code
- **Weekly CUSUM Drift ($h=5$)**: In [backend/domain/volatility.js](file:///d:/OBA-Core-Horqu/backend/domain/volatility.js#L52), evaluating a 7-day window results in a 3-day baseline and 4-day monitored series. Reaching a cumulative threshold of $h=5$ is mathematically impossible across 4 observations. The 30-day window is statistically sound.

### 6.7 Technical Debt Hotspots
- `routes/intelligence/dependencyScan.js` re-derives agent SPOF ranking inline (~15 lines) rather than delegating to the unified SPOF calculation.

---

## 7. Concrete Remediation Backlog

### Finding 1 [HIGH]: Fix Migration Ordering in `run_migrations.js`
Ensure `auth_schema.sql` runs before numbered migrations to avoid `relation "public.app_users" does not exist` errors on fresh databases.

```diff
--- a/backend/run_migrations.js
+++ b/backend/run_migrations.js
@@ -32,6 +32,9 @@ function migrationFiles() {
   const root = path.join(__dirname, 'schema.sql')
   if (fs.existsSync(root)) files.push({ name: 'schema.sql', path: root })
 
+  const authSchema = path.join(__dirname, 'sql', 'auth_schema.sql')
+  if (fs.existsSync(authSchema)) files.push({ name: 'auth_schema.sql', path: authSchema })
+
   const dir = path.join(__dirname, 'sql')
   if (fs.existsSync(dir)) {
-    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
+    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql') && f !== 'auth_schema.sql').sort()) {
       files.push({ name: f, path: path.join(dir, f) })
     }
   }
```

---

### Finding 2 [MEDIUM]: Bind `org_id` on Secondary Logging Inserts
Prevent voice history, executive sessions, and briefing caches from defaulting to the bootstrap tenant.

```diff
--- a/backend/routes/voice/voice.js
+++ b/backend/routes/voice/voice.js
@@ -3,6 +3,7 @@ const router = express.Router()
 const supabase = require('../../supabase')
-const { applyOrgScope } = require('../../lib/tenant')
+const { applyOrgScope, currentOrgId } = require('../../lib/tenant')
@@ -417,6 +418,7 @@ async function logHistory(query, r) {
   try {
     await supabase.from('voice_history').insert({
+      org_id: currentOrgId() || undefined,
       query,
       detected_intent: r.intent,
```

```diff
--- a/backend/routes/executive/executive.js
+++ b/backend/routes/executive/executive.js
@@ -6,6 +6,7 @@ const router = express.Router()
 const supabase = require('../../supabase')
-const { applyOrgScope } = require('../../lib/tenant')
+const { applyOrgScope, currentOrgId } = require('../../lib/tenant')
@@ -300,6 +301,7 @@ router.post('/session', async (req, res) => {
     const { error: logError } = await supabase.from('executive_sessions').insert({
+      org_id: currentOrgId() || undefined,
       question,
       question_type: questionType,
```

```diff
--- a/backend/routes/briefing/briefing.js
+++ b/backend/routes/briefing/briefing.js
@@ -6,6 +6,7 @@ const router = express.Router()
 const supabase = require('../../supabase')
-const { applyOrgScope } = require('../../lib/tenant')
+const { applyOrgScope, currentOrgId } = require('../../lib/tenant')
@@ -182,6 +183,7 @@ router.get('/', async (req, res) => {
-    const { error: cacheError } = await supabase.from('executive_briefings').insert(briefing)
+    const { error: cacheError } = await supabase.from('executive_briefings').insert({ ...briefing, org_id: currentOrgId() || undefined })
```

---

### Finding 3 [MEDIUM]: Scope Sub-lookups in `routes/knowledge/gaps.js`
Ensure sub-entity queries enforce tenant scoping.

```diff
--- a/backend/routes/knowledge/gaps.js
+++ b/backend/routes/knowledge/gaps.js
@@ -10,7 +10,7 @@ const { must } = require('../../lib/supabaseQuery')
 const fetchByIds = (table, cols, ids) =>
-  ids.length ? must(table, supabase.from(table).select(cols).in('id', ids)) : Promise.resolve([])
+  ids.length ? must(table, applyOrgScope(supabase.from(table).select(cols)).in('id', ids)) : Promise.resolve([])
```

---

### Finding 4 [LOW]: Clean Up Redundant Check in `impactPagerank.js`
Remove dead line in row normalization loop.

```diff
--- a/backend/domain/riskEngine/impactPagerank.js
+++ b/backend/domain/riskEngine/impactPagerank.js
@@ -83,5 +83,4 @@ function build(edges) {
   }
   for (let i = 0; i < n; i++) {
-    if (rowIdx[i] === undefined) { rowIdx[i] = []; rowVal[i] = [] }
     const sum = rowVal[i].reduce((a, b) => a + b, 0)
```

---

## 8. Verification & Sign-Off

All tests and verification instruments have been executed and passed without regressions:
1. **Automated Unit & Integration**: 1,169/1,169 checks passed.
2. **Mathematical Ground Truth**: Python BBN & eIRWR parity confirmed (max diff $< 10^{-16}$).
3. **Application Smoke Harness**: 24/24 routes verified end-to-end.
4. **Frontend Production Build**: 24/24 Next.js routes prerendered cleanly.
5. **Static Database Migration Validator**: 60 active tables verified.

*Audit Report Complete. All findings documented with actionable remediations.*
