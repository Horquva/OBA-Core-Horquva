-- ============================================================
-- OBA — MIGRATION 08: Simulation Integrations + Capability Registry
-- Creates:
--   simulation_runs      — audit log of every simulation tied to a twin snapshot
--   module_capabilities  — capability registry for orchestrator discovery
-- Run in Supabase SQL Editor AFTER the 07 migration.
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. SIMULATION RUNS
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_runs (
  id                SERIAL PRIMARY KEY,
  simulation_type   TEXT NOT NULL,   -- 'agent_fails' | 'employee_leaves' | 'platform_down' | 'workflow_disruption'
  target_entity     TEXT NOT NULL,   -- name of the entity being simulated
  twin_snapshot_id  INT REFERENCES twin_snapshots(id),
  input_params      JSONB,           -- original request params
  affected_entities JSONB,           -- computed blast radius entities
  impact_score      INT DEFAULT 0,   -- 0–100
  severity          TEXT,            -- 'low' | 'medium' | 'high' | 'critical'
  narrative         TEXT,            -- human-readable impact summary
  run_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_type    ON simulation_runs(simulation_type);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_entity  ON simulation_runs(target_entity);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_snapshot ON simulation_runs(twin_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_run_at  ON simulation_runs(run_at DESC);

-- ────────────────────────────────────────────────
-- 2. MODULE CAPABILITIES (Capability Registry)
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS module_capabilities (
  id            SERIAL PRIMARY KEY,
  module_id     TEXT NOT NULL UNIQUE,   -- e.g. 'M01', 'core.graph', 'M63'
  module_name   TEXT NOT NULL,
  category      TEXT NOT NULL,          -- 'core' | 'intelligence' | 'graph' | 'simulation' | 'twin' | 'pattern' | 'event'
  base_route    TEXT NOT NULL,          -- e.g. '/api/predictive-risk'
  capabilities  JSONB,                  -- [{endpoint, method, description, returns}]
  status        TEXT DEFAULT 'active',  -- 'active' | 'deprecated'
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_capabilities_category ON module_capabilities(category);
CREATE INDEX IF NOT EXISTS idx_module_capabilities_status   ON module_capabilities(status);

-- Verification
SELECT
  (SELECT COUNT(*) FROM simulation_runs)      AS simulation_runs_count,
  (SELECT COUNT(*) FROM module_capabilities)  AS module_capabilities_count;
