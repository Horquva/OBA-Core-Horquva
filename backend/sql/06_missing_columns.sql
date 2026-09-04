-- 06_missing_columns.sql — add timestamp columns the API orders by.
--
-- WHY THIS EXISTS
-- Same root cause as 05_foreign_keys.sql: the schema in git is behind the code.
-- Nine routes call .order('computed_at') / .order('created_at') on tables whose
-- CREATE TABLE never declared that column, so they fail with:
--     "column <table>.<column> does not exist"
--
-- These were added by hand to the previous Supabase project and never written
-- back into a migration, so a database built from this repo was missing them.
--
-- Defaulting to now() means existing rows sort together by insertion time rather
-- than nulling out, which keeps "most recent first" ordering sane on seed data.

alter table public.accountability_summary  add column if not exists computed_at   timestamptz default now();
alter table public.collaboration_scores    add column if not exists computed_at   timestamptz default now();
alter table public.collaboration_summary   add column if not exists computed_at   timestamptz default now();
alter table public.decision_history        add column if not exists computed_at   timestamptz default now();
alter table public.learning_snapshots      add column if not exists created_at    timestamptz default now();
alter table public.predictive_risk_scores  add column if not exists computed_at   timestamptz default now();
alter table public.workflow_runbooks       add column if not exists computed_at   timestamptz default now();
alter table public.intelligence_results    add column if not exists computed_at   timestamptz default now();

-- agents.snapshot_date is a date, not a timestamp — /api/agents orders by it to
-- find the latest snapshot row per agent.
alter table public.agents                  add column if not exists snapshot_date date default current_date;

notify pgrst, 'reload schema';
