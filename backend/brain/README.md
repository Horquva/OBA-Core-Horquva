# Organizational Brain — analysis library (`backend/brain/`)

Builds the organizational Knowledge Graph from Supabase and runs the 23
analyses over it. (The catalog is numbered M01–M55; 32 codes have been
retired across three passes — see Known gaps.)

**It is a library, not a service.** Nothing is mounted; there is no `/api/brain`.
Routes call it directly:

```js
const brain = require('../../brain')

await brain.loadGraph()                   // build from Supabase, swap in atomically
const intel = await brain.run('culture')  // one analysis + its dependencies
```

Analyses are addressable by a readable slug derived from the catalog name
(`'culture'`, `'ownership'`) or by their catalog code (`'M42'`). The code stays
canonical — `dependsOn` and the ordering rules key on it — but route files read
better with the name.

**M01–M55 belongs to this catalog and nothing else.** The dataset analyses in
`domain/analyses.js` used to claim M36/M38/M39/M40/M46/M48/M54 as well, so
"fix M39" had two possible meanings; they were renamed for what they compute.

This replaced a 1,154-line constitutional runtime — execution engine, event bus,
communication layer, module and capability registries, brain state manager,
intelligence bus and an `/api/brain` surface. None of it had a consumer outside
its own self-description. See
[the design document](../../docs/superpowers/specs/2026-08-24-brain-as-library-design.md).

## API

| Function | Purpose |
|---|---|
| `loadGraph()` | Build the graph from Supabase and swap it in. Throws on failure, leaving any previous graph in place. |
| `setGraph(g)` | Use an already-built graph (tests, fixtures). `graphSource().live` stays `false`. |
| `getGraph()` / `isReady()` | The current graph, and whether one is loaded. |
| `graphSource()` | Provenance — `{ live, stats, loadedAt, error }`. **Check this before trusting an answer.** |
| `run(id, context)` | One analysis, by slug (`'culture'`) or code (`'M42'`). Its declared dependencies run first, so `context.priorIntel` is populated. |
| `runMany(ids, context)` | Several analyses in dependency order, plus a fused confidence. |
| `resolveOrder(ids)` | The execution order (always codes), dependencies included. |
| `toCode(idOrSlug)` | Resolve a slug or code to the canonical code; `null` if unknown. |
| `MODULES` | The analysis catalog — 23 entries. |

## Files

| File | Role |
|---|---|
| `index.js` | The library: graph lifecycle, dependency ordering, `run` / `runMany` |
| `knowledge/graphLoader.js` | Supabase → Knowledge Graph. **The one place organizational data enters.** |
| `knowledge/knowledgeGraph.js` | The graph: traversal, dependency paths, context search |
| `knowledge/entityRegistry.js` | Every organizational object exists once |
| `knowledge/relationshipRegistry.js` | Relationships as first-class assets; no dangling edges |
| `knowledge/intelligenceExchange.js` | The package shape every analysis returns, plus confidence fusion |
| `data/ontology.js` | One constitutional meaning per entity and relationship type |
| `data/constitutional-modules.js` | The analysis catalog: names, owners, dependencies |
| `modules/implementations.js` | All 23 analyses |
| `modules/analytics.js` | Shared graph algorithms — SPOF, centrality, cycles, transitive deps |

## What survived the runtime, because it is behaviour

**Dependency ordering.** `run()`/`runMany()` resolve and execute an analysis's
declared prerequisites first, so `context.priorIntel` is populated by the time
it runs — Kahn's algorithm with a sorted queue, byte-identical to the retired
engine's. As of the 2026-09-02 retirements (below), none of the 23 remaining
modules actually read `context.priorIntel` themselves — the six that did
(M11, M23, M24, M48, M50, M55) were retired along with it. The mechanism is
kept because `dependsOn` still expresses genuine prerequisite structure (e.g.
M28 Universal Dependency Graph needs M02 Dependency + M34 Hidden Dependency
computed first) and a future module may need cross-module composition again;
today it determines execution order, not what any module reads.

**The two constitutional ordering rules — Truth (M46) gates the Advisor (M48),
Meta-Brain (M55) runs last — were retired with those three modules.** See
`data/constitutional-modules.js`'s header for why: each had a richer,
already-live SQL/`domain/derived.js` answer to the same question, so the rule
had nothing left to gate.

## Known gaps

**Four analyses were retired on 2026-08-24, taking the catalog from 55 to 51.**
M10 Organizational Memory, M12 Forecasting, M17 Organizational Learning and M47
Continuous Learning all read a log of *Brain runs* — how much the brain had been
used, not what the organization did. M47's own constitutional question was "How
does the Brain improve continuously?". Every question they claimed is already
answered from real tables by `/api/learning` (`/failures`, `/decisions`),
`/api/forecast` and `/api/memory`. Nothing depended on them.

**A further 27 were retired on 2026-09-02, taking the catalog from 51 to 24:**
M05, M06, M08, M09, M11, M13, M14, M15, M16, M21, M22, M23, M24, M25, M26, M27,
M33, M36, M38, M46, M48, M50, M51, M52, M53, M54, M55. Each was audited against
the live SQL / `domain/derived.js` system already answering the same-sounding
question and found redundant with something richer and already shipping —
verified by reading both implementations, not just matching names. Two
findings from that audit are worth keeping in mind if this catalog grows again:

- M52/M53 duplicated *other brain modules* (M19, M18), not just SQL — the
  catalog had internal duplication too, not only overlap with the SQL layer.
- The M46→M48→M55 chain is retired as a *public-facing* concept because all
  three stages already have richer live answers elsewhere (`truth.js`'s real
  claims-verification system, M04's 8-rule recommendation engine, and two
  existing fusion systems — `orchestrator.js` and `brainCore.js`) — not
  because verification, advice, or fusion aren't real organizational
  questions. If this catalog's fusion behaviour is ever needed again, prefer
  extending one of the two live fusion systems over reviving M55.

**One more, M30 Knowledge Concentration, was found and retired later the same
day (24 → 23),** while auditing the 24 survivors for live wiring rather than
just SQL duplication. Its `ownershipConcentration()` was a flat asset count
per owner; `domain/derived.js`'s `knowledgeConcentration()`, already live at
`GET /api/knowledge/intelligence`, is criticality-*weighted* and answers the
exact same question ("Where is knowledge dangerously concentrated?") with a
strictly richer signal. `analytics.js`'s `ownershipConcentration()` was
deleted with it — nothing else called it.

**That same audit found five of the 24 survivors had real capability nothing
else computes but no route calling them: M28, M29, M31, M34, M35.** Each is
now live under `routes/intelligence/reality.js` (`/api/intelligence/
dependency-graph`, `/relationships`, `/ecosystem`, `/hidden-dependencies`,
`/network-centrality`). A second look at the rest found five more whose
nearest SQL analogue reads only one source table, where `graphLoader.js`
unifies several into the `depends_on`/`owns`/`governs` edges these modules
read — a genuine, not just presentational, difference in coverage: M02/M03
(vs. the single-table, agent-scoped `GET /api/dependencies` and
`GET /api/risks`), M07 (vs. `GET /api/tool-intelligence`, which is
`ai_platforms` only and never covers automation agents), M32 (vs. the
agent-only `GET /api/dependencies/agent-spofs`), and M49 (a full graph
snapshot; nothing else returns one).

**A final completeness pass checked the last two reality-layer modules —
M01, M20 — and found the same-named SQL surface answers a structurally
different question, not a narrower version of the same one.** M01
(ownership) is asset-first: every asset, owned or not, across every asset
type. `GET /api/ownership` is owner-first and agent-scoped for its primary
listing, so it cannot surface a zero-owner asset by construction. M20
(accountability) is org-chart reporting structure (`reports_to`/`manages`
edges). `GET /api/accountability/*` is a RACI system (Responsible/
Accountable/Consulted/Informed per entity, from `accountability_links`) —
the same word, a genuinely different structure, the same distinction API-2
already drew between M39/M40 and their SQL namesakes.

M01/M02/M03/M07/M20 joined M28/M29/M31/M34/M35 in `reality.js`; M32/M49 are
in `routes/intelligence/prediction.js` alongside the rest of the
Tahir/Kamran layer. All twelve now have their own card on the Org Science
page (`frontend/app/org-science/page.tsx`'s "Knowledge Graph — Structural
Intelligence" grid).

All three retirement passes, and both wiring passes, are recoverable from git
history.

M39's `brainConstitutionalCapabilities` (the registry's own size) and M49's
`runtimeHealth` were self-description and were deleted with the original
runtime.

**The graph has no time dimension.** Entities carry their full source row now,
including timestamps like `last_used` and `hire_date` — but a timestamp field is
not a temporal model. The graph is a snapshot of *now*; nothing records what
changed. Trend questions belong in SQL, and recording change is BUILD_SPEC W5.
(M33 Dependency Evolution was one of the 2026-09-02 retirements for exactly
this reason — it computed a current-state snapshot and labelled it a "trend.")

**Two ontology types have no source.** `team` and `project` are defined and
queried but no Supabase table supplies them, so they are absent rather than
approximated. `system`, `customer`, `process` and `vendor` were wired in W-J
(`systems`/`system_dependencies`/`system_agent_usage`, `accountability_entities`,
and `external_entities`/`external_entity_supplies` respectively — see
graphLoader.js's own header) and are no longer part of this gap.
