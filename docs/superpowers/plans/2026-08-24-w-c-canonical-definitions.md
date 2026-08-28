# W-C Canonical Definitions Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the criticality vocabulary, the SPOF rule, and the evidence threshold into one pure module that every other layer consumes, and fix the three real bugs that the duplication was hiding (F-B, F-G-prime, F-K).

**Architecture:** A new `backend/domain/definitions.js` holds pure functions over rows the caller has already loaded — no database access, no I/O. It sits *beneath* `derived.js` so the existing single-load-per-request guarantee is untouched. `derived.js`, `brain/`, and route files become consumers. Migration is deliberately ordered so that the first consumer migrated (`derived.js`) is the one already believed correct, which proves the module is behavior-preserving before it is pointed at code known to be wrong.

**Tech Stack:** Node.js (CommonJS), Express 5, Supabase JS client. **No test framework** — this repo uses hand-rolled `node` test scripts with a local `check()` helper, registered in `backend/tests/run-all.js`. Do not introduce jest, mocha, or vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-w-c-canonical-definitions-design.md`
**Decision log:** `docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md`

## Global Constraints

- **CommonJS only.** `require` / `module.exports`. No ESM, no TypeScript, in `backend/`.
- **`definitions.js` performs no I/O.** No `require('../supabase')`, no `async`, no `fetch`. Pure functions over plain objects. This is what makes it testable without a database and is not negotiable.
- **Tests are plain node scripts.** Copy the structure of `backend/tests/derived.unit.test.js`: a local `check(name, cond, detail)`, a passed/failed tally, and `process.exit(failed === 0 ? 0 : 1)` at the end.
- **Never fabricate a level.** Absent criticality resolves to the string `'unknown'`, which never satisfies any threshold. Defaulting to `'normal'` is the exact failure mode this workstream exists to remove (D-07).
- **Coverage threshold is `0.5`, inclusive** — exactly 50% computes; below 50% refuses (D-10).
- **Four criticality levels, ranked:** `low(0) < normal(1) < high(2) < critical(3)` (D-03).
- **SPOF requires criticality ≥ `high`**, meaning `{high, critical}`, and does **not** consult dependents (D-06).
- **Commit messages name the responsible decision** (e.g. `D-06`, `F-K`) so the trail exists in git — D-16 waived the reconciliation table, this is the compensating control.
- Run all tests from the `backend/` directory: `node tests/run-all.js`.

---

### Task 1: The criticality scale

**Files:**
- Create: `backend/domain/definitions.js`
- Create: `backend/tests/definitions.unit.test.js`
- Modify: `backend/tests/run-all.js:11-21` (add the new suite to the `tests` array)

**Interfaces:**
- Consumes: nothing.
- Produces: `LEVELS` (array), `RANK` (object), `UNKNOWN` (string `'unknown'`), `normalizeLevel(raw) -> string`, `atOrAbove(level, threshold) -> boolean`, `maxLevel(levels) -> string`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/definitions.unit.test.js`:

```js
/*
 * OBA Core — Canonical definitions unit test.
 *
 * definitions.js is the single source for three concepts that were previously
 * redefined in every file that needed them: how critical a thing is, how
 * critical a link is, and what counts as a single point of failure.
 *
 * These tests assert the DEFINITIONS themselves. A wrong definition here
 * propagates silently into every score in the product, so the assertions are
 * deliberately about boundaries and about absent data rather than happy paths.
 *
 * No database and no network — every function here is pure.
 *
 * Run from backend/:  node tests/definitions.unit.test.js
 */

const D = require('../domain/definitions')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Canonical Definitions Unit Test ===\n')

// ── The scale ────────────────────────────────────────────────────────────────
console.log('Criticality scale — four distinct levels (D-03):')
{
	check('four levels, lowest to highest', JSON.stringify(D.LEVELS) === JSON.stringify(['low', 'normal', 'high', 'critical']), D.LEVELS)
	check('critical outranks high', D.RANK.critical > D.RANK.high)
	check('high outranks normal', D.RANK.high > D.RANK.normal)
	check('normal outranks low', D.RANK.normal > D.RANK.low)

	check('normalizes casing and whitespace', D.normalizeLevel('  CRITICAL ') === 'critical', D.normalizeLevel('  CRITICAL '))
	check('unrecognized string is unknown', D.normalizeLevel('severe') === D.UNKNOWN, D.normalizeLevel('severe'))
	check('null is unknown', D.normalizeLevel(null) === D.UNKNOWN, D.normalizeLevel(null))
	check('undefined is unknown', D.normalizeLevel(undefined) === D.UNKNOWN, D.normalizeLevel(undefined))
	check('empty string is unknown', D.normalizeLevel('') === D.UNKNOWN, D.normalizeLevel(''))
}

console.log('\nThreshold comparison — unknown never qualifies (D-07):')
{
	check('critical is at or above high', D.atOrAbove('critical', 'high') === true)
	check('high is at or above high', D.atOrAbove('high', 'high') === true)
	check('normal is not at or above high', D.atOrAbove('normal', 'high') === false)
	check('low is not at or above high', D.atOrAbove('low', 'high') === false)
	// The single most important assertion in this file. If unknown ever
	// satisfies a threshold, absent data starts manufacturing findings.
	check('unknown is never at or above anything', D.atOrAbove(D.UNKNOWN, 'low') === false)
	check('unknown compared to unknown is false', D.atOrAbove(D.UNKNOWN, D.UNKNOWN) === false)
	check('a bogus threshold is false, not a throw', D.atOrAbove('critical', 'nonsense') === false)
}

console.log('\nmaxLevel — highest known, ignoring unknowns:')
{
	check('picks the highest', D.maxLevel(['low', 'critical', 'normal']) === 'critical', D.maxLevel(['low', 'critical', 'normal']))
	check('ignores unknown alongside known', D.maxLevel([D.UNKNOWN, 'normal']) === 'normal', D.maxLevel([D.UNKNOWN, 'normal']))
	check('all unknown stays unknown', D.maxLevel([D.UNKNOWN, D.UNKNOWN]) === D.UNKNOWN, D.maxLevel([D.UNKNOWN, D.UNKNOWN]))
	check('empty list is unknown', D.maxLevel([]) === D.UNKNOWN, D.maxLevel([]))
}

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'CANONICAL DEFINITIONS TESTS PASSED ✅' : 'CANONICAL DEFINITIONS TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: FAIL — `Error: Cannot find module '../domain/definitions'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/domain/definitions.js`:

```js
/**
 * OBA Core — Canonical definitions.
 *
 * One place where "how critical is this", "how critical is this link" and
 * "is this a single point of failure" are defined. Before this module those
 * three questions were answered independently in roughly twenty route files,
 * the brain, and the derived layer — and they disagreed. The brain treated
 * 'high' as the critical set and excluded 'critical' entirely; route loaders
 * defaulted an absent value to 'low' and collapsed several values by keeping
 * whichever row the database happened to return last.
 *
 * Everything here is PURE. No database, no async, no I/O. Callers load rows
 * and pass them in. That is deliberate: derived.js loads every root table once
 * per request and must keep doing so, and a definitions module that issued its
 * own queries would both break that guarantee and be untestable without a
 * database.
 *
 * The `unknown` level is the load-bearing idea. Absent criticality is not
 * `normal` and not `low` — it is unmeasured, and it never satisfies a
 * threshold. A default here would silently manufacture findings out of missing
 * data, which is the failure this whole workstream exists to remove.
 *
 * See docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md
 * (decisions D-03, D-06, D-07, D-10).
 */

/** Lowest to highest. Order is meaningful — RANK is derived from it. */
const LEVELS = ['low', 'normal', 'high', 'critical']

const RANK = Object.fromEntries(LEVELS.map((level, i) => [level, i]))

/**
 * Not a level. A sentinel meaning "no signal was recorded for this".
 * It has no rank and never compares true against a threshold.
 */
const UNKNOWN = 'unknown'

/** Coerces whatever the database held into a level, or UNKNOWN. */
function normalizeLevel(raw) {
	if (typeof raw !== 'string') return UNKNOWN
	const v = raw.trim().toLowerCase()
	return Object.prototype.hasOwnProperty.call(RANK, v) ? v : UNKNOWN
}

/**
 * True when `level` is at least as critical as `threshold`.
 *
 * Both arguments are normalized first, so callers may pass raw column values.
 * UNKNOWN on either side yields false — an unmeasured thing is never proven to
 * meet a bar, and an unmeasured bar can never be met.
 */
function atOrAbove(level, threshold) {
	const l = normalizeLevel(level)
	const t = normalizeLevel(threshold)
	if (l === UNKNOWN || t === UNKNOWN) return false
	return RANK[l] >= RANK[t]
}

/** Highest known level in the list; UNKNOWN when nothing is known. */
function maxLevel(levels) {
	let best = UNKNOWN
	for (const raw of levels || []) {
		const l = normalizeLevel(raw)
		if (l === UNKNOWN) continue
		if (best === UNKNOWN || RANK[l] > RANK[best]) best = l
	}
	return best
}

module.exports = {
	LEVELS,
	RANK,
	UNKNOWN,
	normalizeLevel,
	atOrAbove,
	maxLevel,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: PASS — `CANONICAL DEFINITIONS TESTS PASSED ✅`, `failed: 0`

- [ ] **Step 5: Register the suite in the runner**

In `backend/tests/run-all.js`, add to the `tests` array immediately after `'derived.unit.test.js',`:

```js
	'definitions.unit.test.js', // pure; asserts the canonical criticality/SPOF definitions
```

Then run the whole suite from `backend/` and confirm nothing else broke:
```bash
node tests/run-all.js
```
Expected: `ALL TEST SUITES PASSED ✅`

- [ ] **Step 6: Commit**

```bash
git add backend/domain/definitions.js backend/tests/definitions.unit.test.js backend/tests/run-all.js
git commit -m "Give criticality one scale with four distinct levels (D-03)"
```

---

### Task 2: Entity criticality across four different column names

**Files:**
- Modify: `backend/domain/definitions.js` (add resolver + field map, extend exports)
- Modify: `backend/tests/definitions.unit.test.js` (append a section before the summary block)

**Interfaces:**
- Consumes: `normalizeLevel`, `maxLevel`, `UNKNOWN` from Task 1.
- Produces: `ENTITY_CRITICALITY_FIELD` (object), `entityCriticality(entityType, row, ctx) -> string`. `ctx` is `{ knowledgeAssets: Array }`, required only for `entityType === 'platform'`.

**Background the implementer needs:** the signal lives under a different column name per table — `agents.risk`, `workflows.risk`, `knowledge_assets.criticality` — and `ai_platforms` has no such column at all. Platform criticality is therefore derived as the **maximum** criticality across `knowledge_assets` rows where `asset_type === 'platform'` and `asset_id === platform.id`. Those rows exist; `backend/sql/10_ai_platforms_knowledge_gaps.sql` populates them. This derivation is authored, not measured, and is labelled as such.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/definitions.unit.test.js`, **before** the `console.log('\n---...')` summary block:

```js
// ── Entity criticality ───────────────────────────────────────────────────────
console.log('\nEntity criticality — four different column names (D-03):')
{
	check('agent reads .risk', D.entityCriticality('agent', { risk: 'critical' }) === 'critical', D.entityCriticality('agent', { risk: 'critical' }))
	check('workflow reads .risk', D.entityCriticality('workflow', { risk: 'high' }) === 'high', D.entityCriticality('workflow', { risk: 'high' }))
	check('knowledge_asset reads .criticality', D.entityCriticality('knowledge_asset', { criticality: 'low' }) === 'low', D.entityCriticality('knowledge_asset', { criticality: 'low' }))

	// These tables have no `criticality` column, so the resolver must read the
	// column that exists rather than trusting a property that happens to be
	// present. Route view models DO carry `.criticality` legitimately — this
	// resolver is for raw rows, and the distinction matters.
	check('agent ignores a stray .criticality property', D.entityCriticality('agent', { criticality: 'critical' }) === D.UNKNOWN, D.entityCriticality('agent', { criticality: 'critical' }))
	check('workflow ignores a stray .criticality property', D.entityCriticality('workflow', { criticality: 'critical' }) === D.UNKNOWN, D.entityCriticality('workflow', { criticality: 'critical' }))

	check('unrecognized entity type is unknown', D.entityCriticality('teapot', { risk: 'critical' }) === D.UNKNOWN, D.entityCriticality('teapot', { risk: 'critical' }))
	check('missing row is unknown, not a throw', D.entityCriticality('agent', null) === D.UNKNOWN, D.entityCriticality('agent', null))
}

console.log('\nPlatform criticality — derived from knowledge assets (authored):')
{
	const knowledgeAssets = [
		{ asset_type: 'platform', asset_id: 1, criticality: 'normal' },
		{ asset_type: 'platform', asset_id: 1, criticality: 'critical' },
		{ asset_type: 'platform', asset_id: 2, criticality: 'low' },
		// Must not leak across asset types even when the id collides.
		{ asset_type: 'workflow', asset_id: 1, criticality: 'critical' },
	]
	const ctx = { knowledgeAssets }

	check('platform takes the max of its assets', D.entityCriticality('platform', { id: 1 }, ctx) === 'critical', D.entityCriticality('platform', { id: 1 }, ctx))
	check('platform with one low asset is low', D.entityCriticality('platform', { id: 2 }, ctx) === 'low', D.entityCriticality('platform', { id: 2 }, ctx))
	// The consequence the owner signed off on: no coverage means not
	// evaluable, NOT "normal". Those platforms fall out of SPOF entirely.
	check('platform with no assets is unknown, not normal', D.entityCriticality('platform', { id: 99 }, ctx) === D.UNKNOWN, D.entityCriticality('platform', { id: 99 }, ctx))
	check('platform without ctx is unknown, not a throw', D.entityCriticality('platform', { id: 1 }) === D.UNKNOWN, D.entityCriticality('platform', { id: 1 }))
	check('other asset types do not leak in', D.entityCriticality('platform', { id: 1 }, { knowledgeAssets: [{ asset_type: 'workflow', asset_id: 1, criticality: 'critical' }] }) === D.UNKNOWN)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: FAIL — `TypeError: D.entityCriticality is not a function`

- [ ] **Step 3: Write minimal implementation**

In `backend/domain/definitions.js`, add before `module.exports`:

```js
/**
 * Which column actually carries the criticality signal, per entity type.
 *
 * These are three different column names for one concept, which is why every
 * consumer that hardcoded one of them was wrong for the other two:
 *
 *   agents            -> risk
 *   workflows         -> risk
 *   knowledge_assets  -> criticality
 *   ai_platforms      -> (none; derived — see entityCriticality)
 *
 * Verified against backend/sql/01_schema_migration.sql.
 */
const ENTITY_CRITICALITY_FIELD = {
	agent: 'risk',
	workflow: 'risk',
	knowledge_asset: 'criticality',
}

/**
 * Criticality of one entity, whatever table it came from.
 *
 * `ai_platforms` carries no criticality column, so a platform's criticality is
 * the highest criticality among the knowledge assets recorded about it. One
 * critical piece of knowledge about a tool makes the tool critical. That is a
 * judgement, not a measurement, and it is labelled authored wherever it
 * surfaces.
 *
 * A platform with no knowledge assets is UNKNOWN rather than `normal`. It
 * therefore cannot satisfy the SPOF threshold and reports as not-evaluable
 * instead of not-a-SPOF. That is the honest answer and it will visibly shrink
 * platform-level findings.
 *
 * @param {string} entityType  'agent' | 'workflow' | 'knowledge_asset' | 'platform'
 * @param {object} row         the entity row
 * @param {{knowledgeAssets?: Array}} [ctx]  required only for platforms
 */
function entityCriticality(entityType, row, ctx = {}) {
	if (!row) return UNKNOWN

	if (entityType === 'platform') {
		const assets = ctx.knowledgeAssets
		if (!Array.isArray(assets)) return UNKNOWN
		return maxLevel(
			assets
				.filter((a) => a && a.asset_type === 'platform' && a.asset_id === row.id)
				.map((a) => a.criticality),
		)
	}

	const field = ENTITY_CRITICALITY_FIELD[entityType]
	if (!field) return UNKNOWN
	return normalizeLevel(row[field])
}
```

Extend `module.exports` with `ENTITY_CRITICALITY_FIELD,` and `entityCriticality,`.

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: PASS, `failed: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/domain/definitions.js backend/tests/definitions.unit.test.js
git commit -m "Resolve entity criticality across its four column names (D-03)"
```

---

### Task 3: Edge criticality, kept separate from entity criticality

**Files:**
- Modify: `backend/domain/definitions.js`
- Modify: `backend/tests/definitions.unit.test.js`

**Interfaces:**
- Consumes: `normalizeLevel` from Task 1.
- Produces: `edgeCriticality(depRow) -> string`.

**Background:** `dependencies.dependency_type` describes how critical a *link* is. It is a different concept from entity criticality and only shares the vocabulary. It gets its own function and its own name so the two can never be silently interchanged. `backend/routes/risks.js:41` already filters this column correctly and is **not** a bug.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/definitions.unit.test.js` before the summary block:

```js
// ── Edge criticality ─────────────────────────────────────────────────────────
console.log('\nEdge criticality — dependency_type, a separate concept:')
{
	check('reads dependency_type', D.edgeCriticality({ dependency_type: 'critical' }) === 'critical', D.edgeCriticality({ dependency_type: 'critical' }))
	check('normalizes casing', D.edgeCriticality({ dependency_type: 'HIGH' }) === 'high', D.edgeCriticality({ dependency_type: 'HIGH' }))
	check('absent dependency_type is unknown', D.edgeCriticality({}) === D.UNKNOWN, D.edgeCriticality({}))
	check('null row is unknown, not a throw', D.edgeCriticality(null) === D.UNKNOWN, D.edgeCriticality(null))
	// The dependencies table has no `criticality` column at all.
	check('does not read a stray .criticality', D.edgeCriticality({ criticality: 'critical' }) === D.UNKNOWN, D.edgeCriticality({ criticality: 'critical' }))
	check('edge threshold comparison works', D.atOrAbove(D.edgeCriticality({ dependency_type: 'critical' }), 'high') === true)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: FAIL — `TypeError: D.edgeCriticality is not a function`

- [ ] **Step 3: Write minimal implementation**

In `backend/domain/definitions.js`, add before `module.exports`:

```js
/**
 * Criticality of a DEPENDENCY EDGE, from `dependencies.dependency_type`.
 *
 * Deliberately a separate function from entityCriticality. "This link is
 * critical" and "this thing is critical" are different claims that happen to
 * share four words, and collapsing them is how a route ends up filtering the
 * wrong column. The `dependencies` table has no `criticality` column.
 */
function edgeCriticality(depRow) {
	if (!depRow) return UNKNOWN
	return normalizeLevel(depRow.dependency_type)
}
```

Extend `module.exports` with `edgeCriticality,`.

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: PASS, `failed: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/domain/definitions.js backend/tests/definitions.unit.test.js
git commit -m "Separate edge criticality from entity criticality (D-03)"
```

---

### Task 4: The SPOF verdict

**Files:**
- Modify: `backend/domain/definitions.js`
- Modify: `backend/tests/definitions.unit.test.js`

**Interfaces:**
- Consumes: `atOrAbove`, `normalizeLevel`, `UNKNOWN` from Task 1.
- Produces: `SPOF_THRESHOLD` (string `'high'`), `spofVerdict({criticality, ownerCount, hasBackup}) -> {status, reasons}` where `status` is one of `'spof' | 'not_spof' | 'orphaned' | 'not_evaluable'`.

**Background:** D-06 defines SPOF as *sole owner AND no backup AND criticality ≥ high*, with dependents deliberately **not** consulted — a critical asset with nothing depending on it is still a SPOF.

The function takes already-resolved facts rather than reaching into ownership tables, so it stays pure and so callers can reuse the existing `backupIndex` at `backend/domain/derived.js:121`.

D-06's wording does not cover **zero owners**. Zero owners is not "sole owner" — it is an orphan, a different and arguably worse finding, and collapsing it into SPOF would hide it. Hence four outcomes rather than a boolean. `not_evaluable` means criticality is UNKNOWN and is distinct from `not_spof`.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/definitions.unit.test.js` before the summary block:

```js
// ── SPOF ─────────────────────────────────────────────────────────────────────
console.log('\nSPOF verdict — sole owner + no backup + criticality >= high (D-06):')
{
	const v = (criticality, ownerCount, hasBackup) => D.spofVerdict({ criticality, ownerCount, hasBackup }).status

	check('threshold is high', D.SPOF_THRESHOLD === 'high', D.SPOF_THRESHOLD)

	// The three conjuncts, each failing alone.
	check('sole owner + no backup + critical IS a spof', v('critical', 1, false) === 'spof', v('critical', 1, false))
	check('sole owner + no backup + high IS a spof', v('high', 1, false) === 'spof', v('high', 1, false))
	check('a backup defeats it', v('critical', 1, true) === 'not_spof', v('critical', 1, true))
	check('multiple owners defeat it', v('critical', 3, false) === 'not_spof', v('critical', 3, false))
	check('normal criticality defeats it', v('normal', 1, false) === 'not_spof', v('normal', 1, false))
	check('low criticality defeats it', v('low', 1, false) === 'not_spof', v('low', 1, false))

	// Zero owners is NOT "sole owner" — it is a different finding.
	check('zero owners is orphaned, not spof', v('critical', 0, false) === 'orphaned', v('critical', 0, false))
	check('orphaned even when criticality is low', v('low', 0, false) === 'orphaned', v('low', 0, false))

	// Unmeasured is not the same as safe.
	check('unknown criticality is not evaluable', v(D.UNKNOWN, 1, false) === 'not_evaluable', v(D.UNKNOWN, 1, false))
	check('not_evaluable is distinct from not_spof', v(D.UNKNOWN, 1, false) !== v('normal', 1, false))
	check('missing criticality is not evaluable', D.spofVerdict({ ownerCount: 1, hasBackup: false }).status === 'not_evaluable')

	// D-06: dependents are irrelevant. This is the behavior change — the old
	// scattered implementations gated on downstream impact.
	check('zero dependents does not prevent a spof', v('critical', 1, false) === 'spof')

	check('reasons are reported', D.spofVerdict({ criticality: 'critical', ownerCount: 1, hasBackup: false }).reasons.length > 0)
	check('reasons name the sole owner', D.spofVerdict({ criticality: 'critical', ownerCount: 1, hasBackup: false }).reasons.includes('sole_owner'))
	check('reasons name the missing backup', D.spofVerdict({ criticality: 'critical', ownerCount: 1, hasBackup: false }).reasons.includes('no_backup_owner'))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: FAIL — `TypeError: D.spofVerdict is not a function`

- [ ] **Step 3: Write minimal implementation**

In `backend/domain/definitions.js`, add before `module.exports`:

```js
/** Criticality at or above which ownership fragility counts as a SPOF (D-06). */
const SPOF_THRESHOLD = 'high'

/**
 * Is this entity a single point of failure?
 *
 * SPOF = sole owner AND no backup owner AND criticality >= high.
 *
 * Dependents are deliberately NOT consulted. A critical asset with nothing
 * currently depending on it is still a single point of failure, because the
 * dependency graph is incomplete and absence of a recorded dependent is not
 * evidence of absence. This is a behavior change from the scattered
 * implementations this replaces, several of which gated on downstream impact.
 *
 * Four outcomes rather than a boolean, because two of the interesting cases
 * are not "no":
 *
 *   spof           sole owner, no backup, critical enough
 *   orphaned       NOBODY owns it — not "sole owner", and a worse finding
 *                  that would be hidden if folded into not_spof
 *   not_evaluable  criticality is unmeasured; we cannot say either way
 *   not_spof       genuinely fine on this axis
 *
 * Takes resolved facts rather than rows so it stays pure and so callers can
 * reuse the backup index derived.js already builds (derived.js:121).
 *
 * @param {{criticality?: string, ownerCount?: number, hasBackup?: boolean}} facts
 * @returns {{status: string, reasons: string[]}}
 */
function spofVerdict({ criticality, ownerCount, hasBackup } = {}) {
	const level = normalizeLevel(criticality)
	const owners = Number(ownerCount) || 0

	if (owners === 0) {
		return { status: 'orphaned', reasons: ['no_owner'] }
	}

	if (level === UNKNOWN) {
		return { status: 'not_evaluable', reasons: ['criticality_unmeasured'] }
	}

	const reasons = []
	if (owners === 1) reasons.push('sole_owner')
	if (!hasBackup) reasons.push('no_backup_owner')
	if (atOrAbove(level, SPOF_THRESHOLD)) reasons.push('criticality_' + level)

	const isSpof = owners === 1 && !hasBackup && atOrAbove(level, SPOF_THRESHOLD)
	return { status: isSpof ? 'spof' : 'not_spof', reasons }
}
```

Extend `module.exports` with `SPOF_THRESHOLD,` and `spofVerdict,`.

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: PASS, `failed: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/domain/definitions.js backend/tests/definitions.unit.test.js
git commit -m "Give SPOF one definition with four honest outcomes (D-06)"
```

---

### Task 5: The coverage gate

**Files:**
- Modify: `backend/domain/definitions.js`
- Modify: `backend/tests/definitions.unit.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `COVERAGE_THRESHOLD` (number `0.5`), `coverage(rows, hasField) -> {covered, total, ratio}`, `evidenceGate(rows, hasField, opts) -> {sufficient, status, coverage, covered, total, threshold}` where `opts` is `{threshold?: number}`.

**Background:** D-10. Each score declares which field it needs on which population. At or above 50% coverage the score computes; below 50% it must return `status: 'insufficient_evidence'` and **no number**. W-C ships the gate and its tests only — W-E is where the refusal reaches the UI. Callers in this workstream may receive it and ignore it; that split is deliberate so the gate can land and be proven without simultaneously rewriting every frontend tile.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/definitions.unit.test.js` before the summary block:

```js
// ── Coverage gate ────────────────────────────────────────────────────────────
console.log('\nCoverage gate — 50% inclusive (D-10):')
{
	const has = (r) => r.documented === true
	const rows = (n, coveredCount) => Array.from({ length: n }, (_, i) => ({ documented: i < coveredCount }))

	check('full coverage is sufficient', D.evidenceGate(rows(10, 10), has).sufficient === true)
	check('exactly 50% is sufficient (inclusive boundary)', D.evidenceGate(rows(10, 5), has).sufficient === true, D.evidenceGate(rows(10, 5), has))
	check('49% is insufficient', D.evidenceGate(rows(100, 49), has).sufficient === false, D.evidenceGate(rows(100, 49), has))
	check('51% is sufficient', D.evidenceGate(rows(100, 51), has).sufficient === true)
	check('zero coverage is insufficient', D.evidenceGate(rows(10, 0), has).sufficient === false)

	check('threshold default is 0.5', D.COVERAGE_THRESHOLD === 0.5, D.COVERAGE_THRESHOLD)
	check('threshold is overridable', D.evidenceGate(rows(10, 3), has, { threshold: 0.25 }).sufficient === true)

	// An empty population cannot support a score. Reporting 0/0 as "100%
	// covered" would let an empty database render as a healthy organization,
	// which derived.js already calls the most dangerous failure mode here.
	check('empty population is insufficient', D.evidenceGate([], has).sufficient === false, D.evidenceGate([], has))
	check('empty population reports zero total', D.evidenceGate([], has).total === 0)

	const bad = D.evidenceGate(rows(10, 1), has)
	check('insufficient carries the status string', bad.status === 'insufficient_evidence', bad.status)
	check('insufficient reports actual coverage', bad.coverage === 0.1, bad.coverage)
	check('insufficient reports the threshold it failed', bad.threshold === 0.5, bad.threshold)
	check('sufficient carries a computed status', D.evidenceGate(rows(10, 10), has).status === 'computed')

	const c = D.coverage(rows(8, 2), has)
	check('coverage reports covered and total', c.covered === 2 && c.total === 8, c)
	check('coverage reports the ratio', c.ratio === 0.25, c.ratio)
	check('coverage of empty is ratio 0', D.coverage([], has).ratio === 0)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: FAIL — `TypeError: D.evidenceGate is not a function`

- [ ] **Step 3: Write minimal implementation**

In `backend/domain/definitions.js`, add before `module.exports`:

```js
/** Share of a population that must carry a field before a score may be computed (D-10). */
const COVERAGE_THRESHOLD = 0.5

/**
 * How much of `rows` actually carries the signal a score needs.
 *
 * @param {Array} rows
 * @param {(row: any) => boolean} hasField
 */
function coverage(rows, hasField) {
	const list = Array.isArray(rows) ? rows : []
	const total = list.length
	const covered = list.filter((r) => Boolean(hasField(r))).length
	return { covered, total, ratio: total === 0 ? 0 : covered / total }
}

/**
 * Decides whether there is enough evidence to publish a number at all.
 *
 * Below the threshold the caller must return `insufficient_evidence` and NO
 * value. Returning a number computed from a tenth of the estate, with a
 * footnote, is how a dashboard comes to assert things the data cannot support.
 *
 * An EMPTY population is always insufficient. Treating 0 of 0 as fully covered
 * would let an empty database render as a healthy organization — derived.js
 * already identifies that as the most dangerous failure mode for this product.
 *
 * W-C ships this gate and its tests. Surfacing the refusal in the UI is W-E.
 *
 * @param {Array} rows
 * @param {(row: any) => boolean} hasField
 * @param {{threshold?: number}} [opts]
 */
function evidenceGate(rows, hasField, opts = {}) {
	const threshold = typeof opts.threshold === 'number' ? opts.threshold : COVERAGE_THRESHOLD
	const { covered, total, ratio } = coverage(rows, hasField)
	const sufficient = total > 0 && ratio >= threshold
	return {
		sufficient,
		status: sufficient ? 'computed' : 'insufficient_evidence',
		coverage: ratio,
		covered,
		total,
		threshold,
	}
}
```

Extend `module.exports` with `COVERAGE_THRESHOLD,`, `coverage,` and `evidenceGate,`.

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`, then the full suite:
```bash
node tests/definitions.unit.test.js
```
Expected: PASS, `failed: 0`

```bash
node tests/run-all.js
```
Expected: `ALL TEST SUITES PASSED ✅`

- [ ] **Step 5: Commit**

```bash
git add backend/domain/definitions.js backend/tests/definitions.unit.test.js
git commit -m "Refuse to publish a score below 50% input coverage (D-10)"
```

---

### Task 6: Migrate derived.js — the behavior-preserving proof

**Files:**
- Modify: `backend/domain/derived.js:312`, `:514`, `:658` (the three `['critical','high']` sites)
- Test: `backend/tests/derived.unit.test.js` (must pass **unchanged**)

**Interfaces:**
- Consumes: `atOrAbove`, `entityCriticality` from Tasks 1-2.
- Produces: nothing new.

**Why this task comes first among the migrations:** `derived.js` is the one consumer already believed correct — it reads `a.risk`, the real column. Migrating it must therefore change **no** behavior, and `derived.unit.test.js` passing without modification is the proof that `definitions.js` is a faithful replacement. Only after that proof do we point the module at code known to be wrong (Tasks 7-8).

These three sites are **Threshold class** per the spec's §3 table: they express "at or above high" and are correct. This is retyping, not a bug fix.

- [ ] **Step 1: Record the current baseline**

Run from `backend/`:
```bash
node tests/derived.unit.test.js
```
Expected: PASS. Note the `passed:` count — it must be identical after the change.

- [ ] **Step 2: Add the require**

At the top of `backend/domain/derived.js`, alongside the existing requires:

```js
const { atOrAbove } = require('./definitions')
```

- [ ] **Step 3: Replace the three threshold sites**

At `backend/domain/derived.js:312`, replace:
```js
    if (!['critical', 'high'].includes(a.risk)) continue
```
with:
```js
    if (!atOrAbove(a.risk, 'high')) continue
```

At `backend/domain/derived.js:514`, replace:
```js
      .filter((w) => w && ['critical', 'high'].includes(w.risk))
```
with:
```js
      .filter((w) => w && atOrAbove(w.risk, 'high'))
```

At `backend/domain/derived.js:658`, replace:
```js
    if (a.owner_id == null || !['critical', 'high'].includes(a.risk)) continue
```
with:
```js
    if (a.owner_id == null || !atOrAbove(a.risk, 'high')) continue
```

- [ ] **Step 4: Verify behavior is unchanged**

Run from `backend/`:
```bash
node tests/derived.unit.test.js
```
Expected: PASS with the **same** `passed:` count as Step 1 and `failed: 0`. If any count differs, `definitions.js` is not a faithful replacement — stop and investigate rather than editing the test.

Then the full suite:
```bash
node tests/run-all.js
```
Expected: `ALL TEST SUITES PASSED ✅`

- [ ] **Step 5: Commit**

```bash
git add backend/domain/derived.js
git commit -m "Point derived.js at the canonical threshold (D-03, no behavior change)"
```

---

### Task 7: Fix the brain's criticality conflation (F-B)

**Files:**
- Modify: `backend/brain/modules/implementations.js:72`, `:86`
- Modify: `backend/tests/definitions.unit.test.js` (append a regression section)

**Interfaces:**
- Consumes: `atOrAbove`, `edgeCriticality` from Tasks 1 and 3.
- Produces: nothing new.

**Background — this is a real bug, not retyping.** Both sites filter `r.criticality === 'high'`, which **excludes `'critical'` entirely**: the most critical dependencies in the estate are absent from every brain analysis that uses them. This is Conflation class per the spec's §3 table. Fixing it will **increase** the counts these analyses report.

Note the field name here is `criticality` on a graph *relationship* object built by the brain's relationship registry, not a database column — `backend/tests/graph.unit.test.js:55` confirms relationships carry `criticality`. So this reads the right property; it is the comparison that is wrong.

- [ ] **Step 1: Write the failing regression test**

Append to `backend/tests/definitions.unit.test.js` before the summary block:

```js
// ── Regression: F-B, the brain excluded 'critical' ───────────────────────────
console.log('\nRegression F-B — a critical dependency must not be filtered out:')
{
	// The brain filtered `criticality === 'high'`, which silently dropped every
	// 'critical' edge — the most important ones in the estate.
	const edges = [
		{ id: 1, criticality: 'critical' },
		{ id: 2, criticality: 'high' },
		{ id: 3, criticality: 'normal' },
		{ id: 4, criticality: 'low' },
	]
	const kept = edges.filter((r) => D.atOrAbove(r.criticality, 'high')).map((r) => r.id)
	check('keeps both critical and high', JSON.stringify(kept) === JSON.stringify([1, 2]), kept)
	check('the old comparison would have dropped critical', edges.filter((r) => r.criticality === 'high').length === 1)
}
```

- [ ] **Step 2: Run test to verify it passes already**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: PASS. This test asserts the *definition*, which Task 1 already provides — it exists to lock in the contract the brain is about to depend on. The behavioral fix is verified by the brain smoke test in Step 5.

- [ ] **Step 3: Add the require to the brain module**

At the top of `backend/brain/modules/implementations.js`, alongside the existing requires:

```js
const { atOrAbove } = require('../../domain/definitions')
```

- [ ] **Step 4: Fix both comparison sites**

At `backend/brain/modules/implementations.js:72`, replace:
```js
      criticalDependencies: deps.filter((r) => r.criticality === 'high').map((r) => ({
```
with:
```js
      criticalDependencies: deps.filter((r) => atOrAbove(r.criticality, 'high')).map((r) => ({
```

At `backend/brain/modules/implementations.js:86`, replace:
```js
  const criticalDeps = A.edgesOfType(g, 'depends_on').filter((r) => r.criticality === 'high')
```
with:
```js
  const criticalDeps = A.edgesOfType(g, 'depends_on').filter((r) => atOrAbove(r.criticality, 'high'))
```

- [ ] **Step 5: Run the brain and graph suites**

Run from `backend/`:
```bash
node tests/brain.smoke.test.js
```
Expected: PASS.

```bash
node tests/run-all.js
```
Expected: `ALL TEST SUITES PASSED ✅`

If a brain test asserts a specific count that has now gone **up**, that is the bug being fixed — update the expected count and note in the commit that the number rose because `critical` edges were previously excluded. Do not revert the fix to satisfy a stale expectation.

- [ ] **Step 6: Commit**

```bash
git add backend/brain/modules/implementations.js backend/tests/definitions.unit.test.js
git commit -m "Stop excluding critical dependencies from brain analyses (F-B)"
```

---

### Task 8: Stop fabricating criticality when it is absent (F-G′, F-K)

**Files:**
- Modify: `backend/routes/tools.js:60-65` (the arbitrary-pick loop)
- Modify: `backend/routes/decisionIntelligence.js:45`, `:326`, `:334` (the three `|| 'low'` defaults)
- Modify: `backend/tests/definitions.unit.test.js` (append a regression section)

**Interfaces:**
- Consumes: `maxLevel`, `normalizeLevel`, `UNKNOWN` from Tasks 1-2.
- Produces: nothing new.

**Background — read this carefully, an earlier version of this finding was wrong.** The scoring functions read `.criticality` on **view-model objects**, not on database rows, and the loaders populate that property correctly: `decisionIntelligence.js:45` maps `criticality: w.risk || 'low'`, `:326` maps `criticality: a.risk || 'low'`, and `tools.js:117` sets it from `knowledge_assets`. There are **no phantom reads** and `scoreAgentDecision` / `scoreToolDecision` / `scoreWorkflowDecision` need no changes at all. Do not "fix" them.

Two real defects remain:

- **F-G′** — all three loaders coerce an absent value to `'low'`. A tool nobody has assessed is scored as low-criticality, so `PENALTY_CRITICAL_NO_FALLBACK` (30) never fires and `PENALTY_NO_BACKUP` (25) fires instead. Absent must become `unknown`, not the safest-looking level.
- **F-K** — `tools.js:63` assigns `byPlatform[k.asset_id]` on every loop iteration, so a platform with several knowledge assets keeps whichever row the database returned **last**. Order-dependent and arbitrary.

**Downstream note:** once absent resolves to `'unknown'`, `isCritical` stays `false` for uncovered tools exactly as before — so scores do not move for them yet. What changes is that the *value* is now honest and W-E can render it as insufficient evidence. Scores **do** move for platforms whose maximum knowledge-asset criticality differs from their last one (F-K).

- [ ] **Step 1: Write the failing regression test**

Append to `backend/tests/definitions.unit.test.js` before the summary block:

```js
// ── Regression: F-G', fabricated defaults ────────────────────────────────────
console.log("\nRegression F-G' — absent criticality must not become 'low':")
{
	// The loaders wrote `criticality: a.risk || 'low'`, so an unmeasured asset
	// was presented as the safest-looking level in the scale.
	check('absent agent risk is unknown, not low', D.entityCriticality('agent', { id: 1 }) === D.UNKNOWN, D.entityCriticality('agent', { id: 1 }))
	check('absent workflow risk is unknown, not low', D.entityCriticality('workflow', { id: 1 }) === D.UNKNOWN, D.entityCriticality('workflow', { id: 1 }))
	check('null risk is unknown, not low', D.entityCriticality('agent', { risk: null }) === D.UNKNOWN, D.entityCriticality('agent', { risk: null }))
	check('unknown is distinguishable from a real low', D.UNKNOWN !== 'low')
	check('a real low is still low', D.entityCriticality('agent', { risk: 'low' }) === 'low')
}

// ── Regression: F-K, arbitrary pick across knowledge assets ──────────────────
console.log('\nRegression F-K — platform criticality must not depend on row order:')
{
	const forward = [
		{ asset_type: 'platform', asset_id: 5, criticality: 'critical' },
		{ asset_type: 'platform', asset_id: 5, criticality: 'low' },
	]
	const reversed = [...forward].reverse()

	// tools.js:63 assigned on every iteration, so this pair disagreed.
	check('takes the max, not the last row', D.entityCriticality('platform', { id: 5 }, { knowledgeAssets: forward }) === 'critical', D.entityCriticality('platform', { id: 5 }, { knowledgeAssets: forward }))
	check('order does not change the answer',
		D.entityCriticality('platform', { id: 5 }, { knowledgeAssets: forward }) === D.entityCriticality('platform', { id: 5 }, { knowledgeAssets: reversed }))
	check('the old last-row-wins rule would have disagreed', forward[forward.length - 1].criticality !== reversed[reversed.length - 1].criticality)
}
```

- [ ] **Step 2: Run test to verify it passes**

Run from `backend/`:
```bash
node tests/definitions.unit.test.js
```
Expected: PASS, `failed: 0`. These assert the definition Tasks 1-2 already provide; they lock the contract the loaders are about to depend on. The behavioral fixes are verified in Step 5.

- [ ] **Step 3: Fix the arbitrary pick in tools.js (F-K)**

At the top of `backend/routes/tools.js`:

```js
const { maxLevel } = require('../domain/definitions')
```

Replace `backend/routes/tools.js:60-65`:
```js
async function loadPlatformKnowledge() {
  const data = await optional('knowledge_assets(platform)', supabase.from('knowledge_assets').select('*').eq('asset_type', 'platform'), [])
  const byPlatform = {}
  for (const k of data) byPlatform[k.asset_id] = { documented: k.is_documented, criticality: k.criticality }
  return byPlatform
}
```
with:
```js
async function loadPlatformKnowledge() {
  const data = await optional('knowledge_assets(platform)', supabase.from('knowledge_assets').select('*').eq('asset_type', 'platform'), [])

  // A platform can have several knowledge assets. The previous version assigned
  // on every iteration, so it kept whichever row the database returned last —
  // an arbitrary, order-dependent answer (F-K). Take the highest criticality
  // instead: one critical piece of knowledge about a tool makes the tool
  // critical. Documented stays a conjunction — one undocumented asset means the
  // platform is not fully documented.
  const byPlatform = {}
  for (const k of data) {
    const prev = byPlatform[k.asset_id]
    byPlatform[k.asset_id] = {
      documented: prev ? Boolean(prev.documented) && Boolean(k.is_documented) : Boolean(k.is_documented),
      criticality: maxLevel([prev?.criticality, k.criticality]),
    }
  }
  return byPlatform
}
```

Note `maxLevel` returns `'unknown'` when nothing is known, so `tools.js:117`'s `k ? k.criticality : null` now yields `'unknown'` rather than `null` for a covered-but-unrated platform. That is the intended direction.

- [ ] **Step 4: Remove the fabricated defaults (F-G′)**

At `backend/routes/decisionIntelligence.js:45`, replace:
```js
      criticality: w.risk || 'low',
```
with:
```js
      // Not `|| 'low'`. An unmeasured workflow is not a low-criticality one,
      // and presenting it as such is the safest-looking possible lie (F-G').
      criticality: normalizeLevel(w.risk),
```

At `backend/routes/decisionIntelligence.js:326`, replace:
```js
      criticality: a.risk || 'low',
```
with:
```js
      criticality: normalizeLevel(a.risk),
```

At `backend/routes/decisionIntelligence.js:334`, replace:
```js
      criticality: t.criticality || 'low',
```
with:
```js
      criticality: normalizeLevel(t.criticality),
```

Add the require at the top of `backend/routes/decisionIntelligence.js`:
```js
const { normalizeLevel } = require('../domain/definitions')
```

Leave `scoreAgentDecision`, `scoreToolDecision` and `scoreWorkflowDecision` **untouched** — they compare against `'critical'` and `'high'` string literals, which continue to behave correctly now that the value is either a real level or `'unknown'`.

- [ ] **Step 5: Verify**

Run from `backend/`:
```bash
node tests/run-all.js
```
Expected: `ALL TEST SUITES PASSED ✅`

Then check the narrative text, which interpolates criticality directly at roughly `backend/routes/decisionIntelligence.js:169`:
```bash
grep -n 'was adopted as a' backend/routes/decisionIntelligence.js
```
That line renders `a ${tool.criticality}`, which now produces **"a unknown tool"** for uncovered platforms. Fix the phrasing in the same commit:
```js
  const criticalityPhrase = tool.criticality === 'unknown' ? 'an unassessed' : `a ${tool.criticality}`
  return `"${tool.name}" was adopted as ${criticalityPhrase} tool across ${dept}. ${owner}. ${fallback}. ${docs}.`
```

- [ ] **Step 6: Commit**

```bash
git add backend/routes/tools.js backend/routes/decisionIntelligence.js backend/tests/definitions.unit.test.js
git commit -m "Stop defaulting absent criticality to low (F-G', F-K)"
```

---

### Task 9: Classify and migrate the remaining call sites

**Files:**
- Create: `docs/superpowers/specs/2026-08-24-w-c-call-site-classification.md`
- Modify: the Threshold-class sites identified below
- Modify: `backend/tests/definitions.unit.test.js` if a Conflation-class bug is found

**Interfaces:**
- Consumes: `atOrAbove`, `entityCriticality`, `edgeCriticality` from Tasks 1-3.
- Produces: nothing new.

**Background:** the spec's §3 requires each remaining site to be **classified before it is touched**, because the twenty `['critical','high']` sites are not uniformly wrong. Threshold-class retyping and Conflation-class bug fixes land as **separate commits**, so real bugs do not hide in a wall of no-op renames.

- [ ] **Step 1: Enumerate every remaining site**

Run from the repo root:
```bash
grep -rnE "\['critical', ?'high'\]|criticality ?=== ?'|dependency_type ?=== ?'|\.in\('(criticality|dependency_type|severity)'" backend --include=*.js
```

Record every hit in `docs/superpowers/specs/2026-08-24-w-c-call-site-classification.md` as a table with columns: `file:line`, `class` (Threshold / Conflation / Phantom / Severity), `evidence`, `action`.

**Severity is a fourth class, not in the original spec.** Sites filtering `severity` (e.g. `backend/routes/context/context.js:145`, `backend/routes/executiveMemory/executiveMemory.js:57,202`) operate on incident/violation severity, which is a **different vocabulary** from entity criticality. Classify them, then **leave them alone** — unifying severity is not in W-C's scope. Note them as deferred.

- [ ] **Step 2: Commit the classification before changing anything**

```bash
git add docs/superpowers/specs/2026-08-24-w-c-call-site-classification.md
git commit -m "Classify every remaining criticality call site before touching one (D-03)"
```

- [ ] **Step 3: Migrate the Threshold-class sites**

For each site classified Threshold, replace the array-literal test with `atOrAbove(value, 'high')`, adding the require at the top of each file:

```js
const { atOrAbove } = require('../domain/definitions')
```

Adjust the relative path per file depth (`../../domain/definitions` from `backend/routes/<dir>/`).

Do **not** change Supabase `.in('criticality', ['critical','high'])` calls into JavaScript filters — those run in the database and rewriting them changes the query shape and the row count returned. Leave them, and note in the classification doc that server-side filters are a W-D concern once `derived.js` owns the reads.

- [ ] **Step 4: Verify no behavior changed**

Run from `backend/`:
```bash
node tests/run-all.js
```
Expected: `ALL TEST SUITES PASSED ✅` with unchanged counts. Threshold retyping is by definition behavior-preserving — any count that moves means the site was misclassified. Reclassify it rather than adjusting the test.

- [ ] **Step 5: Commit the retyping separately**

**Do not `git add` whole directories.** The working tree carries unrelated modifications across
~30 files from other workstreams; a directory-wide add would sweep them into this commit. Stage the
exact files you edited, listed individually:

```bash
git status --short
```

Then add only the paths your classification doc marked Threshold, e.g.:
```bash
git add backend/routes/<file-you-edited>.js backend/routes/<dir>/<other-file>.js
git commit -m "Retype threshold checks against the canonical scale (D-03, no behavior change)"
```

Verify before committing that the staged set matches your classification doc:
```bash
git diff --cached --name-only
```

- [ ] **Step 6: Fix any Conflation-class sites found, one commit each**

For each, first add a regression assertion to `backend/tests/definitions.unit.test.js` naming the file, then fix, then run `node tests/run-all.js`, then commit with a message naming the file and `D-03`.

- [ ] **Step 7: Final verification**

Run from `backend/`:
```bash
node tests/run-all.js
```
Expected: `ALL TEST SUITES PASSED ✅`

Confirm no stragglers remain outside the deferred Severity class:
```bash
grep -rnE "\['critical', ?'high'\]" backend --include=*.js
```
Expected: only Supabase `.in(...)` calls, each noted in the classification doc.

---

## Definition of done

- `backend/domain/definitions.js` exists, is pure, and has no `require('../supabase')`.
- `node tests/run-all.js` passes from `backend/`.
- `derived.unit.test.js` passes **unmodified** — the behavior-preservation proof.
- F-B, F-G′ and F-K each have a regression test and a commit naming them.
- Every remaining call site is classified in the classification doc, including deferred Severity sites.
- No commit mixes Threshold retyping with a Conflation fix.

## Out of scope — do not do these here

- Rendering `insufficient_evidence` in the UI → **W-E**.
- Consolidating the three competing OIS definitions → **W-D**.
- Dropping `governance_assessments`, `continuity_assessments`, `dept_health_scores`, `collaboration_scores`, `predictive_risk_scores` → **W-H**.
- Unifying incident/violation `severity` with entity criticality → deferred, not yet assigned.
- Anything that writes to the database → deferred entirely by **D-04**.
