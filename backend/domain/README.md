# The domain layer (`backend/domain/`)

One import for organizational intelligence. Routes parse a request, call a domain
function, and shape a response. **They do not decide where an answer comes from.**

```js
const domain = require('../../domain')

const data   = await domain.loadDataset()          // the flat, asset-shaped view
const align  = domain.alignmentChecklist(data)     // an aggregate analysis
const intel  = await domain.graph.run('culture')   // a structural analysis
```

## The boundary

| | Technique | Because |
|---|---|---|
| **Structural** — ownership, dependency cascades, centrality, single points of failure, cycles | Knowledge Graph traversal | Graph traversal is the right tool; SQL is a poor one |
| **Aggregate & temporal** — cost, adoption, coverage percentages, month-over-month trends | SQL | The graph has no time dimension and is not going to grow one |

**Callers do not know or care which ran.** That is the point. Before this layer,
`M39` meant capability *counts* through the graph and per-department capability
*scores* through the dataset, and nothing said which a page had called.

## Files

| File | Role |
|---|---|
| `index.js` | The public surface. Read its header for the full rationale. |
| `dataset.js` | Assembles the flat organizational view from 13 Supabase tables |
| `analyses.js` | Seven pure functions of that shape |
| *(the graph)* | `../brain` — re-exported as `domain.graph` |

## Rules

**A new organizational number goes here, not in a route.** If a route computes
something about the organization beyond shaping a response, it belongs in this
directory instead.

**Absence is never a score.** A dimension with no data reports `null` and is
excluded from any average — never folded in as 0 or 100. Two live defects came
from breaking this: culture called all 40 people siloed when no collaboration
data existed, and alignment scored a company with no data at all as
`100 / ALIGNED`. See `analyses.js`'s `alignmentChecklist` and the brain's M42.

**One join per concept.** Backup coverage is `lib/ownerBackups.js`, keyed on
`owners.employee_id`. `dataset.js` used to key on `owners.name` instead — the two
agreed on all 40 employees, but two strategies for one concept is the drift this
layer exists to prevent.

## One loader

`dataset.js` does **not** query the organization for itself. It derives its shape
from the graph `graphLoader` already built, and queries SQL only for the three
tables the graph legitimately cannot hold — `decision_history`,
`documentation_trend`, `snapshots`.

| | Tables read | Overlap |
|---|---|---|
| `../brain/knowledge/graphLoader.js` | 16 + `owners` via the shared helper | — |
| `dataset.js` | 3 (all temporal) | **none** |

Before this, the two read 27 tables between them with **eight in common** — two
loaders building a whole-organization view from one database, free to drift. The
derivation was verified byte-identical against the previous implementation, and
all 51 graph analyses are unchanged.

## Resolved: two real dependency relationships are now edges

`agent_platform` (which agents use which platform) and
`workflow_tool_dependencies` (which workflows depend on which tool) used to be
loaded and attached to entities only as **metadata**, not as `depends_on`
edges — understating every cascade, single-point-of-failure and centrality
number the analyses produce. Both are now also modelled as real `depends_on`
edges (`workflow_tool_dependencies.is_critical` maps to edge criticality); the
metadata lookups (`agentsUsing`/`workflowsUsing`/`backupTool`) stay in place
since display code reads them directly.
