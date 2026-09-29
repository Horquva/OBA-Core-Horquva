-- 21_score_history.sql — Spec 1: score + evidence persistence ledger.
--
-- WHY THIS EXISTS
-- Every calculated score in OBA Core is computed on demand (Invariant 1) and,
-- until now, discarded the moment the HTTP response was serialized. An
-- executive or auditor could not inspect what the org's risk posture WAS two
-- weeks ago, nor verify which facts justified a score. This ledger persists:
--
--   score_history    — one row per scored entity per run (score, threat
--                      level, model version, org, timestamp);
--   evidence_records — the backing facts for a score row (fact text, source
--                      table + row id, weight), linked to its score_history
--                      row. Together they make a score REPLAYABLE: the
--                      stored evidence reproduces the stored score.
--
-- Writes are best-effort from domain/scoreLedger.js: a persistence failure
-- never fails the read path (scores are still computed live per Invariant 1).
-- Rows are append-only — nothing updates or deletes them except retention.
--
-- RETENTION: keep 180 days. If pg_cron is enabled on the project:
--   select cron.schedule('score-history-retention', '0 3 * * *',
--     $$delete from score_history where recorded_at < now() - interval '180 days'$$);
-- otherwise run that delete on a schedule outside the app.
--
-- ⛔ DO NOT RUN BY HAND — `node run_migrations.js` (see 01's header).

BEGIN;

create table if not exists public.score_history (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs(id) default '00000000-0000-4000-8000-000000000001',
  entity_type   text not null,
  entity_id     uuid not null,
  score         numeric,
  threat_level  text,
  model_version text not null,
  evidence      jsonb,
  recorded_at   timestamptz not null default now()
);

create table if not exists public.evidence_records (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs(id) default '00000000-0000-4000-8000-000000000001',
  score_history_id uuid not null references public.score_history(id) on delete cascade,
  fact             text not null,
  source_table     text not null,
  source_row_id    text,
  weight           numeric,
  verified         boolean not null default true
);

create index if not exists idx_score_history_entity
  on public.score_history (org_id, entity_type, entity_id, recorded_at desc);
create index if not exists idx_score_history_recorded
  on public.score_history (org_id, recorded_at desc);
create index if not exists idx_evidence_records_score
  on public.evidence_records (score_history_id);

-- Same tenant policy as the business tables (20_multi_tenancy.sql): RLS is
-- defense-in-depth for direct data-API access; the backend scopes reads via
-- lib/tenant.js and sets org_id explicitly on insert.
alter table public.score_history enable row level security;
drop policy if exists tenant_isolation on public.score_history;
create policy tenant_isolation on public.score_history
  using (org_id = current_setting('app.current_org', true)::uuid);

alter table public.evidence_records enable row level security;
drop policy if exists tenant_isolation on public.evidence_records;
create policy tenant_isolation on public.evidence_records
  using (org_id = current_setting('app.current_org', true)::uuid);

revoke all on public.score_history from anon, authenticated;
revoke all on public.evidence_records from anon, authenticated;

notify pgrst, 'reload schema';

COMMIT;
