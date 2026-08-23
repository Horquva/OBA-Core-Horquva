# Collapse the Brain from a Runtime into a Library

**Status:** proposed · **Date:** 2026-08-24 · **Branch:** `ocos/develop`

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
| The `M01`–`M55` identifiers | **Drop** | Functions get names: `culture(graph)`, `departmentCapability(data)` |

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

**Decision required per module: retire it, or re-point it at real data.**
`decision_history`, `workflow_failures` and `documentation_trend` are the
candidate real sources for learning-shaped questions. This is the one part of
the refactor that is not mechanical.

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
| **1** | Delete the Python layer | hours |
| **2** | Expose the 55 module bodies as directly-callable functions; delete `executionEngine`, `eventBus`, `communicationLayer`, `brainState`, `moduleRegistry`, `capabilityRegistry`, `brainApi`, `graphSeeder`. Replace `priorIntel` wiring with explicit composition (§6.3). `prediction.js` calls functions instead of `engine.execute` | 1–2 d |
| **3** | Resolve the six machinery-measuring modules (§6.1) | 1 d + decisions |
| **4** | Carry full rows into graph metadata (§6.2) | 0.5 d |
| **5** | Rename every analysis off the M-numbers; fix the stale `NOT MOUNTED` comments in `frontend/lib/api.ts` | 0.5 d |
| **6** | Fix `constitutional.js` M40's two constant dimensions and its shadowed `/truth` route (see §9) | 0.5 d |
| **7** | Create `backend/domain/`; fold in `orgDataset.js` and `constitutional.js`'s analyses; rewire `voice.js` | 2–4 d |
| **8** | Migrate routes to the domain layer, page by page | long tail |

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

Both verified against live data on 2026-08-24:

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

1. **§6.1, per module** — retire M10/M12/M17/M47, or re-point them at
   `decision_history` / `workflow_failures` / `documentation_trend`? Needs a
   product answer about what "organizational learning" should mean.
2. **Python layer** — delete outright, or move to `prototype/` with a README?
   Recommendation: delete; it is in git history.
3. **`brainCore.js` / `orchestrator.js`** — they compute an "organizational
   intelligence score" from snapshot tables, independently of both other layers.
   In scope for the domain layer eventually, but not addressed here.
