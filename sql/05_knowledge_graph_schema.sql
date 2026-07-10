-- ============================================================
-- OBA — MIGRATION 05: Knowledge Graph + Event & Signal Bus
-- Creates:
--   graph_nodes     — one node per organizational entity
--   graph_edges     — relationships between nodes
--   system_events   — Postgres-backed event log for the pub/sub bus
-- Run in Supabase SQL Editor AFTER 04_fizza_modules_seed.sql
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. KNOWLEDGE GRAPH
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graph_nodes (
  id          SERIAL PRIMARY KEY,
  node_type   TEXT NOT NULL,   -- 'employee' | 'agent' | 'platform' | 'workflow' | 'knowledge_asset' | 'department'
  entity_id   INT,
  entity_name TEXT,
  properties  JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id                SERIAL PRIMARY KEY,
  source_node_id    INT REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_node_id    INT REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,  -- 'owns' | 'depends_on' | 'reports_to' | 'uses' | 'documents'
  weight            NUMERIC DEFAULT 1.0,
  properties        JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient graph traversal
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type   ON graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_entity ON graph_nodes(node_type, entity_id);

-- ────────────────────────────────────────────────
-- 2. EVENT & SIGNAL BUS
-- ────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_system_events_type       ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_source     ON system_events(source_module);
CREATE INDEX IF NOT EXISTS idx_system_events_correlation ON system_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created    ON system_events(created_at DESC);
