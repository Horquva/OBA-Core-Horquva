-- 25_revamp_live_repair.sql — repairs two defects 19–23 left in the live DB.
--
-- WHY THIS EXISTS
-- 19–24 were applied to production on 2026-09-28. Two problems came with them:
--
--   1. fn_record_out_of_band (23) wrote `coalesce(new.id, old.id)` into
--      dependency_change_log.target_id (uuid). Six of the twelve trigger
--      tables — owners, dependencies, tool_ownership, tool_backups,
--      knowledge_assets, workflow_runbooks — keep SERIAL integer ids (19 only
--      converted the six entity tables), and Postgres has no integer→uuid
--      cast, so EVERY update/delete on those tables raised and rolled back:
--      owner reassignment, edge removal and entity deletion through
--      domain/mutations.js all failed. The triggers also fired on the API's
--      own writes (row triggers fire regardless of caller), double-recording
--      every mutation the mutation layer had already logged and inflating
--      the volatility series built from this table.
--
--   2. tool_spend.platform_id (15) references ai_platforms but was missing
--      from 19's conversion list: 19 dropped its FK and then dropped the
--      integer ai_platforms.id it pointed at, leaving 72 spend rows keyed by
--      integers that no longer identify anything. 19 now converts it for
--      fresh builds; the live DB is repaired here.
--
-- FIX 1: the function is rewritten to
--   - skip writes made by the backend. Every app write goes through
--     PostgREST as the service role (the only direct-Postgres client is
--     run_migrations.js), and those writes are already logged — with cascade
--     pricing — by domain/mutations.js. What remains is exactly what the
--     trigger was for: SQL editor / psql / ETL writes;
--   - read the row id generically (jsonb) and put it in target_id only when
--     it is a uuid; every id, int or uuid, also lands in the new text column
--     target_ref so integer-keyed rows stay identifiable;
--   - run as SECURITY INVOKER with a pinned search_path (the SECURITY
--     DEFINER original had neither reason nor search_path).
--
-- FIX 2: the integer → platform mapping is recovered from 02_seed_data.sql's
-- explicit ids (1 = ChatGPT Enterprise … 12 = DataRobot). Verified against
-- the live rows before writing this file: each id's 2026-06 amount_usd
-- equals that platform's ai_platforms.cost_monthly for 11 of 12 ids; the
-- twelfth (11, Perplexity Pro, status inactive) spent 0 in June and is the
-- only remaining platform. The block aborts the whole transaction if any
-- spend row fails to map, so a partial repair cannot land.
--
-- FIX 3: escalation_logs and execution_mode were left out of 20's org_id
-- list, but routes/avatar/index.js and routes/orchestration/orchestration.js
-- read both through applyOrgScope — `.eq('org_id', …)` on a column that does
-- not exist, so both reads 500'd. They get the same org_id + tenant policy
-- as every other business table.
--
-- All three fixes are idempotent: on a fresh build (where 19 already
-- converted tool_spend) the repair block is a no-op.
--
-- ⛔ DO NOT RUN BY HAND — `node run_migrations.js` (see 01's header).

BEGIN;

-- ── 1. out-of-band trigger function ─────────────────────────────────────────
alter table public.dependency_change_log add column if not exists target_ref text;

create or replace function public.fn_record_out_of_band()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row      jsonb;
  v_id       text;
  v_jwt_role text;
begin
  -- The API's writes are already in the change log (domain/mutations.js).
  v_jwt_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  if current_user = 'service_role' or v_jwt_role = 'service_role' then
    return null;
  end if;

  v_row := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_id  := v_row ->> 'id';

  insert into public.dependency_change_log (
    org_id, mutation_type, target_type, target_id, target_ref, actor_id, before, after
  ) values (
    coalesce((v_row ->> 'org_id')::uuid, '00000000-0000-4000-8000-000000000001'),
    'OUT_OF_BAND',
    tg_table_name,
    case when v_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then v_id::uuid end,
    v_id,
    'db-trigger:' || current_user,
    to_jsonb(old),
    case when tg_op = 'UPDATE' then to_jsonb(new) end
  );
  return null; -- AFTER trigger: return value is ignored
end;
$$;

-- ── 2. tool_spend.platform_id → uuid (live repair; no-op on fresh builds) ───
do $$
declare
  v_type     text;
  v_unmapped int;
begin
  select data_type into v_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'tool_spend' and column_name = 'platform_id';

  if v_type is distinct from 'integer' then
    return;
  end if;

  alter table public.tool_spend add column platform_uuid uuid;

  update public.tool_spend s
  set platform_uuid = p.id
  from (values
    (1,  'ChatGPT Enterprise'),
    (2,  'Claude Pro'),
    (3,  'GitHub Copilot'),
    (4,  'Gemini Advanced'),
    (5,  'Midjourney'),
    (6,  'Jasper AI'),
    (7,  'Cursor'),
    (8,  'Tableau AI'),
    (9,  'Notion AI'),
    (10, 'Grammarly Business'),
    (11, 'Perplexity Pro'),
    (12, 'DataRobot')
  ) as m(old_id, name)
  join public.ai_platforms p on p.name = m.name
  where s.platform_id = m.old_id;

  select count(*) into v_unmapped from public.tool_spend where platform_uuid is null;
  if v_unmapped > 0 then
    raise exception 'tool_spend repair: % row(s) did not map to an ai_platforms row — aborting', v_unmapped;
  end if;

  alter table public.tool_spend drop column platform_id; -- takes the (platform_id, month) unique with it
  alter table public.tool_spend rename column platform_uuid to platform_id;
  alter table public.tool_spend alter column platform_id set not null;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tool_spend_platform_id_fkey') then
    alter table public.tool_spend
      add constraint tool_spend_platform_id_fkey foreign key (platform_id) references public.ai_platforms(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tool_spend_platform_id_month_key') then
    alter table public.tool_spend
      add constraint tool_spend_platform_id_month_key unique (platform_id, month);
  end if;
end $$;

create index if not exists tool_spend_platform_id_idx on public.tool_spend (platform_id);

-- ── 3. org_id on the two tables 20 missed ───────────────────────────────────
alter table public.escalation_logs add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.execution_mode  add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);

do $$
declare
  t text;
begin
  foreach t in array array['escalation_logs', 'execution_mode'] loop
    execute format('create index if not exists idx_%I_org_id on public.%I (org_id)', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format(
      'create policy tenant_isolation on public.%I using (org_id = current_setting(''app.current_org'', true)::uuid)',
      t
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

COMMIT;
