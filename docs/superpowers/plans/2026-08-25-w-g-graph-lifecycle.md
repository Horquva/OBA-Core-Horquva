# W-G: Graph Lifecycle & Narrative Honesty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Knowledge Graph a manual reload path and make its staleness visible in the UI, closing D-14/F-H without leaving the frontend blind to a field the backend already sends.

**Architecture:** Two new routes on the existing graph-facing router (`prediction.js`) — a cheap `GET /graph/status` and a `POST /graph/reload` that calls the brain's existing (never re-triggered) `loadGraph()`. The frontend types the `dataSource` field the backend has been sending since W-D and adds one shared banner component to the Org Science page (the only page whose cards read the graph) instead of touching all 8 cards individually.

**Tech Stack:** Express (backend routes), Next.js/React client components (frontend), hand-rolled `node` test scripts (no framework, matches `backend/tests/`).

**Spec:** [docs/superpowers/specs/2026-08-25-w-g-graph-lifecycle-design.md](../specs/2026-08-25-w-g-graph-lifecycle-design.md)

## Global Constraints

- No admin/role gate on either new route — D-05 deleted `requireRole`; global `requireAuth` (`backend/index.js:71`) already covers them.
- No rate limiting or de-dup on `POST /graph/reload` — D-30, reasoned and accepted.
- `voice.js` / `dataset.js`'s provenance path is out of scope — D-29.
- Full backend suite (`node tests/run-all.js`) green before every backend commit; `tsc --noEmit` clean before every frontend commit.
- Commit messages name the responsible decision (D-14, D-28…D-32) — the D-16 compensating control.
- Never batch multiple tasks into one commit.

---

### Task 1: `GET /graph/status` + `POST /graph/reload` routes, with HTTP-level tests

**Files:**
- Modify: `backend/routes/intelligence/prediction.js`
- Create: `backend/tests/graphRoutes.test.js`
- Modify: `backend/tests/run-all.js`

**Interfaces:**
- Produces: `GET /api/intelligence/graph/status` → `200 { isReady: boolean, source: { live, stats, loadedAt, error } }`.
- Produces: `POST /api/intelligence/graph/reload` → `200 { reloaded: true, stats, loadedAt }` on success, `502 { reloaded: false, error, source }` on failure.
- Consumes: `domain.graph.load` / `.isReady` / `.source` (`backend/domain/index.js:53-64`, already exist — no changes there).

- [ ] **Step 1: Write the failing test**

Create `backend/tests/graphRoutes.test.js`:

```js
/*
 * OBA Core — Graph Lifecycle Route Test (D-14, D-28..D-32).
 *
 * Covers GET /api/intelligence/graph/status and POST /api/intelligence/graph/reload.
 * Boots the real prediction.js router on an ephemeral port, same no-framework
 * HTTP-level style as authRoutes.test.js. Stubs backend/brain (not supabase —
 * this file never calls domain.loadDataset()/domain.intelligence.*, only the
 * graph.* surface) so it runs offline. backend/supabase.js is also stubbed
 * because domain/dataset.js requires it unconditionally at module load time,
 * even though this test never calls the function that uses it.
 *
 * Run from backend/:  node tests/graphRoutes.test.js
 */

const path = require('path')
const express = require('express')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// ── Fake supabase (never called, only needs to exist so require() succeeds) ──
const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath,
	filename: supabasePath,
	loaded: true,
	exports: { from: () => { throw new Error('graphRoutes.test.js should never touch supabase directly') } },
}

// ── Fake brain — mirrors backend/brain/index.js's isReady()/graphSource()
// invariants exactly: isReady() is sticky (graph !== null) across a failed
// reload, and a failed reload's source spreads over the previous one so
// stats/loadedAt from the last success survive alongside the new error. ──
let graph = null
let source = { live: false, stats: null, loadedAt: null, error: null }
let shouldFail = false

const fakeBrain = {
	MODULES: [],
	loadGraph: async () => {
		if (shouldFail) {
			source = { ...source, live: false, error: 'simulated Supabase failure', failedAt: new Date().toISOString() }
			throw new Error('simulated Supabase failure')
		}
		graph = { builtAt: Date.now() }
		source = { live: true, stats: { entities: 2, relationships: 1 }, loadedAt: new Date().toISOString(), error: null }
		return source.stats
	},
	setGraph: () => {},
	getGraph: () => graph,
	isReady: () => graph !== null,
	graphSource: () => ({ ...source }),
	run: async () => null,
	runMany: async () => ({}),
	resolveOrder: () => [],
	toCode: () => null,
}
const brainPath = require.resolve(path.join(__dirname, '..', 'brain'))
require.cache[brainPath] = { id: brainPath, filename: brainPath, loaded: true, exports: fakeBrain }

// ── Boot the real router ──────────────────────────────────────────────────
const predictionRouter = require('../routes/intelligence/prediction')

const app = express()
app.use(express.json())
app.use('/api/intelligence', predictionRouter)

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function call(method, p) {
		const res = await fetch(base + p, { method })
		const json = await res.json().catch(() => ({}))
		return { status: res.status, json }
	}

	console.log('\n=== OBA Core — Graph Lifecycle Route Test ===\n')

	console.log('Before any load:')
	{
		const r = await call('GET', '/api/intelligence/graph/status')
		check('status 200', r.status === 200, r.status)
		check('isReady is false', r.json.isReady === false, r.json.isReady)
		check('source.live is false', r.json.source.live === false, r.json.source)
		check('source.loadedAt is null', r.json.source.loadedAt === null, r.json.source.loadedAt)
	}

	console.log('\nA successful reload:')
	let firstLoadedAt
	{
		const r = await call('POST', '/api/intelligence/graph/reload')
		check('reload 200', r.status === 200, r.status)
		check('reloaded is true', r.json.reloaded === true, r.json)
		check('stats present', !!r.json.stats, r.json.stats)
		check('loadedAt present', typeof r.json.loadedAt === 'string', r.json.loadedAt)
		firstLoadedAt = r.json.loadedAt
	}
	{
		const r = await call('GET', '/api/intelligence/graph/status')
		check('status now isReady', r.json.isReady === true, r.json.isReady)
		check('status reflects the same loadedAt the reload returned', r.json.source.loadedAt === firstLoadedAt, r.json.source.loadedAt)
	}

	console.log('\nA failed reload leaves last-known-good state intact:')
	shouldFail = true
	{
		// Force a distinguishable timestamp so "unchanged" is a real assertion.
		await new Promise((r) => setTimeout(r, 5))
		const r = await call('POST', '/api/intelligence/graph/reload')
		check('reload 502', r.status === 502, r.status)
		check('reloaded is false', r.json.reloaded === false, r.json)
		check('error message present', r.json.error === 'simulated Supabase failure', r.json.error)
		check('failed source still carries the previous loadedAt', r.json.source.loadedAt === firstLoadedAt, r.json.source.loadedAt)
	}
	{
		const r = await call('GET', '/api/intelligence/graph/status')
		check('status still isReady (previous graph never cleared)', r.json.isReady === true, r.json.isReady)
		check('status still reports the previous successful loadedAt', r.json.source.loadedAt === firstLoadedAt, r.json.source.loadedAt)
		check('status surfaces the failure', r.json.source.error === 'simulated Supabase failure', r.json.source.error)
	}
	shouldFail = false

	console.log('\nNo role gate:')
	{
		const fs = require('fs')
		const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'intelligence', 'prediction.js'), 'utf8')
		check('prediction.js does not import requireRole', !src.includes('requireRole'), 'D-05: role gating was deleted, not re-added')
	}

	server.close()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'GRAPH ROUTE TESTS PASSED ✅' : 'GRAPH ROUTE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node tests/graphRoutes.test.js`
Expected: FAIL — `GET /api/intelligence/graph/status` and `POST /api/intelligence/graph/reload` are unrouted (404s), so the very first `check('status 200', ...)` fails.

- [ ] **Step 3: Add the two routes to prediction.js**

In `backend/routes/intelligence/prediction.js`, insert immediately after the last card route (`router.get('/capability-by-dept', ...)`, currently line 83) and before the `// Convenience index` comment:

```js
// ── Graph lifecycle (D-14) ───────────────────────────────────────
// loadGraph() otherwise runs exactly once, at backend/index.js boot — nothing
// ever calls it again, so a Supabase edit after boot is invisible until the
// process restarts. No admin gate: D-05 deleted requireRole, and a reload is
// idempotent and non-destructive (loadGraph() only swaps the graph in on
// success, so the previous one keeps answering every other route here if
// this fails) — any authenticated user triggering it is acceptable.

// GET /api/intelligence/graph/status — current provenance, no analysis run.
router.get('/graph/status', (req, res) => {
  res.json({ isReady: domain.graph.isReady(), source: domain.graph.source() })
})

// POST /api/intelligence/graph/reload — see header comment above.
router.post('/graph/reload', async (req, res) => {
  try {
    const stats = await domain.graph.load()
    res.json({ reloaded: true, stats, loadedAt: domain.graph.source().loadedAt })
  } catch (e) {
    res.status(502).json({ reloaded: false, error: e.message, source: domain.graph.source() })
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node tests/graphRoutes.test.js`
Expected: `GRAPH ROUTE TESTS PASSED ✅`, all `check()` lines show `✓`.

- [ ] **Step 5: Register the new test in run-all.js**

In `backend/tests/run-all.js`, add `'graphRoutes.test.js',` to the `tests` array, immediately after `'authRoutes.test.js', // HTTP-level; stubs Supabase, so it runs offline` (so the two HTTP-level, offline-stubbed tests sit together):

```js
	'authRoutes.test.js', // HTTP-level; stubs Supabase, so it runs offline
	'graphRoutes.test.js', // HTTP-level; stubs brain, so it runs offline
]
```

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED ✅`.

- [ ] **Step 7: Commit**

```bash
git add backend/routes/intelligence/prediction.js backend/tests/graphRoutes.test.js backend/tests/run-all.js
git commit -m "$(cat <<'EOF'
Add graph status/reload routes (D-14)

GET /api/intelligence/graph/status and POST /api/intelligence/graph/reload
close F-H's remaining gap: loadGraph() ran exactly once at boot with no way
to bring it current afterward. No role gate (D-05); no rate limit (D-30,
reasoned in the design doc — concurrent reloads are independently safe,
just wasteful).
EOF
)"
```

---

### Task 2: Frontend API client — type `dataSource`, add graph status/reload calls

**Files:**
- Modify: `frontend/lib/api.ts:605-611` (the `IntelligenceResponse<T>` interface), `frontend/lib/api.ts:681-690` (the `orgScience` object)

**Interfaces:**
- Consumes: nothing new (uses the existing `request<T>()` helper at `frontend/lib/api.ts:11`).
- Produces: `orgScience.graphStatus(): Promise<GraphStatus>`, `orgScience.graphReload(): Promise<GraphReloadResult>` — `GraphFreshnessBanner` (Task 3) calls these.

- [ ] **Step 1: Type the field the backend already sends and add two client calls**

In `frontend/lib/api.ts`, replace the `IntelligenceResponse<T>` interface (lines 605-612):

```ts
export interface GraphSource {
  live: boolean;
  stats: Record<string, unknown> | null;
  loadedAt: string | null;
  error: string | null;
}

export interface IntelligenceResponse<T> {
  module: string;
  type: string;
  confidence: number;
  payload: T;
  recommendations: string[];
  generatedAt: string;
  /** Present on the 8 graph-backed cards (domain.graph.run) — absent elsewhere. */
  dataSource?: GraphSource;
}

export interface GraphStatus {
  isReady: boolean;
  source: GraphSource;
}

export interface GraphReloadResult {
  reloaded: boolean;
  stats?: Record<string, unknown>;
  loadedAt?: string;
  error?: string;
  source?: GraphSource;
}
```

Then add two entries to the `orgScience` object (after `benchmark`, before the closing `};` at line 690):

```ts
export const orgScience = {
  pattern: () => request<IntelligenceResponse<PatternPayload>>('/api/intelligence/pattern'),
  capabilityByDept: () => request<IntelligenceResponse<CapabilityPayload>>('/api/intelligence/capability-by-dept'),
  strategicAlignment: () => request<IntelligenceResponse<StrategicAlignmentPayload>>('/api/intelligence/strategic-alignment'),
  dna: () => request<IntelligenceResponse<DNAPayload>>('/api/intelligence/dna'),
  culture: () => request<IntelligenceResponse<CulturePayload>>('/api/intelligence/culture'),
  maturity: () => request<IntelligenceResponse<MaturityPayload>>('/api/intelligence/maturity'),
  behavior: () => request<IntelligenceResponse<BehaviorPayload>>('/api/intelligence/behavior'),
  benchmark: () => request<IntelligenceResponse<BenchmarkPayload>>('/api/intelligence/benchmark'),
  graphStatus: () => request<GraphStatus>('/api/intelligence/graph/status'),
  graphReload: () => request<GraphReloadResult>('/api/intelligence/graph/reload', { method: 'POST' }),
};
```

Note: `POST /graph/reload` can return `502` on failure — `request<T>()` (`frontend/lib/api.ts:11-26`) already throws an `ApiError` on any non-2xx status without parsing the body into the success type, so `GraphFreshnessBanner` (Task 3) will catch that `ApiError` rather than receiving a `GraphReloadResult` with `reloaded: false`. `GraphReloadResult`'s `reloaded: false` shape documents what the raw JSON body looks like on the wire; the client-side failure path is the thrown `ApiError`.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors. (There is no test framework for the frontend in this repo — confirmed in the design doc §7 — so type-checking is the mechanical verification step; Task 3/4's live-server check is what actually proves behavior.)

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "$(cat <<'EOF'
Type dataSource on IntelligenceResponse; add graph status/reload client calls (D-28, D-14)

The backend has sent dataSource.loadedAt on all 8 Org Science card responses
since W-D's D-18 migration; the frontend type never declared it and nothing
ever read it. This is the corrected half of F-H (D-28) -- the field existed,
the client didn't know about it.
EOF
)"
```

---

### Task 3: `GraphFreshnessBanner` component

**Files:**
- Create: `frontend/components/org-science/GraphFreshnessBanner.tsx`

**Interfaces:**
- Consumes: `orgScience.graphStatus()`, `orgScience.graphReload()`, `GraphStatus`, `ApiError` (all from Task 2, `frontend/lib/api.ts`).
- Produces: `<GraphFreshnessBanner onReload={() => void} />` — `onReload` fires after a successful reload completes, so the parent (Task 4) can remount the card grid. Exported as a named export `GraphFreshnessBanner`.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { orgScience, ApiError, type GraphStatus } from '../../lib/api';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

type BannerState = 'loading' | 'ready' | 'error';

function relativeTime(iso: string | null): string {
  if (!iso) return 'never loaded';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface GraphFreshnessBannerProps {
  /** Fires after a reload completes successfully, so callers can refetch dependent data. */
  onReload: () => void;
}

export function GraphFreshnessBanner({ onReload }: GraphFreshnessBannerProps) {
  const [state, setState] = useState<BannerState>('loading');
  const [status, setStatus] = useState<GraphStatus | null>(null);
  const [reloading, setReloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await orgScience.graphStatus();
      setStatus(s);
      setState('ready');
    } catch (err: unknown) {
      setErrorMsg(err instanceof ApiError ? `${err.status} — ${err.message}` : 'Failed to reach the backend');
      setState('error');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleReload() {
    setReloading(true);
    setErrorMsg(null);
    try {
      await orgScience.graphReload();
      await fetchStatus();
      onReload();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof ApiError
          ? `Reload failed (${err.status}) — showing last-known data`
          : 'Reload failed — showing last-known data',
      );
    } finally {
      setReloading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-sm">
      <div className="flex items-center gap-2 min-w-0">
        {state === 'error' && !errorMsg?.includes('Reload failed') && (
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        )}
        <span className="text-[color:var(--text-secondary)] truncate">
          {state === 'loading' && 'Checking graph status…'}
          {state === 'ready' && status && `Graph data as of ${relativeTime(status.source.loadedAt)}`}
          {state === 'error' && (errorMsg ?? 'Graph status unavailable')}
        </span>
      </div>
      <button
        type="button"
        onClick={handleReload}
        disabled={reloading}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-widest',
          'border border-[var(--border-default)] text-[color:var(--text-primary)]',
          'hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <RefreshCw className={clsx('w-3.5 h-3.5', reloading && 'animate-spin')} />
        {reloading ? 'Reloading…' : 'Reload'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/org-science/GraphFreshnessBanner.tsx
git commit -m "$(cat <<'EOF'
Add GraphFreshnessBanner component (D-32)

Renders the graph's loadedAt (relative time) plus a Reload button. Follows
EvidenceBadge.tsx's precedent of a small, neutral, reusable status chip
rather than inventing new visual language.
EOF
)"
```

---

### Task 4: Wire the banner into the Org Science page; verify live

**Files:**
- Modify: `frontend/app/org-science/page.tsx`
- Modify: `frontend/components/admin/EndpointHealthGrid.tsx`

**Interfaces:**
- Consumes: `GraphFreshnessBanner` (Task 3).

- [ ] **Step 1: Wire the banner and a remount-on-reload grid**

Replace the full contents of `frontend/app/org-science/page.tsx`:

```tsx
'use client';

import { useState, useCallback } from 'react';
import { CollaborationScoreCard } from '../../components/org-science/CollaborationScoreCard';
import { LearningMaturityCard } from '../../components/org-science/LearningMaturityCard';
import { PatternRegularityCard } from '../../components/org-science/PatternRegularityCard';
import { CapabilityByDeptCard } from '../../components/org-science/CapabilityByDeptCard';
import { StrategicAlignmentCard } from '../../components/org-science/StrategicAlignmentCard';
import { DNAFingerprintCard } from '../../components/org-science/DNAFingerprintCard';
import { CultureHealthCard } from '../../components/org-science/CultureHealthCard';
import { MaturityCurveCard } from '../../components/org-science/MaturityCurveCard';
import { BehavioralProfileCard } from '../../components/org-science/BehavioralProfileCard';
import { IndustryBenchmarkCard } from '../../components/org-science/IndustryBenchmarkCard';
import { GraphFreshnessBanner } from '../../components/org-science/GraphFreshnessBanner';

export default function OrgSciencePage() {
  const [reloadNonce, setReloadNonce] = useState(0);
  const handleReload = useCallback(() => setReloadNonce((n) => n + 1), []);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight mb-1">
            Strategic &amp; Org Science
          </h1>
          <p className="text-[color:var(--text-secondary)] text-sm">
            Deep organizational behavioral analysis, culture health, and maturity curve positioning.
          </p>
        </div>
        <GraphFreshnessBanner onReload={handleReload} />
      </div>

      <div key={reloadNonce} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-up delay-150">
        <CollaborationScoreCard />
        <LearningMaturityCard />
        <PatternRegularityCard />
        <CapabilityByDeptCard />
        <StrategicAlignmentCard />
        <DNAFingerprintCard />
        <CultureHealthCard />
        <MaturityCurveCard />
        <BehavioralProfileCard />
        <IndustryBenchmarkCard />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the status endpoint to the admin health grid**

In `frontend/components/admin/EndpointHealthGrid.tsx`, add one entry to `ROUTE_REGISTRY` in the `Constitutional` group, immediately after the `Industry Benchmark` row (currently line 101):

```ts
  { name: 'Industry Benchmark',   path: '/api/intelligence/benchmark',         pingPath: '/api/intelligence/benchmark',          category: 'Constitutional', module: 'M45', mounted: true },
  { name: 'Graph Status',         path: '/api/intelligence/graph/status',      pingPath: '/api/intelligence/graph/status',       category: 'Constitutional', mounted: true },
```

(`POST /graph/reload` is deliberately not added here — D-31: an automatic health-check pinger silently reloading the graph on a timer is exactly the invisible side effect this workstream removes elsewhere.)

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Start both dev servers and verify live**

Follow the design doc §7 / decision-log §5 process: restart the backend (it does not hot-reload), confirm `frontend/.env.local`'s `NEXT_PUBLIC_API_URL` targets the port the backend actually started on (retarget and restart the frontend dev server if not — then revert `.env.local` afterward, since it's gitignored local config, not part of this commit), log in through the real UI with the `ADMIN_EMAIL`/`ADMIN_PASSWORD` already in `backend/.env`, then:

1. Open `/org-science`. Confirm the banner renders `Graph data as of …` with a real relative time (not "never loaded" — the graph loads at backend boot, so it should already be ready).
2. Read the page's network requests; confirm `GET /api/intelligence/graph/status` fired once and every one of the 8 card endpoints carries a `dataSource.loadedAt` matching the banner's timestamp.
3. Click Reload. Confirm the button shows "Reloading…", then the banner's timestamp advances to "just now" (or a few seconds ago), and the network tab shows `POST /api/intelligence/graph/reload` followed by all 10 cards re-fetching (the grid remount).
4. Open `/admin` and confirm the new "Graph Status" row pings successfully (LIVE).

Record what was actually observed (screenshot or network-tab summary) rather than asserting success without checking, per the repo's verification-before-completion standard.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/org-science/page.tsx frontend/components/admin/EndpointHealthGrid.tsx
git commit -m "$(cat <<'EOF'
Wire GraphFreshnessBanner into /org-science; add Graph Status to admin grid (D-32)

Reload now visibly refreshes the page: the banner's timestamp advances and
all 10 cards remount to refetch. Verified live against a running backend --
see the plan's Task 4 verification notes.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** §5 (endpoint design) → Task 1. §6.1-6.2 (type + client) → Task 2. §6.2 (banner) → Task 3. §6.3-6.4 (page wiring + admin grid) → Task 4. §7 (backend test) → Task 1. §7 (frontend manual verification) → Task 4 Step 4. §3 (D-29 voice.js) and §4 (D-30 no rate limit) are reasoned-and-rejected — no task needed, both are called out in Global Constraints so no implementer reintroduces them by default instinct.
- **Placeholder scan:** none — every step has literal code or literal verification instructions.
- **Type consistency:** `GraphStatus`/`GraphSource`/`GraphReloadResult` (Task 2) are the exact names Task 3's `GraphFreshnessBanner` imports; `onReload` prop name matches between Task 3's definition and Task 4's usage; `orgScience.graphStatus()`/`graphReload()` names match between Task 2's definition and Task 3's calls.
