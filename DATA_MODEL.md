# Canonical Organizational Data Model

This document outlines the canonical data model used to power the Organizational Brain Analysis (OBA) platform. The model supports 20+ intelligence modules by providing a rich, interconnected graph of the organization.

## The 12 Canonical Entities

1. **Employees (Humans)**: The people in the organization (engineers, managers, executives).
2. **AI Platforms (Tools)**: The underlying AI services used (ChatGPT, Copilot, Midjourney).
3. **AI Agents**: Specialized AI applications owned by employees and used in workflows (DeployBot, SecurityScanner).
4. **Workflows**: Multi-step business or technical processes.
5. **Knowledge Assets**: Documentation, configurations, and institutional memory.
6. **Dependencies**: The graph edges connecting people, tools, agents, and workflows.
7. **Events & Incidents**: Outages, failures, or violations affecting the organization.
8. **Decisions**: Strategic choices made regarding ownership, backups, or risk mitigation.
9. **Snapshots**: Time-series captures of organizational health metrics.
10. **Governance Policies**: Rules and compliance standards governing tools and workflows.
11. **RACI Records**: Accountability mappings (Responsible, Accountable, Consulted, Informed).
12. **Recommendations**: System-generated suggestions to improve resilience and reduce risk.

---

## Core Database Schema (Supabase)

### `employees`
Tracks human capital, their roles, risk levels, skills, and workload.
- `id`, `name`, `role`, `department`
- `risk` (low, medium, high, critical)
- `tenure` (years)
- `skills` (text array)
- `workload` (0-100)
- `manager`, `hire_date`

### `ai_platforms`
The foundation AI tools purchased/used by the company.
- `id`, `name`, `type`, `status`
- `cost_monthly`, `usage_count`, `adoption_pct`, `last_used`

### `agents`
Specific implementations of AI tools managed by employees.
- `id`, `name`, `type`, `status`, `risk`
- `owner_id` (references `employees`)
- `usage_count`, `adoption_pct`, `last_used`, `cost`

### `workflows` & `workflow_steps`
Business processes and their constituent steps.
- **workflows**: `id`, `name`, `status`, `risk`, `department`, `frequency`
- **workflow_steps**: `id`, `workflow_id`, `step_number`, `step_name`, `actor_type` (human/agent/tool), `actor_name`

### `dependencies`
The edges of the organizational graph.
- `id`, `source_id`, `target_id`
- `source_type`, `target_type` (agent, workflow, platform, employee)
- `dependency_type` (critical, high, normal, low)
- `strength` (0-100)

### `knowledge_assets`
Documentation status and criticality.
- `id`, `asset_type`, `asset_id`, `topic`
- `is_documented` (boolean)
- `criticality`, `owner_id`

### `snapshots`
Monthly time-series data for forecasting.
- `snapshot_date`, `headcount`, `avg_workload`
- `total_tool_cost`, `risk_index`
- `memory_health`, `continuity_score`, `governance_score`

---

## Relational Junction Tables

- **`employee_agent`**: Maps employees to agents (roles: owner, operator, backup).
- **`agent_platform`**: Maps agents to the underlying AI platforms they consume.
- **`tool_ownership`, `tool_users`, `tool_backups`, `tool_policies`**: Extends platform metadata.
- **`workflow_dependencies`, `workflow_tool_dependencies`**: Links workflows to agents and tools.

---

## Intelligence Module Tables

The schema also includes specialized tables for the 20+ modules:
- **Risk & Forecasting**: `predictive_risk_scores`, `organizational_forecasts`, `forecast_findings`
- **Collaboration**: `collaboration_scores`, `collaboration_summary`
- **Decisions & Verification**: `organizational_decisions`, `decision_factors`, `verification_actions`, `policy_violations`
- **Orchestration**: `workflow_orchestration`, `workflow_failures`, `workflow_runbooks`
- **Continuity & Governance**: `continuity_assessments`, `continuity_plans`, `governance_assessments`, `governance_gaps`
- **Learning & Accountability**: `learning_snapshots`, `failure_patterns`, `department_exposure`, `accountability_entities`, `accountability_links`, `accountability_scores`, `accountability_summary`

## Data Quality validation

The system relies on the `validate.js` middleware and `/api/data-quality` route to ensure the integrity of the data across these tables, checking for issues like orphaned agents, undocumented knowledge, and workflows missing runbooks.

---

## Knowledge Graph Tables (Migration 05/06)

### `graph_nodes`
One node per organizational entity. Mirrors the actual source tables — sync via `POST /api/graph/sync`.
- `id` SERIAL PK
- `node_type` TEXT — `'employee' | 'agent' | 'platform' | 'workflow' | 'knowledge_asset' | 'department'`
- `entity_id` INT — FK back to the source table
- `entity_name` TEXT
- `properties` JSONB — type-specific metadata (role, risk, cost, etc.)
- `created_at` TIMESTAMPTZ

### `graph_edges`
Directed relationships between graph nodes.
- `id` SERIAL PK
- `source_node_id` INT REFERENCES graph_nodes(id)
- `target_node_id` INT REFERENCES graph_nodes(id)
- `relationship_type` TEXT — `'owns' | 'depends_on' | 'reports_to' | 'uses' | 'documents'`
- `weight` NUMERIC — 0.0–1.0 (1.0 = critical/primary)
- `properties` JSONB
- `created_at` TIMESTAMPTZ

**Graph traversal**: Use `GET /api/graph/path/:sourceId/:targetId` for BFS shortest-path queries, `GET /api/graph/nodes/:id/neighbors` for one-hop expansion. Call `POST /api/graph/sync` after any core data change.

---

## Event & Signal Bus Table (Migration 05)

### `system_events`
Postgres-backed event log. Every event published via `services/eventBus.js` is persisted here for durability, replay, and audit.
- `id` SERIAL PK
- `event_type` TEXT — e.g. `'risk.critical'`, `'graph.synced'`, `'agent.failed'`
- `source_module` TEXT — originating module
- `target_module` TEXT — intended consumer
- `correlation_id` TEXT — UUID linking related events in a trace
- `payload` JSONB — event-specific data
- `confidence` NUMERIC — 0.0–1.0
- `status` TEXT — `'published' | 'processed'`
- `created_at` TIMESTAMPTZ
- `processed_at` TIMESTAMPTZ

**Pub/sub**: Node `EventEmitter` propagates events in-process. Call `eventBus.subscribe(eventType, handler)` to register a handler, `eventBus.publish(...)` to dispatch. No Redis/Kafka required.

---

## Intelligence Exchange Protocol (IEP)

All modules that hand intelligence to another module or to the Orchestrator should use `services/intelligenceExchange.js`.

### `packageIntelligence({ sourceModule, capability, findings, confidence, evidence, recommendations, graphRefs })`

Returns the standardized IEP envelope:

```json
{
  "sourceModule":    "predictiveRisk",
  "capability":      "critical_risk_detection",
  "findings":        { "totalCritical": 3, "agents": [...] },
  "confidenceScore": 0.95,
  "evidence":        ["KnowledgeIndexer: score 90/100 — failed since April"],
  "recommendations": ["Address CRITICAL agent KnowledgeIndexer before escalation"],
  "graphRefs":       [{ "nodeType": "agent", "entityName": "KnowledgeIndexer" }],
  "timestamp":       "2026-07-08T13:45:00.000Z"
}
```

**Retrofitted endpoints**: `GET /api/predictive-risk/critical`, `GET /api/learning/summary`, `GET /api/intelligence/orchestrator`.

---

## Pattern Intelligence Tables (Migration 07)

### `detected_patterns`
Computed patterns persisted by `POST /api/pattern-intelligence/scan`. Populated from cross-table analysis of `system_events`, `incident_patterns`, `workflow_failures`, and `graph_edges`.
- `id` SERIAL PK
- `pattern_type` TEXT — `'recurring_failure' | 'dependency_cluster' | 'escalation_chain' | 'event_correlation'`
- `title` TEXT — human-readable pattern label
- `description` TEXT — what the pattern means operationally
- `entities_involved` JSONB — array of `{ entityName, entityType, nodeId?, ... }` 
- `occurrence_count` INT — how many times the pattern has been observed
- `confidence` NUMERIC — 0.0–1.0
- `first_detected` / `last_detected` TIMESTAMPTZ
- `status` TEXT — `'active' | 'resolved' | 'monitoring'`

**Routes**: `GET /api/pattern-intelligence/summary` (IEP-wrapped), `GET /api/pattern-intelligence/recurring-failures`, `GET /api/pattern-intelligence/dependency-clusters`, `GET /api/pattern-intelligence/event-correlations`, `POST /api/pattern-intelligence/scan`

**Pattern types**:
- `recurring_failure` — groups `workflow_failures` + `incident_patterns` by failure_type, flags anything 2+ times
- `dependency_cluster` — uses `graph_edges` degree (fan-in / fan-out) to find structurally risky nodes
- `escalation_chain` — surfaces broken escalation paths from `workflow_failures` + `system_events`
- `event_correlation` — groups `system_events` by `correlation_id` and by `event_type` to find storms

---

## Digital Twin Tables (Migration 07)

### `twin_snapshots`
One row per sync run. Captures the org's aggregate state at a point in time for drift comparison.
- `id` SERIAL PK
- `snapshot_type` TEXT — `'full' | 'incremental'`
- `node_count` INT — total graph nodes at sync time
- `edge_count` INT — total graph edges at sync time
- `org_health_index` INT — pulled from `org_health_snapshots`
- `critical_risk_count` INT — count of CRITICAL agents from `predictive_risk_scores`
- `spof_count` INT — count of human-SPOF workflow failures
- `summary` JSONB — nodeType breakdown, top risks, health status
- `computed_at` TIMESTAMPTZ

### `twin_entity_state`
One row per `graph_nodes` entry (upserted on each sync). The live structured mirror of every entity.
- `id` SERIAL PK
- `node_id` INT REFERENCES graph_nodes(id) — unique index, upserted on conflict
- `entity_type` TEXT — mirrors `graph_nodes.node_type`
- `entity_name` TEXT — mirrors `graph_nodes.entity_name`
- `current_state` JSONB — merged: node properties + governance data + snapshotId
- `risk_level` TEXT — `'low' | 'medium' | 'high' | 'critical'` (from predictive scores or node properties)
- `last_synced` TIMESTAMPTZ

**Routes**: `POST /api/digital-twin/sync`, `GET /api/digital-twin/current`, `GET /api/digital-twin/entity/:nodeId`, `GET /api/digital-twin/drift`

**Key behaviours**:
- `POST /sync` publishes a `twin.synced` event via `eventBus.js` — other modules react automatically
- `GET /drift` compares the two most-recent `twin_snapshots` rows and surfaces delta signals (new risks, resolved risks, health index change, SPOF changes)
- Entity state is upserted on `node_id` — no duplicates, always current

---

## Simulation Integration Tables (Migration 08)

### `simulation_runs`
Audit log of every simulation execution. Each simulation now reads from `twin_snapshots` + `twin_entity_state` + `graph_edges` for blast radius, then inserts a row here.
- `id` SERIAL PK
- `simulation_type` TEXT — `'agent_fails' | 'employee_leaves' | 'platform_down' | 'workflow_disruption'`
- `target_entity` TEXT — the entity name being simulated
- `twin_snapshot_id` INT REFERENCES twin_snapshots(id) — which Digital Twin snapshot was used
- `input_params` JSONB — original request parameters
- `affected_entities` JSONB — computed blast radius: `{ agents: [], workflows: [], ... }`
- `impact_score` INT — 0–100
- `severity` TEXT — `'low' | 'medium' | 'high' | 'critical'`
- `narrative` TEXT — human-readable impact summary
- `run_at` TIMESTAMPTZ

**Routes**: All 4 simulation endpoints (`/agent-fails/:agent`, `/employee-leaves/:employee`, `/platform-down/:platform`, `/workflow-disruption/:workflow`) now write here + `GET /api/simulations/history`

**Key upgrade**: All 4 simulations now:
1. Read the latest `twin_snapshots` row (auto-refresh if >1 hour old)
2. Use `graph_edges` fan-in degree for blast radius (reuses edge pattern, not raw dependency tables)
3. Pull live `risk_level` from `twin_entity_state` for each affected entity
4. Wrap responses in `packageIntelligence()` IEP envelope
5. Publish `simulation.completed` event via `eventBus.js`

**EventBus Wire 5**: `simulation.completed` → if severity is critical/high, logs a `executive_memory_items` row automatically

---

## Capability Registry Tables (Migration 08)

### `module_capabilities`
Registry of all working modules on the platform. One row per module. Populated at server startup via `scripts/registerCapabilities.js` (idempotent upsert on `module_id`).
- `id` SERIAL PK
- `module_id` TEXT UNIQUE — e.g. `'M11'`, `'M55'`, `'M64'`, `'core.dataquality'`
- `module_name` TEXT — human-readable module name
- `category` TEXT — `'core' | 'intelligence' | 'executive' | 'graph' | 'simulation' | 'twin' | 'pattern' | 'event' | 'registry'`
- `base_route` TEXT — e.g. `'/api/predictive-risk'`
- `capabilities` JSONB — array of `{ endpoint, method, description, returns }`
- `status` TEXT — `'active' | 'deprecated'`
- `registered_at` TIMESTAMPTZ

**Service**: `services/capabilityRegistry.js` — exports `registerCapability()`, `getCapability()`, `listCapabilities()`, `findCapabilityFor(intent)`

**Routes**: `GET /api/capabilities`, `GET /api/capabilities/search?intent=`, `GET /api/capabilities/:moduleId`

**Orchestrator Integration**: `routes/intelligence/registryBridge.js` — maps all 14 of Fizza's orchestrator MODULE_REGISTRY keys to their Capability Registry module IDs. Fizza's `orchestrator.js` was NOT modified. Bridge endpoints:
- `GET /api/intelligence/registry-bridge` — bridge status + key map
- `GET /api/intelligence/registry-bridge/resolve/:key` — resolve orchestrator key → full capability
- `GET /api/intelligence/registry-bridge/coverage` — % of orchestrator keys registered

---

## Prediction & Learning Wiring (Chunk 10 / Migration 09)

**No new tables created** — this chunk wired existing modules into the event/graph foundation.

### Changes in `services/eventBus.js`

**Wire 1 extension (`risk.critical`)**: In addition to the original `executive_memory_items` insert, now also upserts a `failure_patterns` row for the agent so the Learning module's `/failures` and `/summary` endpoints reflect live event-driven learning, not just static seed data.

**Wire 5 extension (`simulation.completed`)**: In addition to the original `executive_memory_items` insert (critical/high only), now ALWAYS upserts a `failure_patterns` row regardless of severity so all simulated failures are captured by the Learning module. Increments `appearance_count` if the entity already exists; sets `is_repeat_offender = true` when `appearance_count >= 2`.

### Changes in `routes/predictive/predictiveRisk.js`

Added `buildAgentInDegreeMap()` helper: fetches `graph_nodes` (agents only) and `graph_edges` (depends_on/uses relationships only) in a single `Promise.all` call, then counts in-degree per agent entity_id.

Updated `/critical` and `/emerging` endpoints:
- Now call `buildAgentInDegreeMap()` in parallel with `fetchAllPredictions()` via `Promise.all`
- Each prediction formatted with `adjustedScore = min(100, predicted_score + min(20, inDegree * 2))`
- Results sorted by `adjustedScore` so highly-depended-on agents surface first
- Both endpoints now wrapped in `packageIntelligence()` IEP envelope
- Evidence and recommendations reference `dependentCount` and `adjustedScore`

---

## Integration Map — All Modules Across All Chunks

| Module | ID | Publishes | Subscribes To |
|--------|----|-----------|---------------|
| Knowledge Graph | M60 | `graph.synced` | — |
| Event & Signal Bus | M61 | — (infrastructure) | — |
| Intelligence Exchange (IEP) | M62 | — (utility function) | — |
| Pattern Intelligence | M63 | — | — |
| Digital Twin | M64 | `twin.synced` | — |
| Simulations (agent_fails, etc.) | M65 | `simulation.completed` | — |
| Capability Registry | M66 | — | — |
| Predictive Risk Intelligence | M11 | `risk.critical` (on each /critical hit) | — |
| Organizational Learning | M17 | — | `simulation.completed`, `risk.critical` (via eventBus) |
| Executive Memory | M26 | — | `risk.critical`, `graph.synced`, `agent.failed`, `twin.synced`, `simulation.completed` |
| Executive Context | M27 | — | `agent.failed` (via eventBus → context_items) |

### Event Handlers Summary (`services/eventBus.js`)

| Event | Handler Effect |
|-------|---------------|
| `risk.critical` | → upsert `executive_memory_items` (hero_risk) + upsert `failure_patterns` (learning) |
| `graph.synced` | → insert `executive_memory_items` (lesson: graph updated) |
| `agent.failed` | → insert `context_items` (incident: agent failure) |
| `twin.synced` | → insert `executive_memory_items` (lesson: twin snapshot computed) |
| `simulation.completed` | → insert `executive_memory_items` if critical/high + upsert `failure_patterns` always (learning) |

