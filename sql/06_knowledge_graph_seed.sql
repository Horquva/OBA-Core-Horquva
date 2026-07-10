-- ============================================================
-- OBA — MIGRATION 06: Knowledge Graph Seed
-- Populates graph_nodes from every existing employee, agent,
-- ai_platform, and workflow row, then populates graph_edges
-- from all existing relationships in the data.
-- Run AFTER 05_knowledge_graph_schema.sql
-- ============================================================

-- ────────────────────────────────────────────────
-- CLEAN STATE (safe re-run)
-- ────────────────────────────────────────────────
TRUNCATE graph_edges, graph_nodes RESTART IDENTITY CASCADE;

-- ────────────────────────────────────────────────
-- 1. NODES — one per employee
-- ────────────────────────────────────────────────
INSERT INTO graph_nodes (node_type, entity_id, entity_name, properties)
SELECT
  'employee'       AS node_type,
  e.id             AS entity_id,
  e.name           AS entity_name,
  jsonb_build_object(
    'role',       e.role,
    'department', e.department,
    'risk',       e.risk,
    'workload',   e.workload,
    'tenure',     e.tenure
  )                AS properties
FROM employees e;

-- ────────────────────────────────────────────────
-- 2. NODES — one per agent
-- ────────────────────────────────────────────────
INSERT INTO graph_nodes (node_type, entity_id, entity_name, properties)
SELECT
  'agent'          AS node_type,
  a.id             AS entity_id,
  a.name           AS entity_name,
  jsonb_build_object(
    'type',         a.type,
    'status',       a.status,
    'risk',         a.risk,
    'usage_count',  a.usage_count,
    'adoption_pct', a.adoption_pct,
    'cost',         a.cost
  )                AS properties
FROM agents a;

-- ────────────────────────────────────────────────
-- 3. NODES — one per ai_platform
-- ────────────────────────────────────────────────
INSERT INTO graph_nodes (node_type, entity_id, entity_name, properties)
SELECT
  'platform'       AS node_type,
  p.id             AS entity_id,
  p.name           AS entity_name,
  jsonb_build_object(
    'type',          p.type,
    'status',        p.status,
    'cost_monthly',  p.cost_monthly,
    'adoption_pct',  p.adoption_pct,
    'usage_count',   p.usage_count
  )                AS properties
FROM ai_platforms p;

-- ────────────────────────────────────────────────
-- 4. NODES — one per workflow
-- ────────────────────────────────────────────────
INSERT INTO graph_nodes (node_type, entity_id, entity_name, properties)
SELECT
  'workflow'       AS node_type,
  w.id             AS entity_id,
  w.name           AS entity_name,
  jsonb_build_object(
    'status',     w.status,
    'risk',       w.risk,
    'department', w.department,
    'frequency',  w.frequency
  )                AS properties
FROM workflows w;

-- ────────────────────────────────────────────────
-- 5. EDGES — employee_agent ownership
--    employee → agent : "owns"
-- ────────────────────────────────────────────────
INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT
  en.id  AS source_node_id,
  an.id  AS target_node_id,
  'owns' AS relationship_type,
  CASE ea.role
    WHEN 'owner'  THEN 1.0
    WHEN 'backup' THEN 0.5
    ELSE 0.3
  END    AS weight,
  jsonb_build_object('role', ea.role) AS properties
FROM employee_agent ea
JOIN graph_nodes en ON en.node_type = 'employee' AND en.entity_id = ea.employee_id
JOIN graph_nodes an ON an.node_type = 'agent'    AND an.entity_id = ea.agent_id;

-- ────────────────────────────────────────────────
-- 6. EDGES — agent_platform usage
--    agent → platform : "uses"
-- ────────────────────────────────────────────────
INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT
  an.id  AS source_node_id,
  pn.id  AS target_node_id,
  'uses' AS relationship_type,
  1.0    AS weight,
  '{}'::jsonb AS properties
FROM agent_platform ap
JOIN graph_nodes an ON an.node_type = 'agent'    AND an.entity_id = ap.agent_id
JOIN graph_nodes pn ON pn.node_type = 'platform' AND pn.entity_id = ap.platform_id;

-- ────────────────────────────────────────────────
-- 7. EDGES — agent dependencies (agent → agent)
--    source agent "depends_on" target agent
-- ────────────────────────────────────────────────
INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT
  sa.id         AS source_node_id,
  ta.id         AS target_node_id,
  'depends_on'  AS relationship_type,
  (d.strength::NUMERIC / 100.0) AS weight,
  jsonb_build_object('dependency_type', d.dependency_type, 'strength', d.strength) AS properties
FROM dependencies d
JOIN graph_nodes sa ON sa.node_type = 'agent' AND sa.entity_id = d.source_id
JOIN graph_nodes ta ON ta.node_type = 'agent' AND ta.entity_id = d.target_id
WHERE d.source_type = 'agent' AND d.target_type = 'agent';

-- ────────────────────────────────────────────────
-- 8. EDGES — workflow depends on agent
--    workflow → agent : "depends_on"
-- ────────────────────────────────────────────────
INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT
  wn.id        AS source_node_id,
  an.id        AS target_node_id,
  'depends_on' AS relationship_type,
  CASE wd.is_critical WHEN true THEN 1.0 ELSE 0.5 END AS weight,
  jsonb_build_object('is_critical', wd.is_critical) AS properties
FROM workflow_dependencies wd
JOIN graph_nodes wn ON wn.node_type = 'workflow' AND wn.entity_id = wd.workflow_id
JOIN graph_nodes an ON an.node_type = 'agent'    AND an.entity_id = wd.agent_id;

-- ────────────────────────────────────────────────
-- 9. EDGES — workflow uses platform
--    workflow → platform : "uses"
-- ────────────────────────────────────────────────
INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT
  wn.id  AS source_node_id,
  pn.id  AS target_node_id,
  'uses' AS relationship_type,
  CASE wtd.is_critical WHEN true THEN 1.0 ELSE 0.5 END AS weight,
  jsonb_build_object('is_critical', wtd.is_critical) AS properties
FROM workflow_tool_dependencies wtd
JOIN graph_nodes wn ON wn.node_type = 'workflow' AND wn.entity_id = wtd.workflow_id
JOIN graph_nodes pn ON pn.node_type = 'platform' AND pn.entity_id = wtd.platform_id;

-- ────────────────────────────────────────────────
-- 10. EDGES — employee owns platform (tool_ownership)
--     employee → platform : "owns"
-- ────────────────────────────────────────────────
INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT
  en.id  AS source_node_id,
  pn.id  AS target_node_id,
  'owns' AS relationship_type,
  1.0    AS weight,
  '{"role": "platform_owner"}'::jsonb AS properties
FROM tool_ownership to2
JOIN graph_nodes en ON en.node_type = 'employee' AND en.entity_id = to2.employee_id
JOIN graph_nodes pn ON pn.node_type = 'platform' AND pn.entity_id = to2.platform_id;

-- ────────────────────────────────────────────────
-- 11. EDGES — employee reports_to manager
--     employee → employee : "reports_to"
-- ────────────────────────────────────────────────
INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT
  en.id        AS source_node_id,
  mn.id        AS target_node_id,
  'reports_to' AS relationship_type,
  0.8          AS weight,
  '{}'::jsonb  AS properties
FROM employees e
JOIN employees m  ON m.name = e.manager
JOIN graph_nodes en ON en.node_type = 'employee' AND en.entity_id = e.id
JOIN graph_nodes mn ON mn.node_type = 'employee' AND mn.entity_id = m.id
WHERE e.manager IS NOT NULL;

-- ────────────────────────────────────────────────
-- 12. EDGES — employee documents knowledge_asset
-- ────────────────────────────────────────────────
INSERT INTO graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
SELECT
  on_node.id    AS source_node_id,
  tgt.id        AS target_node_id,
  'documents'   AS relationship_type,
  CASE ka.criticality
    WHEN 'critical' THEN 1.0
    WHEN 'high'     THEN 0.8
    WHEN 'medium'   THEN 0.5
    ELSE 0.3
  END           AS weight,
  jsonb_build_object(
    'is_documented', ka.is_documented,
    'criticality',   ka.criticality,
    'topic',         ka.topic
  )             AS properties
FROM knowledge_assets ka
JOIN graph_nodes on_node ON on_node.node_type = 'employee' AND on_node.entity_id = ka.owner_id
JOIN graph_nodes tgt     ON tgt.node_type = ka.asset_type AND tgt.entity_id = ka.asset_id
WHERE ka.asset_id IS NOT NULL
  AND ka.asset_type IN ('agent', 'workflow');