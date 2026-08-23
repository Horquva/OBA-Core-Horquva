# Organizational Brain — analysis library (`backend/brain/`)

Builds the organizational Knowledge Graph from Supabase and runs the 55
analyses (M01–M55) over it.

**It is a library, not a service.** Nothing is mounted; there is no `/api/brain`.
Routes call it directly:

```js
const brain = require('../../brain')

await brain.loadGraph()              // build from Supabase, swap in atomically
const intel = await brain.run('M42') // one analysis + its dependencies
```

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
| `run(code, context)` | One analysis. Its declared dependencies run first, so `context.priorIntel` is populated. |
| `runMany(codes, context)` | Several analyses in constitutional order, plus a fused confidence. |
| `resolveOrder(codes)` | The execution order, dependencies included. |
| `MODULES` | The locked M01–M55 catalog. |

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
| `data/constitutional-modules.js` | The M01–M55 catalog: names, owners, dependencies |
| `modules/implementations.js` | All 55 analyses |
| `modules/analytics.js` | Shared graph algorithms — SPOF, centrality, cycles, transitive deps |

## Two things that survived the runtime, because they are behaviour

**Dependency ordering.** Six analyses (M11, M23, M24, M48, M50, M55) read prior
analyses' output through `context.priorIntel` and return different answers
without it. `run()` resolves and executes the dependency chain first. The
ordering is byte-identical to the retired engine's — Kahn's algorithm with a
sorted queue.

**The two constitutional rules.** Truth (M46) runs before the Advisor (M48),
which it gates. Meta-Brain (M55) always runs last, because it fuses everything.

## Known gaps

**Seven analyses used to read runtime internals, not organizational data.**
M10, M12, M17, M47 and M46 read a log of *Brain runs* — how much the brain had
been used, not what the organization did. M39 and M49 reported the registry's
own size and the runtime's health. All are null-guarded and now return empty for
those fields; M39's and M49's were deleted outright. Whether to retire the other
four or re-point them at `decision_history` / `workflow_failures` /
`documentation_trend` is open question 1 in the design document.

**The graph is a lossy projection.** `graphLoader` drops `cost`, `usage_count`,
`adoption_pct`, `last_used` and every timestamp, and the graph has no time
dimension. Cost, adoption and trend questions belong in SQL — that boundary is
deliberate — but the dropped fields are not, and carrying full rows through is
step 4 of the design.

**Five ontology types have no source.** `system`, `team`, `customer`, `process`
and `project` are defined and queried but no Supabase table supplies them, so
they are absent rather than approximated. M39's empty `systemCapabilities` and
M31's empty `externalActors` are correct until W2 wires `data/company.json` in.
