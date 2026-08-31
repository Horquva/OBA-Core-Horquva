-- ============================================================
-- OBA — MIGRATION 03: Fizza's Intelligence Module Tables
-- Creates 21 tables required by routes:
--   truth, brainCore, orchestrator, executive, voice,
--   briefing, decisionSupport, health, executiveMemory, context
-- Run in Supabase SQL Editor AFTER 02_seed_data.sql
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. TRUTH LAYER
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS truth_entities (
  id          SERIAL PRIMARY KEY,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,  -- 'agent' | 'employee' | 'workflow' | 'platform'
  department  TEXT
);

CREATE TABLE IF NOT EXISTS truth_claims (
  id               SERIAL PRIMARY KEY,
  entity_id        INT REFERENCES truth_entities(id),
  claim_text       TEXT,
  claim_category   TEXT,       -- e.g. 'ownership', 'risk', 'documentation', 'continuity'
  evidence         TEXT,
  verdict          TEXT CHECK (verdict IN ('VERIFIED','UNVERIFIED','CONTRADICTED')),
  confidence_score NUMERIC,
  data_source      TEXT,
  is_contradicted  BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 2. EXECUTIVE MEMORY
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS executive_memory_items (
  id              SERIAL PRIMARY KEY,
  memory_type     TEXT,          -- 'lesson' | 'hero_risk' | 'repeat_offender' | 'bad_decision'
  title           TEXT,
  description     TEXT,
  entity_name     TEXT,
  relevance_score NUMERIC,
  severity        TEXT,          -- 'low' | 'medium' | 'high' | 'critical'
  source_module   TEXT,
  is_recurring    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_patterns (
  id               SERIAL PRIMARY KEY,
  pattern_name     TEXT,
  failure_type     TEXT,
  occurrence_count INT,
  affected_entities TEXT[],
  first_seen       TIMESTAMPTZ,
  last_seen        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hero_dependencies (
  id               SERIAL PRIMARY KEY,
  person_name      TEXT,
  department       TEXT,
  resolution_count INT,
  risk_level       TEXT,          -- 'low' | 'medium' | 'high' | 'critical'
  description      TEXT
);

-- ────────────────────────────────────────────────
-- 3. DECISION SUPPORT
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS decision_history (
  id             SERIAL PRIMARY KEY,
  title          TEXT,
  outcome        TEXT,            -- 'positive' | 'negative' | 'neutral'
  description    TEXT,
  decided_at     TIMESTAMPTZ,
  should_revisit BOOLEAN DEFAULT false,
  revisit_reason TEXT
);

CREATE TABLE IF NOT EXISTS decision_queue (
  id                 SERIAL PRIMARY KEY,
  title              TEXT,
  description        TEXT,
  driver             TEXT CHECK (driver IN ('spof','active_incident','undocumented_knowledge','other')),
  impact_score       INT,
  urgency_score      INT,
  effort_score       INT,
  blast_radius       INT,
  entity_name        TEXT,
  responsible_person TEXT,
  status             TEXT CHECK (status IN ('pending','in_progress','resolved'))
);

CREATE TABLE IF NOT EXISTS pending_decisions (
  id            SERIAL PRIMARY KEY,
  title         TEXT,
  description   TEXT,
  priority      TEXT,            -- 'critical' | 'high' | 'medium' | 'low'
  source_module TEXT,
  raised_at     TIMESTAMPTZ DEFAULT NOW(),
  status        TEXT DEFAULT 'pending'
);

-- ────────────────────────────────────────────────
-- 4. ORGANIZATIONAL HEALTH
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_health_snapshots (
  id                   SERIAL PRIMARY KEY,
  snapshot_month       TEXT,       -- e.g. '2026-06'
  health_index         INT,
  health_status        TEXT,       -- 'STABLE' | 'WARNING' | 'CRITICAL'
  documentation_score  INT,
  continuity_score     INT,
  ownership_spread_score INT,
  critical_safety_score  INT,
  incident_load_score    INT
);

CREATE TABLE IF NOT EXISTS dept_health_scores (
  id                   SERIAL PRIMARY KEY,
  department           TEXT,
  snapshot_month       TEXT,
  health_index         INT,
  health_status        TEXT,
  documentation_score  INT,
  continuity_score     INT,
  ownership_score      INT,
  safety_score         INT,
  incident_score       INT
);

CREATE TABLE IF NOT EXISTS documentation_trend (
  id             SERIAL PRIMARY KEY,
  recorded_month TEXT,
  coverage_pct   NUMERIC,
  total_assets   INT,
  documented     INT
);

-- ────────────────────────────────────────────────
-- 5. BRIEFING
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS executive_briefings (
  id                    SERIAL PRIMARY KEY,
  briefing_date         DATE,
  top_spof              TEXT,
  top_spof_owner        TEXT,
  most_overloaded_owner TEXT,
  overload_score        NUMERIC,
  latest_incident       TEXT,
  lesson_learned        TEXT,
  doc_trend_current     NUMERIC,
  doc_trend_previous    NUMERIC,
  doc_trend_status      TEXT,       -- 'IMPROVING' | 'DECLINING' | 'STABLE'
  summary_points        JSONB
);

-- ────────────────────────────────────────────────
-- 6. EXECUTIVE INTELLIGENCE (NLP session log + question library)
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS executive_sessions (
  id                 SERIAL PRIMARY KEY,
  question           TEXT,
  question_type      TEXT,
  answer_summary     TEXT,
  entity_name        TEXT,
  responsible_person TEXT,
  data_sources       JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executive_questions (
  id            SERIAL PRIMARY KEY,
  question_text TEXT,
  question_type TEXT
);

-- ────────────────────────────────────────────────
-- 7. VOICE INTELLIGENCE
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS voice_intents (
  id            SERIAL PRIMARY KEY,
  intent_name   TEXT,
  example_query TEXT
);

CREATE TABLE IF NOT EXISTS voice_history (
  id              SERIAL PRIMARY KEY,
  query           TEXT,
  detected_intent TEXT,
  resolved_entity TEXT,
  entity_type     TEXT,
  answer          TEXT,
  confidence      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_daily_summary (
  id         SERIAL PRIMARY KEY,
  summary    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 8. INTELLIGENCE RESULTS  (cross-module aggregation)
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intelligence_results (
  id          SERIAL PRIMARY KEY,
  result_type TEXT,   -- 'pillar' | 'overall'
  result_key  TEXT,   -- 'GI' | 'MI' | 'DI' | 'org_score'
  score       INT,
  rating      TEXT,
  strengths   TEXT[],
  weaknesses  TEXT[]
);

-- ────────────────────────────────────────────────
-- 9. BRAIN CORE + ORCHESTRATOR SNAPSHOTS (cache tables)
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brain_core_snapshots (
  id               SERIAL PRIMARY KEY,
  brain_index      INT,
  posture          TEXT,      -- 'STABLE' | 'STRAINED' | 'CRITICAL'
  summary          TEXT,
  top_signals      JSONB,
  explanation      TEXT,
  signal_breakdown JSONB,
  computed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orchestrator_snapshots (
  id                              SERIAL PRIMARY KEY,
  organizational_intelligence_score INT,
  rating                          TEXT,
  final_verdict                   TEXT,
  brain_posture                   TEXT,
  trust_score                     INT,
  executive_recommendations       JSONB,
  module_breakdown                JSONB,
  computed_at                     TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- 10. CONTEXT ITEMS  (executive avatar feed)
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS context_items (
  id                 SERIAL PRIMARY KEY,
  context_type       TEXT,    -- 'incident' | 'decision' | 'metric' | 'spof'
  title              TEXT,
  description        TEXT,
  entity_name        TEXT,
  responsible_person TEXT,
  urgency            TEXT CHECK (urgency IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  blast_radius       INT,
  source_module      TEXT,
  status             TEXT DEFAULT 'open'
);
