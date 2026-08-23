# Organizational Brain — analysis library (`backend/brain/`)

Builds the organizational Knowledge Graph from Supabase and runs the 51
analyses over it. (The catalog is numbered M01–M55; four were retired — see
Known gaps.)

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
| `MODULES` | The analysis catalog — 51 entries. |

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
| `modules/implementations.js` | All 51 analyses |
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

**Four analyses were retired, taking the catalog from 55 to 51.** M10
Organizational Memory, M12 Forecasting, M17 Organizational Learning and M47
Continuous Learning all read a log of *Brain runs* — how much the brain had been
used, not what the organization did. M47's own constitutional question was "How
does the Brain improve continuously?". Every question they claimed is already
answered from real tables by `/api/learning` (`/failures`, `/decisions`),
`/api/forecast` and `/api/memory`. Nothing depended on them.

M39's `brainConstitutionalCapabilities` (the registry's own size) and M49's
`runtimeHealth` were self-description and were deleted with the runtime. M46
still reads bus-derived package counts, which are now always empty — it is
otherwise graph-derived and was kept.

**The graph is a lossy projection.** `graphLoader` drops `cost`, `usage_count`,
`adoption_pct`, `last_used` and every timestamp, and the graph has no time
dimension. Cost, adoption and trend questions belong in SQL — that boundary is
deliberate — but the dropped fields are not, and carrying full rows through is
step 4 of the design.

**Five ontology types have no source.** `system`, `team`, `customer`, `process`
and `project` are defined and queried but no Supabase table supplies them, so
they are absent rather than approximated. M39's empty `systemCapabilities` and
M31's empty `externalActors` are correct until W2 wires `data/company.json` in.
