-- =============================================================================
-- Horquva OBA - Supabase schema for Anusha's Automation + Interaction layer
-- Modules: M15 Verification, M16 Orchestration, M21 Avatar, M23 Briefing,
--          M51 Self-Healing, M52 Governance, M53 Continuity
--
-- Run this ONCE in the Supabase SQL editor before starting the backend.
-- All tables are safe to re-run (IF NOT EXISTS).
-- =============================================================================

-- ---- M15: Verification logs -------------------------------------------------
create table if not exists verification_logs (
  id                bigserial primary key,
  action_id         text,
  actor_type        text        not null,          -- human | agent | tool
  actor_name        text        not null,
  action            text        not null,
  workflow_id       text        not null,
  status            text        not null,          -- completed | flagged | failed
  policy_compliant  boolean     not null default true,
  verified          boolean     not null default true,
  flag_reason       text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_verification_workflow on verification_logs(workflow_id);
create index if not exists idx_verification_status   on verification_logs(status);

-- ---- M16: Orchestration state ----------------------------------------------
create table if not exists orchestration_state (
  id                 bigserial primary key,
  workflow_id        text        not null,
  workflow_name      text,
  status             text        not null default 'running', -- running|blocked|paused|completed
  current_step       int         not null default 1,
  total_steps        int         not null default 1,
  next_actor_name    text,
  next_actor_type    text,                                    -- human | agent | tool
  collision_detected boolean     not null default false,
  collision_detail   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_orch_workflow on orchestration_state(workflow_id);
create index if not exists idx_orch_status   on orchestration_state(status);

-- ---- M16: Execution intents (emitted by M51/M52/M53 -> received by M16) -----
create table if not exists execution_intents (
  id             bigserial primary key,
  intent_id      text        not null unique,
  source_module  text        not null,             -- M51 | M52 | M53 | ...
  intent_type    text        not null,             -- pause_workflow|unblock_workflow|resume_workflow|reassign_actor
  workflow_id    text,
  action         text        not null,
  reasoning      text,
  payload        jsonb       not null default '{}'::jsonb,
  status         text        not null default 'advisory', -- advisory|pending|approved|executed|rejected
  execution_mode text        not null default 'advisory',
  created_at     timestamptz not null default now()
);
create index if not exists idx_intents_status on execution_intents(status);

-- ---- M16: Execution mode (governs autonomy level) --------------------------
create table if not exists execution_mode (
  id         bigserial primary key,
  mode       text        not null default 'advisory', -- advisory|assisted|governed_autonomous|fully_autonomous
  created_at timestamptz not null default now()
);
-- Seed the safest default: advisory (never auto-acts).
insert into execution_mode (mode) values ('advisory')
  on conflict do nothing;

-- ---- M21: Escalation logs (avatar gate-check escalations) -------------------
create table if not exists escalation_logs (
  id           bigserial primary key,
  workflow_id  text,
  severity     text        not null default 'medium', -- critical|high|medium|low
  status       text        not null default 'open',    -- open|acknowledged|resolved
  reason       text,
  detail       text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_escalation_status   on escalation_logs(status);
create index if not exists idx_escalation_severity on escalation_logs(severity);

-- ---- M18 / M19: Continuity + Governance intelligence read tables ------------
-- Kamran's read-only APIs (/api/continuity/*, /api/governance/*) read these.
-- Populate them from the Python engine output (M18 / M19) or a sync job.
create table if not exists continuity_assessments (
  id             bigserial primary key,
  asset          text,
  asset_type     text,
  department     text,
  continuity_score int,
  status         text,                               -- SURVIVES|DEGRADED|FAILS|LOST
  created_at     timestamptz not null default now()
);
create table if not exists continuity_plans (
  id           bigserial primary key,
  asset        text,
  plan         text,
  priority     text,
  created_at   timestamptz not null default now()
);
create table if not exists governance_assessments (
  id               bigserial primary key,
  entity           text,
  entity_type      text,
  department       text,
  governance_score int,
  status           text,                             -- HEALTHY|WARNING|AT_RISK|CRITICAL
  created_at       timestamptz not null default now()
);
create table if not exists governance_gaps (
  id           bigserial primary key,
  entity       text,
  gap          text,
  severity     text,
  created_at   timestamptz not null default now()
);

-- =============================================================================
-- Optional: quick sample rows so the dashboards render immediately.
-- Comment out in production.
-- =============================================================================
insert into orchestration_state (workflow_id, workflow_name, status, current_step, total_steps, next_actor_name, next_actor_type, collision_detected)
values
  ('wf_001','Lead Generation Workflow','running',2,4,'Robert','human',false),
  ('wf_002','Onboarding Workflow','blocked',1,3,'Robert','human',true)
on conflict do nothing;

insert into verification_logs (actor_type, actor_name, action, workflow_id, status, policy_compliant, verified)
values
  ('agent','Lead Scoring Agent','Score inbound leads','wf_001','completed',true,true),
  ('human','Robert','Approve onboarding','wf_002','flagged',false,false)
on conflict do nothing;

insert into escalation_logs (workflow_id, severity, status, reason)
values ('wf_002','critical','open','policy_violation')
on conflict do nothing;
