-- ============================================================
-- OBA — COMBINED MIGRATION: Run migrations 05 + 06 + 07
-- Paste the entire contents of this file into the Supabase
-- SQL Editor and click RUN. Safe to re-run (IF NOT EXISTS).
-- ============================================================

-- ════════════════════════════════════════════
-- MIGRATION 05: Knowledge Graph + Event Bus
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS graph_nodes (
  id          SERIAL PRIMARY KEY,
  node_type   TEXT NOT NULL,
  entity_id   INT,
  entity_name TEXT,
  properties  JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id                SERIAL PRIMARY KEY,
  source_node_id    INT REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_node_id    INT REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  weight            NUMERIC DEFAULT 1.0,
  properties        JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type   ON graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_entity ON graph_nodes(node_type, entity_id);

CREATE TABLE IF NOT EXISTS system_events (
  id             SERIAL PRIMARY KEY,
  event_type     TEXT NOT NULL,
  source_module  TEXT,
  target_module  TEXT,
  correlation_id TEXT,
  payload        JSONB,
  confidence     NUMERIC,
  status         TEXT DEFAULT 'published',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_events_type        ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_source      ON system_events(source_module);
CREATE INDEX IF NOT EXISTS idx_system_events_correlation ON system_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created     ON system_events(created_at DESC);

-- ════════════════════════════════════════════
-- MIGRATION 06: Knowledge Graph Seed
-- ════════════════════════════════════════════

TRUNCATE graph_edges, graph_nodes RESTART IDENTITY;

INSERT INTO graph_nodes (node_type, entity_id, entity_name, properties)
SELECT 'employee', e.id, e.name,
  jsonb_build_object('role', e.role, 'department', e.department, 'risk', e.risk, 'workload', e.workload, 'tenure', e.tenure)
FROM employees e;

INSERT INTO graph_nodes (node_type, entity_id, entity_name, properties)
SELECT 'agent', a.id, a.name,
  jsonb_build_object('type', a.type, 'status', a.status, 'risk', a.risk, 'usage_count', a.usage_count, 'adoption_pct', a.adoption_pct, 'cost', a.cost)
FROM agents a;

INSERT INTO graph_nodes (node_type, entity_id, entity_name, properties)
SELECT 'platform', p.id, p.name,
  jsonb_build_object('type', p.type, 'status', p.status, 'cost_monthly', p.cost_monthly, 'adoption_pct', p.adoption_pct, 'usage_count', p.usage_count)
FROM ai_platforms p;

INSERT INTO graph_nodes (node_type, entity_id, entity_name, properties)
SELECT 'workflow', w.id, w.name,
  jsonb_build_object('status', w.status, 'risk', w.risk, 'department', w.department, 'frequency', w.frequency)
FROM workflows w;

INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT en.id, an.id, 'owns',
  CASE ea.role WHEN 'owner' THEN 1.0 WHEN 'backup' THEN 0.5 ELSE 0.3 END,
  jsonb_build_object('role', ea.role)
FROM employee_agent ea
JOIN graph_nodes en ON en.node_type = 'employee' AND en.entity_id = ea.employee_id
JOIN graph_nodes an ON an.node_type = 'agent'    AND an.entity_id = ea.agent_id;

INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT an.id, pn.id, 'uses', 1.0, '{}'::jsonb
FROM agent_platform ap
JOIN graph_nodes an ON an.node_type = 'agent'    AND an.entity_id = ap.agent_id
JOIN graph_nodes pn ON pn.node_type = 'platform' AND pn.entity_id = ap.platform_id;

INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT sa.id, ta.id, 'depends_on', (d.strength::NUMERIC / 100.0),
  jsonb_build_object('dependency_type', d.dependency_type, 'strength', d.strength)
FROM dependencies d
JOIN graph_nodes sa ON sa.node_type = 'agent' AND sa.entity_id = d.source_id
JOIN graph_nodes ta ON ta.node_type = 'agent' AND ta.entity_id = d.target_id
WHERE d.source_type = 'agent' AND d.target_type = 'agent';

INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT wn.id, an.id, 'depends_on',
  CASE wd.is_critical WHEN true THEN 1.0 ELSE 0.5 END,
  jsonb_build_object('is_critical', wd.is_critical)
FROM workflow_dependencies wd
JOIN graph_nodes wn ON wn.node_type = 'workflow' AND wn.entity_id = wd.workflow_id
JOIN graph_nodes an ON an.node_type = 'agent'    AND an.entity_id = wd.agent_id;

INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT wn.id, pn.id, 'uses',
  CASE wtd.is_critical WHEN true THEN 1.0 ELSE 0.5 END,
  jsonb_build_object('is_critical', wtd.is_critical)
FROM workflow_tool_dependencies wtd
JOIN graph_nodes wn ON wn.node_type = 'workflow' AND wn.entity_id = wtd.workflow_id
JOIN graph_nodes pn ON pn.node_type = 'platform' AND pn.entity_id = wtd.platform_id;

INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT en.id, pn.id, 'owns', 1.0, '{"role": "platform_owner"}'::jsonb
FROM tool_ownership to2
JOIN graph_nodes en ON en.node_type = 'employee' AND en.entity_id = to2.employee_id
JOIN graph_nodes pn ON pn.node_type = 'platform' AND pn.entity_id = to2.platform_id;

INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT en.id, mn.id, 'reports_to', 0.8, '{}'::jsonb
FROM employees e
JOIN employees m ON m.name = e.manager
JOIN graph_nodes en ON en.node_type = 'employee' AND en.entity_id = e.id
JOIN graph_nodes mn ON mn.node_type = 'employee' AND mn.entity_id = m.id
WHERE e.manager IS NOT NULL;

INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT on_node.id, tgt.id, 'documents',
  CASE ka.criticality WHEN 'critical' THEN 1.0 WHEN 'high' THEN 0.8 WHEN 'medium' THEN 0.5 ELSE 0.3 END,
  jsonb_build_object('is_documented', ka.is_documented, 'criticality', ka.criticality, 'topic', ka.topic)
FROM knowledge_assets ka
JOIN graph_nodes on_node ON on_node.node_type = 'employee' AND on_node.entity_id = ka.owner_id
JOIN graph_nodes tgt      ON tgt.node_type = ka.asset_type  AND tgt.entity_id = ka.asset_id
WHERE ka.asset_id IS NOT NULL AND ka.asset_type IN ('agent', 'workflow');

-- Seed a real risk.critical event so system_events is not empty
INSERT INTO system_events (event_type, source_module, target_module, correlation_id, payload, confidence, status)
VALUES (
  'risk.critical',
  'predictiveRisk',
  'executiveMemory',
  gen_random_uuid()::text,
  '{"agentName":"DeployBot","threatLevel":"CRITICAL","predictedScore":92,"reasons":["single owner","no backup","high workload"]}',
  0.92,
  'published'
);

-- ════════════════════════════════════════════
-- MIGRATION 07: Pattern Intelligence + Digital Twin
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS detected_patterns (
  id               SERIAL PRIMARY KEY,
  pattern_type     TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  entities_involved JSONB,
  occurrence_count INT DEFAULT 1,
  confidence       NUMERIC DEFAULT 0.5,
  first_detected   TIMESTAMPTZ DEFAULT NOW(),
  last_detected    TIMESTAMPTZ DEFAULT NOW(),
  status           TEXT DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detected_patterns_type    ON detected_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_status  ON detected_patterns(status);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_last    ON detected_patterns(last_detected DESC);

CREATE TABLE IF NOT EXISTS twin_snapshots (
  id                  SERIAL PRIMARY KEY,
  snapshot_type       TEXT DEFAULT 'full',
  node_count          INT DEFAULT 0,
  edge_count          INT DEFAULT 0,
  org_health_index    INT DEFAULT 0,
  critical_risk_count INT DEFAULT 0,
  spof_count          INT DEFAULT 0,
  summary             JSONB,
  computed_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twin_snapshots_computed ON twin_snapshots(computed_at DESC);

CREATE TABLE IF NOT EXISTS twin_entity_state (
  id           SERIAL PRIMARY KEY,
  node_id      INT REFERENCES graph_nodes(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL,
  entity_name  TEXT NOT NULL,
  current_state JSONB,
  risk_level   TEXT,
  last_synced  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_twin_entity_state_node ON twin_entity_state(node_id);
CREATE INDEX IF NOT EXISTS idx_twin_entity_state_type        ON twin_entity_state(entity_type);
CREATE INDEX IF NOT EXISTS idx_twin_entity_state_risk        ON twin_entity_state(risk_level);

-- Verification: count the new tables
SELECT
  (SELECT COUNT(*) FROM graph_nodes)      AS graph_nodes_count,
  (SELECT COUNT(*) FROM graph_edges)      AS graph_edges_count,
  (SELECT COUNT(*) FROM system_events)    AS system_events_count,
  (SELECT COUNT(*) FROM detected_patterns) AS detected_patterns_count,
  (SELECT COUNT(*) FROM twin_snapshots)    AS twin_snapshots_count,
  (SELECT COUNT(*) FROM twin_entity_state) AS twin_entity_state_count;

-- ════════════════════════════════════════════
-- MIGRATION 08: Simulation Runs + Capability Registry
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS simulation_runs (
  id                SERIAL PRIMARY KEY,
  simulation_type   TEXT NOT NULL,
  target_entity     TEXT NOT NULL,
  twin_snapshot_id  INT REFERENCES twin_snapshots(id),
  input_params      JSONB,
  affected_entities JSONB,
  impact_score      INT DEFAULT 0,
  severity          TEXT,
  narrative         TEXT,
  run_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_type      ON simulation_runs(simulation_type);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_entity    ON simulation_runs(target_entity);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_snapshot  ON simulation_runs(twin_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_run_at    ON simulation_runs(run_at DESC);

CREATE TABLE IF NOT EXISTS module_capabilities (
  id            SERIAL PRIMARY KEY,
  module_id     TEXT NOT NULL UNIQUE,
  module_name   TEXT NOT NULL,
  category      TEXT NOT NULL,
  base_route    TEXT NOT NULL,
  capabilities  JSONB,
  status        TEXT DEFAULT 'active',
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_capabilities_category ON module_capabilities(category);
CREATE INDEX IF NOT EXISTS idx_module_capabilities_status   ON module_capabilities(status);

-- Final combined verification
SELECT
  (SELECT COUNT(*) FROM graph_nodes)         AS graph_nodes,
  (SELECT COUNT(*) FROM graph_edges)         AS graph_edges,
  (SELECT COUNT(*) FROM system_events)       AS system_events,
  (SELECT COUNT(*) FROM detected_patterns)   AS detected_patterns,
  (SELECT COUNT(*) FROM twin_snapshots)      AS twin_snapshots,
  (SELECT COUNT(*) FROM twin_entity_state)   AS twin_entity_state,
  (SELECT COUNT(*) FROM simulation_runs)     AS simulation_runs,
  (SELECT COUNT(*) FROM module_capabilities) AS module_capabilities;

