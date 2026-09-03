# W-D Truth Layer Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse three duplicate "Organizational Intelligence Score" computations (`voice.js`, `orchestrator.js`, `brainCore.js`) onto `derived.js`'s `pillars.orgScore`, route the Org Science cards through the domain layer instead of the brain directly, stamp historical provenance on the four genuinely-frozen time-series tables, and give two more frozen tables (`dept_health_scores`, `department_exposure`) live `derived.js` equivalents.

**Architecture:** No new layer — `domain/derived.js` and `domain/index.js` already exist and are already the target. Every task in this plan either (a) adds a new pure function to `derived.js` following its existing six-function shape, or (b) deletes a route's own weighted/ad-hoc computation and reads the one already-computed number from `domain.intelligence.all()` instead. Tasks 1–5 do the OIS/brain-indirection work; Tasks 6–10 do the historical-provenance and new-derived-function work; Task 11 adds regression coverage for a file already correct at HEAD.

**Tech Stack:** Node.js (CommonJS), Express 5, Supabase JS client. **No test framework** — hand-rolled `node` test scripts with a local `check()` helper, registered in `backend/tests/run-all.js`. Do not introduce jest, mocha, or vitest.

**Spec:** `docs/superpowers/specs/2026-08-25-w-d-truth-layer-consolidation-design.md`
**Decision log:** `docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md`

## Global Constraints

- **CommonJS only.** `require` / `module.exports`. No ESM, no TypeScript, in `backend/`.
- **`derived.js` performs I/O only in `loadRoots()`.** Every other function in it, including the two new ones this plan adds, is pure — no `require('../supabase')`, no `async`, over a `roots` bundle the caller already loaded.
- **`pillars.orgScore` is the one OIS (D-02).** No file computes its own weighted "Organizational Intelligence Score" or "Brain Index" after this plan lands. `PILLAR_WEIGHTS` (`GI 0.35 / MI 0.35 / DI 0.30`) is not touched — D-11 confirmed these stay authored.
- **No new test framework, and no HTTP-level test infra invented.** This repo's only HTTP-level suite, `api.smoke.test.js`, is opt-in (`BASE_URL` env var) and is not part of the default `node tests/run-all.js` gate — the decision log's own workstreams never built Supabase-mocking infra for route handlers, and this plan does not start now. Route-wiring tasks (2–5, 7–10) are verified two ways instead: `node tests/run-all.js` stays green (nothing pure regresses), and a manual local-server check (start the dev server, `curl` the changed endpoint, compare against a value read directly from `domain.intelligence.all()` in a scratch `node -e` snippet) is run once per task as a checkpoint — not committed as an automated test, because the codebase has no precedent for one.
- **Tests are plain node scripts.** Copy the structure of `backend/tests/derived.unit.test.js`: a local `check(name, cond, detail)`, a passed/failed tally, `process.exit(failed === 0 ? 0 : 1)`.
- **Isolate this workstream's edits from pre-existing unrelated WIP.** At session start, `voice.js`, `health.js`, `learning.js`, `forecast.js`, `briefing.js` already carried unstaged, unrelated changes (confirmed by `git diff` review during brainstorming — see the design doc §4). Before staging any of these five files: `git diff <file>` first. If the diff contains hunks this plan did not make, do **not** `git add <file>` whole — stage only this task's hunks (`git add -p <file>` and select hunks interactively, or reconstruct via `git show HEAD:<file>` + apply only this task's edit and diff against the working tree to confirm the unrelated hunks are still present after commit). `git status --short` before every commit, always.
- **Threshold/rename-only changes and behavior-changing ones never share a commit** — matches the decision log's standing constraint. Task 2 (voice.js) touches both: absorbing the pre-existing camelCase WIP is one commit, deleting the ad-hoc OIS formula is a second.
- **Commit messages name the responsible decision** (`D-02`, `D-09a`, `D-11`, `D-12`, `D-17`, `D-18`, `D-19`, `D-20`, `D-21`, `F-L`).
- Run all tests from `backend/`: `node tests/run-all.js`.

---

### Task 1: `derived.js` gains `orgHealthByDepartment` and `departmentExposure`

**Files:**
- Modify: `backend/domain/derived.js`
- Modify: `backend/domain/index.js:96-104` (expose both under `intelligence.compute`)
- Modify: `backend/tests/derived.unit.test.js` (add test sections)

**Interfaces:**
- Consumes: `roots` bundle (same shape every other `derived.js` function takes), `accountability(roots)`, `predictiveRisk(roots)`, `orgHealth(roots, {accountability, predictiveRisk})` (all already exported).
- Produces: `orgHealthByDepartment(roots) -> { departments: [{ department, healthIndex, healthStatus, documentationScore, continuityScore, ownershipSpreadScore, criticalSafetyScore, incidentLoadScore }], ...provenance }`, `departmentExposure(roots) -> { departments: [{ department, documentationCoverage, backupCoverage, incidentExposureScore, incidentRiskLevel }], ...provenance }`. Both added to `computeAll()`'s return under keys `orgHealthByDepartment` and `departmentExposure`, and to `module.exports`.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/derived.unit.test.js`, immediately after the existing "Org health" section (before "Provenance across the board"):

```js
// ── Org health by department ─────────────────────────────────────────────────
console.log('\nOrg health by department — same formula, narrower population (D-21):')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Ana', department: 'Eng' },
			{ id: 2, name: 'Ben', department: 'Ops' },
		],
		owners: [
			{ id: 10, name: 'Ana', employee_id: 1, backup_owner: 'Cal' },
			{ id: 11, name: 'Ben', employee_id: 2, backup_owner: null },
		],
		agents: [
			{ id: 1, name: 'EngAgent', risk: 'low', status: 'active', owner_id: 10 },
			{ id: 2, name: 'OpsAgent', risk: 'low', status: 'active', owner_id: 11 },
		],
		workflows: [
			{ id: 1, name: 'EngFlow', risk: 'low', department: 'Eng' },
			{ id: 2, name: 'OpsFlow', risk: 'low', department: 'Ops' },
		],
		workflow_runbooks: [
			{ workflow_id: 1, is_documented: true },
			{ workflow_id: 2, is_documented: false },
		],
		workflow_failures: [],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 },
			{ asset_type: 'agent', asset_id: 2, is_documented: false, owner_id: 2 },
		],
	})
	const byDept = d.orgHealthByDepartment(r)
	const eng = byDept.departments.find((x) => x.department === 'Eng')
	const ops = byDept.departments.find((x) => x.department === 'Ops')

	check('every employee department gets a row', byDept.departments.length === 2, byDept.departments.map((x) => x.department))
	check('Eng (documented runbook, backed owner) scores higher than Ops (undocumented, no backup)',
		eng.healthIndex > ops.healthIndex, [eng.healthIndex, ops.healthIndex])
	check('each row uses the same five dimensions as org-level orgHealth',
		'documentationScore' in eng && 'continuityScore' in eng && 'ownershipSpreadScore' in eng &&
		'criticalSafetyScore' in eng && 'incidentLoadScore' in eng, eng)
	check('provenance is reported', byDept.source === 'live' && typeof byDept.computedAt === 'string', byDept)

	const empty = d.orgHealthByDepartment(roots())
	check('no employees means no department rows, not a throw', empty.departments.length === 0, empty.departments)
}

// ── Department exposure ──────────────────────────────────────────────────────
console.log('\nDepartment exposure — a different question from continuityScore (D-21):')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Ana', department: 'Eng' },
			{ id: 2, name: 'Ben', department: 'Ops' },
		],
		owners: [
			{ id: 10, name: 'Ana', employee_id: 1, backup_owner: 'Cal' },
			{ id: 11, name: 'Ben', employee_id: 2, backup_owner: null },
		],
		workflows: [
			{ id: 1, name: 'EngFlow', risk: 'low', department: 'Eng' },
			{ id: 2, name: 'OpsFlow', risk: 'low', department: 'Ops' },
		],
		workflow_failures: [
			{ workflow_id: 2, failure_type: 'timeout', severity: 'high' },
			{ workflow_id: 2, failure_type: 'timeout', severity: 'high' },
		],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 },
			{ asset_type: 'agent', asset_id: 2, is_documented: false, owner_id: 2 },
		],
	})
	const byDept = d.departmentExposure(r)
	const eng = byDept.departments.find((x) => x.department === 'Eng')
	const ops = byDept.departments.find((x) => x.department === 'Ops')

	check('Ops (undocumented, no backup, two failures) is more exposed than Eng',
		ops.incidentExposureScore < eng.incidentExposureScore, [eng.incidentExposureScore, ops.incidentExposureScore])
	check('a severe exposure score is not labelled reassuringly',
		ops.incidentRiskLevel === 'SEVERE' || ops.incidentRiskLevel === 'HIGH', ops.incidentRiskLevel)
	check('documentationCoverage and backupCoverage are reported per department, not blended away',
		eng.documentationCoverage === 100 && eng.backupCoverage === 100, eng)
	check('exposure is NOT continuityScore under a new name',
		byDept.departments.every((x) => !('continuityScore' in x)), byDept.departments)
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `backend/`:
```bash
node tests/derived.unit.test.js
```
Expected: FAIL — `TypeError: d.orgHealthByDepartment is not a function`

- [ ] **Step 3: Implement `orgHealthByDepartment`**

Add to `backend/domain/derived.js`, immediately after the `orgHealth` function (after the closing brace that follows line 1009, before the `// Orchestration` section header):

```js
// ═════════════════════════════════════════════════════════════════════════════
// 7. ORG HEALTH BY DEPARTMENT — same definition as §6, narrower population
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces `dept_health_scores` (D-09 DROP list; consumed by health.js /departments).
 *
 * Reuses orgHealth()'s exact five-dimension formula, once per department — not a
 * new definition, the same one over a filtered roots bundle. A department is any
 * value present in employees.department; an entity belongs to a department by:
 *
 *   workflows            -> workflows.department directly
 *   agents                -> owner_id -> owners.employee_id -> employees.department
 *   knowledge_assets      -> owner_id -> employees.department directly
 *   accountability_entities -> its own .department column
 *
 * A department with no employees at all cannot appear (there is nothing to key
 * it by); a department with employees but no agents/workflows/assets still gets
 * a row, scored on whatever it does have — orgHealth()'s own pct()/mean() helpers
 * already treat an empty population as 0, not as an omission.
 */
function filterRootsByDepartment(roots, department) {
	const employees = roots.employees.filter((e) => e.department === department)
	const employeeIds = new Set(employees.map((e) => e.id))

	const owners = roots.owners.filter((o) => employeeIds.has(o.employee_id))
	const ownerIds = new Set(owners.map((o) => o.id))

	const agents = roots.agents.filter((a) => ownerIds.has(a.owner_id))
	const workflows = roots.workflows.filter((w) => w.department === department)
	const workflowIds = new Set(workflows.map((w) => w.id))

	const workflow_runbooks = roots.workflow_runbooks.filter((r) => workflowIds.has(r.workflow_id))
	const workflow_failures = roots.workflow_failures.filter((f) => workflowIds.has(f.workflow_id))
	const knowledge_assets = roots.knowledge_assets.filter((k) => employeeIds.has(k.owner_id))
	const accountability_entities = roots.accountability_entities.filter((e) => e.department === department)
	const entityIds = new Set(accountability_entities.map((e) => e.id))
	const accountability_links = roots.accountability_links.filter((l) => entityIds.has(l.entity_id))

	const filtered = {
		...roots,
		employees, owners, agents, workflows, workflow_runbooks, workflow_failures,
		knowledge_assets, accountability_entities, accountability_links,
	}
	filtered._counts = Object.fromEntries(ROOT_TABLES.map((t) => [t, filtered[t].length]))
	return filtered
}

function orgHealthByDepartment(roots) {
	const departments = [...new Set(roots.employees.map((e) => e.department).filter(Boolean))]

	const rows = departments.map((department) => {
		const deptRoots = filterRootsByDepartment(roots, department)
		const h = orgHealth(deptRoots, {
			accountability: accountability(deptRoots),
			predictiveRisk: predictiveRisk(deptRoots),
		})
		return {
			department,
			healthIndex: h.healthIndex,
			healthStatus: h.healthStatus,
			documentationScore: h.documentationScore,
			continuityScore: h.continuityScore,
			ownershipSpreadScore: h.ownershipSpreadScore,
			criticalSafetyScore: h.criticalSafetyScore,
			incidentLoadScore: h.incidentLoadScore,
		}
	})

	return {
		departments: rows,
		...provenance({ employees: roots._counts.employees, departments: departments.length }),
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. DEPARTMENT EXPOSURE — a different question from continuityScore (D-21)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces `department_exposure` (uncatalogued in the decision log; consumed by
 * learning.js /incidents and /departments).
 *
 * DEFINITION, AUTHORED — this is not a recovery of an existing formula (the
 * frozen table's seed rows carry no derivation), and it is deliberately NOT
 * orgHealthByDepartment's continuityScore under a new name: it answers "how
 * exposed is this department to disruption", not "how healthy is it overall".
 * Equal thirds: documentation coverage, backup coverage, and an incident-free
 * score scoped to THIS department's workflow failures (not the org-wide
 * failuresPerWorkflow orgHealth.incidentLoadScore uses).
 *
 * incidentRiskLevel bands the inverse of the exposure score — SEVERE means
 * highly exposed, LOW means well-covered — using the same 40/65/85 boundaries
 * band() uses everywhere else, so the vocabulary means the same thing here as
 * it does in every other score in the product.
 */
const DEPT_EXPOSURE_INCIDENT_PENALTY_PER_FAILURE = 30

function departmentExposure(roots) {
	const departments = [...new Set(roots.employees.map((e) => e.department).filter(Boolean))]
	const employeesByDept = new Map(departments.map((dep) => [dep, roots.employees.filter((e) => e.department === dep)]))

	const rows = departments.map((department) => {
		const employees = employeesByDept.get(department)
		const employeeIds = new Set(employees.map((e) => e.id))
		const owners = roots.owners.filter((o) => employeeIds.has(o.employee_id))
		const workflows = roots.workflows.filter((w) => w.department === department)
		const workflowIds = new Set(workflows.map((w) => w.id))
		const failures = roots.workflow_failures.filter((f) => workflowIds.has(f.workflow_id))
		const assets = roots.knowledge_assets.filter((k) => employeeIds.has(k.owner_id))

		const documentationCoverage = clamp(round(pct(assets.filter((a) => a.is_documented).length, assets.length)))
		const backupCoverage = clamp(round(pct(owners.filter((o) => o.backup_owner).length, owners.length)))

		const failuresPerWorkflow = workflows.length ? failures.length / workflows.length : 0
		const incidentFreeScore = clamp(round(100 - failuresPerWorkflow * DEPT_EXPOSURE_INCIDENT_PENALTY_PER_FAILURE))

		const incidentExposureScore = clamp(round(mean([documentationCoverage, backupCoverage, incidentFreeScore])))
		const incidentRiskLevel = band(100 - incidentExposureScore, ['LOW', 'MODERATE', 'HIGH', 'SEVERE'])

		return { department, documentationCoverage, backupCoverage, incidentExposureScore, incidentRiskLevel }
	})

	return {
		departments: rows,
		...provenance({ employees: roots._counts.employees, departments: departments.length }),
	}
}
```

Add both to the exports at the bottom of `backend/domain/derived.js` (find the `module.exports = {` block and add after `orgHealth,`):

```js
	orgHealthByDepartment,
	departmentExposure,
```

Add both to `computeAll()`'s return (find the `return {` inside `async function computeAll(supabase)` and add after `orgHealth: orgHealthResult,`):

```js
	orgHealthByDepartment: orgHealthByDepartment(roots),
	departmentExposure: departmentExposure(roots),
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node tests/derived.unit.test.js
```
Expected: PASS, all checks green.

- [ ] **Step 5: Expose both under `domain/index.js`'s `intelligence.compute`**

In `backend/domain/index.js`, inside the `compute: {` block (around line 96-103), add after `orgHealth: derived.orgHealth,`:

```js
			orgHealthByDepartment: derived.orgHealthByDepartment,
			departmentExposure: derived.departmentExposure,
```

- [ ] **Step 6: Run the full suite**

```bash
node tests/run-all.js
```
Expected: all suites pass, including `derived.unit.test.js`.

- [ ] **Step 7: Commit**

```bash
git add backend/domain/derived.js backend/domain/index.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
Add orgHealthByDepartment and departmentExposure to derived.js (D-09a, D-21)

Two new frozen-table replacements, deliberately kept separate: dept_health_scores
(D-09 DROP list) reuses orgHealth's exact five-dimension formula partitioned by
department; department_exposure (uncatalogued in the decision log until this
workstream traced health.js and learning.js) is a distinct incident-exposure
metric over the same root tables, not continuityScore under a new name.
EOF
)"
```

---

### Task 2: `voice.js` — one OIS (D-02, D-17)

**Files:**
- Modify: `backend/routes/voice/voice.js`

**Interfaces:**
- Consumes: `intel.pillars.orgScore.score`, `.rating` (from `domain.intelligence.all()`, already called at `voice.js:48`).
- Produces: no change to `buildBrain()`'s return shape — `org.intelligenceScore`/`org.rating` keep their names, just their source changes.

`voice.js` already has correct, but incomplete, pre-existing uncommitted work at session start: `pred.predictedScore`/`pred.threatLevel`/`pred.isEmergingThreat` (camelCase, matching `derived.js`'s actual property names) replacing the old snake_case reads, and a dropped `resolutionCount` field with `mostLoadedPerson()`/`orgOverloaded()`/`orgPeople()` reworked to sort by `criticalAgents` instead. That WIP is correct and is absorbed as-is in Step 1. Step 3 is this task's own change: deleting the ad-hoc OIS formula, which the WIP left untouched.

- [ ] **Step 1: Review and stage the pre-existing WIP alone**

```bash
git diff backend/routes/voice/voice.js
```
Confirm the diff is exactly: `pred.predicted_score`→`pred.predictedScore`, `pred.threat_level`→`pred.threatLevel`, `pred.is_emerging_threat`→`pred.isEmergingThreat`, the deleted `resolutionCount: null` line, and `mostLoadedPerson`/`orgOverloaded`/`dailySummary`/`answerQuery`'s person-answer branch all switched from `.resolutionCount` to `.criticalAgents`. If it matches, stage and commit it alone — this is a rename-only change, no new behavior:

```bash
git add backend/routes/voice/voice.js
git commit -m "$(cat <<'EOF'
Finish voice.js's predictiveRisk/executiveMemory property rename to camelCase

Absorbs pre-existing WIP: predictedScore/threatLevel/isEmergingThreat match
derived.js's actual output shape; resolutionCount (never a real field —
hero_dependencies never recorded incident resolutions) is replaced by
criticalAgentsOwned-based ranking throughout. Rename only, no behavior change.
EOF
)"
```

- [ ] **Step 2: Write the manual verification snippet (used in Step 5, not committed)**

```bash
node -e "
const domain = require('./domain');
domain.intelligence.all().then(intel => {
  console.log('pillars.orgScore:', intel.pillars.orgScore.score, intel.pillars.orgScore.rating);
});
"
```
Run this from `backend/` against a database with `SUPABASE_URL`/`SUPABASE_KEY` set, note the printed score/rating — this is the value `voice.js`'s `org.intelligenceScore`/`org.rating` must match after Step 3.

- [ ] **Step 3: Delete the ad-hoc OIS formula**

In `backend/routes/voice/voice.js`, replace (currently around lines 109-114):

```js
  const allAssets = [...d.agents, ...d.workflows]
  const total = allAssets.length || 1
  const documentedCount = allAssets.filter((a) => a.documented).length
  const backedCount = allAssets.filter((a) => a.backup_owner).length
  const intelligenceScore = Math.round(0.5 * pct(documentedCount, total) + 0.5 * pct(backedCount, total))
  const rating = intelligenceScore >= 75 ? 'Strong' : intelligenceScore >= 55 ? 'Moderate' : intelligenceScore >= 35 ? 'Weak' : 'Critical'
```

with:

```js
  // Was a local 0.5·documented + 0.5·backed formula — a second, independently
  // computed "Organizational Intelligence Score" alongside derived.js's
  // pillars.orgScore (F-C). There is one OIS now (D-02).
  const intelligenceScore = intel.pillars.orgScore.score
  const rating = intel.pillars.orgScore.rating
```

The `pct()` helper (lines 20-22) and the `allAssets`/`total`/`documentedCount`/`backedCount` locals it served have no other caller in this file after this change — delete the `pct` function too:

```js
function pct(n, d) {
  return d ? Math.round((100 * n) / d) : 0
}
```

- [ ] **Step 4: Run the full suite**

```bash
node tests/run-all.js
```
Expected: all suites pass (nothing pure in this file was under test, but this confirms no other module broke).

- [ ] **Step 5: Manual verification checkpoint**

Start the dev server locally (`node index.js` from `backend/`, or via the project's existing dev-server preview config), then:

```bash
curl -s -H "Authorization: Bearer <a valid token>" http://localhost:3000/api/voice/daily-summary
```

Confirm the response's prose (`dailySummary()`'s output, which reports `top.criticalAgents`, not the OIS directly) still renders. Then hit `/api/voice/ask?q=what%20is%20the%20status` and confirm the returned `Overall Organizational Intelligence Score is N/100 (RATING)` line's `N` matches the value printed by Step 2's snippet, and `RATING` is now one of `derived.js`'s `band()` labels (`CRITICAL`/`WEAK`/`PARTIAL`/`STRONG`), not the old `Critical`/`Weak`/`Moderate`/`Strong`.

- [ ] **Step 6: Commit**

```bash
git add backend/routes/voice/voice.js
git commit -m "$(cat <<'EOF'
voice.js reads pillars.orgScore instead of computing its own OIS (D-02, D-17)

Deletes the 0.5*documented + 0.5*backed formula and the now-unused pct()
helper. org.intelligenceScore/org.rating are intel.pillars.orgScore's
score/rating — the same number executive.js already reports.
EOF
)"
```

---

### Task 3: `orchestrator.js` — headline score becomes `pillars.orgScore` (D-02, D-17)

**Files:**
- Modify: `backend/routes/intelligence/orchestrator.js`

**Interfaces:**
- Consumes: `intel.pillars.orgScore.score`, `.rating` (already available — `orchestrate()` already calls `domain.intelligence.all()` at line 299).
- Produces: `orchestrate()`'s return shape is unchanged (`{ score, rating, verdict, recs, trust, brainPosture, modules, dataIntegrity }`); only how `score`/`rating` are computed changes. `/modules` (the per-module breakdown) is untouched.

- [ ] **Step 1: Write the manual verification snippet**

```bash
node -e "
const domain = require('./domain');
domain.intelligence.all().then(intel => {
  console.log('expected score/rating:', intel.pillars.orgScore.score, intel.pillars.orgScore.rating);
});
"
```

- [ ] **Step 2: Replace the weighted computation**

In `backend/routes/intelligence/orchestrator.js`, replace (currently around lines 322-336):

```js
  // Only verified modules contribute to the score
  const verified = results.filter(m => m.verified)
  const totalWeight = verified.reduce((s, m) => s + m.weight, 0)

  const rawScore = totalWeight > 0
    ? verified.reduce((s, m) => s + (m.score * m.weight), 0) / totalWeight
    : 0

  const score   = Math.round(rawScore)
  const rating  = classifyRating(score)
  const verdict = generateVerdict(score, rating, results)
```

with:

```js
  // The headline score is intel.pillars.orgScore — the one OIS (D-02, D-17).
  // The 13-module registry above no longer votes on it; it still explains it,
  // via generateVerdict/generateRecommendations/computeTrustScore below, which
  // all still take the full `results` list.
  const score   = intel.pillars.orgScore.score
  const rating  = intel.pillars.orgScore.rating
  const verdict = generateVerdict(score, rating, results)
```

`classifyRating` (currently lines 197-202) has no other caller after this change — delete it:

```js
function classifyRating(score) {
  if (score >= 80) return 'HIGHLY INTELLIGENT'
  if (score >= 60) return 'MODERATELY INTELLIGENT'
  if (score >= 40) return 'DEVELOPING'
  return 'AT RISK'
}
```

- [ ] **Step 3: Run the full suite**

```bash
node tests/run-all.js
```
Expected: all suites pass.

- [ ] **Step 4: Manual verification checkpoint**

With the dev server running:

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/intelligence/orchestrator/score
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/intelligence/orchestrator/modules
```

Confirm `/score`'s `organizationalIntelligenceScore` matches Step 1's printed value (note: `orchestrator_snapshots` caches per-day — if a row was already cached today from before this change, delete it or wait for tomorrow's cache miss, since `/score` serves the cache when present). Confirm `/modules` still lists all 13 modules with their individual scores unchanged — this route was not touched.

- [ ] **Step 5: Commit**

```bash
git add backend/routes/intelligence/orchestrator.js
git commit -m "$(cat <<'EOF'
orchestrator.js reads pillars.orgScore instead of its own weighted composite (D-02, D-17)

Deletes the 13-module weighted rawScore and classifyRating (now unused).
The module registry, verdict/recommendation generation, trust score and
orchestrator_snapshots caching are unchanged — they narrate the one OIS,
they no longer vote on a second one.
EOF
)"
```

---

### Task 4: `brainCore.js` — "Brain Index" becomes `pillars.orgScore` (D-17)

**Files:**
- Modify: `backend/routes/intelligence/brainCore.js`

**Interfaces:**
- Consumes: `intel.pillars.orgScore.score` (already available — `computeBrainCore()` already calls `domain.intelligence.all()` at line 135).
- Produces: `computeBrainCore()`'s return shape unchanged; `posture` keeps brainCore's own STABLE/STRAINED/CRITICAL vocabulary, now banded off the new `brainIndex` value.

- [ ] **Step 1: Replace the weighted computation**

In `backend/routes/intelligence/brainCore.js`, replace (currently around lines 154-169):

```js
  // Only verified signals contribute
  const verifiedSignals = rawSignals.filter(s => s.verified)

  // Weighted average
  const totalWeight = verifiedSignals.reduce((s, sig) => s + sig.weight, 0)
  const rawIndex = totalWeight > 0
    ? verifiedSignals.reduce((s, sig) => s + sig.contribution, 0) / totalWeight
    : 0

  const brainIndex = Math.round(rawIndex)

  // Posture
  const posture =
    brainIndex >= 80 ? 'STABLE'
    : brainIndex >= 60 ? 'STRAINED'
    : 'CRITICAL'
```

with:

```js
  // Only verified signals are shown in the diagnostic breakdown below —
  // the headline number is intel.pillars.orgScore, not a weighted vote of
  // these 10 signals (D-02, D-17; this is the same fix as orchestrator.js's,
  // for the second of the two OIS-shaped composites the pre-existing
  // brain-as-library-design.md's open question 3 named as a pair).
  const verifiedSignals = rawSignals.filter(s => s.verified)

  const brainIndex = intel.pillars.orgScore.score

  // Posture keeps its own STABLE/STRAINED/CRITICAL vocabulary — only what
  // feeds it changed.
  const posture =
    brainIndex >= 80 ? 'STABLE'
    : brainIndex >= 60 ? 'STRAINED'
    : 'CRITICAL'
```

- [ ] **Step 2: Run the full suite**

```bash
node tests/run-all.js
```
Expected: all suites pass.

- [ ] **Step 3: Manual verification checkpoint**

With the dev server running (and, as in Task 3, mindful of `brain_core_snapshots`' daily cache):

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/intelligence/brain-core/posture
```

Confirm `brainIndex` matches the same value Task 3's Step 1 snippet printed (both now read `intel.pillars.orgScore.score` from the same `domain.intelligence.all()` computation).

- [ ] **Step 4: Commit**

```bash
git add backend/routes/intelligence/brainCore.js
git commit -m "$(cat <<'EOF'
brainCore.js's Brain Index reads pillars.orgScore instead of its own weighted composite (D-17)

Same fix as orchestrator.js's (previous commit) applied to the second of the
two OIS-shaped composites the pre-existing brain-as-library-design.md left
unresolved (see its open question 3). The 10-signal breakdown, summary/
explanation prose and brain_core_snapshots caching are unchanged.
EOF
)"
```

---

### Task 5: `prediction.js` — Org Science cards route through `domain.graph`, not `brain` directly (D-12, D-18)

**Files:**
- Modify: `backend/routes/intelligence/prediction.js`

**Interfaces:**
- Consumes: `domain.graph.run`, `.isReady`, `.toCode`, `.source` (already re-exported by `domain/index.js:53-64` — `run: brain.run`, `isReady: brain.isReady`, `toCode: brain.toCode`, `source: brain.graphSource`).
- Produces: identical response shape from all 8 card endpoints — this is an import-path change, `domain.graph.run` **is** `brain.run`.

- [ ] **Step 1: Capture before-fix payloads for the byte-diff check**

With the dev server running:

```bash
for ep in pattern dna culture maturity behavior benchmark strategic-alignment capability-by-dept; do
  curl -s -H "Authorization: Bearer <token>" "http://localhost:3000/api/intelligence/$ep" > "/tmp/before-$ep.json"
done
```

- [ ] **Step 2: Swap `brain.*` for `domain.graph.*`**

In `backend/routes/intelligence/prediction.js`, replace:

```js
const brain = require('../../brain')
```

with:

```js
const domain = require('../../domain')
```

Then, in `runModule()`, replace:

```js
async function runModule(analysis) {
  if (!brain.isReady()) {
    const err = new Error('Brain graph not loaded')
    err.status = 503
    throw err
  }
  const intel = await brain.run(analysis)
  if (!intel) {
    const err = new Error(`Analysis ${analysis} produced no intelligence`)
    err.status = 502
    throw err
  }
  return {
    module: brain.toCode(analysis),
    analysis,
    type: intel.type,
    confidence: intel.confidence,
    payload: intel.payload,
    recommendations: intel.recommendations || [],
    dataSource: brain.graphSource(),
    generatedAt: new Date().toISOString(),
  }
}
```

with:

```js
async function runModule(analysis) {
  if (!domain.graph.isReady()) {
    const err = new Error('Brain graph not loaded')
    err.status = 503
    throw err
  }
  const intel = await domain.graph.run(analysis)
  if (!intel) {
    const err = new Error(`Analysis ${analysis} produced no intelligence`)
    err.status = 502
    throw err
  }
  return {
    module: domain.graph.toCode(analysis),
    analysis,
    type: intel.type,
    confidence: intel.confidence,
    payload: intel.payload,
    recommendations: intel.recommendations || [],
    dataSource: domain.graph.source(),
    generatedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 3: Run the full suite**

```bash
node tests/run-all.js
```
Expected: all suites pass (`intelligence.verify.test.js` and `brain.smoke.test.js` exercise `brain.run`/`brain.runMany` directly and are unaffected — this task only touches the route file).

- [ ] **Step 4: Byte-diff verification checkpoint**

```bash
for ep in pattern dna culture maturity behavior benchmark strategic-alignment capability-by-dept; do
  curl -s -H "Authorization: Bearer <token>" "http://localhost:3000/api/intelligence/$ep" > "/tmp/after-$ep.json"
  diff <(node -e "console.log(JSON.stringify(require('/tmp/before-$ep.json')))") \
       <(node -e "console.log(JSON.stringify(require('/tmp/after-$ep.json')))") \
    && echo "$ep: identical (excluding generatedAt timestamp)" || echo "$ep: DIFFERS — investigate"
done
```
Expected: identical except `generatedAt` (a fresh timestamp each call) — matches the verification method the pre-existing brain-as-library work already used (design doc §5's testing note).

- [ ] **Step 5: Commit**

```bash
git add backend/routes/intelligence/prediction.js
git commit -m "$(cat <<'EOF'
prediction.js routes the 8 Org Science cards through domain.graph, not brain directly (D-12, D-18)

domain.graph.run/isReady/toCode/source already re-export brain's equivalents
(domain/index.js), so this is an import-path change with an identical call
path underneath — response payloads are unchanged (verified byte-identical
except generatedAt). Satisfies D-12's 'routes stop reaching into brain/
directly' without reimplementing these 8 graph-structural analyses in
derived.js, which none of them have an equivalent shape for.
EOF
)"
```

---

### Task 6: `health.js` — absorb WIP, migrate `/departments`, add historical provenance

**Files:**
- Modify: `backend/routes/health/health.js`

**Interfaces:**
- Consumes: `domain.intelligence.all().orgHealthByDepartment` (Task 1), `domain.intelligence.all().orgHealth` (existing).
- Produces: `/departments`'s response shape is unchanged (`weakestDepartment`, `departments: [{department, healthIndex, healthStatus, scores: {...}}]`) but is now live. `/trend`, `/history`, `/summary` gain provenance fields additively.

- [ ] **Step 1: Review and stage the pre-existing WIP alone**

```bash
git diff backend/routes/health/health.js
```
Confirm the diff matches the design doc §4's description: deletion of the local `WEIGHTS`/`computeHealthIndex()` combiner, `/summary` and `/dimensions` weight labels corrected from `25%/25%/15%/15%` to uniform `20%` each, `/critical` reading `dimensions.healthIndex`/`dimensions.healthStatus` (now present on `computeLiveDimensions()`'s return) instead of recomputing its own `liveIndex` via the deleted combiner. This is exactly the D-02/D-12 consolidation this workstream's design calls for — stage and commit alone:

```bash
git add backend/routes/health/health.js
git commit -m "$(cat <<'EOF'
Absorb health.js's pre-existing consolidation onto domain.intelligence.all().orgHealth (D-02, D-12)

Was already correct at session start, uncommitted: deletes the route's own
weighted health-index combiner (documentation 20%/continuity 25%/ownership
15%/safety 25%/incident 15%) that /critical alone read from, while /summary
and /dimensions already read domain/derived.js's unweighted orgHealth.healthIndex
with different STABLE/WARNING thresholds — same org, same moment, two
different numbers depending which endpoint you called. One index now.
EOF
)"
```

- [ ] **Step 2: Write the failing manual check for `/departments`**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/health/departments
```
Expected at this point: reads `dept_health_scores` directly — still the frozen table, confirming this is the behavior Step 3 changes.

- [ ] **Step 3: Migrate `/departments` onto `orgHealthByDepartment`**

In `backend/routes/health/health.js`, replace the `/departments` handler (currently lines 199-237):

```js
router.get('/departments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dept_health_scores')
      .select('*')
      .order('snapshot_month', { ascending: false })

    if (error) throw new Error(error.message)

    // Keep only the latest snapshot per department
    const latestByDept = {}
    data.forEach(d => {
      if (!latestByDept[d.department]) latestByDept[d.department] = d
    })

    const departments = Object.values(latestByDept)
      .sort((a, b) => a.health_index - b.health_index)

    const weakest = departments[0]

    res.json({
      weakestDepartment: weakest?.department ?? null,
      departments: departments.map(d => ({
        department: d.department,
        healthIndex: d.health_index,
        healthStatus: d.health_status,
        scores: {
          documentation: d.documentation_score,
          continuity:    d.continuity_score,
          ownership:     d.ownership_score,
          safety:        d.safety_score,
          incident:      d.incident_score
        }
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

with:

```js
router.get('/departments', async (req, res) => {
  try {
    // Was dept_health_scores — a frozen table, one row per department, never
    // rewritten after seeding. Computed live now, from the same orgHealth()
    // formula the org-level score uses, per department (D-09a, D-21).
    const intel = await domain.intelligence.all()
    const departments = [...intel.orgHealthByDepartment.departments]
      .sort((a, b) => a.healthIndex - b.healthIndex)

    const weakest = departments[0]

    res.json({
      weakestDepartment: weakest?.department ?? null,
      departments: departments.map(d => ({
        department: d.department,
        healthIndex: d.healthIndex,
        healthStatus: d.healthStatus,
        scores: {
          documentation: d.documentationScore,
          continuity:    d.continuityScore,
          ownership:     d.ownershipSpreadScore,
          safety:        d.criticalSafetyScore,
          incident:      d.incidentLoadScore
        }
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

- [ ] **Step 4: Add historical provenance to `/trend` and `/history`**

In `backend/routes/health/health.js`'s `/trend` handler (currently lines 243-270), add a `provenance` field to the response — replace:

```js
    res.json({
      trend,
      changeFromBaseline: change,
      baselineMonth: first?.snapshot_month,
      latestMonth: latest?.snapshot_month,
      baselineIndex: first?.health_index,
      latestIndex: latest?.health_index,
      monthlyTrend: snapshots.map(s => ({
        month: s.snapshot_month,
        healthIndex: s.health_index,
        healthStatus: s.health_status
      }))
    })
```

with:

```js
    res.json({
      trend,
      changeFromBaseline: change,
      baselineMonth: first?.snapshot_month,
      latestMonth: latest?.snapshot_month,
      baselineIndex: first?.health_index,
      latestIndex: latest?.health_index,
      monthlyTrend: snapshots.map(s => ({
        month: s.snapshot_month,
        healthIndex: s.health_index,
        healthStatus: s.health_status
      })),
      // org_health_snapshots is a genuine, never-rewritten time series (D-09
      // KEEP list) — this trend can never be recomputed, unlike the current
      // month's figures the rest of this file reads from domain.intelligence.
      provenance: { source: 'historical', table: 'org_health_snapshots' }
    })
```

In `/history` (currently lines 276-298), same pattern — replace:

```js
    res.json({
      totalSnapshots: snapshots.length,
      snapshots: snapshots.map(s => ({
        month: s.snapshot_month,
        healthIndex: s.health_index,
        healthStatus: s.health_status,
        dimensions: {
          documentation:   s.documentation_score,
          continuity:      s.continuity_score,
          ownershipSpread: s.ownership_spread_score,
          criticalSafety:  s.critical_safety_score,
          incidentLoad:    s.incident_load_score
        }
      }))
    })
```

with:

```js
    res.json({
      totalSnapshots: snapshots.length,
      snapshots: snapshots.map(s => ({
        month: s.snapshot_month,
        healthIndex: s.health_index,
        healthStatus: s.health_status,
        dimensions: {
          documentation:   s.documentation_score,
          continuity:      s.continuity_score,
          ownershipSpread: s.ownership_spread_score,
          criticalSafety:  s.critical_safety_score,
          incidentLoad:    s.incident_load_score
        }
      })),
      provenance: { source: 'historical', table: 'org_health_snapshots' }
    })
```

- [ ] **Step 5: Add both provenances to `/summary`**

In `/summary` (currently lines 109-131), replace:

```js
    res.json({
      healthIndex: snapshot.health_index,
      healthStatus: snapshot.health_status,
      trend,
      snapshotMonth: snapshot.snapshot_month,
      dimensions: {
        documentation:   { score: snapshot.documentation_score,    weight: '20%' },
        continuity:      { score: snapshot.continuity_score,        weight: '20%' },
        ownershipSpread: { score: snapshot.ownership_spread_score,  weight: '20%' },
        criticalSafety:  { score: snapshot.critical_safety_score,   weight: '20%' },
        incidentLoad:    { score: snapshot.incident_load_score,      weight: '20%' }
      }
    })
```

with:

```js
    res.json({
      healthIndex: snapshot.health_index,
      healthStatus: snapshot.health_status,
      trend,
      snapshotMonth: snapshot.snapshot_month,
      dimensions: {
        documentation:   { score: snapshot.documentation_score,    weight: '20%' },
        continuity:      { score: snapshot.continuity_score,        weight: '20%' },
        ownershipSpread: { score: snapshot.ownership_spread_score,  weight: '20%' },
        criticalSafety:  { score: snapshot.critical_safety_score,   weight: '20%' },
        incidentLoad:    { score: snapshot.incident_load_score,      weight: '20%' }
      },
      // Two different provenances in one response: healthIndex/dimensions are
      // this month's live computation (getCurrentSnapshot() -> derived.js's
      // orgHealth); trend is read from org_health_snapshots' stored rows, which
      // can never be recomputed. Collapsing these into one field would
      // misrepresent whichever half it didn't describe.
      computedProvenance: { source: snapshot.source, computedAt: snapshot.computed_at },
      trendProvenance: { source: 'historical', table: 'org_health_snapshots' }
    })
```

- [ ] **Step 6: Run the full suite**

```bash
node tests/run-all.js
```
Expected: all suites pass.

- [ ] **Step 7: Manual verification checkpoint**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/health/departments
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/health/summary
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/health/trend
```
Confirm `/departments` returns computed values (no longer identical to whatever `dept_health_scores` held), `/summary` carries both `computedProvenance` and `trendProvenance`, `/trend` carries `provenance.source === 'historical'`.

- [ ] **Step 8: Commit**

```bash
git add backend/routes/health/health.js
git commit -m "$(cat <<'EOF'
health.js: live /departments, historical provenance on /trend, /history, /summary (D-09a, D-20, D-21)

/departments migrates off dept_health_scores (D-09 DROP list) onto
orgHealthByDepartment — same formula as the org-level index, per department.
/trend, /history and /summary's trend half now say explicitly that
org_health_snapshots is a genuine, never-recomputed time series;
/summary's current-month half gets its own live provenance alongside it.
EOF
)"
```

---

### Task 7: `learning.js` — fully live (D-09a, D-21, F-L)

**Files:**
- Modify: `backend/routes/learning/learning.js`

**Interfaces:**
- Consumes: `domain.intelligence.all().executiveMemory.items` (for `/failures`), `domain.intelligence.all().departmentExposure` (for `/incidents`, `/departments`), `domain.intelligence.all().orgHealth`... no — `learning_snapshots` stays a direct historical read for `/summary`/`/decisions`, just provenance-stamped.
- Produces: `/failures`, `/incidents`, `/departments` response shapes unchanged; `/summary`, `/decisions` gain a `provenance` field.

`learning.js` also carries pre-existing unstaged WIP at session start (the `formatLevel()` null-guard — `return level ? level.replace(...) : 'unknown'`). Confirmed unrelated to this task by diff review during brainstorming.

- [ ] **Step 1: Isolate and stage the unrelated WIP first**

```bash
git diff backend/routes/learning/learning.js
```
Confirm the only change is `formatLevel()`'s null-guard. Stage and commit it alone, since it is unrelated to D-09a/D-21 but must not get bundled into this task's commit:

```bash
git add backend/routes/learning/learning.js
git commit -m "$(cat <<'EOF'
formatLevel() handles a missing learning_maturity_level without throwing

Pre-existing WIP, unrelated to W-D — absorbed here only because learning.js
is about to change substantially in the same file.
EOF
)"
```

- [ ] **Step 2: Migrate `/failures` onto `executiveMemory`**

In `backend/routes/learning/learning.js`, add `domain` to the requires at the top of the file — replace:

```js
const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
```

with:

```js
const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')
```

Then replace `fetchFailurePatterns()` (currently lines 25-33):

```js
async function fetchFailurePatterns() {
  const { data, error } = await supabase
    .from('failure_patterns')
    .select('*')
    .order('failure_severity', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
```

with:

```js
// Was failure_patterns — a frozen table derived.js's own top-of-file comment
// already names as forbidden input (alongside governance_assessments etc).
// executiveMemory()'s repeat_offender/lesson items answer the same question
// live, from workflow_failures; reshaped here to failure_patterns' original
// field names so this route's response contract is unchanged (F-L).
async function fetchFailurePatterns() {
  const intel = await domain.intelligence.all()
  return intel.executiveMemory.items
    .filter((i) => i.memoryType === 'repeat_offender' || i.memoryType === 'lesson')
    .map((i) => ({
      asset_name: i.entityName,
      asset_type: i.memoryType === 'repeat_offender' ? 'workflow' : 'failure_type',
      appearance_count: i.evidence.failureCount ?? i.evidence.workflowCount ?? 0,
      failure_severity: i.severity,
      is_repeat_offender: i.memoryType === 'repeat_offender',
      reasons: [i.description],
    }))
}
```

- [ ] **Step 3: Migrate `/incidents` and `/departments` onto `departmentExposure`**

Replace `fetchDepartmentExposure()` (currently lines 35-43):

```js
async function fetchDepartmentExposure() {
  const { data, error } = await supabase
    .from('department_exposure')
    .select('*')
    .order('incident_exposure_score', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
```

with:

```js
// Was department_exposure — frozen, uncatalogued in the decision log until
// this workstream traced it. Computed live now (D-21) from the same root
// tables orgHealthByDepartment uses, but a different formula answering a
// different question — see domain/derived.js's departmentExposure().
async function fetchDepartmentExposure() {
  const intel = await domain.intelligence.all()
  return [...intel.departmentExposure.departments]
    .sort((a, b) => b.incidentExposureScore - a.incidentExposureScore)
    .map((d) => ({
      department: d.department,
      documentation_coverage: d.documentationCoverage,
      backup_coverage: d.backupCoverage,
      incident_exposure_score: d.incidentExposureScore,
      incident_risk_level: d.incidentRiskLevel,
    }))
}
```

`/incidents` and `/departments` (the two handlers calling `fetchDepartmentExposure()`) need no other change — they already read `d.department`/`d.documentation_coverage`/`d.backup_coverage`/`d.incident_exposure_score`/`d.incident_risk_level`, which this new implementation still returns under the same names.

- [ ] **Step 4: Add historical provenance to `/summary` and `/decisions`**

In `/summary` (currently lines 49-73), add a `provenance` field — replace the closing of the `res.json({...})` call:

```js
      highestExposureDepartment: highestExposureDept
        ? { department: highestExposureDept.department, exposureScore: highestExposureDept.incident_exposure_score }
        : null
    })
```

with:

```js
      highestExposureDepartment: highestExposureDept
        ? { department: highestExposureDept.department, exposureScore: highestExposureDept.incident_exposure_score }
        : null,
      // learning_snapshots is a genuine, never-rewritten time series (D-09
      // KEEP list) — snapshot.* above can never be recomputed.
      provenance: { source: 'historical', table: 'learning_snapshots' }
    })
```

In `/decisions` (currently lines 105-121), same pattern — replace:

```js
      interpretation: snapshot.mitigation_percentage < 50
        ? 'Less than half of known organizational risks have been addressed.'
        : 'Majority of known organizational risks have been addressed.'
    })
```

with:

```js
      interpretation: snapshot.mitigation_percentage < 50
        ? 'Less than half of known organizational risks have been addressed.'
        : 'Majority of known organizational risks have been addressed.',
      provenance: { source: 'historical', table: 'learning_snapshots' }
    })
```

- [ ] **Step 5: Run the full suite**

```bash
node tests/run-all.js
```
Expected: all suites pass.

- [ ] **Step 6: Manual verification checkpoint**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/learning/failures
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/learning/incidents
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/learning/departments
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/learning/summary
```
Confirm `/failures`, `/incidents`, `/departments` return computed values in the same field shape as before, `/summary` carries `provenance.source === 'historical'`.

- [ ] **Step 7: Commit**

```bash
git add backend/routes/learning/learning.js
git commit -m "$(cat <<'EOF'
learning.js is fully live: /failures onto executiveMemory, /incidents + /departments onto departmentExposure (D-09a, D-21, F-L)

Closes the last route in the decision log's consumer list that was still
100% frozen-table-backed. /summary and /decisions (reading the genuinely
historical learning_snapshots) gain explicit historical provenance.
EOF
)"
```

---

### Task 8: `forecast.js` — historical provenance on all four handlers (D-09a, D-20)

**Files:**
- Modify: `backend/routes/forecast/forecast.js`

**Interfaces:**
- Consumes: nothing new — `organizational_forecasts` stays a direct read.
- Produces: `/summary`, `/health`, `/memory`, `/continuity`, `/outlook` each gain a `provenance` field.

`forecast.js` carries pre-existing unstaged WIP at session start (the four `if (!forecasts.length) return res.status(404)...` guards). Confirmed unrelated to D-09a/D-20 by diff review — a genuine bug fix (an empty `organizational_forecasts` table previously crashed on `forecasts[forecasts.length - 1]`), just not part of this workstream's decisions.

- [ ] **Step 1: Isolate and stage the unrelated WIP first**

```bash
git diff backend/routes/forecast/forecast.js
```
Confirm the diff is exactly the four `404` guards. Stage and commit alone:

```bash
git add backend/routes/forecast/forecast.js
git commit -m "$(cat <<'EOF'
forecast.js's four handlers 404 on an empty organizational_forecasts table

Pre-existing WIP, unrelated to W-D — previously crashed on
forecasts[forecasts.length - 1] against an empty array. Absorbed here only
because forecast.js is about to change again in the same file.
EOF
)"
```

- [ ] **Step 2: Add provenance to all four handlers**

In `backend/routes/forecast/forecast.js`, `/summary` (currently ends around line 69) — replace:

```js
    res.json({
      forecasts: forecasts.map(formatForecast),
      headlineOutlook: {
        horizonDays: latest.horizon_days,
        outlookScore: latest.outlook_score,
        outlookStatus: latest.outlook_status,
        weakestDimension: ['health', 'memory', 'continuity'].reduce((weakest, dim) => {
          const scoreKey = `${dim}_score`
          if (!weakest || latest[scoreKey] < latest[`${weakest}_score`]) return dim
          return weakest
        }, null)
      }
    })
```

with:

```js
    res.json({
      forecasts: forecasts.map(formatForecast),
      headlineOutlook: {
        horizonDays: latest.horizon_days,
        outlookScore: latest.outlook_score,
        outlookStatus: latest.outlook_status,
        weakestDimension: ['health', 'memory', 'continuity'].reduce((weakest, dim) => {
          const scoreKey = `${dim}_score`
          if (!weakest || latest[scoreKey] < latest[`${weakest}_score`]) return dim
          return weakest
        }, null)
      },
      // organizational_forecasts is a genuine, never-rewritten time series
      // (D-09 KEEP list) — these figures can never be recomputed live.
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
```

`/health` — replace:

```js
    res.json(forecasts.map(f => ({
      horizonDays: f.horizon_days,
      healthScore: f.health_score,
      trend: f.health_trend
    })))
```

with:

```js
    res.json({
      forecasts: forecasts.map(f => ({
        horizonDays: f.horizon_days,
        healthScore: f.health_score,
        trend: f.health_trend
      })),
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
```

(Note: this changes `/health`'s top-level response from a bare array to an object with a `forecasts` key plus `provenance` — the only shape change in this task, necessary because a bare array has nowhere to attach a sibling field. Flag this to the frontend consumer of `/api/forecast/health`, if any, before merging — `grep -rn "forecast/health" frontend/` to check.)

`/memory` — replace the end of its `res.json({...})`:

```js
      undocumentedAssets: undocumented.map(u => ({
        name: u.reference_name,
        detail: u.detail
      }))
    })
```

with:

```js
      undocumentedAssets: undocumented.map(u => ({
        name: u.reference_name,
        detail: u.detail
      })),
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
```

`/continuity` — replace:

```js
      workflowsWithoutBackup: noBackup.map(w => ({
        name: w.reference_name,
        detail: w.detail
      }))
    })
```

with:

```js
      workflowsWithoutBackup: noBackup.map(w => ({
        name: w.reference_name,
        detail: w.detail
      })),
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
```

`/outlook` — replace:

```js
      keyFindings: {
        criticalMemoryCarriers: grouped.criticalMemoryCarriers.map(c => ({ name: c.reference_name, detail: c.detail })),
        fragileWorkflows: grouped.fragileWorkflows.map(w => ({ name: w.reference_name, detail: w.detail })),
        workflowsWithoutBackup: grouped.workflowsWithoutBackup.map(w => ({ name: w.reference_name, detail: w.detail })),
        undocumentedAssets: grouped.undocumentedAssets.map(u => ({ name: u.reference_name, detail: u.detail }))
      }
    })
```

with:

```js
      keyFindings: {
        criticalMemoryCarriers: grouped.criticalMemoryCarriers.map(c => ({ name: c.reference_name, detail: c.detail })),
        fragileWorkflows: grouped.fragileWorkflows.map(w => ({ name: w.reference_name, detail: w.detail })),
        workflowsWithoutBackup: grouped.workflowsWithoutBackup.map(w => ({ name: w.reference_name, detail: w.detail })),
        undocumentedAssets: grouped.undocumentedAssets.map(u => ({ name: u.reference_name, detail: u.detail }))
      },
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
```

- [ ] **Step 3: Check `/health`'s shape change against the frontend**

```bash
grep -rn "forecast/health\|forecastHealth" frontend/
```
If a consumer exists and expects a bare array, adjust it in the same commit (out of caution — this plan does not assume the frontend is untouched by a response-shape change it introduces).

- [ ] **Step 4: Run the full suite**

```bash
node tests/run-all.js
```

- [ ] **Step 5: Manual verification checkpoint**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/forecast/summary
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/forecast/health
```
Confirm both carry `provenance.source === 'historical'`.

- [ ] **Step 6: Commit**

```bash
git add backend/routes/forecast/forecast.js frontend/
git commit -m "$(cat <<'EOF'
forecast.js: historical provenance on all four handlers (D-09a, D-20)

organizational_forecasts (D-09 KEEP list, confirmed zero writers anywhere
in backend/) is a genuine time series that can never be recomputed live.
/health's response becomes {forecasts, provenance} instead of a bare array
so provenance has somewhere to attach; frontend consumers checked and
adjusted if needed.
EOF
)"
```

---

### Task 9: `briefing.js` — historical provenance on `/documentation-trend` only (D-09a, D-20)

**Files:**
- Modify: `backend/routes/briefing/briefing.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `/documentation-trend` gains a `provenance` field. **No other handler in this file changes** — `executive_briefings` is a live daily cache (confirmed by its own `.insert()` in `/today`), not a KEEP-list table, and must not be stamped `historical`.

`briefing.js` carries pre-existing unstaged WIP at session start (`getPendingDecisionsCount()`'s `if (error) throw` addition). Confirmed unrelated by diff review.

- [ ] **Step 1: Isolate and stage the unrelated WIP first**

```bash
git diff backend/routes/briefing/briefing.js
```
Confirm the only change is `getPendingDecisionsCount()` now throwing on a query error instead of silently returning `count ?? 0` from a failed query. Stage and commit alone:

```bash
git add backend/routes/briefing/briefing.js
git commit -m "$(cat <<'EOF'
getPendingDecisionsCount() throws on a query error instead of silently returning 0

Pre-existing WIP, unrelated to W-D — a failed pending_decisions count used to
render identically to a genuinely empty queue. Absorbed here only because
briefing.js is about to change again in the same file.
EOF
)"
```

- [ ] **Step 2: Add provenance to `/documentation-trend` only**

In `backend/routes/briefing/briefing.js`, replace the `/documentation-trend` handler's response (currently around lines 226-253):

```js
    res.json({
      currentCoverage: latest?.coverage_pct ?? null,
      startingCoverage: first?.coverage_pct ?? null,
      safeThreshold: 60,
      belowSafeThreshold: (latest?.coverage_pct ?? 0) < 60,
      trend: data.map(d => ({
        month: d.recorded_month,
        coveragePct: d.coverage_pct,
        totalAssets: d.total_assets,
        documented: d.documented
      }))
    })
```

with:

```js
    res.json({
      currentCoverage: latest?.coverage_pct ?? null,
      startingCoverage: first?.coverage_pct ?? null,
      safeThreshold: 60,
      belowSafeThreshold: (latest?.coverage_pct ?? 0) < 60,
      trend: data.map(d => ({
        month: d.recorded_month,
        coveragePct: d.coverage_pct,
        totalAssets: d.total_assets,
        documented: d.documented
      })),
      // documentation_trend is a genuine, never-rewritten time series (D-09
      // KEEP list). Unlike executive_briefings elsewhere in this file (which
      // IS written daily by /today below), this can never be recomputed.
      provenance: { source: 'historical', table: 'documentation_trend' }
    })
```

Do **not** touch `/today`, `/summary`, `/history`, `/pending-decisions`, `/top-risks`, or `/recommendations` — none of them read a D-09 KEEP-list table directly (`/today` reads `documentation_trend` only via `getDocTrend()`'s internal computation, already folded into a briefing object stamped with its own `briefing_date`/insert timestamp, not exposed as a standalone historical figure).

- [ ] **Step 3: Run the full suite**

```bash
node tests/run-all.js
```

- [ ] **Step 4: Manual verification checkpoint**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/briefing/documentation-trend
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/briefing/today
```
Confirm `/documentation-trend` carries `provenance.source === 'historical'`; confirm `/today`'s response is byte-for-byte unchanged from before this task (it must not gain a provenance field — `executive_briefings` is live).

- [ ] **Step 5: Commit**

```bash
git add backend/routes/briefing/briefing.js
git commit -m "$(cat <<'EOF'
briefing.js: historical provenance on /documentation-trend only (D-09a, D-20)

documentation_trend (D-09 KEEP list) is genuinely historical; every other
handler in this file either computes live via domain.intelligence.all() or
reads executive_briefings, which /today writes daily and is therefore NOT
historical — deliberately not stamped.
EOF
)"
```

---

### Task 10: `context.js` — historical provenance on `/metrics`'s `documentation_trend` field (D-09a, D-20)

**Files:**
- Modify: `backend/routes/context/context.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `/metrics`'s `liveMetrics` object gains a `documentationCoverageProvenance` field.

`context.js` had no pre-existing unstaged WIP at session start — clean to stage as a whole file.

- [ ] **Step 1: Add provenance to `/metrics`**

In `backend/routes/context/context.js`, `/metrics` (currently lines 199-242), replace:

```js
    res.json({
      totalWeakMetrics: items.length,
      contextItems: items.map(formatItem),
      liveMetrics: {
        organizationalHealthIndex: healthSnapshot?.health_index ?? null,
        healthStatus:              healthSnapshot?.health_status ?? null,
        documentationCoverage:     docTrend?.coverage_pct ?? null,
        orgIntelligenceScore:      orgScore?.score ?? null,
        orgIntelligenceRating:     orgScore?.rating ?? null
      }
    })
```

with:

```js
    res.json({
      totalWeakMetrics: items.length,
      contextItems: items.map(formatItem),
      liveMetrics: {
        organizationalHealthIndex: healthSnapshot?.health_index ?? null,
        healthStatus:              healthSnapshot?.health_status ?? null,
        documentationCoverage:     docTrend?.coverage_pct ?? null,
        orgIntelligenceScore:      orgScore?.score ?? null,
        orgIntelligenceRating:     orgScore?.rating ?? null
      },
      // organizationalHealthIndex/orgIntelligenceScore above are this
      // moment's live computation; documentationCoverage is read directly
      // from documentation_trend, a genuine never-rewritten time series
      // (D-09 KEEP list) — the one figure in this response that cannot be
      // recomputed.
      metricsProvenance: {
        documentationCoverage: { source: 'historical', table: 'documentation_trend' },
        organizationalHealthIndex: { source: 'live' },
        orgIntelligenceScore: { source: 'live' }
      }
    })
```

- [ ] **Step 2: Run the full suite**

```bash
node tests/run-all.js
```

- [ ] **Step 3: Manual verification checkpoint**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3000/api/context/metrics
```
Confirm `metricsProvenance.documentationCoverage.source === 'historical'` and the other two are `'live'`.

- [ ] **Step 4: Commit**

```bash
git add backend/routes/context/context.js
git commit -m "$(cat <<'EOF'
context.js: /metrics distinguishes documentation_trend's historical figure from its two live ones (D-09a, D-20)
EOF
)"
```

---

### Task 11: `executive.js` — regression coverage for already-correct behavior (D-02)

**Files:**
- Modify: `backend/tests/derived.unit.test.js` (add one assertion; no route code changes — `executive.js` already reads `intel.pillars.orgScore` at HEAD, confirmed by `git log`/`git status` showing this file has zero pending changes)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task only guards against a future regression back to a locally-computed OIS in this file.

`executive.js`'s `answerGeneral()` (lines 197-222) already builds `orgScore` from `intel.pillars.orgScore.score`/`.rating` — this is committed at HEAD, not pending WIP, so there is no code change here. The gap is that nothing currently asserts this stays true; a future edit could silently reintroduce a local computation the way `orchestrator.js` and `brainCore.js` had. Since `derived.js`'s `pillars()` is already fully unit-tested (existing "Pillars" section of `derived.unit.test.js`), the missing piece is a same-file assertion that `executive.js`'s source code itself references `pillars.orgScore` and not some other computation — a lightweight grep-based regression check, not a route-level test (consistent with this plan's Global Constraints on not inventing HTTP test infra).

- [ ] **Step 1: Write the regression check**

Add to `backend/tests/derived.unit.test.js`, in the "Provenance across the board" section (or immediately after it):

```js
// ── Source-level regression: no file re-derives its own OIS ─────────────────
console.log('\nNo route computes a second Organizational Intelligence Score (D-02, D-17):')
{
	const fs = require('fs')
	const path = require('path')
	const filesThatMustReadPillarsOrgScore = [
		'../routes/executive/executive.js',
		'../routes/voice/voice.js',
		'../routes/intelligence/orchestrator.js',
		'../routes/intelligence/brainCore.js',
	]
	for (const rel of filesThatMustReadPillarsOrgScore) {
		const src = fs.readFileSync(path.join(__dirname, rel), 'utf8')
		check(`${rel} reads intel.pillars.orgScore`, src.includes('pillars.orgScore'), rel)
	}
}
```

- [ ] **Step 2: Run to verify it passes against the current tree**

```bash
node tests/derived.unit.test.js
```
Expected: PASS for all four files — `executive.js` already does this at HEAD; the other three were made true by Tasks 2–4.

- [ ] **Step 3: Run the full suite**

```bash
node tests/run-all.js
```
Expected: all suites pass. This is the final task — confirm every prior task's commit is still present and green together.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
Add source-level regression check: no route re-derives its own OIS (D-02)

executive.js already read intel.pillars.orgScore at HEAD before this
workstream started; voice.js, orchestrator.js and brainCore.js were fixed
by Tasks 2-4. This guards all four against silently reintroducing a local
computation.
EOF
)"
```

---

## Post-plan check

After Task 11's commit, run `git log --oneline -20` and confirm every commit names a decision (`D-02`, `D-09a`, `D-11`, `D-12`, `D-17`, `D-18`, `D-19`, `D-20`, `D-21`, `F-L`) except the three WIP-isolation commits (Tasks 2, 7, 8, 9's Step 1), which correctly name no decision because they are not this workstream's work. Confirm `git status --short` shows only the files this plan did not touch still modified (`governance.js`, `memory.js`, `orchestration.js`, `gateCheck.js`, `knowledge/gaps.js`, `knowledge/impact.js`, `index.js`, `middleware/auth.js`, `auth/auth.js`, `.env.example`, `schema.sql`, `.claude/launch.json`, `constitutional-modules.js`, `employeeLeaves.js`, `platformDown.js`, and the frontend files) — everything this plan committed should no longer appear in `git status`.
