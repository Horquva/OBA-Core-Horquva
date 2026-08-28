# W-E — Provenance & Evidence Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `evidenceGate()` (built and unit-tested in W-C, currently uncalled anywhere) into every score-producing site that can currently fabricate a verdict from absent or near-absent data — both the CRITICAL-on-absence direction (D-07's literal target) and its optimistic mirror (D-24) — and surface the refusal through the API and UI (D-10b).

**Architecture:** `band()` and the existing tier functions are unchanged; the fix sits at each call site as a guard evaluated *before* banding: compute an `evidenceGate()`/`coverage()` result over the population the score claims to summarize, and only call the banding function when `sufficient` is true. Insufficient responses carry `score: null, rating: null` plus a sibling `evidence` object instead of a fabricated label. Backend gating lands first (each `derived.js` function, then the two routes found to compute independently of it), then the frontend: one shared `EvidenceBadge` component, a minimal TypeScript port of the gate for the two client-side files that compute their own verdicts, and the concrete wiring into each confirmed consumer.

**Tech Stack:** Node.js (backend, hand-rolled `node` test scripts, no framework), Next.js/React/TypeScript (frontend).

**Spec:** [docs/superpowers/specs/2026-08-25-w-e-provenance-evidence-design.md](../specs/2026-08-25-w-e-provenance-evidence-design.md)

## Global Constraints

- 50% coverage threshold (D-10), via `evidenceGate()`'s existing default — never hardcode a second copy of `0.5`.
- Insufficient-evidence responses always return HTTP 200 with the detail in the body, never a different status code.
- `evidence` is a sibling field alongside the existing `score`/`rating` (or equivalent) — those fields keep their existing type, becoming `null` when insufficient, rather than being wrapped in a new object (D-23).
- Gating is per-component: each aggregate declares and checks its own required inputs independently (D-22) — never one blanket gate at the top of a function that decides everything beneath it.
- `evidenceGate()`/`coverage()` (`backend/domain/definitions.js`) are the only implementations of the coverage check on the backend; the new `frontend/lib/evidenceGate.ts` is the only other one, and it exists solely because there is no shared runtime with `frontend/` — no third reimplementation anywhere.
- Threshold-preserving edits (adding a field, adding a null-check) and behavior-changing edits (a rating that used to compute now returns null) must not share a commit when both touch the same function — call this out explicitly in the commit message, per the decision log's standing constraint.
- `git diff <file>` before staging any file already carrying pre-existing WIP (see plan-time recheck note in Task 0).
- `node tests/run-all.js` green before every backend commit.

---

## Task 0: Re-verify pre-existing WIP is still where the design doc found it

**Files:** none modified — this is a verification-only task with no commit.

- [ ] **Step 1: Re-run the WIP check**

```bash
git status --short
```

Compare the modified/untracked file list against §4 of the design doc
(`docs/superpowers/specs/2026-08-25-w-e-provenance-evidence-design.md`). None of this plan's
Tasks 1–18 touch any file on that list. If `git status --short` now shows a *different* file this
plan needs to touch (e.g. someone started editing `backend/domain/derived.js` since the design was
written), stop and `git diff` that file before proceeding with the task that touches it — isolate
this plan's hunks from whatever is already there, per the decision log's §5 warning.

- [ ] **Step 2: Confirm the baseline test suite is green before any change**

Run from `backend/`:

```bash
node tests/run-all.js
```

Expected: `ALL TEST SUITES PASSED`. If it isn't green already, stop and report — this plan's tasks
assume a clean starting point.

---

## Task 1: Gate `accountability()`'s aggregate score

**Files:**
- Modify: `backend/domain/derived.js:62` (import), `backend/domain/derived.js:195-255` (`accountability()`)
- Test: `backend/tests/derived.unit.test.js`

**Interfaces:**
- Consumes: `evidenceGate(rows, hasField, opts)` from `backend/domain/definitions.js` — returns
  `{sufficient, status, coverage, covered, total, threshold}`.
- Produces: `accountability(roots).evidence` — `{sufficient, status, coverage, covered, total, threshold}`.
  `accountability(roots).accountabilityScore` and `.status` become `null` when
  `evidence.sufficient === false`. `perEntity[].score`/`.status` are **not** gated — an entity that
  exists in `accountability_entities` with zero links is a real, recorded gap (score 0, status
  `CRITICAL`), not missing evidence; only the org-wide aggregate needs the gate. Every existing
  field (`totalEntities`, `entitiesWithLinks`, `sameRandACount`, `uniquePeopleCount`, `perEntity`,
  provenance fields) is unchanged and always present regardless of `evidence.sufficient`.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/derived.unit.test.js`, immediately after the existing accountability block
(after line 73, before the `// ── Collaboration ──` comment):

```js
// ── Accountability evidence gate (D-07, D-10) ──────────────────────────────
console.log('\nAccountability — evidence gate:')
{
	const empty = d.accountability(roots())
	check('zero entities is insufficient evidence, not a CRITICAL score',
		empty.evidence.sufficient === false && empty.accountabilityScore === null && empty.status === null,
		empty)
	check('...but provenance is still reported', empty.source === 'live' && typeof empty.computedAt === 'string', empty)

	const mostlyUnlinked = roots({
		accountability_entities: [
			{ id: 1, entity_name: 'Linked', entity_type: 'workflow', department: 'Eng' },
			{ id: 2, entity_name: 'Bare2', entity_type: 'workflow', department: 'Eng' },
			{ id: 3, entity_name: 'Bare3', entity_type: 'agent', department: 'Ops' },
		],
		accountability_links: [
			{ entity_id: 1, person_name: 'Ana', raci_role: 'Responsible' },
		],
	})
	const under = d.accountability(mostlyUnlinked)
	check('1 of 3 entities linked (33%) is below the 50% threshold', under.evidence.coverage < 0.5, under.evidence)
	check('...so it is insufficient too', under.evidence.sufficient === false && under.accountabilityScore === null, under)

	const r = roots({
		accountability_entities: [
			{ id: 1, entity_name: 'Separated', entity_type: 'workflow', department: 'Eng' },
			{ id: 2, entity_name: 'SamePerson', entity_type: 'workflow', department: 'Eng' },
			{ id: 3, entity_name: 'OnlyResponsible', entity_type: 'agent', department: 'Ops' },
			{ id: 4, entity_name: 'Nobody', entity_type: 'agent', department: 'Ops' },
		],
		accountability_links: [
			{ entity_id: 1, person_name: 'Ana', raci_role: 'Responsible' },
			{ entity_id: 1, person_name: 'Ben', raci_role: 'Accountable' },
			{ entity_id: 2, person_name: 'Cal', raci_role: 'Responsible' },
			{ entity_id: 2, person_name: 'Cal', raci_role: 'Accountable' },
			{ entity_id: 3, person_name: 'Dee', raci_role: 'Responsible' },
			{ entity_id: 4, person_name: 'Eve', raci_role: 'Consulted' },
			{ entity_id: 4, person_name: 'Fay', raci_role: 'Informed' },
		],
	})
	const full = d.accountability(r)
	check('all 4 entities carry a link (even Consulted/Informed-only) — evidence is sufficient',
		full.evidence.sufficient === true && full.accountabilityScore === 40, full.evidence)
	check('a real, evidenced CRITICAL score is still allowed through', full.status === 'CRITICAL', full.status)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:

```bash
node tests/derived.unit.test.js
```

Expected: FAIL — `empty.evidence` is `undefined` (`Cannot read properties of undefined`), or the
`check` reports `accountabilityScore === null` as false (it currently computes to `0`).

- [ ] **Step 3: Implement the gate**

In `backend/domain/derived.js`, change the import at line 62:

```js
const { atOrAbove, evidenceGate } = require('./definitions')
```

Replace the `accountability()` function's closing block (lines 239-254 — from
`const accountabilityScore = ...` through the closing `}`) with:

```js
	const accountabilityScore = round(mean(perEntity.map((e) => e.score)))
	const uniquePeople = new Set(roots.accountability_links.map((l) => l.person_name))

	const evidence = evidenceGate(roots.accountability_entities, (e) => (linksByEntity.get(e.id) || []).length > 0)

	return {
		accountabilityScore: evidence.sufficient ? accountabilityScore : null,
		status: evidence.sufficient ? band(accountabilityScore) : null,
		totalEntities: roots.accountability_entities.length,
		entitiesWithLinks,
		sameRandACount: sameRandA,
		uniquePeopleCount: uniquePeople.size,
		perEntity,
		evidence,
		...provenance({
			accountability_entities: roots._counts.accountability_entities,
			accountability_links: roots._counts.accountability_links,
		}),
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node tests/derived.unit.test.js
```

Expected: PASS for every check, including the pre-existing accountability assertions from lines
59-72 (they use a fixture where all 4 entities carry a link, so `evidence.sufficient` is `true` and
`accountabilityScore`/`status` compute exactly as before).

- [ ] **Step 5: Run the full suite and commit**

```bash
cd backend && node tests/run-all.js
```

Expected: `ALL TEST SUITES PASSED`.

```bash
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: gate accountability()'s aggregate score on evidence (D-07, D-10, D-22)

Zero accountability_entities, or fewer than half carrying any RACI link,
now reports accountabilityScore/status as null with an evidence sibling
instead of computing a fabricated CRITICAL. Per-entity scores are
unchanged — an entity that exists with zero links is a real, recorded
gap, not missing evidence.
EOF
)"
```

---

## Task 2: Gate `collaboration()`'s summary verdicts

**Files:**
- Modify: `backend/domain/derived.js:294-410` (`collaboration()`)
- Test: `backend/tests/derived.unit.test.js`

**Interfaces:**
- Produces: `collaboration(roots).summary.evidence` — `{sufficient, status, coverage, covered, total, threshold}`,
  gated on `roots.employees` being non-empty (population-empty check only — a genuinely-zero
  adoption score among employees who exist and were checked is a real answer, not a data gap; see
  design doc §2.1 pattern 1). When insufficient: `aiAdoptionScore`, `adoptionLevel`,
  `humanDependencyScore`, `meanDependencyScore`, `dependencyLevel`, `collaborationScore`,
  `collaborationLevel` all become `null`. `highestDependencyEmployee`/`highestDependencyScore`,
  `peopleScored`/`peopleTotal` are unchanged (they're already `null`/`0`-safe on empty input).
  `perEmployee` is unchanged.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/derived.unit.test.js`, immediately after the existing collaboration block
(after line 116, before `// ── Predictive risk ──`):

```js
// ── Collaboration evidence gate (D-07, D-10) ───────────────────────────────
console.log('\nCollaboration — evidence gate:')
{
	const empty = d.collaboration(roots())
	check('zero employees is insufficient evidence',
		empty.summary.evidence.sufficient === false, empty.summary.evidence)
	check('...so every summary verdict is null, not a fabricated MINIMAL/POOR',
		empty.summary.aiAdoptionScore === null && empty.summary.adoptionLevel === null &&
		empty.summary.collaborationScore === null && empty.summary.collaborationLevel === null &&
		empty.summary.dependencyLevel === null, empty.summary)
	check('peopleScored/peopleTotal still report zero, not null', empty.summary.peopleScored === 0 && empty.summary.peopleTotal === 0, empty.summary)

	const oneEmployeeNoAI = d.collaboration(roots({ employees: [{ id: 1, name: 'Solo', department: 'Eng' }] }))
	check('employees exist but none touch AI — a real zero, evidence is sufficient',
		oneEmployeeNoAI.summary.evidence.sufficient === true && oneEmployeeNoAI.summary.aiAdoptionScore === 0,
		oneEmployeeNoAI.summary)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: FAIL — `empty.summary.evidence` is `undefined`.

- [ ] **Step 3: Implement the gate**

In `backend/domain/derived.js`, replace the `return` statement of `collaboration()` (lines 384-409)
with:

```js
	const evidence = evidenceGate(roots.employees, () => true)

	return {
		perEmployee,
		summary: {
			aiAdoptionScore: evidence.sufficient ? aiAdoptionScore : null,
			adoptionLevel: evidence.sufficient ? band(aiAdoptionScore, ['MINIMAL', 'LOW', 'MODERATE', 'HIGH']) : null,
			humanDependencyScore: evidence.sufficient ? humanDependencyScore : null,
			meanDependencyScore: evidence.sufficient ? meanDependencyScore : null,
			// Deliberately inverted: a HIGH dependency score is a BAD outcome, so the
			// reassuring label has to sit at the low end or the word and the number
			// would tell opposite stories.
			dependencyLevel: evidence.sufficient ? band(100 - humanDependencyScore, ['SEVERE', 'HIGH', 'MODERATE', 'LOW']) : null,
			highestDependencyEmployee: highest ? highest.name : null,
			highestDependencyScore: highest ? highest.dependencyScore : null,
			collaborationScore: evidence.sufficient ? collaborationScore : null,
			collaborationLevel: evidence.sufficient ? band(collaborationScore, ['POOR', 'FAIR', 'GOOD', 'STRONG']) : null,
			peopleScored: perEmployee.length,
			peopleTotal: roots.employees.length,
			evidence,
		},
		...provenance({
			employees: roots._counts.employees,
			tool_users: roots._counts.tool_users,
			employee_agent: roots._counts.employee_agent,
			agents: roots._counts.agents,
			owners: roots._counts.owners,
		}),
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: PASS, including the pre-existing collaboration assertions (their fixture has 3 non-empty
employees, so `evidence.sufficient` is `true` throughout).

- [ ] **Step 5: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: gate collaboration() summary verdicts on evidence (D-07, D-10, D-22)

Zero employees now reports the summary's five verdict fields as null
with an evidence sibling. A real zero-adoption score among employees
that do exist is left alone — that's a measurement, not a gap.
EOF
)"
```

---

## Task 3: Gate `pillars()` GI, fixing the D-24 optimistic mirror

**Files:**
- Modify: `backend/domain/definitions.js` (new `combineEvidence()` helper)
- Modify: `backend/domain/derived.js:62` (import), `:787-884` (`pillars()`)
- Test: `backend/tests/definitions.unit.test.js`, `backend/tests/derived.unit.test.js`

**Interfaces:**
- Produces (new, `definitions.js`): `combineEvidence(namedGates: {[name: string]: EvidenceGateResult}): EvidenceGateResult & {[name: string]: EvidenceGateResult}`.
  Every composite evidence object in this workstream (GI, MI, DI, orgScore, orgHealth,
  departmentExposure) is built from more than one underlying `evidenceGate()` call. `EvidenceBadge`
  (Task 13) only knows how to read a flat `{status, coverage, covered, total}` shape, so a composite
  needs the same flat fields at its own top level — not just nested per-input detail — or the badge
  renders "undefined of undefined". `combineEvidence` takes several named gates, is `sufficient`
  only if every one of them is, and surfaces the **worst** (lowest-coverage) gate's own
  `coverage`/`covered`/`total`/`threshold` at the top level (the most informative single number when
  something's insufficient — "here's your actual bottleneck"), while spreading every named gate
  alongside so detail (`.workflows`, `.platforms`, etc.) is still reachable.
- Produces: `pillars(roots, accountabilityResult).pillars[0].evidence` (GI) —
  `combineEvidence({workflows: ..., platforms: ...})`, so `.workflows`/`.platforms` carry each
  sub-gate's own shape, and `.sufficient`/`.status`/`.coverage`/`.covered`/`.total`/`.threshold` are
  the flat summary. GI is sufficient only if both the `workflows` gate (has any `workflow_runbooks`
  row) and the `platforms` gate (has any `tool_policies` row) are sufficient. When insufficient: GI's
  `score`, `rating`, `strengths`, `weaknesses` become `null`/`[]`; `components` stays populated (it's
  raw intermediate math, not itself a published verdict). D-24: `violationScore` no longer defaults
  to 100 when `ai_platforms` is empty — that case is folded into the same `platforms` gate.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/derived.unit.test.js`, immediately after the existing Pillars block (after
line 289, before `// ── Decision quality ──`):

```js
// ── Pillars evidence gate (D-07, D-10, D-24) ────────────────────────────────
console.log('\nPillars — evidence gate:')
{
	const empty = roots()
	const p = d.pillars(empty, d.accountability(empty))
	const by = Object.fromEntries(p.pillars.map((x) => [x.resultKey, x]))

	check('GI is insufficient with no workflows and no platforms',
		by.GI.evidence.sufficient === false && by.GI.score === null && by.GI.rating === null, by.GI.evidence)
	check('...components are still reported (raw intermediate math, not a verdict)',
		'runbookCoverage' in by.GI.components, by.GI.components)

	// D-24: zero platforms used to fabricate a perfect violationScore of 100.
	const noPlatforms = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
	})
	const g = d.pillars(noPlatforms, d.accountability(noPlatforms)).pillars.find((x) => x.resultKey === 'GI')
	check('workflows are covered but platforms are still empty — GI stays insufficient',
		g.evidence.sufficient === false && g.evidence.platforms.sufficient === false, g.evidence)

	// Platforms exist but none has ANY tool_policies row (not even inactive) — never assessed.
	const unassessedPlatforms = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		ai_platforms: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }],
		tool_policies: [],
	})
	const g2 = d.pillars(unassessedPlatforms, d.accountability(unassessedPlatforms)).pillars.find((x) => x.resultKey === 'GI')
	check('platforms exist but none was ever assessed for policy — still insufficient',
		g2.evidence.sufficient === false, g2.evidence)
	check('...and the flat coverage/covered/total EvidenceBadge reads are populated, not undefined',
		typeof g2.evidence.coverage === 'number' && typeof g2.evidence.total === 'number', g2.evidence)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: FAIL — `by.GI.evidence` is `undefined`.

- [ ] **Step 3: Add `combineEvidence()` to `definitions.js`**

Add to `backend/tests/definitions.unit.test.js`, at the end of the file (after the existing
`spofVerdict` tests, before whatever the file's final summary/exit lines are):

```js
console.log('\ncombineEvidence — composite gates stay readable as a flat gate (D-22, D-23):')
{
	const a = D.evidenceGate([{ x: 1 }], () => true)          // sufficient, coverage 1
	const b = D.evidenceGate([{ x: 1 }, { x: 1 }, { x: null }], (r) => r.x != null) // sufficient, coverage 0.67
	const c = D.evidenceGate([], () => true)                   // insufficient, coverage 0

	const allGood = D.combineEvidence({ a, b })
	check('sufficient only if every named gate is', allGood.sufficient === true, allGood)
	check('surfaces the worst gate\'s own coverage at the top level', allGood.coverage === b.coverage, allGood)
	check('named gates are still reachable for detail', allGood.a === a && allGood.b === b, allGood)

	const oneBad = D.combineEvidence({ a, c })
	check('one insufficient gate sinks the whole composite', oneBad.sufficient === false, oneBad)
	check('the worst (zero-coverage) gate is what surfaces at the top', oneBad.coverage === 0 && oneBad.total === 0, oneBad)
}
```

Run it and confirm it fails:

```bash
cd backend && node tests/definitions.unit.test.js
```

Expected: FAIL — `D.combineEvidence is not a function`.

Implement in `backend/domain/definitions.js`, after `evidenceGate` (after its closing `}`, before
`module.exports`):

```js
/**
 * Combines several evidenceGate() results into one composite: sufficient only
 * if every named gate is. Surfaces the WORST (lowest-coverage) gate's own
 * coverage/covered/total/threshold at the top level — so a composite is still
 * readable by anything that only knows how to read a single evidenceGate()
 * shape (a UI badge, for instance) — while spreading every named gate
 * alongside for detail.
 *
 * @param {{[name: string]: ReturnType<typeof evidenceGate>}} namedGates
 */
function combineEvidence(namedGates) {
	const entries = Object.entries(namedGates)
	const sufficient = entries.every(([, g]) => g.sufficient)
	const worst = entries.reduce((min, [, g]) => (g.coverage < min.coverage ? g : min), entries[0][1])
	return {
		sufficient,
		status: sufficient ? 'computed' : 'insufficient_evidence',
		coverage: worst.coverage,
		covered: worst.covered,
		total: worst.total,
		threshold: worst.threshold,
		...namedGates,
	}
}
```

Add `combineEvidence` to the `module.exports` list.

Run `node tests/definitions.unit.test.js` again — expected PASS.

- [ ] **Step 4: Gate GI using `combineEvidence`**

In `backend/domain/derived.js`, change the import at line 62:

```js
const { atOrAbove, evidenceGate, combineEvidence } = require('./definitions')
```

Inside `pillars()`, insert evidence gates right after the GI block's existing computation (after
line 808, `const GI = round(mean([runbookCoverage, policyCoverage, violationScore]))`) and before the
`// ── MI ──` comment:

```js
  const giEvidence = combineEvidence({
    workflows: evidenceGate(roots.workflows, (w) => roots.workflow_runbooks.some((r) => r.workflow_id === w.id)),
    platforms: evidenceGate(roots.ai_platforms, (p) => roots.tool_policies.some((tp) => tp.platform_id === p.id)),
  })
```

Then update the `shape` helper (lines 843-851) to accept and apply an evidence object:

```js
  const shape = (key, score, components, evidence) => ({
    resultType: 'pillar',
    resultKey: key,
    score: evidence.sufficient ? score : null,
    rating: evidence.sufficient ? band(score) : null,
    components,
    strengths: evidence.sufficient ? Object.entries(components).filter(([, v]) => v >= 70).map(([k]) => k) : [],
    weaknesses: evidence.sufficient ? Object.entries(components).filter(([, v]) => v < 50).map(([k]) => k) : [],
    evidence,
  })
```

And update GI's line in the returned `pillars` array (line 855) to pass it:

```js
      shape('GI', GI, { runbookCoverage, policyCoverage, violationScore }, giEvidence),
```

(MI and DI keep passing a placeholder evidence object for now — `{ sufficient: true, status: 'computed', coverage: 1, covered: 0, total: 0, threshold: 0.5 }` — Tasks 4 and 5 replace it. `orgScore`'s `shape(...)` call similarly needs a 4th argument for this task's code to run at all; pass the same placeholder there too, Task 6 replaces it.)

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: PASS. The pre-existing pillars test (fixture at lines 226-252 has 2 workflows each with a
runbook row, and 2 platforms where 1 has an active policy — 50% platform coverage, exactly at
threshold) still computes GI normally: `by.GI.components.violationScore === 100` still holds (2
platforms exist, 0 violations — a real, evidenced 100, not the D-24 bug).

- [ ] **Step 6: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/domain/definitions.js backend/domain/derived.js backend/tests/definitions.unit.test.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: gate pillars() GI on evidence, fix violationScore fabrication (D-07, D-10, D-22, D-24)

Adds combineEvidence() to definitions.js so a composite gate (GI draws
on two populations) still exposes the flat coverage/covered/total shape
EvidenceBadge and every other consumer of a single evidenceGate() result
already expect — surfacing the worst of the named sub-gates.

GI now requires both workflows-with-runbook-records and platforms-with-
policy-records evidence before publishing a score. Fixes the mirror bug:
zero ai_platforms used to default violationScore to a fabricated 100
("perfect, zero violations") instead of reporting insufficient evidence.
EOF
)"
```

---

## Task 4: Gate `pillars()` MI

**Files:**
- Modify: `backend/domain/derived.js:787-884` (`pillars()`)
- Test: `backend/tests/derived.unit.test.js`

**Interfaces:**
- Consumes: `accountabilityResult.evidence` from Task 1's `accountability()` change.
- Produces: `pillars(...).pillars[1].evidence` (MI) — sufficient only if `accountabilityResult.evidence.sufficient`
  AND `roots.owners` is non-empty AND `roots.knowledge_assets` is non-empty.

- [ ] **Step 1: Write the failing test**

Add to the same "Pillars — evidence gate" block from Task 3 (append before its closing `}`):

```js
	const noOwnersOrAssets = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		ai_platforms: [{ id: 1, name: 'P1' }],
		tool_policies: [{ platform_id: 1, policy_name: 'pol', status: 'active' }],
		accountability_entities: [{ id: 1, entity_name: 'E', entity_type: 'workflow', department: 'Eng' }],
		accountability_links: [{ entity_id: 1, person_name: 'A', raci_role: 'Responsible' }],
	})
	const mi = d.pillars(noOwnersOrAssets, d.accountability(noOwnersOrAssets)).pillars.find((x) => x.resultKey === 'MI')
	check('MI is insufficient with zero owners and zero knowledge_assets, even though accountability is fine',
		mi.evidence.sufficient === false, mi.evidence)

	const insufficientAccountability = roots({
		owners: [{ id: 10, name: 'A', employee_id: 1, backup_owner: 'B' }],
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
	})
	const mi2 = d.pillars(insufficientAccountability, d.accountability(insufficientAccountability)).pillars.find((x) => x.resultKey === 'MI')
	check('MI inherits an insufficient accountability sub-score rather than recomputing around it',
		mi2.evidence.sufficient === false, mi2.evidence)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: FAIL — MI currently always passes the Task-3 placeholder `{sufficient: true}`.

- [ ] **Step 3: Implement the gate**

In `backend/domain/derived.js`, in `pillars()`, after the MI block's existing computation (after
line 818, `const MI = round(mean([...]))`) and before the `// ── DI ──` comment:

```js
  const miEvidence = combineEvidence({
    accountability: accountabilityResult.evidence,
    owners: evidenceGate(roots.owners, () => true),
    knowledgeAssets: evidenceGate(roots.knowledge_assets, () => true),
  })
```

Replace the MI placeholder in the returned array (from Task 3) with `miEvidence`:

```js
      shape('MI', MI, {
        accountability: accountabilityResult.accountabilityScore,
        backupCoverage,
        ownershipCoverage,
      }, miEvidence),
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: PASS, including the pre-existing pillars test (owners and knowledge_assets are both
non-empty there, and accountability is sufficient).

- [ ] **Step 5: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: gate pillars() MI on evidence, inheriting accountability's gate (D-07, D-10, D-22)

MI is insufficient if owners or knowledge_assets is empty, OR if the
accountability sub-score it reuses is itself insufficient — a composite
cannot be more trustworthy than the sub-score it's built from.
EOF
)"
```

---

## Task 5: Gate `pillars()` DI

**Files:**
- Modify: `backend/domain/derived.js:787-884` (`pillars()`)
- Test: `backend/tests/derived.unit.test.js`

**Interfaces:**
- Produces: `pillars(...).pillars[2].evidence` (DI) — sufficient only if `roots.knowledge_assets` and
  `roots.truth_claims` are both non-empty.

- [ ] **Step 1: Write the failing test**

Append to the same "Pillars — evidence gate" block:

```js
	const noAssetsOrClaims = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		ai_platforms: [{ id: 1, name: 'P1' }],
		tool_policies: [{ platform_id: 1, policy_name: 'pol', status: 'active' }],
	})
	const di = d.pillars(noAssetsOrClaims, d.accountability(noAssetsOrClaims)).pillars.find((x) => x.resultKey === 'DI')
	check('DI is insufficient with zero knowledge_assets and zero truth_claims', di.evidence.sufficient === false, di.evidence)
}
```

(This closes the "Pillars — evidence gate" block opened in Task 3.)

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement the gate**

In `backend/domain/derived.js`, in `pillars()`, after the DI block's existing computation (after
line 839, `const DI = round(mean([...]))`) and before `const orgScore = ...`:

```js
  const diEvidence = combineEvidence({
    knowledgeAssets: evidenceGate(roots.knowledge_assets, () => true),
    truthClaims: evidenceGate(roots.truth_claims, () => true),
  })
```

Replace the DI placeholder:

```js
      shape('DI', DI, { documentationCoverage, verificationRate, contradictionScore }, diEvidence),
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: PASS, including the "Contradictions weigh more than gaps" test (both its fixtures have 1
knowledge_asset and 2 truth_claims — non-empty, sufficient).

- [ ] **Step 5: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: gate pillars() DI on evidence (D-07, D-10, D-22)

DI is insufficient if knowledge_assets or truth_claims is empty.
EOF
)"
```

---

## Task 6: Gate `pillars().orgScore`

**Files:**
- Modify: `backend/domain/derived.js:787-884` (`pillars()`)
- Test: `backend/tests/derived.unit.test.js`

**Interfaces:**
- Produces: `pillars(...).orgScore.evidence` — `{sufficient, status, pillars: {GI, MI, DI}}`. Sufficient
  only if all three of `giEvidence`/`miEvidence`/`diEvidence` are sufficient — a weighted composite
  cannot be more trustworthy than its least-evidenced input.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/derived.unit.test.js`, right after the "Pillars — evidence gate" block closes
(Task 5's Step 1 location):

```js
console.log('\norgScore — insufficient if any pillar is insufficient:')
{
	const fullFixture = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }, { id: 2, name: 'W2', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }, { workflow_id: 2, is_documented: false }],
		ai_platforms: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }],
		tool_policies: [{ platform_id: 1, policy_name: 'pol', status: 'active' }],
		policy_violations: [],
		owners: [{ id: 10, name: 'A', employee_id: 1, backup_owner: 'B' }, { id: 11, name: 'C', employee_id: 2, backup_owner: null }],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 },
			{ asset_type: 'agent', asset_id: 2, is_documented: false, owner_id: 1 },
		],
		truth_claims: [{ verdict: 'VERIFIED', is_contradicted: false }, { verdict: 'UNVERIFIED', is_contradicted: false }],
		accountability_entities: [{ id: 1, entity_name: 'E', entity_type: 'workflow', department: 'Eng' }],
		accountability_links: [
			{ entity_id: 1, person_name: 'A', raci_role: 'Responsible' },
			{ entity_id: 1, person_name: 'B', raci_role: 'Accountable' },
		],
	})
	const good = d.pillars(fullFixture, d.accountability(fullFixture))
	check('all three pillars evidenced -> orgScore is sufficient and computes',
		good.orgScore.evidence.sufficient === true && typeof good.orgScore.score === 'number', good.orgScore)

	// Same fixture minus knowledge_assets and truth_claims — DI alone goes insufficient.
	const diMissing = { ...fullFixture, knowledge_assets: [], truth_claims: [], _counts: { ...fullFixture._counts, knowledge_assets: 0, truth_claims: 0 } }
	const partial = d.pillars(diMissing, d.accountability(diMissing))
	check('DI insufficient alone still sinks orgScore, even though GI and MI are fine',
		partial.orgScore.evidence.sufficient === false && partial.orgScore.score === null, partial.orgScore.evidence)
	check('...and says exactly which pillar is the problem',
		partial.orgScore.evidence.DI.sufficient === false &&
		partial.orgScore.evidence.GI.sufficient === true &&
		partial.orgScore.evidence.MI.sufficient === true, partial.orgScore.evidence)
	check('...and the flat coverage figure is DI\'s (the worst/only-insufficient one)',
		partial.orgScore.evidence.coverage === partial.orgScore.evidence.DI.coverage, partial.orgScore.evidence)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: FAIL — `orgScore.evidence` is currently the Task-3 placeholder
`{sufficient: true, status: 'computed', coverage: 1, covered: 0, total: 0, threshold: 0.5}`, so
`partial.orgScore.evidence.sufficient === false` fails.

- [ ] **Step 3: Implement the gate**

In `backend/domain/derived.js`, in `pillars()`, replace the `orgScore` block (lines 841 and
863-869) with:

```js
  const orgScore = round(GI * PILLAR_WEIGHTS.GI + MI * PILLAR_WEIGHTS.MI + DI * PILLAR_WEIGHTS.DI)
  const orgScoreEvidence = combineEvidence({ GI: giEvidence, MI: miEvidence, DI: diEvidence })
```

And in the returned object, replace `orgScore: {...}` (lines 863-869) with:

```js
    orgScore: {
      resultType: 'overall',
      resultKey: 'org_score',
      score: orgScoreEvidence.sufficient ? orgScore : null,
      rating: orgScoreEvidence.sufficient ? band(orgScore) : null,
      weights: PILLAR_WEIGHTS,
      evidence: orgScoreEvidence,
    },
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: PASS, including the pre-existing "org score applies the declared weights" assertion (its
fixture is fully evidenced).

- [ ] **Step 5: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: gate pillars().orgScore on all three pillars' evidence (D-07, D-10, D-22)

The published Organizational Intelligence Score is insufficient if any
one of GI/MI/DI is insufficient. evidence.{GI,MI,DI} names which one,
and the flat evidence.coverage surfaces the worst of the three. This is
the headline number orchestrator.js /summary publishes and
VerdictBanner.tsx renders — Tasks 12 and 15 wire it through.
EOF
)"
```

---

## Task 7: Replace `decisionQuality()`'s ad hoc evidence marker

**Files:**
- Modify: `backend/domain/derived.js:901-916` (`decisionQuality()`)
- Test: `backend/tests/derived.unit.test.js`

**Interfaces:**
- Produces: `decisionQuality(roots).evidence` — gated on `decision_history` rows with a non-null
  `outcome` (this reuses the function's own existing `decided` filter as the `hasField` predicate — a
  ratio-based gate, not population-empty-only, because a decision existing without an outcome yet is
  a real, distinct state from a decision never being recorded at all). `score` and `rating` become
  `null` when insufficient. The `hasEvidence` field is **removed** (replaced by `evidence`) — this is
  the plan's one intentional breaking change to an existing field name; every caller of
  `decisionQuality()` is `derived.js`'s own `computeAll()` and `orgHealth()`, neither of which reads
  `hasEvidence`, so nothing outside this file needs updating.

- [ ] **Step 1: Write the failing test**

Replace the existing "Decision quality" block in `backend/tests/derived.unit.test.js` (lines
291-305) with:

```js
// ── Decision quality ─────────────────────────────────────────────────────────
console.log('\nDecision quality and org health:')
{
	const r = roots({
		decision_history: [
			{ id: 1, outcome: 'positive', should_revisit: false },
			{ id: 2, outcome: 'negative', should_revisit: true },
			{ id: 3, outcome: null, should_revisit: false },
		],
	})
	const q = d.decisionQuality(r)
	check('undecided decisions are excluded, not counted as wins', q.decisionsWithOutcome === 2 && q.score === 50, q)
	check('2 of 3 decisions have an outcome (67%) — evidence is sufficient', q.evidence.sufficient === true, q.evidence)

	const empty = d.decisionQuality(roots())
	check('an empty log is insufficient evidence, not a fabricated WEAK/50', empty.evidence.sufficient === false && empty.score === null && empty.rating === null, empty)
	check('...hasEvidence is gone, replaced by evidence', !('hasEvidence' in empty), empty)

	const mostlyPending = roots({
		decision_history: [
			{ id: 1, outcome: 'positive', should_revisit: false },
			{ id: 2, outcome: null, should_revisit: false },
			{ id: 3, outcome: null, should_revisit: false },
		],
	})
	const under = d.decisionQuality(mostlyPending)
	check('1 of 3 decided (33%) is below the 50% threshold', under.evidence.sufficient === false, under.evidence)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: FAIL — `q.evidence` is `undefined`; `empty.score === 50`, not `null`.

- [ ] **Step 3: Implement the gate**

Replace `decisionQuality()` (lines 901-916) with:

```js
function decisionQuality(roots) {
  const decided = roots.decision_history.filter((d) => d.outcome)
  const negative = decided.filter((d) => d.outcome === 'negative').length
  const evidence = evidenceGate(roots.decision_history, (d) => d.outcome != null)
  const score = decided.length ? clamp(round(pct(decided.length - negative, decided.length))) : 50

  return {
    score: evidence.sufficient ? score : null,
    rating: evidence.sufficient ? band(score) : null,
    decisionsRecorded: roots.decision_history.length,
    decisionsWithOutcome: decided.length,
    negativeOutcomes: negative,
    flaggedForRevisit: roots.decision_history.filter((d) => d.should_revisit).length,
    evidence,
    ...provenance({ decision_history: roots._counts.decision_history }),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: PASS.

- [ ] **Step 5: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: replace decisionQuality()'s ad hoc hasEvidence with evidenceGate() (D-07, D-10, D-22, D-25)

A 0-decision org previously reported a WEAK (score 50) rating via a
one-off hasEvidence flag that avoided CRITICAL but still fabricated a
number. Now reports insufficient_evidence via the same mechanism every
other gated score uses. Breaking change: hasEvidence is removed in favor
of evidence; no caller outside this file read it.
EOF
)"
```

---

## Task 8: Gate `orgHealth()`'s five dimensions, fixing the D-24 mirror in `ownershipSpreadScore`

**Files:**
- Modify: `backend/domain/derived.js:939-1009` (`orgHealth()`)
- Test: `backend/tests/derived.unit.test.js`

**Interfaces:**
- Produces: `orgHealth(roots, {...}).evidence` — `{sufficient, status, documentation, continuity, ownershipSpread, criticalSafety, incidentLoad}`,
  each an `evidenceGate()` result. `documentationScore` null unless `knowledge_assets` non-empty.
  `continuityScore` null unless `workflows` AND `owners` both non-empty. `ownershipSpreadScore` null
  unless at least one agent has an `owner_id` set (fixes D-24 — previously defaulted to 100).
  `criticalSafetyScore` null unless `agents` non-empty. `incidentLoadScore` null unless `workflows`
  non-empty. `healthIndex`/`healthStatus` null unless all five are sufficient.
  `orgHealthByDepartment()` (which calls `orgHealth()` once per department-filtered roots) inherits
  this automatically — no code change needed there, only a test.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/derived.unit.test.js`, immediately after the "Org health" blocks (after line
334, before `// ── Org health by department ──`):

```js
// ── Org health evidence gate (D-07, D-10, D-24) ─────────────────────────────
console.log('\nOrg health — evidence gate:')
{
	const empty = d.orgHealth(roots(), { accountability: d.accountability(roots()), predictiveRisk: d.predictiveRisk(roots()) })
	check('fully empty roots is insufficient evidence on every dimension',
		empty.evidence.sufficient === false &&
		empty.healthIndex === null && empty.healthStatus === null &&
		empty.documentationScore === null && empty.continuityScore === null &&
		empty.ownershipSpreadScore === null && empty.criticalSafetyScore === null &&
		empty.incidentLoadScore === null, empty)

	// D-24: zero agents-with-owners used to fabricate a perfect ownershipSpreadScore of 100.
	const noOwnedAgents = roots({
		agents: [{ id: 1, name: 'A1', risk: 'low', status: 'active', owner_id: null }],
	})
	const h = d.orgHealth(noOwnedAgents, { accountability: d.accountability(noOwnedAgents), predictiveRisk: d.predictiveRisk(noOwnedAgents) })
	check('an agent exists but nobody owns anything — ownershipSpreadScore is insufficient, not a fabricated 100',
		h.evidence.ownershipSpread.sufficient === false && h.ownershipSpreadScore === null, h)

	// One dimension insufficient (no owners at all -> continuity fails) does not null out
	// a sibling dimension whose own population (agents) is fine.
	const r = roots({
		workflows: [{ id: 1, name: 'W', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		workflow_failures: [],
		agents: [{ id: 1, name: 'A1', risk: 'low', status: 'active', owner_id: 10 }],
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
		owners: [],
	})
	const h2 = d.orgHealth(r, { accountability: d.accountability(r), predictiveRisk: d.predictiveRisk(r) })
	check('continuity is insufficient (zero owners) while documentation and criticalSafety stay evidenced',
		h2.evidence.continuity.sufficient === false &&
		h2.evidence.documentation.sufficient === true &&
		h2.evidence.criticalSafety.sufficient === true, h2.evidence)
	check('...but healthIndex/healthStatus are still null overall, since one dimension failed',
		h2.healthIndex === null && h2.healthStatus === null, h2)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: FAIL — `empty.evidence` is `undefined`.

- [ ] **Step 3: Implement the gate**

In `backend/domain/derived.js`, replace the `orgHealth()` function's tail — from
`const criticalThreats = ...` (line 970) through the closing `}` (line 1009) — with:

```js
  const criticalThreats = risk.scores.filter((s) => s.threatLevel === 'CRITICAL').length
  const criticalSafetyScore = clamp(round(100 - pct(criticalThreats, roots.agents.length) * 1.5))

  const failuresPerWorkflow = roots.workflows.length
    ? roots.workflow_failures.length / roots.workflows.length
    : 0
  const incidentLoadScore = clamp(round(100 - failuresPerWorkflow * INCIDENT_LOAD_PENALTY_PER_FAILURE))

  const documentationEvidence = evidenceGate(roots.knowledge_assets, () => true)
  const continuityEvidence = combineEvidence({
    workflows: evidenceGate(roots.workflows, () => true),
    owners: evidenceGate(roots.owners, () => true),
  })
  const ownershipSpreadEvidence = evidenceGate(roots.agents, (a) => a.owner_id != null)
  const criticalSafetyEvidence = evidenceGate(roots.agents, () => true)
  const incidentLoadEvidence = evidenceGate(roots.workflows, () => true)

  const evidence = combineEvidence({
    documentation: documentationEvidence,
    continuity: continuityEvidence,
    ownershipSpread: ownershipSpreadEvidence,
    criticalSafety: criticalSafetyEvidence,
    incidentLoad: incidentLoadEvidence,
  })

  const healthIndex = evidence.sufficient ? round(mean([
    documentationScore, continuityScore, ownershipSpreadScore,
    criticalSafetyScore, incidentLoadScore,
  ])) : null

  const now = new Date()
  const snapshotMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

  return {
    snapshotMonth,
    healthIndex,
    healthStatus: !evidence.sufficient ? null : (healthIndex >= 70 ? 'STABLE' : healthIndex >= 45 ? 'WARNING' : 'CRITICAL'),
    documentationScore: documentationEvidence.sufficient ? documentationScore : null,
    continuityScore: continuityEvidence.sufficient ? continuityScore : null,
    ownershipSpreadScore: ownershipSpreadEvidence.sufficient ? ownershipSpreadScore : null,
    criticalSafetyScore: criticalSafetyEvidence.sufficient ? criticalSafetyScore : null,
    incidentLoadScore: incidentLoadEvidence.sufficient ? incidentLoadScore : null,
    accountabilityScore: acc.accountabilityScore,
    evidence,
    ...provenance({
      knowledge_assets: roots._counts.knowledge_assets,
      workflow_runbooks: roots._counts.workflow_runbooks,
      workflows: roots._counts.workflows,
      owners: roots._counts.owners,
      agents: roots._counts.agents,
      workflow_failures: roots._counts.workflow_failures,
    }),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: PASS, including:
- The first pre-existing orgHealth test (line 309-322, all 5 populations non-empty — unaffected).
- The "busy" regression test (line 327-333) — only checks `h.incidentLoadScore`, whose own
  population (`workflows`, 1 row) is non-empty, so it stays a number (75) even though
  `owners`/`agents`/`knowledge_assets` are empty in that fixture and other dimensions go `null`.
- The `orgHealthByDepartment` tests (lines 337-380) — both Eng and Ops partitions have all 5
  populations non-empty in that fixture, so gating doesn't change their `healthIndex` values.

- [ ] **Step 5: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: gate orgHealth()'s five dimensions independently, fix ownershipSpreadScore fabrication (D-07, D-10, D-22, D-24)

Each dimension gates on its own population; healthIndex/healthStatus
require all five. Fixes the mirror bug: zero agents with an owner used
to default ownershipSpreadScore to a fabricated 100 ("no concentration
to measure" read as "perfectly spread") instead of insufficient
evidence. orgHealthByDepartment() inherits this for free — it calls
orgHealth() per department, verified by existing tests, no code change.
EOF
)"
```

---

## Task 9: Gate `departmentExposure()`

**Files:**
- Modify: `backend/domain/derived.js:1109-1138` (`departmentExposure()`)
- Test: `backend/tests/derived.unit.test.js`

**Interfaces:**
- Produces: each row in `departmentExposure(roots).departments[]` gains an `evidence` field —
  `{sufficient, status, knowledgeAssets, owners}` — sufficient only if that department's
  `knowledge_assets` and `owners` populations (after the existing per-department filter) are both
  non-empty. When insufficient: `documentationCoverage`, `backupCoverage`, `incidentExposureScore`,
  `incidentRiskLevel` become `null` for that row.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/derived.unit.test.js`, immediately after the existing "Department exposure"
block (after line 419, before `// ── Provenance across the board ──`):

```js
// ── Department exposure evidence gate (D-07, D-10) ──────────────────────────
console.log('\nDepartment exposure — evidence gate:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Ana', department: 'Eng' },
			{ id: 2, name: 'Ben', department: 'Empty' },
		],
		owners: [{ id: 10, name: 'Ana', employee_id: 1, backup_owner: 'Cal' }],
		workflows: [{ id: 1, name: 'EngFlow', risk: 'low', department: 'Eng' }],
		workflow_failures: [],
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
	})
	const byDept = d.departmentExposure(r)
	const eng = byDept.departments.find((x) => x.department === 'Eng')
	const empty = byDept.departments.find((x) => x.department === 'Empty')

	check('Eng has owners and knowledge_assets — evidenced', eng.evidence.sufficient === true && typeof eng.incidentExposureScore === 'number', eng)
	check('Empty department has neither — insufficient, not a fabricated score',
		empty.evidence.sufficient === false && empty.incidentExposureScore === null && empty.incidentRiskLevel === null, empty)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: FAIL — `eng.evidence` is `undefined`.

- [ ] **Step 3: Implement the gate**

In `backend/domain/derived.js`, replace the `rows` mapping inside `departmentExposure()` (lines
1113-1132) with:

```js
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

		const evidence = combineEvidence({
			knowledgeAssets: evidenceGate(assets, () => true),
			owners: evidenceGate(owners, () => true),
		})

		return {
			department,
			documentationCoverage: evidence.sufficient ? documentationCoverage : null,
			backupCoverage: evidence.sufficient ? backupCoverage : null,
			incidentExposureScore: evidence.sufficient ? incidentExposureScore : null,
			incidentRiskLevel: evidence.sufficient ? incidentRiskLevel : null,
			evidence,
		}
	})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/derived.unit.test.js
```

Expected: PASS, including the pre-existing departmentExposure test (both Eng and Ops have non-empty
owners and knowledge_assets in that fixture).

- [ ] **Step 5: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "$(cat <<'EOF'
derived.js: gate departmentExposure() per department on evidence (D-07, D-10, D-22)

A department with employees but no owners or knowledge_assets recorded
now reports insufficient_evidence for that row instead of a computed
(and largely meaningless) exposure score built from two empty
populations and one real one.
EOF
)"
```

---

## Task 10: Gate `truth.js /summary`'s `trustStatus`

**Files:**
- Modify: `backend/routes/truth/truth.js:105-159`
- Test: `backend/tests/routeEvidence.unit.test.js` (new)
- Modify: `backend/tests/run-all.js` (register the new test)

**Interfaces:**
- Produces: a new exported pure function `trustStatusFor(claims)` on the router object
  (`router.trustStatusFor = trustStatusFor`, alongside the existing `module.exports = router` —
  attaching to the function object is how this codebase keeps a route file's pure logic testable
  without changing what `require('./truth')` returns everywhere else it's already mounted). Returns
  `{trustStatus, evidence}` where `trustStatus` is `null` and `evidence.sufficient` is `false` when
  `claims.length === 0`; otherwise unchanged behavior (`TRUSTED`/`PARTIAL`/`UNTRUSTED` from the
  existing thresholds).
- `/summary`'s JSON response gains an `evidence` field; `trustStatus` becomes `null` on zero claims
  instead of `'UNTRUSTED'`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/routeEvidence.unit.test.js`:

```js
/*
 * OBA Core — Evidence gating for routes outside domain/derived.js.
 *
 * truth.js and decisionIntelligence.js each compute a verdict directly from
 * root tables, independently of derived.js — tracing every score-producing
 * route (per the remediation decision log's standing instruction) found both
 * exhibited the same absence-fabrication bug band() does, under their own
 * inline ternaries. This file asserts the extracted, testable pieces of each
 * fix in isolation, the same way definitions.unit.test.js and
 * derived.unit.test.js assert pure logic without a database.
 *
 * Run from backend/:  node tests/routeEvidence.unit.test.js
 */

const truthRouter = require('../routes/truth/truth')
const decisionIntelligenceRouter = require('../routes/decisionIntelligence')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Route-Level Evidence Gate Unit Test ===\n')

console.log('truth.js /summary — trustStatus evidence gate (D-07, D-10):')
{
	const empty = truthRouter.trustStatusFor([])
	check('zero claims is insufficient evidence, not UNTRUSTED', empty.evidence.sufficient === false && empty.trustStatus === null, empty)

	const claims = [
		{ verdict: 'VERIFIED' }, { verdict: 'VERIFIED' }, { verdict: 'UNVERIFIED' },
	]
	const real = truthRouter.trustStatusFor(claims)
	check('a real, evidenced low trust score is still allowed through as UNTRUSTED-or-better',
		real.evidence.sufficient === true && typeof real.trustStatus === 'string', real)
}

console.log('\ndecisionIntelligence.js — dqiVerdict evidence gate (D-07, D-10, D-24):')
{
	const empty = decisionIntelligenceRouter.dqiVerdictFor([])
	check('zero decisions is insufficient evidence, not a fabricated dqi=100/STRONG',
		empty.evidence.sufficient === false && empty.dqi === null && empty.dqiVerdict === null, empty)

	const decisions = [{ score: 90 }, { score: 70 }]
	const real = decisionIntelligenceRouter.dqiVerdictFor(decisions)
	check('real decisions still compute a real dqi', real.evidence.sufficient === true && real.dqi === 80, real)
}

console.log('\n========================================')
console.log(failed === 0 ? 'ALL CHECKS PASSED ✅' : (failed + ' CHECK(S) FAILED ❌'))
console.log(`${passed} passed, ${failed} failed`)
console.log('========================================\n')
process.exit(failed === 0 ? 0 : 1)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/routeEvidence.unit.test.js
```

Expected: FAIL — `TypeError: truthRouter.trustStatusFor is not a function`.

- [ ] **Step 3: Implement the gate in `truth.js`**

In `backend/routes/truth/truth.js`, add the import at the top (after line 3, `const supabase = ...`):

```js
const { evidenceGate } = require('../../domain/definitions')
```

Add a new pure function after `computeLiveTrustScore` (after line 60, before the `/` route):

```js
function trustStatusFor(claims) {
  const evidence = evidenceGate(claims, () => true)
  if (!evidence.sufficient) return { trustStatus: null, evidence }

  const trustScore = computeLiveTrustScore(claims)
  const trustStatus =
    trustScore >= 75 ? 'TRUSTED'
    : trustScore >= 50 ? 'PARTIAL'
    : 'UNTRUSTED'
  return { trustStatus, evidence }
}
```

Replace the `/summary` route's `trustStatus` computation and response (lines 148-155) — from
`trustStatus:` through the closing of the `res.json({...})` call — with:

```js
    const { trustStatus, evidence } = trustStatusFor(claims)

    res.json({
      totalClaims:              total,
      verifiedClaims:           verified,
      unverifiedClaims:         unverified,
      contradictedClaims:       contradicted,
      trustScore,
      trustStatus,
      evidence,
      entitiesWithContradictions: contradictedEntities.length,
      contradictedEntities,
      weakestClaimCategory: weakestCategory
    })
```

At the bottom of the file, before `module.exports = router`, add:

```js
router.trustStatusFor = trustStatusFor
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/routeEvidence.unit.test.js
```

Expected: PASS for the truth.js checks (the decisionIntelligence.js checks still fail — Task 11
fixes those).

- [ ] **Step 5: Register the new test and commit**

In `backend/tests/run-all.js`, add `'routeEvidence.unit.test.js'` to the `tests` array, alongside
`'derived.unit.test.js'` and `'definitions.unit.test.js'`:

```js
	'derived.unit.test.js', // pure; asserts the derived-intelligence definitions
	'definitions.unit.test.js', // pure; asserts the canonical criticality/SPOF definitions
	'routeEvidence.unit.test.js', // pure; asserts evidence gating in routes outside derived.js
	'authRoutes.test.js', // HTTP-level; stubs Supabase, so it runs offline
```

```bash
cd backend && node tests/run-all.js
```

Expected: `routeEvidence.unit.test.js`'s truth.js checks pass; its decisionIntelligence.js checks
still fail (Task 11), so the overall suite is still red at this point — that's expected and
resolved in the very next task. Commit anyway, since `truth.js`'s own change is complete and
correct in isolation:

```bash
git add backend/routes/truth/truth.js backend/tests/routeEvidence.unit.test.js backend/tests/run-all.js
git commit -m "$(cat <<'EOF'
truth.js: gate /summary's trustStatus on evidence (D-07, D-10)

Zero truth_claims previously reported trustStatus: 'UNTRUSTED' via its
own inline ternary, independently of band() and domain.intelligence.
Extracted trustStatusFor() so the gate is unit-testable; wired into
/summary's response with an evidence sibling. No frontend consumer
exists for this field today (grepped) — fixed anyway since a future
consumer shouldn't inherit the bug.

Note: this commit leaves routeEvidence.unit.test.js's
decisionIntelligence.js checks red; Task 11 (next commit) completes
that half of the same new test file.
EOF
)"
```

---

## Task 11: Gate `decisionIntelligence.js`'s `dqiVerdict`, fixing the D-24 `calcDQI` mirror

**Files:**
- Modify: `backend/routes/decisionIntelligence.js:309-370`
- Test: `backend/tests/routeEvidence.unit.test.js` (from Task 10)

**Interfaces:**
- Produces: a new exported pure function `dqiVerdictFor(decisions)` on the router object. Returns
  `{dqi, dqiVerdict, evidence}`; `dqi`/`dqiVerdict` are `null` when `decisions.length === 0` (fixes
  D-24 — `calcDQI` previously returned `100` for an empty list, banding to `'STRONG'`).

- [ ] **Step 1: The test already exists**

Task 10 already wrote this task's test (the "decisionIntelligence.js — dqiVerdict evidence gate"
block in `backend/tests/routeEvidence.unit.test.js`). Confirm it still fails for the right reason:

```bash
cd backend && node tests/routeEvidence.unit.test.js
```

Expected: FAIL — `TypeError: decisionIntelligenceRouter.dqiVerdictFor is not a function`.

- [ ] **Step 2: Implement the gate**

In `backend/routes/decisionIntelligence.js`, add the import at the top (after line 7,
`const { normalizeLevel } = require('../domain/definitions')`):

```js
const { evidenceGate } = require('../domain/definitions')
```

Replace `calcDQI` (lines 311-315) and the `dqi`/`dqiVerdict` computation (lines 357-358) together —
delete `calcDQI` entirely and replace it with:

```js
function dqiVerdictFor(decisions) {
  const evidence = evidenceGate(decisions, () => true)
  if (!evidence.sufficient) return { dqi: null, dqiVerdict: null, evidence }

  const avg = decisions.reduce((s, d) => s + d.score, 0) / decisions.length
  const dqi = Math.round(avg)
  const dqiVerdict = dqi >= 80 ? 'STRONG' : dqi >= 55 ? 'MIXED' : dqi >= 30 ? 'WEAK' : 'CRITICAL'
  return { dqi, dqiVerdict, evidence }
}
```

Update the route handler (replace lines 357-358):

```js
    const { dqi, dqiVerdict, evidence } = dqiVerdictFor(decisions)
```

And add `evidence` to the `res.json({...})` call (after line 367, `dqiVerdict,`):

```js
      dqi,
      dqiVerdict,
      evidence,
```

At the bottom of the file, before `module.exports = router`:

```js
router.dqiVerdictFor = dqiVerdictFor
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd backend && node tests/routeEvidence.unit.test.js
```

Expected: PASS for all checks in the file.

- [ ] **Step 4: Full suite and commit**

```bash
cd backend && node tests/run-all.js
```

Expected: `ALL TEST SUITES PASSED`.

```bash
git add backend/routes/decisionIntelligence.js
git commit -m "$(cat <<'EOF'
decisionIntelligence.js: gate dqiVerdict on evidence, fix calcDQI fabrication (D-07, D-10, D-24)

calcDQI() returned 100 for zero decisions, banding to 'STRONG' — the
optimistic mirror of band()'s CRITICAL-on-absence bug. Replaced with
dqiVerdictFor(), gated the same way as every other score in this
workstream; zero decisions now reports insufficient_evidence.
EOF
)"
```

---

## Task 12: Wire `orchestrator.js` to `pillars.orgScore.evidence`

**Files:**
- Modify: `backend/routes/intelligence/orchestrator.js:288-340` (`orchestrate()`), `:346-418`
  (`getOrComputeOrchestration()`), `:449-468` (`/summary` route)
- Test: `backend/tests/routeEvidence.unit.test.js`

**Interfaces:**
- Consumes: `intel.pillars.orgScore` from Task 6 (`{score, rating, evidence}`, `score`/`rating`
  possibly `null`).
- Produces: `orchestrate()` returns an added `evidence` field. When `intel.pillars.orgScore.evidence.sufficient`
  is `false`, `orchestrate()` short-circuits before `generateVerdict`/`generateRecommendations` (both
  assume a real numeric score) and returns a fixed verdict string instead.
  `getOrComputeOrchestration()`'s existing "never cache a degraded snapshot" guard is extended to
  also skip caching when evidence is insufficient — no schema change to `orchestrator_snapshots`,
  since the insufficient case reuses the exact code path that already bypasses the `.insert()` for
  degraded reads. `/summary`'s response gains `evidence: snap.evidence ?? null`.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/routeEvidence.unit.test.js`, after the decisionIntelligence.js block:

```js
console.log('\norchestrator.js — orgScore evidence short-circuit (D-07, D-10, D-22):')
{
	const orchestrator = require('../routes/intelligence/orchestrator')
	check('orchestrator.js exports orchestrateFrom for testing without a live Supabase call',
		typeof orchestrator.orchestrateFrom === 'function', typeof orchestrator.orchestrateFrom)

	// A minimal intel bundle whose pillars.orgScore is insufficient (mirrors what
	// derived.js's pillars() now returns for a near-empty database).
	const insufficientIntel = {
		pillars: {
			orgScore: { score: null, rating: null, evidence: { sufficient: false, status: 'insufficient_evidence', pillars: {} } },
			pillars: [],
		},
		accountability: { accountabilityScore: null, evidence: { sufficient: false } },
		collaboration: { summary: { evidence: { sufficient: false } } },
		predictiveRisk: { scores: [], emergingThreats: [] },
		orgHealth: { evidence: { sufficient: false } },
		decisionQuality: { evidence: { sufficient: false } },
		executiveMemory: { items: [] },
	}
	const result = orchestrator.orchestrateFrom(insufficientIntel)
	check('score/rating are null when orgScore is insufficient', result.score === null && result.rating === null, result)
	check('evidence is passed through', result.evidence.sufficient === false, result.evidence)
	check('a fixed verdict explains why, instead of generateVerdict running on a null score',
		typeof result.verdict === 'string' && result.verdict.length > 0, result.verdict)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && node tests/routeEvidence.unit.test.js
```

Expected: FAIL — `orchestrator.orchestrateFrom` is `undefined` (the module currently exports only
`router`).

- [ ] **Step 3: Implement the wiring**

In `backend/routes/intelligence/orchestrator.js`, split `orchestrate()` (lines 288-340) so the part
that takes an already-loaded `intel` bundle is separately callable and testable. Replace the whole
function with:

```js
async function orchestrateFrom(intel) {
  const orgScoreEvidence = intel.pillars.orgScore.evidence

  if (!orgScoreEvidence.sufficient) {
    const [results, brainCoreResult] = await Promise.all([
      Promise.all(
        MODULE_REGISTRY.map(async cfg => {
          const result = await readModule(cfg.key, MODULE_READERS[cfg.key], intel)
          return {
            key: cfg.key, label: cfg.label, weight: cfg.weight,
            score: result.score, verified: result.verified, source: result.source,
            meta: result.meta ?? null, unavailable: !!result.unavailable, error: result.error ?? null
          }
        })
      ),
      readModule('brainCore', readBrainCore, intel)
    ])
    const unavailable = results.filter(m => m.unavailable)
    return {
      score: null,
      rating: null,
      verdict: `Insufficient evidence to compute an Organizational Intelligence Score — ${orgScoreEvidence.coverage != null ? Math.round(orgScoreEvidence.coverage * 100) + '% coverage' : 'coverage below threshold'} on at least one pillar. See evidence for detail.`,
      recs: [],
      trust: computeTrustScore(results),
      brainPosture: brainCoreResult?.meta?.posture ?? null,
      modules: results,
      dataIntegrity: {
        degraded: unavailable.length > 0,
        modulesRead: results.length,
        modulesVerified: results.filter(m => m.verified).length,
        modulesUnavailable: unavailable.length,
        unavailableModules: unavailable.map(m => ({ key: m.key, label: m.label, error: m.error })),
        warning: unavailable.length
          ? `${unavailable.length} of ${results.length} modules could not be read. This score was computed from the rest and is NOT a complete picture.`
          : null,
      },
      evidence: orgScoreEvidence,
    }
  }

  const [results, brainCoreResult] = await Promise.all([
    Promise.all(
      MODULE_REGISTRY.map(async cfg => {
        const result = await readModule(cfg.key, MODULE_READERS[cfg.key], intel)
        return {
          key:         cfg.key,
          label:       cfg.label,
          weight:      cfg.weight,
          score:       result.score,
          verified:    result.verified,
          source:      result.source,
          meta:        result.meta ?? null,
          unavailable: !!result.unavailable,
          error:       result.error ?? null
        }
      })
    ),
    readModule('brainCore', readBrainCore, intel)
  ])

  const score   = intel.pillars.orgScore.score
  const rating  = intel.pillars.orgScore.rating
  const verdict = generateVerdict(score, rating, results)
  const recs    = generateRecommendations(results)
  const trust   = computeTrustScore(results)
  const brainPosture = brainCoreResult?.meta?.posture ?? null

  const unavailable = results.filter(m => m.unavailable)
  const dataIntegrity = {
    degraded: unavailable.length > 0,
    modulesRead: results.length,
    modulesVerified: results.filter(m => m.verified).length,
    modulesUnavailable: unavailable.length,
    unavailableModules: unavailable.map(m => ({ key: m.key, label: m.label, error: m.error })),
    warning: unavailable.length
      ? `${unavailable.length} of ${results.length} modules could not be read. This score was computed from the rest and is NOT a complete picture.`
      : null,
  }

  return { score, rating, verdict, recs, trust, brainPosture, modules: results, dataIntegrity, evidence: orgScoreEvidence }
}

async function orchestrate() {
  const intel = await domain.intelligence.all()
  return orchestrateFrom(intel)
}
```

In `getOrComputeOrchestration()`, change the caching guard (line 364) from:

```js
  if (result.dataIntegrity.degraded) {
```

to:

```js
  if (result.dataIntegrity.degraded || !result.evidence.sufficient) {
```

and add `evidence: result.evidence` to that branch's returned object (after line 374,
`dataIntegrity: result.dataIntegrity,`):

```js
      dataIntegrity: result.dataIntegrity,
      evidence:      result.evidence,
```

In the `/summary` route (line 449-468), add `evidence` to the `res.json({...})` call, after
`dataIntegrity: snap.dataIntegrity ?? null`:

```js
      dataIntegrity: snap.dataIntegrity ?? null,
      evidence:      snap.evidence ?? null
```

At the bottom of the file, alongside `module.exports = router`, export the testable function:

```js
module.exports = router
module.exports.orchestrateFrom = orchestrateFrom
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && node tests/routeEvidence.unit.test.js
```

Expected: PASS.

- [ ] **Step 5: Full suite and commit**

```bash
cd backend && node tests/run-all.js
git add backend/routes/intelligence/orchestrator.js backend/tests/routeEvidence.unit.test.js
git commit -m "$(cat <<'EOF'
orchestrator.js: wire orgScore's evidence through /summary, never cache an insufficient snapshot (D-07, D-10, D-22)

orchestrate() is split into orchestrateFrom(intel) (testable without a
live Supabase call) and orchestrate() (the thin live wrapper). When
pillars.orgScore is insufficient, score/rating are null and a fixed
verdict string explains why, reusing the exact same "never persist a
number computed during a partial outage" guard the degraded-modules
case already used — no orchestrator_snapshots schema change needed,
since an insufficient result now simply never reaches the .insert().
EOF
)"
```

---

## Task 13: `EvidenceBadge` frontend component

**Files:**
- Create: `frontend/components/ui/EvidenceBadge.tsx`
- Test: `frontend/components/ui/EvidenceBadge.test.tsx`

**Interfaces:**
- Produces: `EvidenceBadge({ evidence }: { evidence: { status: string; coverage: number; covered: number; total: number } })`
  — a React component. Renders a neutral badge with the coverage figure when
  `evidence.status === 'insufficient_evidence'`; renders `null` otherwise (callers gate on the same
  condition before deciding whether to show their normal score UI at all — this component only
  covers the badge itself).

- [ ] **Step 1: Check the frontend test runner**

```bash
cd frontend && cat package.json | grep -A 3 '"scripts"'
```

Confirm which test command exists (`test`, `test:unit`, or similar) and which framework
(`jest`/`vitest`/`@testing-library/react`) is already a dependency — use whichever this repo already
has. If no component-test setup exists yet, check `frontend/package.json`'s devDependencies for
`@testing-library/react` and a runner; if genuinely absent, skip Steps 2 and 4 (write the component
in Step 3 only) and rely on Task 15's live browser verification instead, noting this explicitly in
the commit message.

- [ ] **Step 2: Write the failing test** (only if a component-test runner exists per Step 1)

Create `frontend/components/ui/EvidenceBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { EvidenceBadge } from './EvidenceBadge';

describe('EvidenceBadge', () => {
  it('renders the coverage figure, not a score, when insufficient', () => {
    render(<EvidenceBadge evidence={{ status: 'insufficient_evidence', coverage: 0.25, covered: 3, total: 12 }} />);
    expect(screen.getByText(/3 of 12/)).toBeInTheDocument();
    expect(screen.getByText(/insufficient evidence/i)).toBeInTheDocument();
  });

  it('renders nothing when evidence is sufficient', () => {
    const { container } = render(<EvidenceBadge evidence={{ status: 'computed', coverage: 1, covered: 12, total: 12 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

Run it and confirm it fails (`Cannot find module './EvidenceBadge'`).

- [ ] **Step 3: Implement the component**

Create `frontend/components/ui/EvidenceBadge.tsx`, matching the sibling `RiskBadge.tsx`'s
conventions (`clsx`, CSS custom properties, uppercase tracked label):

```tsx
import clsx from 'clsx';

export interface EvidenceInfo {
  status: string;
  coverage: number;
  covered: number;
  total: number;
}

interface EvidenceBadgeProps {
  evidence: EvidenceInfo | null | undefined;
  className?: string;
}

/**
 * Renders in place of a score/rating when a backend evidence gate reports
 * insufficient_evidence — a neutral "we don't know yet" state, distinct from
 * every risk-tier color RiskBadge uses, so it never reads as a verdict.
 */
export function EvidenceBadge({ evidence, className }: EvidenceBadgeProps) {
  if (!evidence || evidence.status !== 'insufficient_evidence') return null;

  const pct = Math.round((evidence.coverage ?? 0) * 100);

  return (
    <div
      className={clsx(
        'inline-flex flex-col gap-0.5 px-3 py-1.5 rounded-md border',
        'bg-[color:var(--bg-elevated)] border-[color:var(--border-default)]',
        className,
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
        Insufficient evidence
      </span>
      <span className="text-xs text-[color:var(--text-secondary)]">
        {evidence.covered} of {evidence.total} tracked — {pct}%
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** (only if Step 2 ran)

```bash
cd frontend && npx <test-command-from-step-1> EvidenceBadge.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/ui/EvidenceBadge.tsx
git add frontend/components/ui/EvidenceBadge.test.tsx 2>/dev/null || true
git commit -m "$(cat <<'EOF'
frontend: add EvidenceBadge, the shared insufficient-evidence UI (D-10b)

Renders a neutral coverage figure in place of a score/rating whenever a
gated backend response's evidence.status is insufficient_evidence.
Tasks 15-18 wire it into each confirmed consumer.
EOF
)"
```

---

## Task 14: `frontend/lib/evidenceGate.ts` — minimal TypeScript port

**Files:**
- Create: `frontend/lib/evidenceGate.ts`
- Test: `frontend/lib/evidenceGate.test.ts`

**Interfaces:**
- Produces: `coverage<T>(rows: T[], hasField: (row: T) => boolean): {covered: number; total: number; ratio: number}`
  and `evidenceGate<T>(rows: T[], hasField: (row: T) => boolean, opts?: {threshold?: number}): EvidenceInfo & {sufficient: boolean; threshold: number}` —
  a direct port of `backend/domain/definitions.js`'s `coverage`/`evidenceGate`, same default
  threshold (`0.5`), same "empty population is always insufficient" rule. Does not port
  `atOrAbove`/`spofVerdict`/the criticality vocabulary — nothing on the frontend reimplements those.

- [ ] **Step 1: Write the failing test**

Create `frontend/lib/evidenceGate.test.ts`:

```ts
import { coverage, evidenceGate } from './evidenceGate';

describe('coverage', () => {
  it('counts rows where hasField is true', () => {
    const rows = [{ x: 1 }, { x: null }, { x: 2 }];
    const result = coverage(rows, (r) => r.x != null);
    expect(result).toEqual({ covered: 2, total: 3, ratio: 2 / 3 });
  });

  it('an empty population has ratio 0, not NaN', () => {
    expect(coverage([], () => true).ratio).toBe(0);
  });
});

describe('evidenceGate', () => {
  it('is insufficient below the 50% default threshold', () => {
    const rows = [{ x: 1 }, { x: null }, { x: null }];
    const gate = evidenceGate(rows, (r) => r.x != null);
    expect(gate.sufficient).toBe(false);
    expect(gate.status).toBe('insufficient_evidence');
  });

  it('is sufficient at exactly 50% coverage', () => {
    const rows = [{ x: 1 }, { x: null }];
    const gate = evidenceGate(rows, (r) => r.x != null);
    expect(gate.sufficient).toBe(true);
    expect(gate.status).toBe('computed');
  });

  it('an empty population is always insufficient, never a vacuous 100%', () => {
    const gate = evidenceGate([], () => true);
    expect(gate.sufficient).toBe(false);
    expect(gate.total).toBe(0);
  });

  it('accepts a threshold override', () => {
    const rows = [{ x: 1 }, { x: null }, { x: null }, { x: null }];
    const gate = evidenceGate(rows, (r) => r.x != null, { threshold: 0.2 });
    expect(gate.sufficient).toBe(true);
  });
});
```

Run it (or skip per Task 13 Step 1's finding) and confirm it fails
(`Cannot find module './evidenceGate'`).

- [ ] **Step 2: Implement the port**

Create `frontend/lib/evidenceGate.ts`:

```ts
// lib/evidenceGate.ts
//
// Minimal TypeScript port of backend/domain/definitions.js's coverage()/
// evidenceGate(). Ports only the population/coverage primitives — not the
// criticality vocabulary (atOrAbove, spofVerdict) — because the two
// client-side files that need this (riskIntelligence.ts, orgMemory.ts) only
// ever aggregate a score, they never reimplement SPOF or threshold
// comparison logic. Exists only because there is no shared runtime between
// backend/ and frontend/ to unify the two implementations; if the 50%
// threshold or the coverage formula ever changes, both files need the edit.

export interface CoverageResult {
  covered: number;
  total: number;
  ratio: number;
}

export interface EvidenceGateResult extends CoverageResult {
  sufficient: boolean;
  status: 'computed' | 'insufficient_evidence';
  threshold: number;
}

const COVERAGE_THRESHOLD = 0.5;

export function coverage<T>(rows: T[], hasField: (row: T) => boolean): CoverageResult {
  const total = rows.length;
  const covered = rows.filter(hasField).length;
  return { covered, total, ratio: total === 0 ? 0 : covered / total };
}

export function evidenceGate<T>(
  rows: T[],
  hasField: (row: T) => boolean,
  opts: { threshold?: number } = {},
): EvidenceGateResult {
  const threshold = opts.threshold ?? COVERAGE_THRESHOLD;
  const { covered, total, ratio } = coverage(rows, hasField);
  const sufficient = total > 0 && ratio >= threshold;
  return {
    sufficient,
    status: sufficient ? 'computed' : 'insufficient_evidence',
    coverage: ratio,
    covered,
    total,
    threshold,
  };
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd frontend && npx <test-command> evidenceGate.test.ts
```

Expected: PASS. (If no test runner exists per Task 13 Step 1, skip this step and instead confirm via
`npx tsc --noEmit` that the file type-checks cleanly.)

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/evidenceGate.ts
git add frontend/lib/evidenceGate.test.ts 2>/dev/null || true
git commit -m "$(cat <<'EOF'
frontend: port coverage()/evidenceGate() to TypeScript (D-27)

Minimal port — population/coverage primitives only, not the criticality
vocabulary. Tasks 17-18 wire it into the two client-side files
(riskIntelligence.ts, orgMemory.ts) whose own aggregate score can
currently fabricate a verdict from an empty population, mirroring the
backend fix from Tasks 1-9.
EOF
)"
```

---

## Task 15: Wire `VerdictBanner.tsx` to `orgScore`'s evidence

**Files:**
- Modify: `frontend/components/dashboard/VerdictBanner.tsx`
- Modify: `frontend/lib/api.ts` (the `OrchestratorSummary` type, if `organizationalIntelligenceScore`/`rating` aren't already typed as nullable — check first)

**Interfaces:**
- Consumes: `/api/intelligence/orchestrator/summary`'s new `evidence` field (Task 12).
- Produces: `VerdictBanner` renders `<EvidenceBadge evidence={data.evidence} />` in place of the
  score/rating/progress-bar/verdict block when `data.evidence?.status === 'insufficient_evidence'`.

- [ ] **Step 1: Check the current type**

```bash
grep -n "OrchestratorSummary" -A 15 frontend/lib/api.ts
```

If `organizationalIntelligenceScore`/`rating` are typed as plain `number`/`string`, widen them to
`number | null`/`string | null` and add `evidence: EvidenceInfo | null` (importing `EvidenceInfo`
from `../components/ui/EvidenceBadge`, from Task 13).

- [ ] **Step 2: Modify `VerdictBanner.tsx`**

In `frontend/components/dashboard/VerdictBanner.tsx`, add the import:

```tsx
import { EvidenceBadge } from './../ui/EvidenceBadge';
```

Wrap the "Score row" block (lines 111-136 in the current file) with a conditional. Replace those
lines with:

```tsx
        {data.evidence?.status === 'insufficient_evidence' ? (
          <div className="mb-6">
            <EvidenceBadge evidence={data.evidence} />
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-6 mb-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-bold tabular-nums leading-none text-white">
                  {data.organizationalIntelligenceScore}
                </span>
                <span className="text-2xl text-[color:var(--text-tertiary)]">/100</span>
              </div>
              <div className="mt-2">
                <RatingBadge rating={data.rating} />
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-[color:var(--text-tertiary)] mb-1.5">
                <span>Org Intelligence Score</span>
                <span>Trust: {data.trustScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${data.organizationalIntelligenceScore}%`, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}80)` }} />
              </div>
            </div>
          </div>
        )}
```

`scoreColor` (line 76-79) reads `data.organizationalIntelligenceScore` before this block — guard it
so it doesn't crash on `null`:

```tsx
  const scoreColor = (data.organizationalIntelligenceScore ?? 0) >= 80 ? '#4ade80'
    : (data.organizationalIntelligenceScore ?? 0) >= 60 ? '#facc15'
    : (data.organizationalIntelligenceScore ?? 0) >= 40 ? '#fb923c'
    : '#f87171';
```

- [ ] **Step 3: Verify with the running app**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new type errors.

Start the dev server (via the project's `preview_start`/`.claude/launch.json` entry, or
`npm run dev`), navigate to the dashboard, and confirm `VerdictBanner` still renders the score
normally against the current (populated) database — the insufficient-evidence path can't be
observed against live data without a near-empty database, so this step confirms no regression, not
the new path. Task 12's `orchestrateFrom` unit test already covers the insufficient branch directly.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/dashboard/VerdictBanner.tsx frontend/lib/api.ts
git commit -m "$(cat <<'EOF'
VerdictBanner.tsx: render EvidenceBadge when orgScore is insufficient (D-07, D-10b)

The headline Organizational Intelligence Score now shows the coverage
badge instead of a null-driven broken score bar when
pillars.orgScore.evidence.status is insufficient_evidence.
EOF
)"
```

---

## Task 16: Wire `DecisionHeader.tsx` to `dqi`'s evidence

**Files:**
- Modify: `frontend/lib/decisionIntelligence.ts` (type)
- Modify: `frontend/components/decision/DecisionHeader.tsx`

**Interfaces:**
- Consumes: `/api/decision-intelligence`'s new `evidence` field (Task 11).
- Produces: `DecisionHeader` renders `<EvidenceBadge>` in place of the `DQIGauge` when
  `report.evidence?.status === 'insufficient_evidence'`.

- [ ] **Step 1: Update the type**

In `frontend/lib/decisionIntelligence.ts`, update `DecisionIntelligenceReport` (lines 45-57):

```ts
import { EvidenceInfo } from '../components/ui/EvidenceBadge';

export interface DecisionIntelligenceReport {
  decisions: DecisionRecord[];
  good: DecisionRecord[];
  acceptable: DecisionRecord[];
  poor: DecisionRecord[];
  harmful: DecisionRecord[];
  /** Org-wide Decision Quality Index 0–100, or null when evidence is insufficient */
  dqi: number | null;
  dqiVerdict: 'STRONG' | 'MIXED' | 'WEAK' | 'CRITICAL' | null;
  evidence: EvidenceInfo & { sufficient: boolean };
  totalDecisions: number;
  ownerConcentration: Record<string, number>;
}
```

- [ ] **Step 2: Modify `DecisionHeader.tsx`**

In `frontend/components/decision/DecisionHeader.tsx`, add the import:

```tsx
import { EvidenceBadge } from '../ui/EvidenceBadge';
```

Replace the "Hero row" block (lines 100-108 in the current file, the `<div className="card" ...>`
containing `<DQIGauge .../>`) — guard its opening so the gauge only renders when evidence is
sufficient. Replace lines 100-121 (from the hero-row `<div className="card"` through the closing of
the header/badge block) with:

```tsx
      {/* Hero row: DQI gauge + summary, or the evidence badge */}
      <div className="card" style={{
        padding: '32px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 48,
        flexWrap: 'wrap',
      }}>
        {report.evidence?.status === 'insufficient_evidence' ? (
          <EvidenceBadge evidence={report.evidence} />
        ) : (
          <>
            <DQIGauge score={report.dqi as number} verdict={report.dqiVerdict as keyof typeof verdictConfig} />

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                  Decision Quality Index
                </h2>
                <span style={{
                  fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '4px 12px', borderRadius: 6,
                  color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
                }}>
                  {cfg.label}
                </span>
              </div>
```

The rest of that `<div style={{ flex: 1, ... }}>` block (the `<p>` summary and mini tier bar,
currently lines 123-136+) stays as-is, just now nested inside the `<>` fragment's else-branch — close
the fragment and the conditional after that block's existing closing `</div>` (the one that currently
closes the `flex: 1` container).

Also guard `cfg` (line 80, `const cfg = verdictConfig[report.dqiVerdict]`) against `null`:

```tsx
  const cfg = verdictConfig[report.dqiVerdict ?? 'CRITICAL'];
```

(This fallback is only ever read inside the `else` branch above, which is unreachable when
`dqiVerdict` is `null`, but keeps the file type-checking without a non-null assertion.)

- [ ] **Step 3: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/decisionIntelligence.ts frontend/components/decision/DecisionHeader.tsx
git commit -m "$(cat <<'EOF'
DecisionHeader.tsx: render EvidenceBadge when dqi is insufficient (D-07, D-10b)

Zero audited decisions now shows the coverage badge instead of a
DQIGauge drawn from a null score.
EOF
)"
```

---

## Task 17: Fix `calculateHealthScore`'s D-24 fabrication, wire `riskIntelligence.ts` + `OrgHealthBanner.tsx`

**Files:**
- Modify: `frontend/lib/risk.ts:51-63` (`calculateHealthScore`)
- Modify: `frontend/lib/riskIntelligence.ts` (import `evidenceGate`, gate `organizationalHealthScore`/`healthStatus`)
- Modify: `frontend/components/risk/OrgHealthBanner.tsx`
- Modify: `frontend/lib/simulation.ts`, `frontend/lib/recommendations.ts` (defensive null-handling
  only — these two are call sites of `calculateHealthScore`, not evidence-UI targets; see Interfaces)
- Test: `frontend/lib/risk.test.ts` (new, if a test runner exists per Task 13 Step 1)

**Interfaces:**
- Produces: `calculateHealthScore(agents: Agent[]): number | null` — returns `null` (not `100`) when
  `agents.length === 0`. This is the D-24 fix, at its actual source (three files call it; fixing it
  once here is less duplicative than gating only inside `riskIntelligence.ts`'s wrapper).
- `riskIntelligence.ts`'s `computeRiskIntelligence` gains an `evidence` field on
  `RiskIntelligenceReport`, gated via `evidenceGate(agents, () => true)` — `organizationalHealthScore`/`healthStatus`
  become `null` when insufficient.
- `simulation.ts`/`recommendations.ts` are **not** given evidence-badge UI in this task — out of the
  traced scope for this workstream (design doc §6). They only need to not crash on `null`: both
  already do arithmetic on the return value (`baselineHealthScore`, etc.); each gets a one-line
  `?? 0` fallback at its own call site so a genuinely-empty-agents scenario (which none of their
  current callers exercise today, per grep) degrades to "no measurable change" instead of `NaN`
  propagating through a delta calculation.

- [ ] **Step 1: Write the failing test** (skip if no test runner, per Task 13 Step 1)

Create `frontend/lib/risk.test.ts`:

```ts
import { calculateHealthScore } from './risk';

describe('calculateHealthScore', () => {
  it('returns null for zero agents, not a fabricated 100', () => {
    expect(calculateHealthScore([])).toBeNull();
  });
});
```

- [ ] **Step 2: Implement the fix in `risk.ts`**

In `frontend/lib/risk.ts`, change `calculateHealthScore`'s signature and empty-check (lines 51-52):

```ts
export function calculateHealthScore(agents: Agent[]): number | null {
  if (agents.length === 0) return null;
```

- [ ] **Step 3: Fix the two other call sites' arithmetic**

In `frontend/lib/simulation.ts`, at each of the three `baselineHealthScore`/`simulatedHealthScore`
pairs (lines 44/80, 104/142, 166/192), change the assignment to guard the null:

```ts
  const baselineHealthScore = calculateHealthScore(agents) ?? 0;
```

```ts
  const simulatedHealthScore = calculateHealthScore(simulatedAgents) ?? 0;
```

In `frontend/lib/recommendations.ts`, at line 253:

```ts
  const healthScore = calculateHealthScore(agents) ?? 0;
```

- [ ] **Step 4: Wire `riskIntelligence.ts`**

In `frontend/lib/riskIntelligence.ts`, add the import at the top (alongside the existing
`deriveRiskScore, deriveRisk, calculateHealthScore` import from `./risk`):

```ts
import { evidenceGate } from './evidenceGate';
import { EvidenceInfo } from '../components/ui/EvidenceBadge';
```

Add `evidence: EvidenceInfo & { sufficient: boolean };` to the `RiskIntelligenceReport` interface
(near the existing `organizationalHealthScore`/`healthStatus` fields, per the earlier read of this
file at lines 105-106).

Replace lines 226-231 (`const ohs = calculateHealthScore(agents)` through the `healthStatus`
if/else):

```ts
  const evidence = evidenceGate(agents, () => true);
  const ohs = evidence.sufficient ? calculateHealthScore(agents)! : null;

  let healthStatus: RiskIntelligenceReport['healthStatus'] | null;
  if (!evidence.sufficient)     healthStatus = null;
  else if (ohs! >= 75)          healthStatus = 'HEALTHY';
  else if (ohs! >= 50)          healthStatus = 'AT_RISK';
  else                          healthStatus = 'CRITICAL';
```

Update the return object (line 241-242) to widen the types and add `evidence`:

```ts
    organizationalHealthScore: ohs,
    healthStatus,
    evidence,
```

(This requires widening `organizationalHealthScore: number` to `number | null` and `healthStatus`
similarly in the `RiskIntelligenceReport` interface.)

- [ ] **Step 5: Wire `OrgHealthBanner.tsx`**

In `frontend/components/risk/OrgHealthBanner.tsx`, add the import:

```tsx
import { EvidenceBadge } from '../ui/EvidenceBadge';
```

Guard the top bar's score display. Replace the "Top bar" block's right-hand score section (lines
66-77 in the current file) with:

```tsx
            {report.evidence.status === 'insufficient_evidence' ? (
              <EvidenceBadge evidence={report.evidence} />
            ) : (
              <div className="text-right">
                <div className="flex items-baseline gap-1 justify-end">
                  <span className={clsx('text-4xl font-bold tracking-tight', ohsTextColor)}>{ohs}</span>
                  <span className="text-[color:var(--text-tertiary)] text-sm">/ 100</span>
                </div>
                <p className={clsx('text-xs font-semibold uppercase tracking-widest mt-0.5', ohsTextColor)}>
                  {healthStatus === 'HEALTHY'  ? 'Healthy'   :
                   healthStatus === 'AT_RISK'  ? '⚠ At Risk' :
                                                '🔴 Critical State'}
                </p>
              </div>
            )}
```

`ohsTextColor` (lines 47-50) and the progress-bar block (lines 79-95) both read `ohs` directly —
guard both with a fallback matching `scoreColor`'s pattern from Task 15:

```tsx
  const ohsTextColor =
    (ohs ?? 0) >= 75 ? 'text-emerald-400' :
    (ohs ?? 0) >= 50 ? 'text-yellow-400' :
                        'text-red-400';
```

Wrap the existing progress-bar `<div className="mt-4">...</div>` block (lines 79-95) in the same
`report.evidence.status === 'insufficient_evidence' ? null : (...)` conditional used above, or fold
it into the same ternary's `else` branch alongside the score section — either is acceptable; keep
the score number and its progress bar appearing/disappearing together.

- [ ] **Step 6: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new type errors. If Step 1's test exists, run it and confirm PASS.

Start the dev server, navigate to `/risk`, confirm the banner renders normally against the current
populated database (regression check — the insufficient path isn't observable without a near-empty
dataset, same caveat as Task 15).

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/risk.ts frontend/lib/riskIntelligence.ts frontend/lib/simulation.ts frontend/lib/recommendations.ts frontend/components/risk/OrgHealthBanner.tsx
git add frontend/lib/risk.test.ts 2>/dev/null || true
git commit -m "$(cat <<'EOF'
risk.ts/riskIntelligence.ts: fix calculateHealthScore's D-24 fabrication, wire evidence into OrgHealthBanner (D-07, D-10, D-24, D-27)

calculateHealthScore([]) returned 100 (the same optimistic-mirror bug
D-24 fixed on the backend); now returns null. riskIntelligence.ts gates
its organizationalHealthScore/healthStatus on evidenceGate(), and
OrgHealthBanner.tsx shows the coverage badge instead. simulation.ts and
recommendations.ts (calculateHealthScore's two other call sites) get a
defensive ?? 0 fallback only — no evidence-badge UI, since neither is a
traced consumer of a published verdict for this workstream (design doc
§6); their empty-agents case isn't exercised by any current caller.
EOF
)"
```

---

## Task 18: Fix `calcIMHS`'s D-24 fabrication, wire `orgMemory.ts` + `MemoryHeader.tsx`

**Files:**
- Modify: `frontend/lib/orgMemory.ts`
- Modify: `frontend/components/memory/MemoryHeader.tsx`
- Test: `frontend/lib/orgMemory.test.ts` (new, if a test runner exists)

**Interfaces:**
- Produces: `calcIMHS` no longer special-cases `total === 0` to `100`; `computeOrgMemory`'s
  `OrgMemoryReport` gains `evidence: EvidenceInfo & { sufficient: boolean }`, gated on
  `memoryAssets` (the flattened agents+workflows+tools list) being non-empty. `imhs`/`imhsVerdict`
  become `number | null` / `'HEALTHY' | 'AT_RISK' | 'CRITICAL' | null`.

- [ ] **Step 1: Write the failing test** (skip if no test runner)

Create `frontend/lib/orgMemory.test.ts`:

```ts
import { computeOrgMemory } from './orgMemory';

describe('computeOrgMemory', () => {
  it('reports insufficient evidence for zero assets, not a fabricated imhs of 100', () => {
    const report = computeOrgMemory([], [], []);
    expect(report.evidence.sufficient).toBe(false);
    expect(report.imhs).toBeNull();
    expect(report.imhsVerdict).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

In `frontend/lib/orgMemory.ts`, add the import at the top:

```ts
import { evidenceGate } from './evidenceGate';
import { EvidenceInfo } from '../components/ui/EvidenceBadge';
```

Add `evidence: EvidenceInfo & { sufficient: boolean };` to `OrgMemoryReport`, and widen `imhs`/`imhsVerdict`:

```ts
  imhs: number | null;
  imhsVerdict: 'HEALTHY' | 'AT_RISK' | 'CRITICAL' | null;
```

Replace the `calcIMHS` empty-guard (line 90, `if (total === 0) return 100;`) — since evidence gating
now owns the empty case, `calcIMHS` no longer needs its own special case; leave the function to
divide normally and let the caller decide whether to use its output:

```ts
function calcIMHS(preserved: number, vulnerable: number, atRisk: number, total: number): number {
  return Math.round(((preserved * 1.0 + vulnerable * 0.5 + atRisk * 0.25) / total) * 100);
}
```

Replace the IMHS block inside `computeOrgMemory` (lines 144-147):

```ts
  const evidence = evidenceGate(memoryAssets, () => true);
  const imhs = evidence.sufficient ? calcIMHS(preserved.length, vulnerable.length, atRisk.length, memoryAssets.length) : null;
  const imhsVerdict: OrgMemoryReport['imhsVerdict'] =
    !evidence.sufficient ? null : (imhs! >= 75 ? 'HEALTHY' : imhs! >= 45 ? 'AT_RISK' : 'CRITICAL');
```

Add `evidence` to the function's final returned object (wherever `imhs`/`imhsVerdict` are currently
assembled into the return — locate the `return { ... imhs, imhsVerdict, ... }` further down in the
file and add `evidence,` alongside them).

- [ ] **Step 3: Wire `MemoryHeader.tsx`**

In `frontend/components/memory/MemoryHeader.tsx`, add the import:

```tsx
import { EvidenceBadge } from '../ui/EvidenceBadge';
```

Replace the "IMHS Score card" block's inner content (lines 176-184 in the current file, from the
`<p>Institutional Memory Health</p>` label through `<IMHSArc .../>`):

```tsx
          <p style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--text-tertiary)', margin: '0 0 4px',
            textAlign: 'center'
          }}>
            Institutional Memory Health
          </p>
          {report.evidence.status === 'insufficient_evidence' ? (
            <EvidenceBadge evidence={report.evidence} />
          ) : (
            <IMHSArc score={report.imhs as number} verdict={report.imhsVerdict as string} />
          )}
```

- [ ] **Step 4: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new type errors. If Step 1's test exists, run it and confirm PASS.

Start the dev server, navigate to `/memory`, confirm `MemoryHeader` renders normally against the
current populated database.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/orgMemory.ts frontend/components/memory/MemoryHeader.tsx
git add frontend/lib/orgMemory.test.ts 2>/dev/null || true
git commit -m "$(cat <<'EOF'
orgMemory.ts: fix calcIMHS's D-24 fabrication, wire evidence into MemoryHeader (D-07, D-10, D-24, D-27)

calcIMHS returned a hardcoded 100 for zero assets — the same
optimistic-mirror pattern fixed elsewhere in this workstream. Evidence
gating now owns the empty case; MemoryHeader shows the coverage badge
in place of the IMHS arc when insufficient.
EOF
)"
```

---

## Plan self-review notes (for the executor, not a task)

- **Corrections made during planning, relative to the design doc:** three of the design doc's
  assumed frontend consumers turned out, on tracing the actual component code, not to be what the
  design doc guessed. `FivePillarsRadar.tsx` reads `/orchestrator/modules`, which reads the
  13-module registry (`MODULE_READERS`) — explicitly narration-only per D-17/D-19, never gated by
  this plan — so it needs no change. `ConcentrationRiskPanel.tsx` and `DecisionSupportQueue.tsx`
  turned out to read client-side mock/tier logic unrelated to `spofVerdict()` or `dqiVerdict`
  respectively; the actual `dqiVerdict` consumer is `DecisionHeader.tsx` (Task 16). `spofVerdict()`
  itself (built in W-C) has zero callers anywhere — `routes/workflows/spof.js` was never migrated
  onto it, which is D-06's affected-file list, not D-07/D-10b's — so SPOF `not_evaluable` surfacing
  has no live site to wire yet and is left out of this plan rather than silently expanded into it.
  `knowledgeRisk.ts` and `aiToolIntelligence.ts` turned out to have no single top-level aggregate
  score (only per-item tiers over lists that are already correctly empty-safe), so D-27's TypeScript
  port only ends up wired into two files (`riskIntelligence.ts`, `orgMemory.ts`), not four.
- **Spec coverage:** D-07/D-22 (per-component gating) — Tasks 1-9. D-23 (sibling evidence object) —
  every task. D-24 (optimistic mirror) — Tasks 3, 8, 11, 17, 18. D-25 (decisionQuality replacement)
  — Task 7. D-26 (sentinel surfacing) — deferred per the correction above; nothing in this plan
  claims to close it. D-27 (TS port) — Tasks 14, 17, 18. Truth.js/decisionIntelligence.js sites
  beyond derived.js — Tasks 10-11. Orchestrator wiring/caching — Task 12. Frontend badge — Task 13.
