# Diagnostic Fake-UI and Unverified-Claim Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five confirmed "hardcoded or fake UI" / "unverified claim" bugs from the 2026-09-17 full-system diagnostic — the Continuity page's fabricated automation strip, the Decision Trail table's self-described mock verification column, a leftover demo subtitle, the Digital Twin card's always-true "SYNCED" badge, and the briefing/voice assistant asserting "no backup owner" without checking. This is the second batch from that diagnostic; the first batch (owner-change cache invalidation, risk cascade counts, AI Tools outage impact, tools backup field, memory label) is already merged (`4af55e7..8fe508d` on `ocos/develop`).

**Architecture:** Each task is an isolated, independently-testable fix. No shared abstractions between tasks except Task 4, which touches both a backend module (`brain/index.js`, `implementations.js`) and its two frontend consumers (`api.ts` type, `DigitalTwinCard.tsx`) as one coherent contract change. Backend changes get real test coverage where a test file already exists for the touched module; frontend changes are verified via `tsc --noEmit` + `eslint` (no component test runner in this repo, same convention as the first batch).

**Tech Stack:** Node.js/Express 5 + Supabase (`backend/`), Next.js 16 / React 19 + TypeScript (`frontend/`).

**Spec:** No separate spec doc — this plan implements the remaining "Hardcoded or fake UI" items from the "High (confirmed)" list of the 2026-09-17 full-system diagnostic pasted into the conversation that produced the first plan (not a repo file). The "Seeded data shown as live" items from the same diagnostic section (`context_items`, `pending_decisions` vs `decision_queue`, forecasts, learning) are explicitly OUT of scope — the diagnostic itself says those need an owner decision on what to do with the seeded tables, same reasoning that kept the simulation-health formulas and IMHS weights out of the first plan.

## Global Constraints

- Do not invent new backend data sources or tables to back a previously-fake UI element. Where no real signal exists (Task 1's "4 Pending Resolves" count, Task 2's "Verification" column), remove the fabricated claim rather than replacing it with a differently-fabricated one.
- Do not touch `domain/simulations.js`'s health-delta formulas, `derived.js`'s IMHS weights, or any other scoring/weighting constant (same constraint as the first plan — still out of scope).
- Frontend: no new dependencies, no new shared abstractions beyond what's specified per task.
- Task 4's backend change to `brain/index.js`'s `invoke()` function is additive only (adds a new key to the `rt` object passed to every `IMPL[code]` module) — verify no other `IMPL.*` module in `backend/brain/modules/implementations.js` breaks from receiving an extra `rt.source` key it doesn't use.

---

### Task 1: Continuity page's automation strip shows a fabricated pending-resolve count and a fabricated "intents being emitted" claim

**Files:**
- Modify: `frontend/components/continuity/AutomationStatusStrip.tsx`

**Interfaces:**
- Consumes: nothing — this component takes no props today (`export function AutomationStatusStrip()`) and nothing is added.
- Produces: nothing new.

- [ ] **Step 1: Edit the component**

The component today shows: (a) a description claiming "Automated remediation Intents are being emitted by the execution engine" — there is no such engine in this codebase; everything documented about this MVP describes it as read-only/advisory. (b) a "4 Pending Resolves" badge with a hardcoded `4` and no backing data source anywhere in this component or its (nonexistent) props. (c) a "Writes Blocked" badge, which IS a true architectural fact of this MVP (writes are genuinely disabled in advisory mode) — keep it.

In `frontend/components/continuity/AutomationStatusStrip.tsx`, replace the description paragraph (lines 20-22):

```tsx
        <p className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 max-w-2xl truncate">
          Automated remediation Intents are being emitted by the execution engine, but writing is disabled in the MVP.
        </p>
```

with:

```tsx
        <p className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 max-w-2xl truncate">
          Recommendations are surfaced for review; automated remediation writes are disabled in this MVP.
        </p>
```

Then remove the fabricated "4 Pending Resolves" badge (lines 25-29), keeping only the true "Writes Blocked" one. Replace:

```tsx
      <div className="hidden md:flex gap-3 text-[10px] text-[color:var(--text-secondary)] shrink-0">
        <div className="px-3 py-1.5 rounded border border-amber-500/20 bg-amber-500/10 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400 font-semibold tracking-wide uppercase">4 Pending Resolves</span>
        </div>
        <div className="px-3 py-1.5 rounded border border-red-500/20 bg-red-500/10 flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-400 font-semibold tracking-wide uppercase">Writes Blocked</span>
        </div>
      </div>
```

with:

```tsx
      <div className="hidden md:flex gap-3 text-[10px] text-[color:var(--text-secondary)] shrink-0">
        <div className="px-3 py-1.5 rounded border border-red-500/20 bg-red-500/10 flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-400 font-semibold tracking-wide uppercase">Writes Blocked</span>
        </div>
      </div>
```

Remove the now-unused `AlertCircle` import (line 4): change

```tsx
import { PlayCircle, AlertCircle, Ban } from 'lucide-react';
```

to:

```tsx
import { PlayCircle, Ban } from 'lucide-react';
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Run: `npm run lint` (from `frontend/`)
Expected: no new errors, no "unused import" error.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/continuity/AutomationStatusStrip.tsx
git commit -m "fix: remove fabricated pending-resolve count and intent-engine claim from continuity strip"
```

---

### Task 2: Decision Trail table's "Verification" column is a self-described mock with no real backing data

**Files:**
- Modify: `frontend/components/decision/DecisionTrailTable.tsx`
- Delete: `frontend/components/decision/TruthGateBadge.tsx` (this component exists solely to render this fabricated column — confirmed by search, it has no other caller)

**Interfaces:**
- Consumes: `DecisionRecord` (`frontend/lib/decisionIntelligence.ts`) — unchanged, this task removes a *display* of a heuristic computed from `d.criticality`/`d.fix`, not any real field.
- Produces: nothing new.

- [ ] **Step 1: Confirm `TruthGateBadge` has no other caller**

Run (from `frontend/`): `grep -rn "TruthGateBadge" --include="*.tsx" --include="*.ts" .`
Expected: only `frontend/components/decision/DecisionTrailTable.tsx` (the import) and `frontend/components/decision/TruthGateBadge.tsx` (the definition) — confirmed already in the investigation that produced this plan. If a new caller has appeared since, STOP and report — do not delete the file.

- [ ] **Step 2: Remove the Verification column from the table**

In `frontend/components/decision/DecisionTrailTable.tsx`:

Remove the import (line 6):

```tsx
import { TruthGateBadge } from './TruthGateBadge';
```

Remove the Verification `<td>` from `DecisionRow` (lines 102-107):

```tsx
        {/* Verification */}
        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
          {/* Mocking verification state: HIGH/CRITICAL criticality decisions without a fix are unverified as a demo heuristic, 
              since the real DecisionRecord doesn't have a verified flag natively. */}
          <TruthGateBadge verified={!(d.criticality !== 'low' && !d.fix)} />
        </td>

```

(delete the whole block, including its blank line and comment).

Remove `'Verification'` from the header array (line 253):

```tsx
              {['Decision', 'Category', 'Criticality', 'Verification', 'Score', 'Quality'].map(h => (
```

becomes:

```tsx
              {['Decision', 'Category', 'Criticality', 'Score', 'Quality'].map(h => (
```

Update both `colSpan` values that account for the leading empty `<th>` plus the six header columns (now five): line 130 (`colSpan={7}` in the expanded detail row) and line 270 (`colSpan={7}` in the empty-filter-results row) both become `colSpan={6}`.

- [ ] **Step 3: Delete the now-unused component file**

```bash
rm frontend/components/decision/TruthGateBadge.tsx
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Run: `npm run lint` (from `frontend/`)
Expected: no new errors, no "unused import"/"cannot find module" errors, `colSpan` values type-check as numbers.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/decision/DecisionTrailTable.tsx
git rm frontend/components/decision/TruthGateBadge.tsx
git commit -m "fix: remove Decision Trail table's self-described mock verification column"
```

---

### Task 3: Recommendations page subtitle still says "Sunrise Care Demo"

**Files:**
- Modify: `frontend/components/recommendations/RecommendationHeader.tsx`

**Interfaces:** none — a one-line string change.

- [ ] **Step 1: Edit the subtitle**

In `frontend/components/recommendations/RecommendationHeader.tsx`, replace (line 55):

```tsx
          {output.recommendations.length} actionable recommendations generated from risk analysis · Sunrise Care Demo
        </p>
```

with:

```tsx
          {output.recommendations.length} actionable recommendations generated from risk analysis
        </p>
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Run: `npm run lint` (from `frontend/`)
Expected: no new errors either run.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/recommendations/RecommendationHeader.tsx
git commit -m "fix: remove leftover 'Sunrise Care Demo' subtitle from recommendations page"
```

---

### Task 4: Digital Twin card always shows "SYNCED", right next to a banner reporting real graph age

**Files:**
- Modify: `backend/brain/index.js:154-156` (the `invoke()` function — pass real graph provenance into `rt`)
- Modify: `backend/brain/modules/implementations.js:901-929` (M49 — report the real graph-load timestamp, stop fabricating `synchronized: true`)
- Modify: `frontend/lib/api.ts:847-857` (`DigitalTwinPayload` type — drop the fabricated `synchronized` field)
- Modify: `frontend/components/org-science/DigitalTwinCard.tsx` (stop rendering a badge from that fabricated field; show the real sync timestamp as a row instead)

**Interfaces:**
- Consumes: `graphSource()` (`backend/brain/index.js:100`, already defined in the same file — returns `{ live, stats, loadedAt, error }`, unchanged).
- Produces: `rt.source` — a new key on the object every `IMPL[code]` module receives as its first argument (`invoke()`, `backend/brain/index.js:154-171`). Only M49 uses it in this task; every other module ignores the extra key (JS objects don't error on unused keys) — Task's own Step 2 verifies this by running the brain smoke test, which exercises every module.

- [ ] **Step 1: Pass graph provenance into every module invocation**

In `backend/brain/index.js`, find `invoke()`:

```js
async function invoke(code, context) {
  const m = BY_CODE[code]
  const out = await IMPL[code]({ graph }, context)
```

Change the `IMPL[code]` call to also pass `source`:

```js
async function invoke(code, context) {
  const m = BY_CODE[code]
  const out = await IMPL[code]({ graph, source: graphSource() }, context)
```

- [ ] **Step 2: Run the brain smoke test to confirm every module still works with the extra `rt.source` key**

Run: `node tests/brain.smoke.test.js` (from `backend/`)
Expected: passes exactly as it did before this change (this test runs every module in the catalog — it is the fastest way to confirm none of the other ~50 `IMPL.*` functions break from an object they didn't ask for gaining an extra key).

- [ ] **Step 3: Fix M49 to report the real graph-load time and stop fabricating `synchronized`**

In `backend/brain/modules/implementations.js`, replace (the M49 function, roughly lines 901-929):

```js
// M49 — Digital Twin: a live, synchronized virtual model of the organization.
IMPL.M49 = (rt, context) => {
  const g = rt.graph
  const stats = g.stats()
  const twin = {
    syncedAt: new Date().toISOString(),
    entities: g.entities.list().map((e) => ({ id: e.id, type: e.type, name: e.name, status: e.status || 'active' })),
    relationships: g.relationships.list().map((r) => ({ from: r.from, type: r.type, to: r.to })),
    stats,
    layers: {
      structure: A.byTypes(g, ['department', 'team', 'executive', 'employee']).length,
      systems: A.byTypes(g, ['system', 'ai_agent']).length,
      workflows: A.byType(g, 'workflow').length,
      knowledge: A.byType(g, 'knowledge').length,
    },
  }
  return {
    type: 'simulation',
    definition: 'A full snapshot of every entity and relationship in the graph, mirrored as one object plus stats — nothing else in this codebase returns the whole graph in a single call.',
    payload: {
      digitalTwin: twin,
      synchronized: true,
      simulationReady: stats.entities > 0,
    },
    confidence: A.confidence(twin.entities.length || 1, 1),
    evidence: [ev('graph', 'snapshot', `${twin.entities.length} entities / ${twin.relationships.length} relationships mirrored`)],
    recommendations: [],
  }
}
```

with:

```js
// M49 — Digital Twin: a full snapshot of the graph, mirrored as one object.
//
// `syncedAt` used to be `new Date().toISOString()` -- "now", on every single
// call, regardless of when the graph itself was actually loaded. Paired with
// a hardcoded `synchronized: true`, the Digital Twin card always claimed to
// be perfectly in sync even sitting right next to GraphFreshnessBanner
// reporting the graph is genuinely days old. There is no async twin/replica
// in this architecture (the graph is read synchronously from memory on every
// request, same reasoning TwinSyncStatus.tsx's own fix already established
// for the simulation page's twin card) -- so "synchronized" was never a
// measurable fact and is dropped rather than computed differently.
// `syncedAt` now reports the graph's real load time (`rt.source.loadedAt`,
// from brain/index.js's own provenance tracking), which the caller can
// compare against "now" itself instead of trusting a self-reported claim.
IMPL.M49 = (rt, context) => {
  const g = rt.graph
  const stats = g.stats()
  const twin = {
    syncedAt: rt.source.loadedAt,
    entities: g.entities.list().map((e) => ({ id: e.id, type: e.type, name: e.name, status: e.status || 'active' })),
    relationships: g.relationships.list().map((r) => ({ from: r.from, type: r.type, to: r.to })),
    stats,
    layers: {
      structure: A.byTypes(g, ['department', 'team', 'executive', 'employee']).length,
      systems: A.byTypes(g, ['system', 'ai_agent']).length,
      workflows: A.byType(g, 'workflow').length,
      knowledge: A.byType(g, 'knowledge').length,
    },
  }
  return {
    type: 'simulation',
    definition: 'A full snapshot of every entity and relationship in the graph, mirrored as one object plus stats — nothing else in this codebase returns the whole graph in a single call.',
    payload: {
      digitalTwin: twin,
      simulationReady: stats.entities > 0,
    },
    confidence: A.confidence(twin.entities.length || 1, 1),
    evidence: [ev('graph', 'snapshot', `${twin.entities.length} entities / ${twin.relationships.length} relationships mirrored`)],
    recommendations: [],
  }
}
```

- [ ] **Step 4: Re-run the brain smoke test**

Run: `node tests/brain.smoke.test.js` (from `backend/`)
Expected: still passes, M49's own check (if the smoke test inspects specific payload shapes) reflects the new `syncedAt` source and the absence of `synchronized`.

- [ ] **Step 5: Update the frontend type to match**

In `frontend/lib/api.ts`, replace (lines 847-857):

```ts
export interface DigitalTwinPayload {
  digitalTwin: {
    syncedAt: string;
    entities: Array<{ id: string; type: string; name: string; status: string }>;
    relationships: Array<{ from: string; type: string; to: string }>;
    stats: Record<string, unknown>;
    layers: { structure: number; systems: number; workflows: number; knowledge: number };
  };
  synchronized: boolean;
  simulationReady: boolean;
}
```

with:

```ts
export interface DigitalTwinPayload {
  digitalTwin: {
    syncedAt: string;
    entities: Array<{ id: string; type: string; name: string; status: string }>;
    relationships: Array<{ from: string; type: string; to: string }>;
    stats: Record<string, unknown>;
    layers: { structure: number; systems: number; workflows: number; knowledge: number };
  };
  simulationReady: boolean;
}
```

- [ ] **Step 6: Fix the card to stop claiming a fabricated sync badge, and show the real timestamp instead**

In `frontend/components/org-science/DigitalTwinCard.tsx`, replace the whole `toView` callback:

```tsx
      toView={(data) => ({
        headline: data.digitalTwin.entities.length,
        headlineLabel: 'Entities Mirrored',
        badge: data.synchronized
          ? { text: 'SYNCED', tone: 'good' }
          : { text: 'OUT OF SYNC', tone: 'bad' },
        rows: [
          { label: 'Relationships Mirrored', value: data.digitalTwin.relationships.length },
          {
            label: 'Simulation Ready',
            value: data.simulationReady ? 'Yes' : 'No',
            tone: data.simulationReady ? 'good' : 'warn',
          },
        ],
      })}
```

with:

```tsx
      toView={(data) => ({
        headline: data.digitalTwin.entities.length,
        headlineLabel: 'Entities Mirrored',
        rows: [
          { label: 'Relationships Mirrored', value: data.digitalTwin.relationships.length },
          { label: 'Graph Loaded', value: new Date(data.digitalTwin.syncedAt).toLocaleString() },
          {
            label: 'Simulation Ready',
            value: data.simulationReady ? 'Yes' : 'No',
            tone: data.simulationReady ? 'good' : 'warn',
          },
        ],
      })}
```

(The `badge` prop on `GraphIntelligenceCard` is optional — `view.badge?` in `GraphIntelligenceCard.tsx:106` — so omitting it entirely is valid and simply hides the badge slot rather than requiring a replacement.)

- [ ] **Step 7: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Run: `npm run lint` (from `frontend/`)
Expected: no new errors either run — in particular, confirm no other file reads `DigitalTwinPayload.synchronized` (already confirmed absent in the investigation that produced this plan; re-confirm with `grep -rn "\.synchronized" frontend/` from `frontend/`).

- [ ] **Step 8: Commit**

```bash
git add backend/brain/index.js backend/brain/modules/implementations.js frontend/lib/api.ts frontend/components/org-science/DigitalTwinCard.tsx
git commit -m "fix: Digital Twin card reports real graph-load time instead of a hardcoded SYNCED claim"
```

---

### Task 5: Briefing and voice assistant assert "no backup owner" on the top-risk agent without checking

**Files:**
- Modify: `backend/routes/briefing/briefing.js:16-24,84-88` (`getTopSPOF()` and `buildSummaryPoints()`)
- Modify: `backend/routes/voice/voice.js:314-326` (`dailySummary()`)

**Interfaces:**
- Consumes: `intel.predictiveRisk.scores[].contributingFactors` (`backend/domain/derived.js` — a `single_owner` key is present in `contributingFactors` if and only if the agent has no owner or its owner has no backup; absent when the owner has a real backup — see `derived.js:510-516`, unchanged by this task). `brain.agents[].backup` (`backend/routes/voice/voice.js:61`, already resolved from `a.backup_owner`, unchanged — the exact field `orgSpof()` in the same file already uses correctly at line 290).
- Produces: nothing new consumed elsewhere.

- [ ] **Step 1: Fix `briefing.js`'s `getTopSPOF()` to carry real backup status**

In `backend/routes/briefing/briefing.js`, replace (lines 16-24):

```js
async function getTopSPOF() {
  const intel = await domain.intelligence.all()
  const top = intel.predictiveRisk.scores.find(p => p.threatLevel === 'CRITICAL')
  if (!top) return null
  return {
    predicted_score: top.predictedScore,
    agents: { name: top.agentName, risk: top.recordedRisk, owner_id: null },
  }
}
```

with:

```js
async function getTopSPOF() {
  const intel = await domain.intelligence.all()
  const top = intel.predictiveRisk.scores.find(p => p.threatLevel === 'CRITICAL')
  if (!top) return null
  return {
    predicted_score: top.predictedScore,
    agents: { name: top.agentName, risk: top.recordedRisk, owner_id: null },
    // predictiveRisk()'s single_owner factor is only present when the agent
    // has no owner AT ALL, or has an owner with no backup (derived.js's
    // predictiveRisk(), lines ~510-516) -- absent when the owner has a real
    // backup. Previously this route asserted "no backup owner" for whichever
    // agent happened to be top-CRITICAL, whether or not that was true.
    hasNoBackupOwner: 'single_owner' in top.contributingFactors,
  }
}
```

- [ ] **Step 2: Fix `buildSummaryPoints()` to only claim what's true**

In the same file, replace (lines 84-88):

```js
  if (spof) {
    points.push(
      `SPOF ALERT: ${spof.agents?.name} has no backup owner. It is rated CRITICAL with a predicted risk score of ${spof.predicted_score}.`
    )
  }
```

with:

```js
  if (spof) {
    // Only call it a SPOF alert, and only claim "no backup owner", when
    // that's actually true -- an agent with real backup coverage isn't a
    // single point of failure by this app's own definition (definitions.js's
    // spofVerdict: sole owner AND no backup AND criticality >= high), even
    // if it's still the org's top predicted-risk CRITICAL agent.
    const label = spof.hasNoBackupOwner ? 'SPOF ALERT' : 'CRITICAL RISK ALERT'
    const backupClause = spof.hasNoBackupOwner ? 'has no backup owner' : 'has backup coverage'
    points.push(
      `${label}: ${spof.agents?.name} ${backupClause}. It is rated CRITICAL with a predicted risk score of ${spof.predicted_score}.`
    )
  }
```

- [ ] **Step 3: Fix `voice.js`'s `dailySummary()` the same way, reusing the pattern already correct in `orgSpof()` in the same file**

In `backend/routes/voice/voice.js`, replace (lines 314-317, the start of `dailySummary()`):

```js
function dailySummary(brain) {
  const parts = []
  if (brain.org.spof) parts.push(`${brain.org.spof} has no backup owner (CRITICAL SPOF).`)
```

with:

```js
function dailySummary(brain) {
  const parts = []
  if (brain.org.spof) {
    // Same real backup lookup orgSpof() already uses correctly a few lines
    // above in this file -- this branch used to assert "no backup owner"
    // unconditionally, true today only because SecurityScanner (the current
    // top risk) genuinely has none; it silently becomes false the day a
    // backup is assigned.
    const s = brain.agents.find((a) => a.name === brain.org.spof)
    const backupClause = s?.backup ? `has backup coverage from ${s.backup}` : 'has no backup owner'
    parts.push(`${brain.org.spof} ${backupClause} (CRITICAL SPOF).`)
  }
```

- [ ] **Step 4: Write a test for the fixed backup-check in briefing.js**

No test file exists yet for this route (confirmed: `ls backend/tests/ | grep -i briefing` returns nothing). `buildSummaryPoints` is a pure function but is not currently exported — only `module.exports = router` exists at the bottom of `backend/routes/briefing/briefing.js`. Change that line to also export it, the same pattern `agents.js` uses for `loadEnrichedAgents`:

```js
module.exports = router
module.exports.buildSummaryPoints = buildSummaryPoints
```

Then create `backend/tests/briefingBackupClaim.unit.test.js`:

```js
/*
 * OBA Core — Briefing SPOF Backup Claim Test.
 *
 * Covers buildSummaryPoints()'s SPOF Alert line (backend/routes/briefing/
 * briefing.js) — it used to assert "has no backup owner" for whichever agent
 * was top-CRITICAL by predicted risk, whether or not that was actually true.
 * Pure function, no Supabase/network involved — runs fully offline.
 *
 * Run from backend/: node tests/briefingBackupClaim.unit.test.js
 */

const { buildSummaryPoints } = require('../routes/briefing/briefing')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Briefing SPOF Backup Claim Test ===\n')

console.log('Agent genuinely has no backup:')
{
	const points = buildSummaryPoints({
		spof: { agents: { name: 'SecurityScanner' }, predicted_score: 92, hasNoBackupOwner: true },
		overloaded: null, incident: null, docTrend: null, pendingCount: 0,
	})
	const line = points.find(p => p.startsWith('SPOF ALERT') || p.startsWith('CRITICAL RISK ALERT'))
	check('line exists', !!line, points)
	check('labeled SPOF ALERT', line?.startsWith('SPOF ALERT'), line)
	check('claims no backup owner', line?.includes('has no backup owner'), line)
}

console.log('\nAgent has real backup coverage:')
{
	const points = buildSummaryPoints({
		spof: { agents: { name: 'DeployBot' }, predicted_score: 88, hasNoBackupOwner: false },
		overloaded: null, incident: null, docTrend: null, pendingCount: 0,
	})
	const line = points.find(p => p.startsWith('SPOF ALERT') || p.startsWith('CRITICAL RISK ALERT'))
	check('line exists', !!line, points)
	check('labeled CRITICAL RISK ALERT, not SPOF ALERT', line?.startsWith('CRITICAL RISK ALERT'), line)
	check('claims backup coverage', line?.includes('has backup coverage'), line)
	check('does not claim no backup owner', !line?.includes('has no backup owner'), line)
}

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'BRIEFING BACKUP CLAIM TESTS PASSED ✅' : 'BRIEFING BACKUP CLAIM TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
```

- [ ] **Step 5: Run the new/updated test**

Run: `node tests/briefingBackupClaim.unit.test.js` (from `backend/`)
Expected: both cases pass.

- [ ] **Step 6: Run the full backend suite to confirm no regression**

Run: `npm test` (from `backend/`)
Expected: same pass count as before this change plus the new/updated checks.

- [ ] **Step 7: Commit**

```bash
git add backend/routes/briefing/briefing.js backend/routes/voice/voice.js backend/tests/
git commit -m "fix: briefing and voice assistant verify backup coverage before claiming an agent has none"
```

---

### Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start both servers**

Start the backend and the frontend dev server, then open the app in the browser.

- [ ] **Step 2: Verify Task 1**

On `/continuity`, confirm the automation strip no longer shows "4 Pending Resolves" or the "intents being emitted" claim, and still shows "Writes Blocked".

- [ ] **Step 3: Verify Task 2**

On `/decision` (or wherever `DecisionTrailTable` renders), confirm the table no longer has a "Verification" column, and the row layout/column count still looks correct (no leftover empty column, expanded-row detail panel still spans the full table width).

- [ ] **Step 4: Verify Task 3**

On the Recommendations page, confirm the subtitle no longer says "Sunrise Care Demo".

- [ ] **Step 5: Verify Task 4**

On the Org Science page, confirm the Digital Twin card no longer shows a "SYNCED"/"OUT OF SYNC" badge, shows a real "Graph Loaded" timestamp, and that timestamp is plausible (matches roughly what `GraphFreshnessBanner` elsewhere on the same page reports, not "just now" unless the graph was in fact just reloaded).

- [ ] **Step 6: Verify Task 5**

Hit `GET /api/briefing/today` and the voice assistant's daily-summary intent (or whatever UI surfaces it) and confirm the SPOF/backup wording matches the live data — if the current top-CRITICAL agent (SecurityScanner per the diagnostic) still has no backup, the wording is unchanged from before; the real test is that the logic now depends on real data rather than being hardcoded (can be confirmed by reading the code path, not just the current output).

- [ ] **Step 7: Share results**

Report pass/fail for each of the five checks above.
