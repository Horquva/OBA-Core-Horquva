-- 23_out_of_band_triggers.sql — Feature 3 backstop: catch out-of-band writes.
--
-- WHY THIS EXISTS
-- The mutation layer (domain/mutations.js) is the ONE write path and records
-- every mutation in dependency_change_log. But nothing in Postgres FORCES
-- writes through the API — a psql session, a Supabase SQL-editor edit or a
-- future ETL job can UPDATE/DELETE entity rows directly, and the change log
-- would silently miss them. These AFTER UPDATE/DELETE triggers record such
-- writes as mutation_type = 'OUT_OF_BAND' rows (before/after snapshots only —
-- no cascade computation; the next org scan prices the new reality).
--
-- The triggers are defensive, not load-bearing: while all writes flow through
-- the API they never fire. Do NOT add INSERT triggers — the mutation layer
-- inserts with org_id explicitly and double-recording created entities here
-- would duplicate its rows.
--
-- ⛔ DO NOT RUN BY HAND — `node run_migrations.js` (see 01's header).

BEGIN;

create or replace function public.fn_record_out_of_band()
returns trigger
language plpgsql
security definer
as $$
declare
  v_org uuid;
begin
  -- org from the row itself (NEW on update, OLD on delete)
  v_org := coalesce(new.org_id, old.org_id);
  insert into public.dependency_change_log (
    org_id, mutation_type, target_type, target_id, actor_id, before, after
  ) values (
    v_org,
    'OUT_OF_BAND',
    tg_table_name,
    coalesce(new.id, old.id),
    'db-trigger',
    to_jsonb(old),
    case when tg_op = 'UPDATE' then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t record;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'org_id'
      and table_name in (
        'agents','workflows','ai_platforms','employees','systems',
        'external_entities','owners','tool_ownership','tool_backups',
        'dependencies','knowledge_assets','workflow_runbooks'
      )
  loop
    execute format('drop trigger if exists trg_out_of_band on public.%I', t.table_name);
    execute format(
      'create trigger trg_out_of_band after update or delete on public.%I for each row execute function public.fn_record_out_of_band()',
      t.table_name
    );
  end loop;
end $$;

COMMIT;
