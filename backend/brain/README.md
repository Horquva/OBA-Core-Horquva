# Organizational Brain — Constitutional Runtime (`backend/brain/`)

This module is the real, running heart of the Horquva Organizational Brain. It
boots all **55 constitutional modules (M01–M55)**, builds the organizational
knowledge graph, and answers executive requests through a constitutional
execution pipeline.

It is split into the two ownership layers defined by the MVP Execution Guides:

## 1. Knowledge Platform — *Huzaifa* (`brain/knowledge/`)
The foundation: discovers organizational reality and stores it as one shared truth.

| Component | File | Role |
|---|---|---|
| Module Registry Loader | `moduleRegistry.js` | Auto-discovers & validates all 55 modules; rejects duplicates/invalid |
| Capability Registry | `capabilityRegistry.js` | Turns modules into discoverable organizational services |
| Intelligence Exchange Protocol | `intelligenceExchange.js` | The common language: validated Intelligence Packages + confidence propagation |
| Entity Registry | `entityRegistry.js` | Every org object exists once (Single Source of Truth) |
| Relationship Registry | `relationshipRegistry.js` | Relationships as first-class assets; no dangling edges |
| Unified Knowledge Graph | `knowledgeGraph.js` | Long-term memory: traversal, dependency paths, context search |
| Ontology Runtime | `data/ontology.js` | One constitutional meaning per concept & relationship |
| Graph APIs | `knowledge/graphApi.js` | The only gateway to knowledge (registry + graph + exchange) |

## 2. Brain Runtime — *Kamran* (`brain/runtime/`)
The engineering brain that makes the modules act as one organ.

| Component | File | Role |
|---|---|---|
| Event & Signal Bus | `eventBus.js` | Event-driven backbone; loose coupling + observability |
| Brain State Manager | `brainState.js` | Lifecycle phase, module health, executions, boot report |
| Constitutional Communication Layer | `communicationLayer.js` | No module talks directly; every call is routed + contract-checked |
| Brain Execution Engine | `executionEngine.js` | Capability discovery + topological dependency ordering + fusion |
| Organizational Brain Runtime | `runtime.js` | Boots the whole Brain; produces the **Boot Report** |
| Constitutional API Gateway | `runtime/brainApi.js` | Executive APIs: `/status`, `/boot-report`, `/ask`, `/plan`, `/signals` |

## Constitutional rules enforced
- **Truth (M46) gates Autonomous Advisor (M48)** — Truth always executes first.
- **Meta-Brain Orchestrator (M55) always runs last.**
- **Discovery before execution** — no module is ever hard-referenced.
- **Every result is a validated Intelligence Package** (source, type, confidence, evidence, timestamp).

## The source of truth
`data/constitutional-modules.js` is the LOCKED catalog of M01–M55 (names,
owners, layers, dependencies, capabilities). Everything discovers from here.

## Run standalone (Boot Report)
```bash
node backend/brain/boot.js
```
Expected: `Accepted: YES`, 55/55 modules, 55 capabilities, graph valid, and a
demo executive request executed in constitutional order.

## Runs inside the API server
`backend/index.js` mounts the Brain automatically at **`/api/brain`**:
```
GET  /api/brain/status
GET  /api/brain/boot-report
GET  /api/brain/registry/modules?owner=Huzaifa
GET  /api/brain/registry/capabilities?discover=risk
GET  /api/brain/graph/entities?type=system
GET  /api/brain/graph/traverse/:id?depth=2
GET  /api/brain/graph/dependency-path/:id
GET  /api/brain/graph/validate
POST /api/brain/plan   { "modules": ["M03","M48","M55"] }
POST /api/brain/ask    { "need": "risk", "context": { "role": "CEO" } }
```

## Where teammates plug in
- **Tahir (prediction M11–M13, M17, M32–M49):** bind real handlers via
  `communicationLayer.bindCapability(capabilityId, handler)`; publish results as
  Intelligence Packages — they auto-sync into the graph.
- **Anusha (executive M15,M16,M21,M23,M51–M53):** consume `/api/brain/*` for
  Executive OS, OBA, verification & automation.
- **Backend (Fizza/Shawal):** replace `graphSeeder.js` with live discovery /
  Supabase-Neo4j import; the graph contract stays identical.
- **Frontend:** consume `/api/brain/*` read APIs only (no business logic).
