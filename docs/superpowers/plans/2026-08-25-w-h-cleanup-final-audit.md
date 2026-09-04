# W-H: Cleanup & Final Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop the 5 DROP-list tables plus the 2 dead route files that turn out to depend on 2 of them (D-09b), close F-I by removing the one genuinely-dead duplicate-edge query while documenting the one genuinely-used one, and fix the 2 real bugs the endpoint census surfaced — all with D-15's census proving there is otherwise nothing else provably dead to delete.

**Architecture:** Six tasks. Code that reads a table is always deleted before that table drops, so there is never a moment where a live request could hit a route whose data source no longer exists. The table drop is a genuinely destructive live-database action and gets its own explicit go-ahead at execution time, separate from the general plan approval — same pattern as W-F's D-01 migration.

**Tech Stack:** Express (backend routes), Supabase JS client for the live DROP (no raw-SQL runner in this repo — the `.sql` file is the durable record), hand-rolled `node` test scripts, Next.js/React (frontend deletion only, no new UI).

**Spec:** [docs/superpowers/specs/2026-08-25-w-h-cleanup-final-audit-design.md](../specs/2026-08-25-w-h-cleanup-final-audit-design.md)

## Global Constraints

- Delete code before dropping its backing table — never the reverse.
- The table-drop SQL runs live only after an explicit go-ahead at that step, separate from general plan approval.
- D-15 deletes nothing else — the census (companion file `w-h-endpoint-census-raw.md`) found zero DEAD endpoints outside governance/continuity; every other route in this plan is either fixed (a real bug) or untouched.
- Full backend suite (`node tests/run-all.js`) green before every backend commit; `tsc --noEmit` clean before every frontend commit.
- Commit messages name the responsible decision (D-09b, D-15, F-I/D-38, D-37, D-40).
- Never batch multiple tasks into one commit.

---

### Task 1: Delete `governance.js`/`continuity.js` and their mounts (D-37)

**Files:**
- Delete: `backend/routes/governance/governance.js`
- Delete: `backend/routes/continuity/continuity.js`
- Modify: `backend/index.js`
- Modify: `frontend/components/admin/EndpointHealthGrid.tsx`

**Interfaces:**
- Produces: `/api/governance/*` and `/api/continuity/*` are unrouted (404) after this task. Nothing in `backend/` or `frontend/` calls either path afterward — confirmed by the census; the only remaining reference was the two admin-grid rows this task also removes.

- [ ] **Step 1: Delete the two route files**

```bash
git rm backend/routes/governance/governance.js backend/routes/continuity/continuity.js
```

- [ ] **Step 2: Remove their mounts from `index.js`**

In `backend/index.js`, remove these two lines:

```js
app.use('/api/continuity', require('./routes/continuity/continuity'))
```
and:
```js
app.use('/api/governance', require('./routes/governance/governance'))
```

(They currently sit among the other `/api/...` mounts, lines 102 and 104 — leave every line around them untouched.)

- [ ] **Step 3: Remove the two admin-grid rows**

In `frontend/components/admin/EndpointHealthGrid.tsx`, remove:

```ts
  { name: 'Continuity',      path: '/api/continuity',      pingPath: '/api/continuity/score',      category: 'Interaction', mounted: true },
```
and:
```ts
  { name: 'Governance',      path: '/api/governance',      pingPath: '/api/governance/score',       category: 'Interaction', mounted: true },
```

- [ ] **Step 4: Run the full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅` — no test referenced either file (confirmed by the census).

- [ ] **Step 5: Type-check the frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add backend/routes/governance/governance.js backend/routes/continuity/continuity.js backend/index.js frontend/components/admin/EndpointHealthGrid.tsx
git commit -m "$(cat <<'EOF'
D-37: delete governance.js/continuity.js -- never migrated, zero real consumers

Both files read governance_assessments/continuity_assessments live,
unconditionally, on every request -- frozen at seed time (no write loop,
D-04), the exact F-C pattern this remediation exists to close. Traced
every possible consumer (frontend/lib/api.ts, direct fetch calls,
backend/tests/, backend/tools/): zero, beyond the admin health-check ping
this commit also removes. Building a live equivalent nobody asked for
isn't justified -- deleted instead, as a direct consequence of D-09b
dropping their only data source next.
EOF
)"
```

---

### Task 2: Drop the 7 frozen-aggregate tables (D-09b)

**Files:**
- Create: `backend/sql/13_drop_frozen_aggregates.sql`

**Interfaces:**
- Consumes: nothing (Task 1 already removed every code path that reads these tables).
- Produces: `governance_assessments`, `governance_gaps`, `continuity_assessments`, `continuity_plans`, `dept_health_scores`, `collaboration_scores`, `predictive_risk_scores` no longer exist in the live database.

- [ ] **Step 1: Write the migration record**

```sql
-- 13_drop_frozen_aggregates.sql — D-09b: drop the DROP-list tables.
--
-- WHY THIS EXISTS
-- D-09's sequencing: derive live -> migrate consumers -> verify equivalence ->
-- then drop. dept_health_scores, collaboration_scores, and predictive_risk_scores
-- were migrated to live domain/derived.js equivalents during W-B/W-D; zero code
-- anywhere still reads them. governance_assessments and continuity_assessments
-- were never migrated -- tracing during W-H found zero real product consumers
-- (only an admin health-check ping), so their two serving route files
-- (governance.js, continuity.js) were deleted outright instead of rewritten
-- (previous commit). Nothing in backend/ reads any of the 7 tables below as of
-- this migration.
--
-- CASCADE handles governance_gaps -> governance_assessments and
-- continuity_plans -> continuity_assessments (both FK'd in 05_foreign_keys.sql)
-- without needing an explicit drop order.

drop table if exists governance_gaps cascade;
drop table if exists governance_assessments cascade;
drop table if exists continuity_plans cascade;
drop table if exists continuity_assessments cascade;
drop table if exists collaboration_scores cascade;
drop table if exists predictive_risk_scores cascade;
drop table if exists dept_health_scores cascade;
```

- [ ] **Step 2: Get explicit go-ahead, then run it**

State the exact statements above and wait for an explicit yes before running anything — this drops 7 live tables, distinct from the general plan approval. Once confirmed, run it through `backend/run_migrations.js` — the repo's actual transactional migration runner (`DATABASE_URL` is already set in `backend/.env`; the JS Supabase client cannot execute DDL, only PostgREST-exposed operations, per the runner's own header comment).

First, a dry run to see exactly what will apply:

```bash
node run_migrations.js --dry-run
```
Expected: `2 pending: 12_consolidate_single_tenant.sql, 13_drop_frozen_aggregates.sql`. The first one shows pending because W-F's Task 1 applied its `UPDATE` manually through the Supabase JS client rather than this runner, so it was never recorded in the `schema_migrations` ledger — re-running it now is a harmless no-op (`where org <> 'horquva'` matches zero rows, since Task 1 of W-F already made that true).

Then, with the go-ahead confirmed, run it for real:

```bash
node run_migrations.js
```
Expected: both files report `OK`, ending with `All migrations applied.` Each file runs inside its own transaction — a failure on `13_drop_frozen_aggregates.sql` rolls back cleanly and reports which statement failed, per the runner's own design.

- [ ] **Step 3: Verify with a fresh read**

```bash
node -e "
const supabase = require('./supabase');
const tables = ['governance_gaps', 'governance_assessments', 'continuity_plans', 'continuity_assessments', 'collaboration_scores', 'predictive_risk_scores', 'dept_health_scores'];
(async () => {
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(1);
    console.log(t, '->', error ? error.message : 'STILL EXISTS (unexpected)');
  }
})();
"
```
Expected: every table reports a "relation does not exist" (or equivalent PostgREST "Could not find the table" schema-cache) error — proving each one is actually gone, not just believed gone.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/13_drop_frozen_aggregates.sql
git commit -m "$(cat <<'EOF'
D-09b: drop the 5 DROP-list tables + 2 child tables

3 of 5 (dept_health_scores, collaboration_scores, predictive_risk_scores)
were already fully migrated (W-B/W-D) with zero remaining readers. The
other 2 (governance_assessments, continuity_assessments) had their only
serving code deleted in the previous commit. governance_gaps and
continuity_plans go with their parent tables via CASCADE. Verified live:
all 7 confirmed gone by a fresh read against each.
EOF
)"
```

---

### Task 3: F-I — remove the dead edge-embedding query, document the live one

**Files:**
- Modify: `backend/routes/dependencies.js`
- Modify: `backend/routes/simulations/agentFails.js`
- Modify: `backend/sql/01_schema_migration.sql`

**Interfaces:**
- Produces: `GET /api/dependencies`'s response no longer carries `agent_source`/`agent_target` embedded objects on each edge (nothing read them — confirmed zero references anywhere in `frontend/`).

- [ ] **Step 1: Remove the dead embedding from `dependencies.js`**

In `backend/routes/dependencies.js`, replace:

```js
  const { data, error } = await supabase
    .from('dependencies')
    .select(`
      id,
      source_id,
      target_id,
      source_type,
      target_type,
      dependency_type,
      strength,
      agent_source:agents!dependencies_agent_source_fkey (id, name, status, risk),
      agent_target:agents!dependencies_agent_target_fkey (id, name, status, risk)
    `)
```

with:

```js
  // F-I: agent_source/agent_target used to be embedded here via PostgREST's FK
  // syntax to attach each edge's agent detail inline, but nothing ever read
  // .agent_source/.agent_target from this response (confirmed: zero references
  // anywhere in frontend/). source_id/target_id + the type columns are the
  // canonical edge representation (derived.js, graphLoader.js, network.js,
  // risks.js, export-company.js all already use only these) -- the embed was
  // computing a join, sending it over the wire, and being discarded.
  const { data, error } = await supabase
    .from('dependencies')
    .select(`
      id,
      source_id,
      target_id,
      source_type,
      target_type,
      dependency_type,
      strength
    `)
```

- [ ] **Step 2: Document the live use in `agentFails.js`**

In `backend/routes/simulations/agentFails.js`, immediately above the query that uses `agent_source`/`agent_target`:

```js
    // Get agents that depend on this agent
    const { data: depLinks, error: depErr } = await supabase
      .from('dependencies')
      .select('dependent:agent_source(id, name, status, risk), dependency_type')
      .eq('agent_target', targetAgent.id)
```

add a comment directly above it:

```js
    // F-I: agent_source/agent_target duplicate source_id/target_id whenever
    // both ends are agents (byte-identical, confirmed against seed data) and
    // are NULL otherwise -- kept here deliberately rather than migrated to the
    // polymorphic source_id/target_id pair, because the FK-embedding is
    // exactly what these two columns exist for and correctness can't drift
    // (no write path touches `dependencies`, D-04). Migrating this to
    // source_id/target_id would cost a second round-trip for a purely
    // architectural preference with no behavior change.
    // Get agents that depend on this agent
    const { data: depLinks, error: depErr } = await supabase
      .from('dependencies')
      .select('dependent:agent_source(id, name, status, risk), dependency_type')
      .eq('agent_target', targetAgent.id)
```

- [ ] **Step 3: Document the relationship in the schema file**

In `backend/sql/01_schema_migration.sql`, immediately above `CREATE TABLE dependencies (`:

```sql
-- agent_source/agent_target duplicate source_id/target_id whenever both ends
-- are agents (source_type='agent' AND target_type='agent'), and are NULL for
-- every cross-type edge -- verified against 02_seed_data.sql, which populates
-- them identically to source_id/target_id in that case and never otherwise.
-- They exist only so PostgREST's FK-embedding syntax can pull a related
-- agent's full row in one query (see 05_foreign_keys.sql's header comment on
-- why 33 route handlers depend on declared FKs for exactly this). Safe to
-- treat as redundant-by-design rather than a data-integrity risk: nothing
-- writes to this table (D-04), so the two representations cannot drift.
-- routes/simulations/agentFails.js is the one deliberate consumer of the FK
-- pair; every other reader (derived.js, graphLoader.js, network.js, risks.js,
-- export-company.js) uses only source_id/target_id (F-I).
CREATE TABLE dependencies (
```

- [ ] **Step 4: Run the full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅` — no test covers `dependencies.js` or `agentFails.js` (confirmed by the census).

- [ ] **Step 5: Commit**

```bash
git add backend/routes/dependencies.js backend/routes/simulations/agentFails.js backend/sql/01_schema_migration.sql
git commit -m "$(cat <<'EOF'
F-I: remove dependencies.js's dead agent_source/agent_target embed, document agentFails.js's live one (D-38)

Confirmed against seed data: the two columns are byte-identical duplicates
of source_id/target_id whenever populated, NULL otherwise, and can't drift
-- nothing writes to `dependencies` (D-04). dependencies.js embedded them
and nothing ever read the result (zero frontend references) -- removed.
agentFails.js's use is real (builds the "if this agent fails" simulation's
impactedAgents list) -- kept, documented as the deliberate exception.
EOF
)"
```

---

### Task 4: D-40 — fix the phantom `/api/brain/*` references

**Files:**
- Modify: `backend/index.js`
- Modify: `backend/tests/api.smoke.test.js`

**Interfaces:**
- Produces: `GET /`'s JSON body no longer names 3 endpoints that don't exist. `api.smoke.test.js` authenticates before checking, and checks real endpoints only.

- [ ] **Step 1: Fix `index.js`'s self-description**

In `backend/index.js`, replace:

```js
app.get('/', (req, res) => {
  res.json({
    name: 'Horquva OBA Core API',
    status: 'running',
    message: 'Organizational Brain backend is live. This is a JSON API, not a web page.',
    endpoints: {
      bootReport: '/api/brain/boot-report',
      brainStatus: '/api/brain/status',
      modules: '/api/brain/registry/modules',
      health: '/api/health/summary',
      authLogin: 'POST /api/auth/login',
    },
  })
})
```

with:

```js
app.get('/', (req, res) => {
  res.json({
    name: 'Horquva OBA Core API',
    status: 'running',
    message: 'Organizational Brain backend is live. This is a JSON API, not a web page.',
    // D-40: the brain is a library, not a service (see backend/brain/README.md)
    // -- there is no /api/brain mount, so this used to point at 3 endpoints
    // that never existed.
    endpoints: {
      health: '/api/health/summary',
      authLogin: 'POST /api/auth/login',
    },
  })
})
```

- [ ] **Step 2: Repair `api.smoke.test.js`**

Replace the entire file:

```js
/*
 * OBA Core — Live API Smoke Test (MVP)
 * Checks basic authenticated endpoints against the deployed Vercel URL or a
 * local server. Node 18+ (built-in fetch). Run:
 *   BASE_URL=https://horquva-oba-core.vercel.app node tests/api.smoke.test.js
 *   (local: BASE_URL=http://localhost:3000 node tests/api.smoke.test.js)
 * Needs ADMIN_EMAIL/ADMIN_PASSWORD set in the environment it runs against.
 *
 * D-40: this file used to check 3 /api/brain/* paths that never existed (the
 * brain is a library, not a service -- see backend/brain/README.md) and its
 * one real check never sent an Authorization header against a codebase where
 * every route sits behind the global requireAuth gate -- it could not have
 * passed a single one of its 4 checks in its previous form. Logs in first now,
 * and checks real, meaningful endpoints.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

let passed = 0
let failed = 0
let token = null

async function checkEndpoint(path, validate) {
	try {
		const res = await fetch(BASE_URL + path, {
			headers: token ? { Authorization: 'Bearer ' + token } : {},
		})
		const ok = res.ok
		let body = null
		try { body = await res.json() } catch (_) {}
		const valid = ok && (validate ? validate(body) : true)
		if (valid) {
			passed++
			console.log('  ✓', path, '->', res.status)
		} else {
			failed++
			console.error('  ✗', path, '->', res.status)
		}
	} catch (e) {
		failed++
		console.error('  ✗', path, '->', e.message)
	}
}

;(async () => {
	console.log('\n=== OBA Core — API Smoke Test ===')
	console.log('Base URL:', BASE_URL, '\n')

	const adminEmail = process.env.ADMIN_EMAIL
	const adminPassword = process.env.ADMIN_PASSWORD
	if (!adminEmail || !adminPassword) {
		console.error('ADMIN_EMAIL/ADMIN_PASSWORD not set -- cannot authenticate, skipping smoke test.')
		process.exit(0)
	}

	try {
		const res = await fetch(BASE_URL + '/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: adminEmail, password: adminPassword }),
		})
		const body = await res.json()
		if (!res.ok || !body.token) {
			console.error('  ✗ login failed:', body.error || res.status)
			process.exit(1)
		}
		token = body.token
		console.log('  ✓ authenticated as', adminEmail, '\n')
	} catch (e) {
		console.error('  ✗ login request failed:', e.message)
		process.exit(1)
	}

	await checkEndpoint('/api/health/summary')
	await checkEndpoint('/api/intelligence/graph/status', (b) => b && typeof b.isReady === 'boolean')
	await checkEndpoint('/api/dashboard')

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()
```

- [ ] **Step 3: Run the full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅` — `api.smoke.test.js` is still opt-in (only added when `BASE_URL` is set), so this doesn't run in the default suite; verified separately in Task 6.

- [ ] **Step 4: Commit**

```bash
git add backend/index.js backend/tests/api.smoke.test.js
git commit -m "$(cat <<'EOF'
D-40: fix phantom /api/brain/* references in index.js and api.smoke.test.js

Both referenced 3 endpoints that never existed (the brain is a library,
not a service -- backend/brain/README.md already said so). index.js's own
self-description just never caught up. api.smoke.test.js additionally
never authenticated, so it could not have passed any of its 4 checks in
its previous form -- repaired with a login step and 3 real endpoint checks
instead of deleted, since a live-deployment smoke check is worth keeping.
EOF
)"
```

---

### Task 5: D-40 — delete the dead `RelationshipHealthStrip`

**Files:**
- Delete: `frontend/components/dashboard/RelationshipHealthStrip.tsx`
- Modify: `frontend/lib/api.ts`

**Interfaces:**
- Produces: `frontend/lib/api.ts` no longer exports `relationshipApi` or `RelationshipHealth` — confirmed their only caller was the deleted component.

- [ ] **Step 1: Delete the component**

```bash
git rm frontend/components/dashboard/RelationshipHealthStrip.tsx
```

- [ ] **Step 2: Remove its dead API client entry**

In `frontend/lib/api.ts`, remove:

```ts
// ─── Relationship (M29) ─────────────────────────────────────────────────────

export interface RelationshipHealth {
  healthy: number;
  atRisk: number;
  fragile: number;
  totalRelationships: number;
}

export const relationshipApi = {
  health: () => request<RelationshipHealth>('/api/relationships/health'),
};

```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/dashboard/RelationshipHealthStrip.tsx frontend/lib/api.ts
git commit -m "$(cat <<'EOF'
D-40: delete RelationshipHealthStrip -- dead on both ends

Calls /api/relationships/health, which has never existed (BUILD_SPEC.md
already documented this). Confirmed one level further: the component
itself is never imported or rendered anywhere in frontend/, and its link
target (/relationship-explorer) doesn't exist as a page either. BUILD_SPEC's
own instruction: "Write it or remove the call... don't leave it." Building
the feature is new scope; removing the dead call is cleanup.
EOF
)"
```

---

### Task 6: Full-suite and live verification; close out the decision log

**Files:** `docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md` (final commit only).

- [ ] **Step 1: Full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅`.

- [ ] **Step 2: Frontend type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Start the backend and verify live**

Follow the decision log §5 process: start via `.claude/launch.json`'s `backend` entry (autoPort).

1. **Boot happy-path:** confirm `Server running on port <N>` with no errors, and `curl <base>/` shows the corrected self-description (no `/api/brain/*` entries).
2. **Governance/continuity are gone:** `curl -i <base>/api/governance/score` and `curl -i <base>/api/continuity/score` (with a valid token, so the response is a genuine 404 rather than the global gate's 401 — same distinction W-F's Task 1 verification made for `/register`) → expect `404` for both.
3. **Dependencies still works, embed is gone:** `curl <base>/api/dependencies` with a valid token → confirm the response's `dependencies` array entries no longer have `agent_source`/`agent_target` keys, and that `total`/`critical`/`high`/`hubs` are still populated sensibly.
4. **The simulation that depends on F-I's kept path still works:** `curl <base>/api/simulations/agent-fails/DeployBot` (or another real agent name from the seed data) with a valid token → confirm `impactedAgents` is populated (proves `agentFails.js`'s `agent_source`/`agent_target` query still functions after Task 3's comment-only change).
5. **Table drop confirmed from the running server, not just the earlier one-off script:** `curl <base>/api/health/summary` → confirm it still returns a normal response (proves `health.js`, which reads several of the KEEP-list tables alongside computing things live, wasn't accidentally affected by the DROP-list migration).
6. **`api.smoke.test.js` actually passes now:** `cd backend && BASE_URL=http://localhost:<port> node tests/api.smoke.test.js` (with `ADMIN_EMAIL`/`ADMIN_PASSWORD` already in `backend/.env`) → expect `passed: 3 failed: 0`.
7. **Admin grid:** load `/admin` in the browser, confirm no `Governance`/`Continuity` rows appear under "Interaction," and the total endpoint count is 2 lower than before.

Record what was actually observed (terminal output, screenshots) rather than asserting success without checking.

- [ ] **Step 4: Update the decision log**

In `docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md`:
- Status line: this is the **last** workstream — update to reflect all of W-A through W-H landed, nothing left queued (W-F was already independent/done; confirm the line reads as fully complete).
- Add a `### D-37…D-40 — decided during W-H's brainstorming phase (2026-08-25)` section, mirroring the existing D-28…D-32 / D-33…D-36 sections: D-37 (governance/continuity never migrated, deleted as a D-09b consequence), D-38 (F-I closed), D-39 (the census: zero DEAD, 9 AMBIGUOUS adjudicated), D-40 (the two real bugs fixed).
- §3 workstream map: mark W-H **DONE** with its commit range.
- §5: update "read this before starting W-H" — since W-H is now done and last, this becomes a closing note rather than a pointer to a next workstream. Add whatever W-H-specific lesson is worth carrying forward (the census-delegated-to-a-background-agent-then-adjudicated-by-hand pattern, and the "D-15 found zero DEAD" result itself, are both worth recording explicitly so a future audit doesn't assume there's dead code left to find without checking first).
- Update the "Quality bar, concretely" paragraph to include the W-H plan and commit range.

- [ ] **Step 5: Commit the decision log update**

```bash
git add docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md
git commit -m "$(cat <<'EOF'
decision log: mark W-H done, record D-37..D-40 -- remediation complete

Last workstream. D-15's census found zero provably-dead endpoints across
all 177 -- recorded explicitly so a future pass doesn't assume there's
more dead code to find without checking. W-A through W-H all landed on
ocos/develop.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** §1/D-37 → Tasks 1-2. §2/D-38 → Task 3. §3/D-39 → no code task (adjudication is the deliverable, already recorded in the design doc; Task 6 records it in the decision log). §4/D-40 → Tasks 4-5.
- **Placeholder scan:** none — every step has literal code, SQL, or verification commands. Task 2's RPC-fallback note is a real contingency (the JS client's raw-DDL access is genuinely uncertain in this environment), not a placeholder — it names the exact fallback action if the primary path fails.
- **Type consistency:** the 7-table list is identical across the design doc, Task 2's SQL file, Task 2's drop script, and Task 2's verification script. `agent_source`/`agent_target` terminology matches between Task 3's `dependencies.js` edit, its `agentFails.js` comment, and its schema comment.
