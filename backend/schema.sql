-- =============================================================================
-- Horquva OBA - Supabase schema for Anusha's Automation + Interaction layer
-- Modules: M16 Orchestration, M21 Avatar
--
-- Applied by run_migrations.js, first in sequence — see backend/DB_SETUP.md.
-- Never hand-run this in the Supabase SQL editor; run_migrations.js is the
-- only supported path (it records what's applied in schema_migrations, which
-- is what makes re-running it safe).
--
-- DATA-2 (system diagnostic, 2026-09-02): this file used to also define
-- verification_logs, orchestration_state, continuity_assessments,
-- continuity_plans, governance_assessments and governance_gaps, plus a block
-- of demo INSERTs into them and into escalation_logs. None of those five
-- tables were read or written anywhere in the codebase — orchestration_state
-- and verification_logs were superseded before this repo's history started
-- (the app reads workflow_orchestration and verification_actions instead, see
-- 01_schema_migration.sql), and the continuity/governance four were dead on
-- arrival: 01_schema_migration.sql DROP TABLE ... CASCADE's all four and
-- recreates them with a different column set moments later in the same run,
-- so this file's versions never described what was really in the database.
-- Removed rather than left as dead weight every future setup would create
-- and immediately drop. The demo seed block is removed outright, not just
-- pointed at real tables — it inserted a fabricated "Lead Generation
-- Workflow" / "Robert" escalation into escalation_logs, a table the app
-- genuinely reads (/api/avatar/escalations), so a fresh setup would have
-- shown a fictitious critical escalation as if it were real data.
--
-- execution_intents is kept even though nothing currently reads or writes it
-- either: 07_intent_accountability.sql ALTERs it, and dropping the table here
-- without also retiring that migration would break a fresh setup. Left as
-- unused rather than adding a second migration to remove it in the same pass
-- that only decided to trim this file.
-- =============================================================================

-- ---- M16: Execution intents (emitted by M51/M52/M53 -> received by M16) -----
-- ⚠ UNUSED: no route in this codebase reads or writes this table. Kept
-- because 07_intent_accountability.sql ALTERs it — see header above.
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
