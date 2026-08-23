# Collapse the Brain from a Runtime into a Library

**Status:** all eight steps done · migrating the remaining routes to the domain layer is the long tail · **Date:** 2026-08-24 · **Branch:** `ocos/develop`

Supersedes BUILD_SPEC's W9 ("wire the brain to the routes"). W9 assumed the brain
was a service to be plugged into more routes. It is better understood as a
library that should be called directly, and this document says why and how.

> **This document sets aside two BUILD_SPEC constraints, deliberately and with
> the owner's agreement:** the `M01–M55` registry being LOCKED, and the
> constitutional runtime being a fixed property of the system. Both were
> confirmed to be implementation details that nothing outside the repository
> depends on.

---

## 1. The problem

The same organization is described by four independent pieces of code reading
one database, and they can disagree with nobody able to say which is right.

Most visibly, **`M39` means two different things**. `intelligence/prediction.js`
serves the brain's M39 (capability *counts*, from graph structure).
`intelligence/constitutional.js` serves a different M39 (per-department
capability *scores*, banded STRONG/DEVELOPING/AT RISK, from table aggregates).
The same holds for M40, M46, M48 and M54. A developer told to "fix M39" has
three files to choose from — a fourth if the dormant Python layer counts — and
no way to know which one reaches a screen.

## 2. The reframe

**The graph is not a second data source. It is a lossy projection of the first
one.** `graphLoader.js` builds it *from* thirteen Supabase tables. The brain and
the SQL routes therefore cannot legitimately disagree about facts; any
disagreement is either a bug or an artifact of what the projection drops.

So the goal is not to arbitrate between two truths. It is to stop having two.

The corollary is that the brain does not need to be a *pipeline*. Graph
traversal is a good technique for structural questions — cascades, centrality,
cycles, single points of failure — and a poor one for costs and time series.
That is an argument for the graph being a **data structure used inside one
analysis layer**, not a rival authority sitting beside it.

## 3. Current state, measured

Four readers of one database (Supabase `ncfwxpstkwuznpjpfomt`, ~70 tables):

| # | Reader | Consumers | Verdict |
|---|---|---|---|
| 1 | Direct SQL | 49 of 54 route files | **Keep** — this is the app |
| 2 | Brain (`graphLoader` → 55 modules) | **one** route file, `prediction.js` (8 endpoints) | **Keep the analysis, drop the runtime** |
| 3 | `lib/orgDataset.js` | 2 files: `constitutional.js`, `voice.js` | **Fold in** — 8 of its 14 tables are already read by layer 1 |
| 4 | `brain_core_snapshots` readers | `brainCore.js`, `orchestrator.js` | **Reclassify** — a cache over tables other code writes, not an intelligence source |

Plus a dormant fifth: `modules/` + `horquva_modules_py/` + `main.py`, 71 Python
files, zero references from any JS/TS/CI. Its only reader of `data/company.json`
is itself.

### The brain's own split

```
runtime scaffolding : 1,154 lines   eventBus, communicationLayer, moduleRegistry,
                                    capabilityRegistry, intelligenceExchange,
                                    executionEngine, brainState, brainApi, boot
actual analysis     : 2,110 lines   analytics.js, implementations.js,
                                    graphLoader, graph/entity/relationship classes
```

**The only callers of `/api/brain/*` anywhere in the repository are its own
self-description strings.** The scaffolding exists to solve dynamic module
discovery and orchestration across four owning teams — a problem this codebase
does not have.

## 4. Target architecture

```
Supabase (~70 tables)
        │
        ▼
backend/domain/          ← ONE analysis layer. The single place any
  ownership.js             organizational number is computed.
  dependencies.js          Graph algorithms live INSIDE it, as a technique.
  risk.js
  capability.js
  culture.js  …
        │
        ▼
backend/routes/          ← thin: parse request, call domain, shape response
        │
        ▼
frontend pages
```

One pipeline. The graph becomes a data structure the domain layer builds when a
question needs traversal — comparable to building an index — rather than a
parallel system with its own boot sequence and confidence model.

### The rule that replaces "which pipeline wins"

> Structural questions use graph traversal. Aggregate and temporal questions use
> SQL. Both live behind the same domain function, and callers do not know which
> was used.

## 5. Disposition of every piece

| Piece | Action | Note |
|---|---|---|
| `modules/implementations.js` (55 module bodies) | **Keep verbatim** | The actual product. Called as plain functions. Not rewritten. |
| `modules/analytics.js` | **Keep** | 137 lines of correct graph algorithms |
| `knowledge/graphLoader.js` | **Keep, extend** | See §6.2 |
| `knowledge/knowledgeGraph.js`, `entityRegistry.js`, `relationshipRegistry.js` | **Keep** | The data structure |
| `runtime/executionEngine.js` | **Delete** | Replaced by explicit function composition (§6.3) |
| `runtime/eventBus.js`, `communicationLayer.js`, `brainState.js` | **Delete** | No consumers |
| `knowledge/moduleRegistry.js`, `capabilityRegistry.js` | **Delete** | Self-description only |
| `knowledge/intelligenceExchange.js` | **Delete** | See §6.1 — its only readers measure the machinery |
| `runtime/brainApi.js`, `brain/index.js`, `brain/boot.js` | **Delete** | `/api/brain/*` has no callers |
| `knowledge/graphSeeder.js` | **Delete** | Demo data; the real loader works |
| `routes/intelligence/constitutional.js` | **Move into domain, rename off M-numbers** | Keep the analyses, drop the module codes |
| `lib/orgDataset.js` | **Fold into domain** | |
| `routes/intelligence/brainCore.js`, `orchestrator.js` | **Keep, relabel** | Snapshot cache, not intelligence |
| `modules/`, `horquva_modules_py/`, `main.py` | **Delete** | 71 files, zero references, recoverable from git |
| The `M01`–`M55` identifiers | **Dropped outside the brain** | See the note below |

### On the M-numbers (done 2026-08-24, and narrower than first written)

This document originally said to drop the identifiers everywhere. In the event
they were dropped **only from `lib/orgAnalyses.js`**, and that is enough: the
collision was two files claiming the same code, and only one of them can be
right about what `M39` means. The brain's catalog is a coherent registry — it
carries owners, dependencies and the ordering rules key on the codes — whereas
the dataset analyses only wore theirs as labels. So:

| Was | Now |
|---|---|
| `signalIntelligence` (M36) | `trendSignals` |
| `opportunityIntelligence` (M38) | `improvementOpportunities` |
| `capabilityIntelligence` (M39) | `departmentCapability` |
| `strategicAlignment` (M40) | `alignmentChecklist` |
| `truthIntelligence` (M46) | `standardClaimChecks` |
| `autonomousAdvisor` (M48) | `playbookAdvice` |
| `simulationUniverse` (M54) | `resilienceScenarios` |

**M01–M55 now belongs to the brain catalog and nothing else claims a code.**

This was true of `constitutional.js` first; a later sweep found the same pattern
in three files the rename step never looked at — `routes/avatar/index.js` (M21),
`routes/selfHealing/index.js` (M51) and `routes/automation/index.js` (M52, M53)
answered with a brain code while computing something different. The brain's M52
returns governance coverage from the graph (`complianceRate`, `governanceGaps`);
`/api/automation/governance` returns pending approvals from `pending_decisions`.
All four were renamed to a `service` identifier describing what they do.

`EndpointHealthGrid.tsx` carried a third copy: 27 hardcoded module badges, of
which only 8 named the analysis actually serving the request. Five had gone stale
when the dataset analyses were renamed, and several were never right —
`/api/forecast` was labelled M20, which is Accountability Intelligence. The 19
wrong badges are gone; the 8 brain-served ones stay.

**Guarded against regression**: `brain.smoke.test.js` now walks every route file
and fails if any answers with a brain module code. The collision had been
reintroduced by accident once already, which is why the check exists rather than
a comment.

Renaming the brain's 51 as well would touch every `IMPL.MXX` key, the
`DEPENDENCIES` map, ten `A.prior(context, 'M46')` call sites and every test, to
buy readability rather than correctness. Instead each analysis gained a `slug`
derived from its catalog name, and `run` / `runMany` / `resolveOrder` accept
either form — so `prediction.js` reads `moduleEndpoint('culture')` while the
code stays canonical. Slug uniqueness is asserted in `brain.smoke.test.js`,
since a future rename could silently collide two analyses onto one alias.

## 6. The three problems that need real decisions

### 6.1 Six modules measure the machinery, not the organization

Deleting the runtime forces an issue that already exists:

| Module | Reads | What it actually reports |
|---|---|---|
| **M10** Organizational Memory | `intelligenceBus.history(200)` | a log of *Brain runs* |
| **M12** Forecasting | `intelligenceBus.history(1000)` | ditto |
| **M17** Organizational Learning | `intelligenceBus.history(1000)` | ditto |
| **M47** Continuous Learning | `intelligenceBus.history(2000)` | ditto |
| **M39** Capability | `capabilityRegistry.count()` | `brainConstitutionalCapabilities: 55` — a constant |
| **M49** Digital Twin | `state.health` | `runtimeHealth` — currently empty |

BUILD_SPEC already recorded M10's misnaming ("Returns `rt.intelligenceBus.history()`
— a log of **Brain runs**"). The 2026-08-13 audit "fixed" M10/M12/M17/M47 by
wiring the bus so they stopped returning zeros — but what they now report is how
much the brain has been *used*, not what the organization has *learned*. A
number that moves when you refresh a page is not organizational memory.

**RESOLVED 2026-08-24 — all four retired.** The catalog is 55 → 51.

The re-pointing candidates turned out to be already built, correctly, in SQL:
`routes/learning` serves `/failures` and `/decisions` from `workflow_failures`
and `decision_history` — the exact tables named above — and `routes/forecast`
and `routes/memory` cover the other two questions. Re-pointing would have meant
writing four new analyses duplicating three working routes.

Nothing salvageable remained in the bodies: M17's `learningIndex` was
`min(1, brainRuns / 100)` and its recommendation told the user to run the
software more often; M12 projected entity growth as `1.1 + brainUsage`,
fabricated arithmetic of the same class as M40's constants (§9). Nothing
depended on any of the four. Verified after removal: the surviving 51 analyses
are byte-identical.

⚠ **This overrides BUILD_SPEC W5**, which planned to *extend* `IMPL.M10` to read
a new `graph_snapshot` table "which makes it the Organizational Memory its name
claims". That plan replaces M10's body wholesale against a table that does not
exist yet, so nothing is lost by retiring it now — but whoever builds W5 should
add a new, named analysis rather than look for M10.

The two self-description fields (`brainConstitutionalCapabilities`,
`runtimeHealth`) are simply deleted; `CapabilityByDeptCard` renders the former
and must be updated.

### 6.2 The projection is lossy, and that is why pages cannot use the graph

`graphLoader` stores agents as `{kind, agentType, status, risk}` and discards
`cost`, `usage_count`, `adoption_pct`, `last_used` and every timestamp. The
graph also has no time dimension at all.

**Carry the full row into entity metadata.** Once nothing is dropped, no class of
question is structurally excluded from the graph, and the ai-tools page stops
being un-servable by it. Time series stay in SQL — that is a real boundary, not
an accident.

**DONE 2026-08-24.** A `rowMeta()` helper carries every column, omitting only
`id` and `name` (the entity already carries its identity) and keeping the primary
key as `sourceId` — which BUILD_SPEC W3 will need for stable ids across graph and
database. Agents now carry `cost`, `usage_count`, `adoption_pct` and `last_used`;
platforms carry `cost_monthly` and `vendor`; employees carry `tenure`, `skills`,
`workload`, `manager` and `hire_date`.

Purely additive: all 51 analyses are byte-identical afterwards. Only
`metadata.role` was ever read by any analysis, so this fixes nothing today — it
removes the structural reason steps 7–8 could not serve cost and adoption
questions from the graph. `searchContext()` stringifies metadata, so it does get
immediately better: "Engineering" now matches 14 entities instead of name and
type alone.

⚠ **Carrying timestamps as fields is not a time dimension.** The graph is still a
snapshot of now. Recording what *changed* is W5, untouched.

### 6.3 `priorIntel` is composition, and does not need a scheduler

Roughly ten modules read `context.priorIntel` — M48 is gated by M46, M55 fuses
everything, M24/M50 aggregate. This is legitimate and must survive. It does not
need a topological scheduler: it is function composition.

```js
// before: engine.resolveOrder() + Kahn's algorithm + constitutional rules
// after:
const truth  = truthIntelligence(graph)
const advice = autonomousAdvisor(graph, { truth })   // gate is visible in code
```

The dependency order becomes readable at the call site instead of being computed
at runtime from a registry.

## 7. Migration sequence

Every step leaves the application working. There is no flag day.

| Step | Work | Est. |
|---|---|---|
| ~~**1**~~ | ~~Delete the Python layer~~ — **done**, commit `2fa9d97` | hours |
| ~~**2**~~ | ~~Expose the module bodies as directly-callable functions; delete the runtime~~ — **done**, commit `36d872f`. 50 of 55 payloads byte-identical; the rest were the machinery-measuring fields | 1–2 d |
| ~~**3**~~ | ~~Resolve the six machinery-measuring modules~~ — **done**. M39/M49's self-description fields deleted in step 2; M10/M12/M17/M47 retired | 1 d + decisions |
| ~~**4**~~ | ~~Carry full rows into graph metadata~~ — **done**, 51/51 analyses unchanged | 0.5 d |
| ~~**5**~~ | ~~Rename every analysis off the M-numbers~~ — **done**. The collision in §1 no longer exists | 0.5 d |
| ~~**6**~~ | ~~Fix M40's constant dimensions and the shadowed `/truth` route~~ — **done**, see §9 | 0.5 d |
| ~~**7**~~ | ~~Create `backend/domain/`; fold in the dataset and its analyses; rewire `voice.js`~~ — **done**, but see the note below: the surface exists, the second loader does not yet | 2–4 d |
| ~~**8**~~ | ~~Collapse the second loader~~ — **done**. Migrating the remaining routes to the domain layer is the long tail | long tail |

### Step 7 landed the surface, not the consolidation

`backend/domain/` now exists and is the single import for organizational
intelligence: `loadDataset()`, the seven dataset analyses, and `graph.run()`
re-exported from the brain. `constitutional.js`, `voice.js` and the tests go
through it. `domain/README.md` states the boundary rule.

Two real reductions came with it: `dataset.js` dropped its own `owners` read and
now uses the shared `lib/ownerBackups.js` helper — it had been keying on
`owners.name` while `agents.js`, `dependencies.js` and `decisionIntelligence.js`
keyed on `owners.employee_id`, two strategies for one concept. They agreed on all
40 employees, so the switch is provably output-identical, and the table read went
14 → 13.

### Step 8 closed it (2026-08-24)

`graphLoader` took over `owners` (via the shared `lib/ownerBackups.js` helper),
`tool_backups`, `agent_platform` and `workflow_tool_dependencies`, and now
attaches per-asset `documented`, `backup_owner`, `backupTool`, `agentsUsing` and
`workflowsUsing` to the entities themselves. `dataset.js` derives its whole shape
from that graph and queries only `decision_history`, `documentation_trend` and
`snapshots`.

| | Tables read | Overlap |
|---|---|---|
| `graphLoader` | 16 + `owners` via the helper | — |
| `dataset.js` | 3, all temporal | **none** |

Previously 27 reads with eight tables in common. Verified: the dataset output is
byte-identical to the previous implementation, and all 51 graph analyses are
unchanged.

⚠ **`agent_platform` and `workflow_tool_dependencies` are attached as metadata,
not as `depends_on` edges.** Modelling them as edges would be more correct — they
are dependency data and the dependency graph lacks them — but it would move every
cascade, SPOF and centrality number the analyses produce. That is a change to
what the graph *means*, not to where data is loaded from, so it was kept out of a
consolidation commit. It is now the highest-value improvement to the graph's
accuracy, and it is recorded in `domain/README.md`.

**Steps 1–6 are ~4 days and deliver most of the value.** Steps 7–8 are the
consolidation proper.

## 8. Explicitly not doing

- **Not rewriting the module bodies** — with the single exception of the six in
  §6.1, which are coupled to runtime internals that are being deleted and have to
  be resolved. The other 49 are tested and correct: they are called differently,
  not changed.
- **Not moving cost/adoption/time-series analysis into the graph.** SQL is the
  right tool; the boundary in §4 is deliberate.
- **Not touching `data/company.json` or W2.** Wiring the authored dataset in is
  separate work. After step 1, that file has no readers at all — note it.
- **Not building the W6 honesty layer here.** Related but separate; see §9.

## 9. Known defects to fix in passing

**All three RESOLVED 2026-08-24** (step 6). Originally recorded as:

1. `constitutional.js` M40 has two constant dimensions — "Decision reversibility"
   is permanently `0` (`orgDataset`'s `decisions_log` has no `reversible` field)
   and "Incident lessons captured" is permanently `100` (`incidents` is hardcoded
   `[]` and the code's `: 100` fallback treats absence as perfect). Half that
   alignment score is unrelated to the organization.
2. `constitutional.js`'s `/truth` (M46) is unreachable — shadowed by the earlier
   `/api/intelligence/truth` mount at `index.js:68`.
3. `frontend/lib/api.ts` marks `/alignment`, `/advisor` and `/capability` as
   `NOT MOUNTED`. They are mounted.

Defect 1 is the same bug class as the M42 fix in `ab0524c`: absence rendered as a
confident number. Expect more of them, and treat §6.1 as the same family.

**Fixes.** "Decision reversibility" was removed — no source exists or is planned.
Every remaining dimension now scores `null` when its source is empty and is
excluded from the average rather than folded in at 100; with no data at all the
result is `alignment: null, state: 'NO_SIGNAL'`. Previously an organization with
zero workflows, zero decisions and zero incidents scored **100/ALIGNED**.

⚠ **On live data the score moved 67/PARTIAL → 84/ALIGNED.** It rose because the
permanent 0 was dragging it down, not because anything improved. The 67 was the
mean of two real dimensions and two fabrications; 84 is the mean of the two that
carry data, with the third reported as unknown.

The shadowed `/truth` route was deleted (`truthIntelligence()` itself is kept —
`autonomousAdvisor()` gates on it), and `api.ts`'s stale `NOT MOUNTED` comments
were corrected.

To make the fix testable the pure analyses moved out of the route file into
`lib/orgAnalyses.js` — a down payment on step 7, which folds them into the domain
layer.

## 10. Verification

- The existing suites must stay green throughout: `brain.smoke`, `graph.unit`,
  `culture.unit`, `graphLoader.live`, `intelligence.verify`, `auth.unit`.
  `brain.smoke` and `intelligence.verify` assert boot-report and execution-engine
  behaviour and will need rewriting in step 2 — **rewrite them to assert the same
  outcomes through the new call path, do not delete the assertions.**
- Before and after each step, run the full 55-analysis pass against the live
  graph and diff the payloads. Any change must be explainable; unexplained
  changes are regressions.
- `tsc --noEmit` clean; the eight Org Science cards keep rendering the same
  numbers except where §6.1 deliberately changes them.

## 11. Open questions

1. ~~**§6.1, per module** — retire M10/M12/M17/M47, or re-point them?~~
   **RESOLVED: all four retired** (§6.1). The SQL layer already answers their
   questions from real tables.
2. ~~**Python layer** — delete, or move to `prototype/`?~~ **RESOLVED: deleted**
   in step 1.
3. **`brainCore.js` / `orchestrator.js`** — they compute an "organizational
   intelligence score" from snapshot tables, independently of both other layers.
   In scope for the domain layer eventually, but not addressed here.
