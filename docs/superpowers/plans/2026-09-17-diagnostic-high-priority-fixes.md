# Diagnostic High-Priority Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the six confirmed, unambiguous bugs from the 2026-09-17 full-system diagnostic that don't require a scoring/formula design decision — owner-change cache staleness, the risk-page cascade miscount, the always-empty AI Tools outage panel, the "no backup" tools bug on two pages, and the mislabeled memory status.

**Architecture:** Each task is an isolated, independently-testable bug fix — no shared new abstractions. Backend fix (Task 1) follows this repo's existing offline-stub TDD pattern (`backend/tests/agentsRoutes.test.js`). Frontend fixes (Tasks 2–6) have no project-level component test runner (confirmed: `frontend/` has no `*.test.tsx` outside `node_modules`) — verification is `tsc --noEmit` + `eslint` + a manual browser pass in Task 7, matching this repo's actual convention.

**Tech Stack:** Node.js/Express 5 + Supabase (`backend/`), Next.js 16 / React 19 + TypeScript (`frontend/`).

**Spec:** No separate spec doc — this plan implements items 1, 3, 4, 5, 6 of the "High (confirmed)" list and the exact-fix parts of the "Seeded/hardcoded" §8 list are explicitly OUT of scope, from the 2026-09-17 diagnostic pasted into the conversation that produced this plan (not a repo file).

## Global Constraints

- Every backend cache-clearing step in Task 1 must be best-effort: a failure to clear a cache must never turn a successful owner write into a failed HTTP response (existing rule already established by this codebase's `optional()`/`must()` pattern in `derived.js`).
- Do not touch `domain/simulations.js`'s health-delta formulas, `derived.js`'s IMHS weights (`calcIMHS`, `preserved * 1.0 + vulnerable * 0.5 + atRisk * 0.25`), or any other scoring/weighting constant. Those are flagged in the diagnostic as needing an explicit owner decision (D-60 already made a considered call on the IMHS weights) — out of scope for this plan.
- Frontend: no new dependencies, no new abstractions. Fixes are field-name corrections and filter corrections against data the backend already sends correctly.
- Run `node tests/agentsRoutes.test.js` (from `backend/`) after Task 1; run `npx tsc --noEmit` and `npm run lint` (from `frontend/`) after each frontend task.

---

### Task 1: Owner-change writes must invalidate every cache they make stale

**Files:**
- Modify: `backend/routes/agents.js:1-111` (add a `domain` require and a `clearCachesAfterOwnerChange()` helper, call it from the PATCH handler)
- Test: `backend/tests/agentsRoutes.test.js`

**Interfaces:**
- Consumes: `domain.intelligence.invalidate` (= `derived.invalidate`, `backend/domain/derived.js:1807`, already exported via `backend/domain/index.js:95`), `domain.graph.load` (= `brain.loadGraph`, already exported via `backend/domain/index.js:55`). Both already exist and are used elsewhere (`backend/routes/intelligence/prediction.js:100-112`) — this task wires them into the owner-write path, it does not create them.
- Produces: nothing new consumed by later tasks — this task is self-contained.

- [ ] **Step 1: Write the failing test**

Open `backend/tests/agentsRoutes.test.js`. Extend the existing fake Supabase stub (currently only handles the `'agents'` table, throwing `unexpected table` for anything else — see lines 48-73) to also handle `delete().gte()` / `delete().eq()` on the three snapshot tables the fix must clear, and add a `clearedTables` tracking array plus new assertions.

Replace the whole `require.cache[supabasePath] = { ... }` block (lines 43-75) with:

```js
const clearedTables = []

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath,
	filename: supabasePath,
	loaded: true,
	exports: {
		from(table) {
			if (table === 'agents') {
				return {
					update(patch) {
						return {
							eq(col, val) {
								return {
									select() {
										return {
											async maybeSingle() {
												const agent = agentsTable.find((a) => a.id === val)
												if (!agent) return { data: null, error: null }
												if (patch.owner_id !== null && !validEmployeeIds.has(patch.owner_id)) {
													return { data: null, error: { code: '23503', message: 'insert or update on table "agents" violates foreign key constraint' } }
												}
												agent.owner_id = patch.owner_id
												return { data: { id: agent.id, name: agent.name, owner_id: agent.owner_id }, error: null }
											},
										}
									},
								}
							},
						}
					},
				}
			}
			if (['brain_core_snapshots', 'orchestrator_snapshots', 'executive_briefings'].includes(table)) {
				return {
					delete() {
						return {
							gte(col, val) {
								clearedTables.push({ table, col, val })
								return Promise.resolve({ error: null })
							},
							eq(col, val) {
								clearedTables.push({ table, col, val })
								return Promise.resolve({ error: null })
							},
						}
					},
				}
			}
			// Every other table (graphLoader's ~20 reads during domain.graph.load())
			// is expected to fail in this offline test -- the fix must treat that
			// failure as best-effort and not let it break the response.
			throw new Error(`agentsRoutes.test.js: unexpected table '${table}'`)
		},
	},
}
```

Then, right before the existing `server.close()` line (line 175), insert two new test blocks:

```js
	console.log('\nCache invalidation on successful owner change (post-diagnostic fix):')
	{
		clearedTables.length = 0
		const today = new Date().toISOString().split('T')[0]
		const r = await patch('/api/agents/10/owner', { ownerId: 2 })
		check('owner change still succeeds — 200', r.status === 200, r.status)

		const cleared = (table) => clearedTables.find((c) => c.table === table)
		check('brain_core_snapshots cleared for today', cleared('brain_core_snapshots')?.val === `${today}T00:00:00`, clearedTables)
		check('orchestrator_snapshots cleared for today', cleared('orchestrator_snapshots')?.val === `${today}T00:00:00`, clearedTables)
		check('executive_briefings cleared for today', cleared('executive_briefings')?.val === today, clearedTables)
	}

	{
		clearedTables.length = 0
		const r = await patch('/api/agents/999999/owner', { ownerId: 1 })
		check('nonexistent agent — 404, no cache clear attempted', r.status === 404 && clearedTables.length === 0, { status: r.status, clearedTables })
	}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/agentsRoutes.test.js` (from `backend/`)
Expected: FAIL — the three new `check(...)` calls in the first new block report `got: []` (nothing in `clearedTables`), because `agents.js` doesn't clear anything yet.

- [ ] **Step 3: Write minimal implementation**

In `backend/routes/agents.js`, add the `domain` require after the existing requires (after line 5):

```js
const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { loadOwnerBackupByEmployee } = require('../lib/ownerBackups')
const { requireAdmin } = require('../middleware/requireRole')
const domain = require('../domain')
```

Then, immediately before the `router.patch('/:id/owner', ...)` block (before line 63's comment block), add:

```js
/**
 * An owner change makes three caches stale that nothing else was clearing:
 * the 30s derived.js memo (recommendations/coverage would serve a stale
 * figure for up to 30s -- survivable), the in-memory Knowledge Graph (owns
 * edges are graph entities, not re-read per request -- stale until someone
 * hits the manual reload button), and today's already-cached brain-core /
 * orchestrator / briefing rows (each caches once per UTC day, so without
 * this a change made at 09:00 would not show up in those three surfaces
 * until the next day). Every step here is best-effort: the owner write has
 * already succeeded by the time this runs, and a cache that fails to clear
 * must not turn that success into a failed response.
 */
async function clearCachesAfterOwnerChange() {
  try {
    domain.intelligence.invalidate()
  } catch (err) {
    console.warn(`[agents] failed to invalidate derived cache: ${err.message}`)
  }

  try {
    await domain.graph.load()
  } catch (err) {
    console.warn(`[agents] owner-change graph reload failed: ${err.message}`)
  }

  const today = new Date().toISOString().split('T')[0]
  async function clearTable(label, build) {
    try {
      const { error } = await build()
      if (error) console.warn(`[agents] failed to clear ${label}: ${error.message}`)
    } catch (err) {
      console.warn(`[agents] failed to clear ${label}: ${err.message}`)
    }
  }
  await Promise.all([
    clearTable('brain_core_snapshots', () => supabase.from('brain_core_snapshots').delete().gte('computed_at', `${today}T00:00:00`)),
    clearTable('orchestrator_snapshots', () => supabase.from('orchestrator_snapshots').delete().gte('computed_at', `${today}T00:00:00`)),
    clearTable('executive_briefings', () => supabase.from('executive_briefings').delete().eq('briefing_date', today)),
  ])
}
```

Finally, in the `router.patch('/:id/owner', ...)` handler, change:

```js
  if (!data) return res.status(404).json({ error: `No agent with id ${agentId}` })

  res.json({ ok: true, agent: data })
})
```

to:

```js
  if (!data) return res.status(404).json({ error: `No agent with id ${agentId}` })

  await clearCachesAfterOwnerChange()

  res.json({ ok: true, agent: data })
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/agentsRoutes.test.js` (from `backend/`)
Expected: `AGENT OWNERSHIP WRITE TESTS PASSED ✅`, all checks including the new ones passing.

- [ ] **Step 5: Run the full backend suite to confirm no regression**

Run: `npm test` (from `backend/`)
Expected: same pass count as before this change plus the new checks (the diagnostic notes one pre-existing offline failure — `helmet` not installed locally — unrelated to this change; do not attempt to fix that here).

- [ ] **Step 6: Commit**

```bash
git add backend/routes/agents.js backend/tests/agentsRoutes.test.js
git commit -m "fix: owner change now invalidates derived cache, reloads graph, clears today's snapshots"
```

---

### Task 2: Let admins reassign an agent that already has an owner, not just orphaned ones

**Files:**
- Modify: `frontend/components/ownership/OwnershipList.tsx:1-260`

**Interfaces:**
- Consumes: `onAssignOwner` prop (already generic — `agentsApi.assignOwner()` accepts reassignment of an already-owned agent today; the backend route from Task 1 never restricted this to orphaned agents, only the UI did).
- Produces: nothing new.

- [ ] **Step 1: Edit the component**

In `frontend/components/ownership/OwnershipList.tsx`, remove the now-unused `ChevronRight` import (line 5):

```tsx
import { AlertCircle, CheckCircle2, ShieldAlert, XCircle, Loader2 } from 'lucide-react';
```

Then replace the conditional action cell (lines 241-249):

```tsx
                      <td className="px-6 py-4 text-right">
                         {group.isOrphaned ? (
                           <AssignOwnerControl agentId={agent.id} employees={employees} onAssign={onAssignOwner} />
                         ) : (
                           <button className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors opacity-0 group-hover/row:opacity-100">
                             <ChevronRight className="w-4 h-4" />
                           </button>
                         )}
                      </td>
```

with:

```tsx
                      <td className="px-6 py-4 text-right">
                         <AssignOwnerControl agentId={agent.id} employees={employees} onAssign={onAssignOwner} />
                      </td>
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Expected: no new errors, no "unused import" error for `ChevronRight`.

Run: `npm run lint` (from `frontend/`)
Expected: no new warnings/errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ownership/OwnershipList.tsx
git commit -m "fix: allow reassigning an agent's owner, not just assigning orphaned ones"
```

---

### Task 3: Risk page cascade counts mix workflow ids with agent ids

**Files:**
- Modify: `frontend/app/risk/page.tsx:15-49`

**Interfaces:**
- Consumes: `GET /api/dependencies` response shape `{ dependencies: [{ source_id, target_id, source_type, target_type, dependency_type, ... }] }` (`backend/routes/dependencies.js:17-27` — `source_type`/`target_type` are already returned, just currently discarded by this page).
- Produces: nothing new — same `Dependency[]` shape `computeRiskIntelligence()` already expects.

- [ ] **Step 1: Edit the component**

In `frontend/app/risk/page.tsx`, extend the `RawDependency` interface (lines 15-19) to carry the type discriminators already present on the API response:

```tsx
interface RawDependency {
  source_id?: string | number;
  target_id?: string | number;
  source_type?: string;
  target_type?: string;
  dependency_type?: string;
}
```

Then filter to agent-agent edges only before mapping, matching the same fix already proven correct on `frontend/app/map/page.tsx:65`. Replace (lines 45-49):

```tsx
      const dependencies: Dependency[] = Array.isArray(depsData.dependencies) ? depsData.dependencies.map((d: RawDependency) => ({
        from: d.source_id?.toString() || '',
        to: d.target_id?.toString() || '',
        type: (d.dependency_type || 'normal') as Dependency['type'],
      })) : [];
```

with:

```tsx
      // Only agent-agent edges belong in this graph -- /api/dependencies also
      // returns workflow->agent and other cross-type edges sharing the same
      // numeric id space, which getDownstream() would otherwise walk as if
      // they were all agent ids (a workflow id colliding with an unrelated
      // agent id). Same fix already applied on the Dependency Map page
      // (app/map/page.tsx) -- this page was the one place it was missing.
      const dependencies: Dependency[] = Array.isArray(depsData.dependencies)
        ? depsData.dependencies
            .filter((d: RawDependency) => d.source_type === 'agent' && d.target_type === 'agent')
            .map((d: RawDependency) => ({
              from: d.source_id?.toString() || '',
              to: d.target_id?.toString() || '',
              type: (d.dependency_type || 'normal') as Dependency['type'],
            }))
        : [];
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Run: `npm run lint` (from `frontend/`)
Expected: no new errors either run.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/risk/page.tsx
git commit -m "fix: risk page cascade counts no longer mix workflow ids into the agent dependency graph"
```

---

### Task 4: AI Tools outage impact panel is always empty

**Files:**
- Modify: `frontend/lib/aiToolIntelligence.ts:71-90` and `:147-178`

**Interfaces:**
- Consumes: `AITool.agents_using: string[]` (agent **names**, per `backend/routes/tools.js:81-90`'s `loadPlatformAgents()`) and `AITool.workflows: string[]` (workflow **names**, per `backend/routes/tools.js:92-99`'s `loadPlatformWorkflows()`, sourced from `workflow_tool_dependencies` — the real tool↔workflow link table).
- Produces: same `OutageImpact`/`ToolRiskProfile` shapes — no signature change, callers (`ai-tools/page.tsx`, `simulation/page.tsx`) are unaffected.

- [ ] **Step 1: Edit `simulateOutage()`**

In `frontend/lib/aiToolIntelligence.ts`, replace (lines 71-77):

```ts
export function simulateOutage(tool: AITool, workflows: Workflow[], agents: Agent[]): OutageImpact {
  const brokenWorkflows = workflows.filter(w =>
    w.steps.some(s => s.actor === 'tool' && s.name === tool.name)
  );

  const brokenAgents = agents.filter(a => tool.agents_using.includes(a.id));
```

with:

```ts
export function simulateOutage(tool: AITool, workflows: Workflow[], agents: Agent[]): OutageImpact {
  // tool.workflows and tool.agents_using are both NAME lists (backend/routes/
  // tools.js's loadPlatformWorkflows()/loadPlatformAgents(), sourced from
  // workflow_tool_dependencies and agent_platform) -- match by name, not id.
  // The previous w.steps.some(s => s.actor === 'tool' ...) check always
  // missed: no workflow_steps row in this dataset has actor_type 'tool'
  // (the real tool<->workflow link lives in workflow_tool_dependencies, not
  // in step actors), and agents_using.includes(a.id) compared names to ids.
  const brokenWorkflows = workflows.filter(w => tool.workflows.includes(w.name));

  const brokenAgents = agents.filter(a => tool.agents_using.includes(a.name));
```

- [ ] **Step 2: Edit `computeAIToolIntelligence()`'s duplicate of the same logic**

Replace (lines 161-164):

```ts
    const affectedWorkflows = workflows.filter(w =>
      w.steps.some(s => s.actor === 'tool' && s.name === tool.name)
    );
    const affectedAgents = agents.filter(a => tool.agents_using.includes(a.id));
```

with:

```ts
    // Same name-based matching as simulateOutage() above -- see its comment.
    const affectedWorkflows = workflows.filter(w => tool.workflows.includes(w.name));
    const affectedAgents = agents.filter(a => tool.agents_using.includes(a.name));
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Run: `npm run lint` (from `frontend/`)
Expected: no new errors either run.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/aiToolIntelligence.ts
git commit -m "fix: AI Tools outage impact now matches agents/workflows by name, not a broken id/step-actor check"
```

---

### Task 5: Every tool shows "no backup" on the Ownership and Simulation pages

**Files:**
- Modify: `frontend/app/ownership/page.tsx:75-80`
- Modify: `frontend/app/simulation/page.tsx:57-62`

**Interfaces:**
- Consumes: `GET /api/tools` response, which already sends the correct `backup_tool: string | null` and `users: string[]` fields (`backend/routes/tools.js:187-201`). Both pages currently override these correct fields with a nonexistent `t.backupAssigned` field and a hardcoded empty array, right after spreading the correct ones in.
- Produces: nothing new.

- [ ] **Step 1: Fix `frontend/app/ownership/page.tsx`**

Replace (lines 75-80):

```tsx
      const ai_tools = Array.isArray(toolsData) ? toolsData.map((t: Record<string, unknown>) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
        backup_tool: t.backupAssigned ? 'Yes' : null,
        users: [],
      } as unknown as AITool)) : [];
```

with:

```tsx
      // backup_tool and users already come through correctly via the `...t`
      // spread (GET /api/tools sends both) -- the two lines below used to
      // override them with a `backupAssigned` field the API never sends
      // (always falsy, so "no backup" for every tool) and a hardcoded empty
      // users array. Only access_owner genuinely needs a UI-level default.
      const ai_tools = Array.isArray(toolsData) ? toolsData.map((t: Record<string, unknown>) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
      } as unknown as AITool)) : [];
```

- [ ] **Step 2: Fix `frontend/app/simulation/page.tsx`**

Replace (lines 57-62):

```tsx
      const mappedTools: AITool[] = Array.isArray(toolsData) ? toolsData.map((t: Record<string, unknown>) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
        backup_tool: t.backupAssigned ? 'Yes' : null,
        users: [],
      } as unknown as AITool)) : [];
```

with:

```tsx
      // Same fix as ownership/page.tsx: backup_tool/users already arrive
      // correctly via the `...t` spread -- stop overriding them.
      const mappedTools: AITool[] = Array.isArray(toolsData) ? toolsData.map((t: Record<string, unknown>) => ({
        ...t,
        access_owner: t.owner || t.access_owner || 'Unassigned',
      } as unknown as AITool)) : [];
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Run: `npm run lint` (from `frontend/`)
Expected: no new errors either run.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/ownership/page.tsx frontend/app/simulation/page.tsx
git commit -m "fix: stop overriding tools' real backup_tool/users fields with a nonexistent field"
```

---

### Task 6: Memory "VULNERABLE" tile sublabel is wrong for undocumented assets

**Files:**
- Modify: `frontend/components/memory/MemoryHeader.tsx:112-120`

**Interfaces:**
- Consumes: `report.vulnerable` (from `domain/derived.js`'s `memoryStatus()`, `backend/domain/derived.js:776-781`). No backend change — `memoryStatus()`'s classification is untouched per Global Constraints; only the frontend label describing it is wrong.

- [ ] **Step 1: Confirm the mismatch**

`memoryStatus(hasOwner, isDocumented, hasBackup)` returns `'VULNERABLE'` for every combination that isn't `LOST`/`PRESERVED`/`AT_RISK` — which includes owned-but-undocumented-with-no-backup (documented=false), not just documented-with-no-backup. The one fact true of every `VULNERABLE` case is "no backup coverage"; documented status varies. No code change needed here — this step is verification before editing the label.

- [ ] **Step 2: Edit the sublabel**

In `frontend/components/memory/MemoryHeader.tsx`, replace (line 119):

```tsx
      sublabel: 'Documented, no backup',
```

with:

```tsx
      sublabel: 'No backup coverage',
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit` (from `frontend/`)
Run: `npm run lint` (from `frontend/`)
Expected: no new errors either run.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/memory/MemoryHeader.tsx
git commit -m "fix: VULNERABLE memory tile no longer claims every asset in it is documented"
```

---

### Task 7: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start both servers**

Start the backend (`npm start` from `backend/`, or however this session's dev setup runs it) and the frontend dev server (`npm run dev` from `frontend/`), then open the app in the browser.

- [ ] **Step 2: Verify Task 1 (owner-change cache invalidation)**

On `/ownership`, assign or reassign an owner on any agent. Confirm the request succeeds and the page's own reload (`loadOwnershipData()`) shows the new owner immediately with no stale coverage numbers.

- [ ] **Step 3: Verify Task 2 (reassign an already-owned agent)**

Still on `/ownership`, confirm every agent row — not just orphaned ones — now shows the "Assign owner…" control, and that picking a different owner for an already-owned agent succeeds.

- [ ] **Step 4: Verify Task 3 (risk page cascade counts)**

On `/risk`, spot-check a couple of agents' cascade/downstream counts against `/map`'s per-agent cascade figures (or `GET /api/dependencies/agent-spofs`'s `victimsCount`) — they should now agree, where previously the risk page's counts were inflated by workflow ids being walked as agent ids.

- [ ] **Step 5: Verify Task 4 (AI Tools outage impact)**

On `/ai-tools`, open a tool that the diagnostic said should power agents (e.g. one with a nonzero "Powers N Critical Agents" risk factor). Confirm its outage-impact panel now lists broken agents/workflows instead of "Contained / No agents powered".

- [ ] **Step 6: Verify Task 5 (tools backup status)**

On `/ownership` and `/simulation`, confirm tools that have a real backup assigned (cross-check against `/ai-tools`, which was never broken) now show that backup instead of every tool reading "no backup".

- [ ] **Step 7: Verify Task 6 (memory label)**

On `/memory`, hover/read the VULNERABLE tile and confirm the sublabel no longer claims "Documented, no backup".

- [ ] **Step 8: Share results**

Report pass/fail for each of the six checks above.

---

## Deferred — needs an owner decision, not in scope for this plan

- **Simulation health deltas are mostly meaningless** (`backend/domain/simulations.js`, diagnostic §8 item 2): `orgHealth()` never reads `ai_platforms`, so platform-down scenarios always show Δ0; several agent-fails scenarios show health *improving*; 36 of 40 employee-departure scenarios show Δ0. Fixing this means changing what `orgHealth()` weighs, which is a scoring-formula decision the diagnostic itself flags as needing an owner call (its own "suggested order of work" item 4).
- **IMHS weight ordering** (`backend/domain/derived.js:791-793`, `calcIMHS`): `VULNERABLE` currently earns more credit (0.5) than `AT_RISK` (0.25) toward the Institutional Memory Health Score, even though the diagnostic argues `VULNERABLE` (which can be owned+undocumented+no-backup) is the worse state. These exact weights were a considered decision (D-60, 2026-08-26, ported verbatim from the frontend's original formula) — reversing them needs the same sign-off, not a silent change here.
