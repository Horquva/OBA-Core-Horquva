-- ============================================================
-- OBA — MIGRATION 07: Pattern Intelligence + Digital Twin
-- Creates:
--   detected_patterns   — computed recurring structural/behavioral patterns
--   twin_snapshots      — periodic full/incremental snapshots of org state
--   twin_entity_state   — per-node current state for the digital twin
-- Run in Supabase SQL Editor AFTER 06_knowledge_graph_seed.sql
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. PATTERN INTELLIGENCE
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS detected_patterns (
  id               SERIAL PRIMARY KEY,
  pattern_type     TEXT NOT NULL,   -- 'recurring_failure' | 'dependency_cluster' | 'escalation_chain' | 'event_correlation'
  title            TEXT NOT NULL,
  description      TEXT,
  entities_involved JSONB,          -- array of { entityName, entityType, nodeId? }
  occurrence_count INT DEFAULT 1,
  confidence       NUMERIC DEFAULT 0.5,  -- 0.0–1.0
  first_detected   TIMESTAMPTZ DEFAULT NOW(),
  last_detected    TIMESTAMPTZ DEFAULT NOW(),
  status           TEXT DEFAULT 'active',  -- 'active' | 'resolved' | 'monitoring'
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detected_patterns_type    ON detected_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_status  ON detected_patterns(status);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_last    ON detected_patterns(last_detected DESC);

-- ────────────────────────────────────────────────
-- 2. DIGITAL TWIN — SNAPSHOTS
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS twin_snapshots (
  id                  SERIAL PRIMARY KEY,
  snapshot_type       TEXT DEFAULT 'full',  -- 'full' | 'incremental'
  node_count          INT DEFAULT 0,
  edge_count          INT DEFAULT 0,
  org_health_index    INT DEFAULT 0,
  critical_risk_count INT DEFAULT 0,
  spof_count          INT DEFAULT 0,
  summary             JSONB,               -- flexible top-level summary payload
  computed_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twin_snapshots_computed ON twin_snapshots(computed_at DESC);

-- ────────────────────────────────────────────────
-- 3. DIGITAL TWIN — ENTITY STATE
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS twin_entity_state (
  id           SERIAL PRIMARY KEY,
  node_id      INT REFERENCES graph_nodes(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL,    -- mirrors graph_nodes.node_type
  entity_name  TEXT NOT NULL,    -- mirrors graph_nodes.entity_name
  current_state JSONB,           -- merged state: properties + live scores
  risk_level   TEXT,             -- 'low' | 'medium' | 'high' | 'critical'
  last_synced  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_twin_entity_state_node ON twin_entity_state(node_id);
CREATE INDEX IF NOT EXISTS idx_twin_entity_state_type        ON twin_entity_state(entity_type);
CREATE INDEX IF NOT EXISTS idx_twin_entity_state_risk        ON twin_entity_state(risk_level);
