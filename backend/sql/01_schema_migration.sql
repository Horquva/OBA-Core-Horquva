-- ============================================================
-- OBA — ORGANIZATIONAL DATA MODEL — FULL SCHEMA MIGRATION
-- Run this FIRST in Supabase SQL Editor
-- WARNING: This will DROP all existing tables and recreate them
-- ============================================================

-- ────────────────────────────────────────────────
-- 0. Drop all existing tables (in dependency order)
-- ────────────────────────────────────────────────

DROP TABLE IF EXISTS forecast_findings CASCADE;
DROP TABLE IF EXISTS organizational_forecasts CASCADE;
DROP TABLE IF EXISTS collaboration_summary CASCADE;
DROP TABLE IF EXISTS collaboration_scores CASCADE;
DROP TABLE IF EXISTS accountability_summary CASCADE;
DROP TABLE IF EXISTS accountability_scores CASCADE;
DROP TABLE IF EXISTS accountability_links CASCADE;
DROP TABLE IF EXISTS accountability_entities CASCADE;
DROP TABLE IF EXISTS continuity_plans CASCADE;
DROP TABLE IF EXISTS continuity_assessments CASCADE;
DROP TABLE IF EXISTS learning_snapshots CASCADE;
DROP TABLE IF EXISTS failure_patterns CASCADE;
DROP TABLE IF EXISTS department_exposure CASCADE;
DROP TABLE IF EXISTS governance_gaps CASCADE;
DROP TABLE IF EXISTS governance_assessments CASCADE;
DROP TABLE IF EXISTS predictive_risk_scores CASCADE;
DROP TABLE IF EXISTS policy_violations CASCADE;
DROP TABLE IF EXISTS verification_actions CASCADE;
DROP TABLE IF EXISTS organizational_decisions CASCADE;
DROP TABLE IF EXISTS decision_factors CASCADE;
DROP TABLE IF EXISTS workflow_orchestration CASCADE;
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS workflow_failures CASCADE;
DROP TABLE IF EXISTS workflow_runbooks CASCADE;
DROP TABLE IF EXISTS workflow_tool_dependencies CASCADE;
DROP TABLE IF EXISTS workflow_dependencies CASCADE;
DROP TABLE IF EXISTS knowledge_assets CASCADE;
DROP TABLE IF EXISTS tool_spend CASCADE;
DROP TABLE IF EXISTS tool_policies CASCADE;
DROP TABLE IF EXISTS tool_backups CASCADE;
DROP TABLE IF EXISTS tool_users CASCADE;
DROP TABLE IF EXISTS tool_ownership CASCADE;
DROP TABLE IF EXISTS agent_platform CASCADE;
DROP TABLE IF EXISTS employee_agent CASCADE;
DROP TABLE IF EXISTS dependencies CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS snapshots CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS ai_platforms CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- ────────────────────────────────────────────────
-- 1. CORE ENTITIES
-- ────────────────────────────────────────────────

-- Employees (Person entity from canonical model)
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  risk TEXT DEFAULT 'low' CHECK (risk IN ('low','medium','high','critical')),
  tenure NUMERIC(4,1) DEFAULT 1.0,          -- years
  skills TEXT[] DEFAULT '{}',
  workload INTEGER DEFAULT 50 CHECK (workload BETWEEN 0 AND 100),
  manager TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owners (for backward compatibility — maps to employees who own things)
CREATE TABLE owners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  backup_owner TEXT,
  risk TEXT DEFAULT 'low' CHECK (risk IN ('low','medium','high','critical')),
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL
);

-- AI Platforms / Tools
CREATE TABLE ai_platforms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                       -- 'llm','code_assistant','design','analytics' etc.
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','deprecated')),
  cost_monthly NUMERIC(10,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  adoption_pct INTEGER DEFAULT 0 CHECK (adoption_pct BETWEEN 0 AND 100),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'automation',           -- 'automation','analysis','monitoring','assistant'
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','deprecated','failed')),
  risk TEXT DEFAULT 'low' CHECK (risk IN ('low','medium','high','critical')),
  owner_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  adoption_pct INTEGER DEFAULT 0 CHECK (adoption_pct BETWEEN 0 AND 100),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  cost NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows
CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','degraded','failed')),
  risk TEXT DEFAULT 'low' CHECK (risk IN ('low','medium','high','critical')),
  department TEXT,
  frequency TEXT DEFAULT 'daily',           -- 'hourly','daily','weekly','monthly','on_demand'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 2. RELATIONSHIP / JUNCTION TABLES
-- ────────────────────────────────────────────────

-- Employee ↔ Agent mapping
CREATE TABLE employee_agent (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner'                 -- 'owner','operator','backup'
);

-- Agent ↔ Platform mapping
CREATE TABLE agent_platform (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id) ON DELETE CASCADE
);

-- Dependencies (edges in the dependency graph)
CREATE TABLE dependencies (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  source_type TEXT NOT NULL,                -- 'agent','workflow','platform','employee'
  target_type TEXT NOT NULL,
  dependency_type TEXT DEFAULT 'normal' CHECK (dependency_type IN ('critical','high','normal','low')),
  strength INTEGER DEFAULT 50 CHECK (strength BETWEEN 0 AND 100),
  -- Legacy FK columns for backward compat
  agent_source INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  agent_target INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations
CREATE TABLE recommendations (
  id SERIAL PRIMARY KEY,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  recommendation TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','done','dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 3. TOOL MODULE TABLES
-- ────────────────────────────────────────────────

-- Tool ownership
CREATE TABLE tool_ownership (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE
);

-- Tool users
CREATE TABLE tool_users (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  usage_level TEXT DEFAULT 'regular' CHECK (usage_level IN ('power','regular','occasional','rare'))
);

-- Tool backups
CREATE TABLE tool_backups (
  id SERIAL PRIMARY KEY,
  primary_platform INTEGER NOT NULL REFERENCES ai_platforms(id) ON DELETE CASCADE,
  backup_platform INTEGER NOT NULL REFERENCES ai_platforms(id) ON DELETE CASCADE
);

-- Tool policies
CREATE TABLE tool_policies (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','pending','expired'))
);

-- Tool spend
CREATE TABLE tool_spend (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id) ON DELETE CASCADE,
  amount_usd NUMERIC(10,2) NOT NULL,
  month TEXT NOT NULL                       -- '2026-01' format
);

-- ────────────────────────────────────────────────
-- 4. WORKFLOW MODULE TABLES
-- ────────────────────────────────────────────────

-- Workflow ↔ Agent dependencies
CREATE TABLE workflow_dependencies (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  is_critical BOOLEAN DEFAULT false
);

-- Workflow ↔ Tool dependencies
CREATE TABLE workflow_tool_dependencies (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id) ON DELETE CASCADE,
  is_critical BOOLEAN DEFAULT false
);

-- Workflow runbooks
CREATE TABLE workflow_runbooks (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  is_documented BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow failures
CREATE TABLE workflow_failures (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  failure_type TEXT NOT NULL,               -- 'human_spof','tool_failure','process_gap','escalation_failure'
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  description TEXT
);

-- Workflow steps (for orchestration)
CREATE TABLE workflow_steps (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  actor_type TEXT NOT NULL,                 -- 'human','agent','tool'
  actor_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 5. KNOWLEDGE MODULE TABLES
-- ────────────────────────────────────────────────

-- Knowledge assets
CREATE TABLE knowledge_assets (
  id SERIAL PRIMARY KEY,
  asset_type TEXT NOT NULL,                 -- 'agent','workflow','platform','process','system'
  asset_id INTEGER,
  topic TEXT,
  is_documented BOOLEAN DEFAULT false,
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('critical','high','medium','low')),
  owner_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 6. TIME-SERIES / SNAPSHOTS
-- ────────────────────────────────────────────────

CREATE TABLE snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  headcount INTEGER DEFAULT 0,
  avg_workload INTEGER DEFAULT 50,
  total_tool_cost NUMERIC(10,2) DEFAULT 0,
  risk_index NUMERIC(5,2) DEFAULT 0,
  memory_health INTEGER DEFAULT 50,
  continuity_score INTEGER DEFAULT 50,
  governance_score INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 7. PREDICTIVE RISK MODULE
-- ────────────────────────────────────────────────

CREATE TABLE predictive_risk_scores (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  predicted_score INTEGER DEFAULT 0 CHECK (predicted_score BETWEEN 0 AND 100),
  threat_level TEXT DEFAULT 'LOW' CHECK (threat_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  is_emerging_threat BOOLEAN DEFAULT false,
  contributing_factors JSONB DEFAULT '{}',
  reasons TEXT[] DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 8. FORECAST MODULE
-- ────────────────────────────────────────────────

CREATE TABLE organizational_forecasts (
  id SERIAL PRIMARY KEY,
  horizon_days INTEGER NOT NULL,            -- 30, 60, 90
  health_score INTEGER DEFAULT 50,
  health_trend TEXT DEFAULT 'stable',       -- 'improving','stable','declining'
  memory_score INTEGER DEFAULT 50,
  knowledge_loss_risk TEXT DEFAULT 'medium',
  continuity_score INTEGER DEFAULT 50,
  resilience_forecast TEXT DEFAULT 'stable',
  outlook_score INTEGER DEFAULT 50,
  outlook_status TEXT DEFAULT 'STABLE',     -- 'STRONG','STABLE','WEAK','CRITICAL'
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forecast_findings (
  id SERIAL PRIMARY KEY,
  forecast_id INTEGER NOT NULL REFERENCES organizational_forecasts(id) ON DELETE CASCADE,
  finding_type TEXT NOT NULL,               -- 'critical_memory_carrier','fragile_workflow','no_backup','undocumented'
  reference_name TEXT NOT NULL,
  detail TEXT
);

-- ────────────────────────────────────────────────
-- 9. COLLABORATION MODULE
-- ────────────────────────────────────────────────

CREATE TABLE collaboration_scores (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  adoption_score INTEGER DEFAULT 0,
  dependency_score INTEGER DEFAULT 0,
  collaboration_score INTEGER DEFAULT 0,
  ai_tools_used INTEGER DEFAULT 0,
  ai_agents_used INTEGER DEFAULT 0,
  critical_agents_owned INTEGER DEFAULT 0,
  has_backup BOOLEAN DEFAULT false,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collaboration_summary (
  id SERIAL PRIMARY KEY,
  ai_adoption_score INTEGER DEFAULT 0,
  adoption_level TEXT DEFAULT 'LOW',
  human_dependency_score INTEGER DEFAULT 0,
  highest_dependency_employee TEXT,
  collaboration_score INTEGER DEFAULT 0,
  collaboration_level TEXT DEFAULT 'FAIR',
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 10. DECISION MODULE
-- ────────────────────────────────────────────────

CREATE TABLE organizational_decisions (
  id SERIAL PRIMARY KEY,
  decision_type TEXT NOT NULL,              -- 'ownership','backup','documentation','tool_selection','risk_mitigation'
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  owner_name TEXT,
  decision_score INTEGER DEFAULT 50,
  quality_tier TEXT DEFAULT 'ACCEPTABLE' CHECK (quality_tier IN ('GOOD','ACCEPTABLE','POOR','HARMFUL')),
  recommended_fix TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE decision_factors (
  id SERIAL PRIMARY KEY,
  decision_id INTEGER NOT NULL REFERENCES organizational_decisions(id) ON DELETE CASCADE,
  factor_name TEXT NOT NULL,
  factor_status TEXT NOT NULL,              -- 'met','not_met','partial'
  score_impact INTEGER DEFAULT 0
);

-- ────────────────────────────────────────────────
-- 11. VERIFICATION MODULE
-- ────────────────────────────────────────────────

CREATE TABLE verification_actions (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflows(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL,                 -- 'human','agent','tool'
  actor_name TEXT NOT NULL,
  action_name TEXT NOT NULL,
  outcome TEXT DEFAULT 'success',           -- 'success','failure','partial'
  verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('COMPLETED','PENDING','FAILED','FLAGGED')),
  policy_compliant BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policy_violations (
  id SERIAL PRIMARY KEY,
  action_id INTEGER NOT NULL REFERENCES verification_actions(id) ON DELETE CASCADE,
  violation_reason TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 12. ORCHESTRATION MODULE
-- ────────────────────────────────────────────────

CREATE TABLE workflow_orchestration (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','blocked','failed')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 13. LEARNING MODULE
-- ────────────────────────────────────────────────

CREATE TABLE learning_snapshots (
  id SERIAL PRIMARY KEY,
  learning_maturity_score INTEGER DEFAULT 0,
  learning_maturity_level TEXT DEFAULT 'INITIAL',   -- 'INITIAL','DEVELOPING','DEFINED','MANAGED','OPTIMIZING'
  total_known_risks INTEGER DEFAULT 0,
  mitigated_risks INTEGER DEFAULT 0,
  unmitigated_risks INTEGER DEFAULT 0,
  mitigation_percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE failure_patterns (
  id SERIAL PRIMARY KEY,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  appearance_count INTEGER DEFAULT 1,
  failure_severity TEXT DEFAULT 'medium' CHECK (failure_severity IN ('critical','high','medium','low')),
  is_repeat_offender BOOLEAN DEFAULT false,
  reasons TEXT[] DEFAULT '{}'
);

CREATE TABLE department_exposure (
  id SERIAL PRIMARY KEY,
  department TEXT NOT NULL,
  documentation_coverage NUMERIC(5,2) DEFAULT 0,
  backup_coverage NUMERIC(5,2) DEFAULT 0,
  incident_exposure_score INTEGER DEFAULT 0,
  incident_risk_level TEXT DEFAULT 'LOW' CHECK (incident_risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);

-- ────────────────────────────────────────────────
-- 14. CONTINUITY MODULE
-- ────────────────────────────────────────────────

CREATE TABLE continuity_assessments (
  id SERIAL PRIMARY KEY,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  department TEXT NOT NULL,
  owner_name TEXT,
  continuity_score INTEGER DEFAULT 50,
  continuity_status TEXT DEFAULT 'DEGRADED' CHECK (continuity_status IN ('SURVIVES','DEGRADED','FAILS','LOST')),
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('critical','high','medium','low'))
);

CREATE TABLE continuity_plans (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES continuity_assessments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,                -- 'document','assign_backup','cross_train','automate'
  action_detail TEXT NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed'))
);

-- ────────────────────────────────────────────────
-- 15. GOVERNANCE MODULE
-- ────────────────────────────────────────────────

CREATE TABLE governance_assessments (
  id SERIAL PRIMARY KEY,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  department TEXT NOT NULL,
  owner_name TEXT,
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('critical','high','medium','low')),
  governance_score INTEGER DEFAULT 50,
  governance_status TEXT DEFAULT 'WARNING' CHECK (governance_status IN ('HEALTHY','WARNING','AT_RISK','CRITICAL'))
);

CREATE TABLE governance_gaps (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES governance_assessments(id) ON DELETE CASCADE,
  gap_type TEXT NOT NULL,                   -- 'no_owner','no_documentation','no_backup','no_policy','stale_review'
  gap_severity TEXT DEFAULT 'MEDIUM' CHECK (gap_severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  description TEXT
);

-- ────────────────────────────────────────────────
-- 16. ACCOUNTABILITY MODULE
-- ────────────────────────────────────────────────

CREATE TABLE accountability_entities (
  id SERIAL PRIMARY KEY,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,                -- 'workflow','agent','platform','process','policy'
  department TEXT NOT NULL
);

CREATE TABLE accountability_links (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES accountability_entities(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  raci_role TEXT NOT NULL CHECK (raci_role IN ('Responsible','Accountable','Consulted','Informed','Decision Authority'))
);

CREATE TABLE accountability_scores (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES accountability_entities(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 50,
  status TEXT DEFAULT 'PARTIAL' CHECK (status IN ('COMPLETE','PARTIAL','MISSING','CRITICAL')),
  same_r_and_a BOOLEAN DEFAULT false,
  missing_responsible BOOLEAN DEFAULT false,
  missing_accountable BOOLEAN DEFAULT false
);

CREATE TABLE accountability_summary (
  id SERIAL PRIMARY KEY,
  accountability_score INTEGER DEFAULT 50,
  status TEXT DEFAULT 'PARTIAL',
  total_entities INTEGER DEFAULT 0,
  entities_with_links INTEGER DEFAULT 0,
  same_r_and_a_count INTEGER DEFAULT 0,
  unique_people_count INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 17. INDEXES
-- ────────────────────────────────────────────────

CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_risk ON employees(risk);
CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_agents_risk ON agents(risk);
CREATE INDEX idx_dependencies_source ON dependencies(source_id, source_type);
CREATE INDEX idx_dependencies_target ON dependencies(target_id, target_type);
CREATE INDEX idx_workflow_deps_wf ON workflow_dependencies(workflow_id);
CREATE INDEX idx_workflow_tool_deps_wf ON workflow_tool_dependencies(workflow_id);
CREATE INDEX idx_knowledge_owner ON knowledge_assets(owner_id);
CREATE INDEX idx_snapshots_date ON snapshots(snapshot_date);
CREATE INDEX idx_tool_users_platform ON tool_users(platform_id);
CREATE INDEX idx_verification_actor ON verification_actions(actor_name);
CREATE INDEX idx_workflow_steps_wf ON workflow_steps(workflow_id, step_number);

-- ────────────────────────────────────────────────
-- DONE — Schema ready for seed data
-- ────────────────────────────────────────────────
