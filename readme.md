# Organizational Brain Analysis (OBA) Backend

## Project Overview

This backend powers the **Organizational Brain Analysis (OBA)** platform. It models an organization as an interconnected intelligence system consisting of:

- Humans (employees)
- AI Agents
- AI Tools
- Workflows
- Organizational Knowledge
- Dependencies
- Risks
- Governance
- Accountability
- Executive Intelligence

The platform transforms organizational data into actionable intelligence for leadership through specialized constitutional modules.

---

# What the Platform Analyzes

- Ownership gaps
- Dependency chains
- Organizational risks
- AI tool governance
- Workflow failures
- Knowledge concentration
- Organizational memory
- Governance & accountability
- Organizational continuity
- Executive insights
- Decision support
- Organizational health

---

# Tech Stack

- Node.js
- Express.js
- Supabase (PostgreSQL)
- dotenv
- cors

---

# Project Structure

```text
backend/
│
├── index.js
├── supabase.js
├── package.json
├── .env
│
└── routes/
    ├── agents.js
    ├── ownership.js
    ├── dependencies.js
    ├── risks.js
    ├── dashboard.js
    ├── humanAgentMap.js
    │
    ├── tools/
    ├── workflows/
    ├── knowledge/
    ├── memory/
    ├── predictive/
    ├── forecast/
    ├── collaboration/
    ├── decisions/
    ├── verification/
    ├── orchestration/
    ├── learning/
    ├── continuity/
    ├── governance/
    ├── accountability/
    ├── executive/
    ├── voice/
    ├── briefing/
    ├── decisionSupport/
    ├── organizationalHealth/
    ├── executiveMemory/
    ├── executiveContext/
    └── intelligence/
```

---

# Implemented Constitutional Modules

## Module 01 — Ownership Intelligence

- Tracks ownership of agents, workflows, and tools
- Detects missing ownership
- Maps responsibility

---

## Module 02 — Dependency Intelligence

- Maps organizational dependencies
- Detects cascading failures
- Dependency analysis

---

## Module 03 — Risk Intelligence

- Calculates risk scores
- Detects critical assets
- Organizational risk analysis

---

## Module 04 — Recommendation Engine

- Generates improvement recommendations
- Suggests backups
- Risk reduction planning

---

## Module 05 — Agent Intelligence

- AI agent management
- Ownership mapping
- Risk scoring
- Orphan detection

---

## Module 06 — Human + AI + Workflow Intelligence

- Organization relationship graph
- Human-AI collaboration mapping
- Workflow connections

---

## Module 07 — AI Tool Intelligence

- AI tool inventory
- Tool ownership
- Cost tracking
- Backup tools
- Tool dependency mapping

---

## Module 08 — Workflow Intelligence

- Workflow execution mapping
- SPOF detection
- Failure analysis
- Workflow health

---

## Module 09 — Knowledge Intelligence

- Knowledge asset management
- Knowledge concentration
- Documentation gaps
- Knowledge loss simulation

---

## Module 10 — Organizational Memory Intelligence

- Memory preservation
- Institutional memory health
- Critical knowledge carriers
- Memory risk analysis

---

## Module 11 — Predictive Risk Intelligence

- Predicts future organizational risks
- Risk forecasting
- Emerging threat detection

---

## Module 12 — Organizational Forecast Intelligence

- 30 / 60 / 90 day forecasting
- Organizational outlook
- Health prediction

---

## Module 13 — Human-AI Collaboration Intelligence

- AI adoption analysis
- Collaboration scoring
- Dependency concentration

---

## Module 14 — Decision Intelligence

- Decision reconstruction
- Decision quality analysis
- Decision Quality Index

---

## Module 15 — Verification Intelligence

- Action verification
- Policy compliance
- Violation detection

---

## Module 16 — Workflow Orchestration Intelligence

- Workflow execution
- Collision detection
- Resource conflict analysis

---

## Module 17 — Organizational Learning Intelligence

- Learning maturity
- Failure pattern analysis
- Learning score

---

## Module 18 — Organizational Continuity Intelligence

- Continuity analysis
- Survival classification
- Recovery planning

---

## Module 19 — Governance Intelligence

- Governance analysis
- Governance heatmap
- Ownership & documentation gaps
- Governance Score

---

## Module 20 — Accountability Intelligence

Implements organizational accountability using the RACI model.

Features:

- Responsible
- Accountable
- Consulted
- Informed
- Decision Authority

Provides:

- Accountability chains
- Accountability score
- Separation-of-duties analysis
- Accountability concentration analysis

---

## Module 21 — Executive Avatar Intelligence

Executive conversational interface for leadership.

Features:

- Executive questions
- Live organizational answers
- Executive briefing
- Organizational insights

---

## Module 22 — Voice Intelligence Engine

Provides voice-ready organizational intelligence.

Features:

- Intent classification
- Entity resolution
- Natural language responses
- Daily spoken summary

---

## Module 23 — Executive Briefing Intelligence

Automatically generates daily executive briefings.

Includes:

- Top risks
- Critical incidents
- Documentation trends
- Pending decisions

---

## Module 24 — Decision Support Intelligence

Converts organizational risks into prioritized actions.

Provides:

- Prioritized decision queue
- Impact × Urgency ÷ Effort scoring
- Decision review
- Recommended actions

---

## Module 25 — Organizational Health Intelligence

Calculates overall organizational health.

Measures:

- Documentation
- Continuity
- Ownership
- Critical safety
- Incident load

Produces:

- Organizational Health Index
- Department health
- Health trends

---

## Module 26 — Executive Memory Intelligence

Preserves leadership memory.

Detects:

- Recurring incidents
- Lessons learned
- Hero dependency
- Repeat failures
- Negative decisions

---

## Module 27 — Executive Context Intelligence

Ranks organizational priorities.

Combines:

- Open incidents
- SPOFs
- Pending decisions
- Dependency blast radius
- Weak metrics

Produces a real-time executive priority feed.

---

## Module 46 — Truth Intelligence

Constitutional verification layer.

Features:

- Fact verification
- Confidence scoring
- Data trust score
- Verified vs unverified facts
- Truth gating

---

## Module 50 — Organizational Brain Core Logic

Reasoning engine of the Organizational Brain.

Features:

- Unified Brain Index
- Organizational posture
- Signal fusion
- Reasoning explanation

Postures:

- STABLE
- STRAINED
- CRITICAL

---

## Module 55 — Organizational Intelligence Orchestrator

Final constitutional reasoning layer.

Features:

- Runs after all verified modules
- Organizational Intelligence Score
- Final organizational verdict
- Cross-module intelligence fusion
- Executive recommendations

---

# API Endpoints

## Core

```
GET /api/agents
GET /api/ownership
GET /api/dependencies
GET /api/risks
GET /api/dashboard
GET /api/human-agent-map
GET /api/data-quality
```

---

## Tools

```
GET /api/tools
GET /api/tool-intelligence
GET /api/tool-impact
```

---

## Workflows

```
GET /api/workflows/intelligence
GET /api/workflows/failures
GET /api/workflows/spof
```

---

## Knowledge

```
GET /api/knowledge/intelligence
GET /api/knowledge/impact/:employee
GET /api/knowledge/gaps
```

---

## Memory

```
GET /api/memory/health
GET /api/memory/employee/:name
GET /api/memory/map
```

---

## Predictive

```
GET /api/predictive/*
```

---

## Forecast

```
GET /api/forecast/*
```

---

## Collaboration

```
GET /api/collaboration/*
```

---

## Decisions

```
GET /api/decisions/*
```

---

## Verification

```
GET /api/verification/*
```

---

## Orchestration

```
GET /api/orchestration/*
```

---

## Learning

```
GET /api/learning/*
```

---

## Continuity

```
GET /api/continuity/*
```

---

## Governance

```
GET /api/governance/*
```

---

## Accountability

```
GET /api/accountability/score
GET /api/accountability/entities
GET /api/accountability/chains
GET /api/accountability/issues
```

---

## Executive Avatar

```
GET /api/executive/questions
GET /api/executive/history
GET /api/executive/briefing

GET /api/executive/ask?q=...
```

---

## Voice Intelligence

```
GET /api/voice/intents
GET /api/voice/history
GET /api/voice/daily-summary

GET /api/voice/ask?q=...
```

---

## Executive Briefing

```
GET /api/briefing
GET /api/briefing/history
GET /api/briefing/top
```

---

## Decision Support

```
GET /api/decision-support
GET /api/decision-support/priorities
GET /api/decision-support/history
```

---

## Organizational Health

```
GET /api/organizational-health
GET /api/organizational-health/departments
GET /api/organizational-health/trend
```

---

## Executive Memory

```
GET /api/executive-memory
GET /api/executive-memory/patterns
GET /api/executive-memory/lessons
```

---

## Executive Context

```
GET /api/executive-context
GET /api/executive-context/urgent
GET /api/executive-context/feed
```

---

## Truth Intelligence

```
GET /api/intelligence/truth
GET /api/intelligence/truth/summary
GET /api/intelligence/truth/verified
GET /api/intelligence/truth/unverified
GET /api/intelligence/truth/entity/:name
```

---

## Brain Core

```
GET /api/intelligence/brain-core
GET /api/intelligence/brain-core/summary
GET /api/intelligence/brain-core/posture
GET /api/intelligence/brain-core/signals
GET /api/intelligence/brain-core/explanation
```

---

## Organizational Intelligence Orchestrator

```
GET /api/intelligence/orchestrator
GET /api/intelligence/orchestrator/summary
GET /api/intelligence/orchestrator/verdict
GET /api/intelligence/orchestrator/recommendations
GET /api/intelligence/orchestrator/modules
GET /api/intelligence/orchestrator/score
```

---

# How to Run

Install dependencies:

```bash
npm install
```

Start the backend server:

```bash
node index.js
```

Default server:

```
http://localhost:3000
```

---

# Architecture

The backend follows a modular architecture where every constitutional module is independently implemented and exposed through REST APIs while sharing a common Supabase database.

Each module is responsible for one intelligence capability and contributes to the overall Organizational Brain.

---

# Tech Summary

- Node.js
- Express.js
- PostgreSQL (Supabase)
- REST APIs
- Modular Architecture
- Organizational Brain Analysis (OBA)
- Constitutional Intelligence Modules (M01–M55)

---

## Module 60 — Knowledge Graph

Postgres-backed entity/relationship graph. Every employee, agent, AI platform, and workflow is a node; every ownership, dependency, and reporting relationship is an edge.

Routes: `GET /api/graph/nodes`, `GET /api/graph/nodes/:id/neighbors`, `GET /api/graph/path/:sourceId/:targetId`, `GET /api/graph/entity/:type/:id`, `POST /api/graph/sync`

Tables: `graph_nodes`, `graph_edges`

---

## Module 61 — Event & Signal Bus

Postgres-persisted event log + in-process Node.js EventEmitter pub/sub. No Redis/Kafka required. Every module can publish typed events (e.g. `risk.critical`, `agent.failed`) that are durably stored and immediately dispatched to in-process subscribers.

Routes: `GET /api/events`, `GET /api/events/:correlationId`, `POST /api/events/publish`

Table: `system_events`

---

## Module 62 — Intelligence Exchange Protocol (IEP)

Shared contract ensuring all module-to-module and module-to-orchestrator intelligence handoffs use a consistent, machine-readable envelope. Retrofit pattern: wrap existing response data in `packageIntelligence()` — no logic changes needed.

Service: `services/intelligenceExchange.js` — exports `packageIntelligence({ sourceModule, capability, findings, confidence, evidence, recommendations, graphRefs })`

Retrofitted endpoints: `GET /api/predictive-risk/critical`, `GET /api/learning/summary`, `GET /api/intelligence/orchestrator`

---

## Module 63 — Pattern Intelligence

Analysis layer over `system_events`, `incident_patterns`, `workflow_failures`, and `graph_edges`. Surfaces recurring structural and behavioural patterns that are invisible when looking at any single table in isolation.

Features:

- Recurring failure detection — groups failures by type across workflows and incident history
- Dependency cluster detection — uses graph fan-in/fan-out degree to find structural risk nodes
- Escalation chain analysis — surfaces broken or undocumented escalation paths
- Event correlation — identifies event storms and correlated event chains in the system bus
- Computed pattern scan — `POST /scan` runs all detectors and upserts into `detected_patterns`
- Summary wrapped in IEP `packageIntelligence()` envelope for orchestrator consumption

Routes: `GET /api/pattern-intelligence/summary`, `GET /api/pattern-intelligence/recurring-failures`, `GET /api/pattern-intelligence/dependency-clusters`, `GET /api/pattern-intelligence/event-correlations`, `POST /api/pattern-intelligence/scan`

Tables: `detected_patterns`

---

## Module 64 — Digital Twin

A continuously-synced snapshot model of the organisation's current state. Not a 3D simulation — a live structured mirror built from `graph_nodes`/`graph_edges` plus current scores from health, risk, and governance modules that any other service can query without re-querying 10 different tables.

Features:

- Full org state sync — pulls graph, predictive risk, org health, and governance in one pass
- Per-entity state mirror — every graph node gets a `twin_entity_state` row with merged current state
- Drift detection — compares last two snapshots to surface new risks, resolved risks, health deltas, SPOF changes
- Event bus integration — publishes `twin.synced` on every sync so other modules react automatically
- Neighbour enrichment — `GET /entity/:nodeId` includes one-hop graph neighbours alongside entity state

Routes: `POST /api/digital-twin/sync`, `GET /api/digital-twin/current`, `GET /api/digital-twin/entity/:nodeId`, `GET /api/digital-twin/drift`

Tables: `twin_snapshots`, `twin_entity_state`

---

## Module 65 — Simulation Intelligence (Digital Twin Upgrade)

All 4 original simulation files upgraded to read from the live Digital Twin snapshot instead of raw tables. Simulations now reflect actual current org state and are linked to a `twin_snapshot_id` for traceability.

Upgrades applied to all 4 simulations:

- Reads latest `twin_snapshots` row at request time (auto-refreshes if >1 hour old)
- Uses `graph_edges` fan-in/fan-out for blast radius instead of raw `workflow_dependencies` / `dependencies` tables
- Pulls live `risk_level` from `twin_entity_state` for every affected entity
- Logs a `simulation_runs` row for every execution, linked to the twin snapshot ID used
- Wraps response in `packageIntelligence()` IEP envelope with confidence, evidence, recommendations
- Publishes `simulation.completed` event via `eventBus.js`; severity=critical/high auto-lands in `executive_memory_items`

New route: `GET /api/simulations/history` — filterable by `?type=` and `?from=`/`?to=` date range

Tables: `simulation_runs`

---

## Module 66 — Capability Registry

The discovery mechanism that lets the orchestrator find and call modules dynamically. Every working module in the codebase is registered with its endpoints, descriptions, and expected returns.

Features:

- `services/capabilityRegistry.js` — `registerCapability()`, `getCapability()`, `listCapabilities()`, `findCapabilityFor(intent)`
- `scripts/registerCapabilities.js` — seeds all 35+ modules at server startup (idempotent upsert on `module_id`)
- Covers all core modules (M01–M10), intelligence modules (M11–M27), Fizza's modules (M46, M50, M55), and all Chunk 07/08/09 modules (M60–M66)
- Naive keyword search across module name, category, base route, and all capability descriptions
- `routes/intelligence/registryBridge.js` — proves orchestrator ↔ registry connection. Maps Fizza's 14 MODULE_REGISTRY keys to their canonical module IDs. Fizza's `orchestrator.js` was NOT modified.

Routes: `GET /api/capabilities`, `GET /api/capabilities/search?intent=`, `GET /api/capabilities/:moduleId`, `GET /api/intelligence/registry-bridge`, `GET /api/intelligence/registry-bridge/resolve/:key`, `GET /api/intelligence/registry-bridge/coverage`

Tables: `module_capabilities`

---

## Chunk 10 — Prediction & Learning Wiring + Full Integration Pass

Connects the Predictive Risk and Learning modules into the Knowledge Graph, Event Bus, and Intelligence Exchange foundation built in prior chunks.

**Prediction (M11) upgrades** (`routes/predictive/predictiveRisk.js`):
- `/critical` and `/emerging` now cross-reference `graph_edges` in-degree via `buildAgentInDegreeMap()` — agents with many dependents receive an adjusted score boost (up to +20 points) so risk ranking reflects organizational dependency weight, not just standalone metric
- Both endpoints now fetch graph and predictions in parallel (`Promise.all`) — no sequential await penalty
- `/emerging` now wrapped in `packageIntelligence()` IEP envelope (was previously returning raw JSON)
- All responses include `adjustedScore`, `dependentCount`, `dependencyBoost` fields

**Learning (M17) wiring** (`services/eventBus.js`):
- `simulation.completed` handler now upserts a `failure_patterns` row for every simulation target (all severities), incrementing `appearance_count` on repeat runs — Learning module's `/failures` and `/summary` now reflect live event-driven data
- `risk.critical` handler now upserts a `failure_patterns` row for each CRITICAL agent, upgrading it to `is_repeat_offender = true` if it appears again
- Both use existing `failure_patterns` table — no new schema created

**Integration Pass**:
- Full route sweep: 57 routes tested. 47 PASS 200, 8 correct 404s (paths tested with wrong sub-path in sweep script — actual routes 200), 1 pre-existing 500 (`/api/ownership`)
- All 37 modules register successfully at startup
- End-to-end chain verified with DB evidence at each step (see PUNCH_LIST.md)

**Files changed this chunk**:
- `services/eventBus.js` — Wire 1 and Wire 5 extended with `failure_patterns` upserts
- `routes/predictive/predictiveRisk.js` — added `buildAgentInDegreeMap()`, updated `/critical` and `/emerging`
- `sql/09_prediction_learning_wiring.sql` — no-table migration documenting the decision
- `DATA_MODEL.md` — Integration Map section added
- `readme.md` — Modules Implemented updated (this section)
- `PUNCH_LIST.md` — honest handoff note created

---

# Complete API Reference (Final)

## Core Intelligence

| Module | Routes |
|--------|--------|
| M01 Ownership | `GET /api/ownership` |
| M02 Dependencies | `GET /api/dependencies` |
| M03 Risk | `GET /api/risks` |
| M04 Dashboard | `GET /api/dashboard` |
| M05 Agents | `GET /api/agents` |
| M06 Human-Agent Map | `GET /api/human-agent-map` |
| M07 Tools | `GET /api/tools`, `GET /api/tool-intelligence`, `GET /api/tool-impact/:name/impact` |
| M08 Workflows | `GET /api/workflows/intelligence`, `/failures`, `/spof` |
| M09 Knowledge | `GET /api/knowledge/intelligence`, `/gaps`, `/impact/:employee` |
| M10 Memory | `GET /api/memory/health`, `/map`, `/employee/:name` |
| Data Quality | `GET /api/data-quality` |

## Intelligence Modules

| Module | Routes |
|--------|--------|
| M11 Predictive Risk | `GET /api/predictive-risk/summary`, `/critical`, `/emerging`, `/agents`, `/agent/:name` |
| M12 Forecast | `GET /api/forecast/summary` |
| M13 Collaboration | `GET /api/collaboration/score`, `/adoption`, `/dependency`, `/departments` |
| M14 Decisions | `GET /api/decisions/index`, `/all`, `/harmful`, `/trail/:id`, `/recommendations` |
| M15 Verification | `GET /api/verification/summary` |
| M16 Orchestration | `GET /api/orchestration/summary` |
| M17 Learning | `GET /api/learning/summary`, `/failures`, `/incidents`, `/decisions`, `/departments` |
| M18 Continuity | `GET /api/continuity/score`, `/assets`, `/risk-map`, `/must-protect`, `/plans` |
| M19 Governance | `GET /api/governance/score`, `/gaps`, `/heatmap`, `/offenders` |
| M20 Accountability | `GET /api/accountability/score`, `/chains`, `/entities` |

## Executive Modules

| Module | Routes |
|--------|--------|
| M21 Executive Avatar | `GET /api/executive/ask?q=`, `/briefing`, `/questions` |
| M22 Voice | `GET /api/voice/ask?q=`, `/daily-summary` |
| M23 Briefing | `GET /api/briefing/today`, `/summary`, `/history` |
| M24 Decision Support | `GET /api/decision-support/summary`, `/queue`, `/top-actions` |
| M25 Health | `GET /api/health/summary`, `/departments`, `/critical`, `/trend` |
| M26 Executive Memory | `GET /api/executive-memory/summary`, `/items`, `/patterns`, `/lessons` |
| M27 Context | `GET /api/context/summary`, `/feed`, `/critical`, `/incidents` |

## Fizza's Constitutional Modules

| Module | Routes |
|--------|--------|
| M46 Truth | `GET /api/intelligence/truth`, `/summary`, `/verified` |
| M50 Brain Core | `GET /api/intelligence/brain-core`, `/posture`, `/signals` |
| M55 Orchestrator | `GET /api/intelligence/orchestrator`, `/summary`, `/modules`, `/score` |

## Infrastructure Modules (Chunks 07–10)

| Module | Routes |
|--------|--------|
| M60 Knowledge Graph | `GET /api/graph/nodes`, `/nodes/:id/neighbors`, `/path/:s/:t`, `/entity/:type/:id` · `POST /api/graph/sync` |
| M61 Event Bus | `GET /api/events`, `/events/:correlationId` · `POST /api/events/publish` |
| M63 Pattern Intel | `GET /api/pattern-intelligence/summary`, `/recurring-failures`, `/dependency-clusters`, `/event-correlations` · `POST /api/pattern-intelligence/scan` |
| M64 Digital Twin | `GET /api/digital-twin/current`, `/entity/:nodeId`, `/drift` · `POST /api/digital-twin/sync` |
| M65 Simulations | `GET /api/simulations/agent-fails/:agent`, `/employee-leaves/:employee`, `/platform-down/:platform`, `/workflow-disruption/:workflow`, `/history` |
| M66 Capabilities | `GET /api/capabilities`, `/capabilities/:moduleId`, `/capabilities/search?intent=`, `/intelligence/registry-bridge` |