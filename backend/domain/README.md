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

## ⚠ What is not done yet

**This establishes the surface; it does not yet remove the second loader.**
`dataset.js` reads thirteen tables of its own, eight of which `graphLoader` also
reads, so two loaders still build a whole-organization view and could drift.

Collapsing them is **step 8**, and it is contained now because only this directory
has to change:

1. Extend `graphLoader` with `owners`, `tool_backups`, `agent_platform` and
   `workflow_tool_dependencies`.
2. Attach per-asset `documented` and `backup_owner` to asset entities — today
   those come from joins only `dataset.js` performs.
3. Derive `dataset.js`'s shape from the graph, keeping SQL only for
   `decision_history`, `documentation_trend` and `snapshots` — the temporal
   tables the graph legitimately cannot hold.

Until then the pipeline count is **three**, not two: direct SQL in 49 route
files, the graph, and this dataset loader.
