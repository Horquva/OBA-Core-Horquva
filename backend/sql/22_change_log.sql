-- 22_change_log.sql — Feature 3: the dependency change log.
--
-- WHY THIS EXISTS
-- Structural mutations used to leave zero longitudinal footprint: changing an
-- agent's owner flushed caches and moved on — no record of what changed, what
-- it cascaded into downstream, or what it did to organizational health.
-- Feature 3 (Change → Impact) writes every mutation here:
--
--   dependency_change_log — one immutable row per mutation: what changed
--     (mutation_type, target, before/after snapshots), who (actor), what it
--     did (blast_radius_score from a seeded Engine A walk on the MUTATED
--     topology, health_delta = ΔOHI before vs after, impacted_entities,
--     mitigation), and an idempotency_key so network retries replay instead
--     of double-applying.
--
-- Volatility (Phase 3.3) reads this table; nothing updates or deletes rows
-- except retention. OUT_OF_BAND rows (direct SQL writes that bypassed the
-- API) come from the trigger backstop in 23_out_of_band_triggers.sql and
-- carry before/after only — no cascade computation.
--
-- ⛔ DO NOT RUN BY HAND — `node run_migrations.js` (see 01's header).

BEGIN;

create table if not exists public.dependency_change_log (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.orgs(id) default '00000000-0000-4000-8000-000000000001',
  idempotency_key    text,
  mutation_type      text not null,
  target_type        text not null,
  target_id          uuid,
  actor_id           text,
  before             jsonb,
  after              jsonb,
  blast_radius_score numeric,
  health_delta       numeric,
  impacted_entities  jsonb,
  mitigation         jsonb,
  created_at         timestamptz not null default now()
);

-- Idempotent retries: one mutation per key per org. Partial — mutations
-- without a key (internal calls) are never deduplicated.
create unique index if not exists uq_change_log_idempotency
  on public.dependency_change_log (org_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_change_log_created
  on public.dependency_change_log (org_id, created_at desc);
create index if not exists idx_change_log_target
  on public.dependency_change_log (org_id, target_type, target_id, created_at desc);
create index if not exists idx_change_log_type
  on public.dependency_change_log (org_id, mutation_type, created_at desc);

alter table public.dependency_change_log enable row level security;
drop policy if exists tenant_isolation on public.dependency_change_log;
create policy tenant_isolation on public.dependency_change_log
  using (org_id = current_setting('app.current_org', true)::uuid);

revoke all on public.dependency_change_log from anon, authenticated;

notify pgrst, 'reload schema';

COMMIT;
