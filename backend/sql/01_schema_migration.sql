-- ============================================================
-- OBA — MIGRATION 01: BASE ORGANIZATIONAL SCHEMA
-- Creates all core organizational tables (M01–M20 foundation).
-- Run this FIRST in the Supabase SQL Editor, in this order:
--   01_schema_migration.sql   (this file — base tables)
--   02_seed_data.sql          (seed base data)
--   03_fizza_modules_schema.sql (intelligence module tables)
--   04_fizza_modules_seed.sql   (seed intelligence data)
-- Safe to re-run: it drops the base tables first, then recreates them.
-- Tables seeded with explicit ids use SERIAL so that the seed's
-- setval('<table>_id_seq', N) calls work.
-- ============================================================

-- ── Clean slate (safe re-run) ─────────────────────────────────
DROP TABLE IF EXISTS
  employees, ai_platforms, agents, owners, workflows,
  employee_agent, agent_platform, dependencies, recommendations,
  tool_ownership, tool_users, tool_backups, tool_policies, tool_spend,
  workflow_dependencies, workflow_tool_dependencies, workflow_runbooks,
  workflow_failures, workflow_steps, knowledge_assets, snapshots,
  predictive_risk_scores, organizational_forecasts, forecast_findings,
  collaboration_scores, collaboration_summary, organizational_decisions,
  decision_factors, verification_actions, policy_violations,
  workflow_orchestration, learning_snapshots, failure_patterns,
  department_exposure, continuity_assessments, continuity_plans,
  governance_assessments, governance_gaps, accountability_entities,
  accountability_links, accountability_scores, accountability_summary
CASCADE;

-- ── People, tools, agents, workflows ─────────────────────────

CREATE TABLE employees (
  id          SERIAL PRIMARY KEY,
  name        TEXT,
  role        TEXT,
  department  TEXT,
  risk        TEXT,
  tenure      NUMERIC,
  skills      TEXT[],
  workload    INTEGER,
  manager     TEXT,
  hire_date   DATE
);

CREATE TABLE ai_platforms (
  id           SERIAL PRIMARY KEY,
  name         TEXT,
  type         TEXT,
  status       TEXT,
  cost_monthly NUMERIC,
  usage_count  INTEGER,
  adoption_pct INTEGER,
  last_used    DATE
);

CREATE TABLE agents (
  id           SERIAL PRIMARY KEY,
  name         TEXT,
  type         TEXT,
  status       TEXT,
  risk         TEXT,
  owner_id     INTEGER,
  usage_count  INTEGER,
  adoption_pct INTEGER,
  last_used    DATE,
  cost         NUMERIC
);

CREATE TABLE owners (
  id           SERIAL PRIMARY KEY,
  name         TEXT,
  role         TEXT,
  backup_owner TEXT,
  risk         TEXT,
  employee_id  INTEGER
);

CREATE TABLE workflows (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  status     TEXT,
  risk       TEXT,
  department TEXT,
  frequency  TEXT
);

-- ── Relationship / junction tables ───────────────────────────

CREATE TABLE employee_agent (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER,
  agent_id    INTEGER,
  role        TEXT
);

CREATE TABLE agent_platform (
  id          SERIAL PRIMARY KEY,
  agent_id    INTEGER,
  platform_id INTEGER
);

CREATE TABLE dependencies (
  id              SERIAL PRIMARY KEY,
  source_id       INTEGER,
  target_id       INTEGER,
  source_type     TEXT,
  target_type     TEXT,
  dependency_type TEXT,
  strength        INTEGER,
  agent_source    TEXT,
  agent_target    TEXT
);

CREATE TABLE recommendations (
  id             SERIAL PRIMARY KEY,
  asset_name     TEXT,
  asset_type     TEXT,
  priority       TEXT,
  recommendation TEXT,
  status         TEXT
);

-- ── Tool metadata ────────────────────────────────────────────

CREATE TABLE tool_ownership (
  id          SERIAL PRIMARY KEY,
  platform_id INTEGER,
  employee_id INTEGER
);

CREATE TABLE tool_users (
  id          SERIAL PRIMARY KEY,
  platform_id INTEGER,
  employee_id INTEGER,
  usage_level TEXT
);

CREATE TABLE tool_backups (
  id               SERIAL PRIMARY KEY,
  primary_platform INTEGER,
  backup_platform  INTEGER
);

CREATE TABLE tool_policies (
  id          SERIAL PRIMARY KEY,
  platform_id INTEGER,
  policy_name TEXT,
  status      TEXT
);

CREATE TABLE tool_spend (
  id          SERIAL PRIMARY KEY,
  platform_id INTEGER,
  amount_usd  NUMERIC,
  month       TEXT
);

-- ── Workflow detail tables ───────────────────────────────────

CREATE TABLE workflow_dependencies (
  id          SERIAL PRIMARY KEY,
  workflow_id INTEGER,
  agent_id    INTEGER,
  is_critical BOOLEAN
);

CREATE TABLE workflow_tool_dependencies (
  id          SERIAL PRIMARY KEY,
  workflow_id INTEGER,
  platform_id INTEGER,
  is_critical BOOLEAN
);

CREATE TABLE workflow_runbooks (
  id            SERIAL PRIMARY KEY,
  workflow_id   INTEGER,
  owner_id      INTEGER,
  is_documented BOOLEAN,
  last_updated  DATE
);

CREATE TABLE workflow_failures (
  id           SERIAL PRIMARY KEY,
  workflow_id  INTEGER,
  failure_type TEXT,
  severity     TEXT,
  description  TEXT
);

CREATE TABLE workflow_steps (
  id               SERIAL PRIMARY KEY,
  workflow_id      INTEGER,
  step_number      INTEGER,
  step_name        TEXT,
  actor_type       TEXT,
  actor_name       TEXT,
  is_required      BOOLEAN,
  duration_minutes INTEGER
);

-- ── Knowledge & time-series ──────────────────────────────────

CREATE TABLE knowledge_assets (
  id            SERIAL PRIMARY KEY,
  asset_type    TEXT,
  asset_id      INTEGER,
  topic         TEXT,
  is_documented BOOLEAN,
  criticality   TEXT,
  owner_id      INTEGER
);

CREATE TABLE snapshots (
  id               SERIAL PRIMARY KEY,
  snapshot_date    DATE,
  headcount        INTEGER,
  avg_workload     NUMERIC,
  total_tool_cost  NUMERIC,
  risk_index       NUMERIC,
  memory_health    INTEGER,
  continuity_score INTEGER,
  governance_score INTEGER
);

-- ── Predictive & forecast (M11–M12) ──────────────────────────

CREATE TABLE predictive_risk_scores (
  id                   SERIAL PRIMARY KEY,
  agent_id             INTEGER,
  predicted_score      INTEGER,
  threat_level         TEXT,
  is_emerging_threat   BOOLEAN,
  contributing_factors JSONB,
  reasons              TEXT[]
);

CREATE TABLE organizational_forecasts (
  id                 SERIAL PRIMARY KEY,
  horizon_days       INTEGER,
  health_score       INTEGER,
  health_trend       TEXT,
  memory_score       INTEGER,
  knowledge_loss_risk TEXT,
  continuity_score   INTEGER,
  resilience_forecast INTEGER,
  outlook_score      INTEGER,
  outlook_status     TEXT
);

CREATE TABLE forecast_findings (
  id             SERIAL PRIMARY KEY,
  forecast_id    INTEGER,
  finding_type   TEXT,
  reference_name TEXT,
  detail         TEXT
);

-- ── Collaboration (M13) ──────────────────────────────────────

CREATE TABLE collaboration_scores (
  id                    SERIAL PRIMARY KEY,
  employee_id           INTEGER,
  adoption_score        INTEGER,
  dependency_score      INTEGER,
  collaboration_score   INTEGER,
  ai_tools_used         INTEGER,
  ai_agents_used        INTEGER,
  critical_agents_owned INTEGER,
  has_backup            BOOLEAN
);

CREATE TABLE collaboration_summary (
  id                        SERIAL PRIMARY KEY,
  ai_adoption_score         INTEGER,
  adoption_level            TEXT,
  human_dependency_score    INTEGER,
  highest_dependency_employee TEXT,
  collaboration_score       INTEGER,
  collaboration_level       TEXT
);

-- ── Decisions & verification (M14–M16) ───────────────────────

CREATE TABLE organizational_decisions (
  id             SERIAL PRIMARY KEY,
  decision_type  TEXT,
  asset_name     TEXT,
  asset_type     TEXT,
  owner_name     TEXT,
  decision_score INTEGER,
  quality_tier   TEXT,
  recommended_fix TEXT
);

CREATE TABLE decision_factors (
  id           SERIAL PRIMARY KEY,
  decision_id  INTEGER,
  factor_name  TEXT,
  factor_status TEXT,
  score_impact INTEGER
);

CREATE TABLE verification_actions (
  id                  SERIAL PRIMARY KEY,
  workflow_id         INTEGER,
  actor_type          TEXT,
  actor_name          TEXT,
  action_name         TEXT,
  outcome             TEXT,
  verification_status TEXT,
  policy_compliant    BOOLEAN,
  created_at          TIMESTAMPTZ
);

CREATE TABLE policy_violations (
  id               SERIAL PRIMARY KEY,
  action_id        INTEGER,
  violation_reason TEXT,
  severity         TEXT,
  created_at       TIMESTAMPTZ
);

CREATE TABLE workflow_orchestration (
  id           SERIAL PRIMARY KEY,
  workflow_id  INTEGER,
  current_step INTEGER,
  total_steps  INTEGER,
  status       TEXT,
  updated_at   TIMESTAMPTZ
);

-- ── Learning (M17) ───────────────────────────────────────────

CREATE TABLE learning_snapshots (
  id                     SERIAL PRIMARY KEY,
  learning_maturity_score INTEGER,
  learning_maturity_level TEXT,
  total_known_risks      INTEGER,
  mitigated_risks        INTEGER,
  unmitigated_risks      INTEGER,
  mitigation_percentage  NUMERIC
);

CREATE TABLE failure_patterns (
  id                SERIAL PRIMARY KEY,
  asset_name        TEXT,
  asset_type        TEXT,
  appearance_count  INTEGER,
  failure_severity  TEXT,
  is_repeat_offender BOOLEAN,
  reasons           TEXT[]
);

CREATE TABLE department_exposure (
  id                     SERIAL PRIMARY KEY,
  department             TEXT,
  documentation_coverage INTEGER,
  backup_coverage        INTEGER,
  incident_exposure_score INTEGER,
  incident_risk_level    TEXT
);

-- ── Continuity (M18) ─────────────────────────────────────────

CREATE TABLE continuity_assessments (
  id               SERIAL PRIMARY KEY,
  asset_name       TEXT,
  asset_type       TEXT,
  department       TEXT,
  owner_name       TEXT,
  continuity_score INTEGER,
  continuity_status TEXT,
  criticality      TEXT
);

CREATE TABLE continuity_plans (
  id            SERIAL PRIMARY KEY,
  assessment_id INTEGER,
  action_type   TEXT,
  action_detail TEXT,
  status        TEXT
);

-- ── Governance (M19) ─────────────────────────────────────────

CREATE TABLE governance_assessments (
  id               SERIAL PRIMARY KEY,
  asset_name       TEXT,
  asset_type       TEXT,
  department       TEXT,
  owner_name       TEXT,
  criticality      TEXT,
  governance_score INTEGER,
  governance_status TEXT
);

CREATE TABLE governance_gaps (
  id            SERIAL PRIMARY KEY,
  assessment_id INTEGER,
  gap_type      TEXT,
  gap_severity  TEXT,
  description   TEXT
);

-- ── Accountability / RACI (M20) ──────────────────────────────

CREATE TABLE accountability_entities (
  id          SERIAL PRIMARY KEY,
  entity_name TEXT,
  entity_type TEXT,
  department  TEXT
);

CREATE TABLE accountability_links (
  id          SERIAL PRIMARY KEY,
  entity_id   INTEGER,
  person_name TEXT,
  raci_role   TEXT
);

CREATE TABLE accountability_scores (
  id                 SERIAL PRIMARY KEY,
  entity_id          INTEGER,
  score              INTEGER,
  status             TEXT,
  same_r_and_a       BOOLEAN,
  missing_responsible BOOLEAN,
  missing_accountable BOOLEAN
);

CREATE TABLE accountability_summary (
  id                   SERIAL PRIMARY KEY,
  accountability_score INTEGER,
  status               TEXT,
  total_entities       INTEGER,
  entities_with_links  INTEGER,
  same_r_and_a_count   INTEGER,
  unique_people_count  INTEGER
);
