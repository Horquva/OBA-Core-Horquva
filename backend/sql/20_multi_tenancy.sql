-- 20_multi_tenancy.sql — org_id on every business table + row-level security.
--
-- WHY THIS EXISTS
-- `org` existed only on app_users (and as a JWT claim). Not one business
-- table carried an org column, so every authenticated user read the same
-- dataset regardless of their token, and lib/orgGuard.js exited the process
-- the moment a second organization appeared — an isolation the product
-- implied but did not implement. This migration makes tenancy real:
--
--   1. an `orgs` table; one bootstrap org with a FIXED uuid so the column
--      defaults below can be deterministic and re-runnable;
--   2. org_id (uuid, not null, default bootstrap) on every business table
--      that holds organizational facts — including the tables created by
--      03 (brain/voice/decision modules) and 14 (systems/external entities);
--   3. row-level security on all of them, keyed on the transaction-local
--      GUC `app.current_org` (set per request by the backend via
--      set_config(..., true) on any direct-Postgres path). The backend's
--      service-role key bypasses RLS, so RLS here is defense-in-depth for
--      anything that reaches Postgres WITHOUT the service role — the
--      PostgREST/Supabase data API and future direct connections. The
--      primary enforcement is application-level scoping
--      (backend/lib/tenant.js), which filters every read at the two doors
--      (domain/derived.js loadRoots, brain/knowledge/graphLoader.js) and in
--      the route files' direct reads;
--   4. org_id indexes — every table now filters by org first;
--   5. audit_log gains a nullable org_id (pre-tenant rows stay null).
--
-- ⛔ DO NOT RUN BY HAND — `node run_migrations.js` (see 01's header).

BEGIN;

-- ── 1. orgs ─────────────────────────────────────────────────────────────────
create table if not exists public.orgs (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Fixed bootstrap uuid: column defaults below reference it literally, which
-- keeps this file deterministic (no subselect-in-default workaround) and
-- idempotent across rebuilds.
insert into public.orgs (id, slug, name)
values ('00000000-0000-4000-8000-000000000001', 'horquva', 'Horquva')
on conflict (slug) do nothing;

-- app_users.org stays the JWT-facing slug (routes/auth/auth.js signs it into
-- the token); org_id is the relational link.
alter table public.app_users add column if not exists org_id uuid references public.orgs(id);
update public.app_users set org_id = (select id from public.orgs where slug = 'horquva') where org_id is null;

-- ── 2. org_id on every business table ───────────────────────────────────────
-- Default = bootstrap org: existing rows land in the org that already owned
-- them, and INSERTs that forget org_id fail closed to the bootstrap tenant
-- instead of erroring (the deployment is single-org until a second exists).

-- Core (01)
alter table public.employees            add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.ai_platforms         add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.agents               add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.owners               add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.workflows            add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.employee_agent       add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.agent_platform       add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.dependencies         add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.tool_ownership       add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.tool_users           add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.tool_backups         add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.tool_policies        add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.workflow_dependencies        add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.workflow_tool_dependencies   add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.workflow_runbooks    add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.workflow_failures    add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.workflow_steps       add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.knowledge_assets     add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.snapshots            add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.organizational_forecasts add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.forecast_findings    add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.verification_actions add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.policy_violations    add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.workflow_orchestration add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.learning_snapshots   add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.accountability_entities add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.accountability_links add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);

-- Authored entities (14)
alter table public.systems              add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.system_dependencies  add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.system_agent_usage   add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.external_entities    add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.external_entity_supplies add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.incidents            add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);

-- Agent layer (15)
alter table public.agent_conversations  add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.agent_messages       add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.agent_tool_calls     add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.agent_usage          add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);

-- Brain / voice / decision modules (03) — real operational records
alter table public.brain_core_snapshots add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.orchestrator_snapshots add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.executive_briefings  add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.executive_sessions   add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.executive_questions  add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.decision_queue       add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.decision_history     add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.context_items        add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.truth_entities       add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.truth_claims         add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.voice_intents        add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.voice_history        add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.documentation_trend  add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.org_health_snapshots add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);
alter table public.tool_spend           add column if not exists org_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.orgs(id);

-- Audit log: nullable — pre-tenant rows and infra actions stay null.
alter table public.audit_log            add column if not exists org_id uuid references public.orgs(id);

-- ── 3. row-level security (defense-in-depth) ────────────────────────────────
-- Policy keyed on the transaction-local GUC; current_setting(..., true)
-- returns NULL (not an error) when unset, so unauthenticated direct access
-- sees nothing rather than everything.
do $$
declare
  t record;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name in (
        'employees','ai_platforms','agents','owners','workflows',
        'employee_agent','agent_platform','dependencies','tool_ownership',
        'tool_users','tool_backups','tool_policies','workflow_dependencies',
        'workflow_tool_dependencies','workflow_runbooks','workflow_failures',
        'workflow_steps','knowledge_assets','snapshots','organizational_forecasts',
        'forecast_findings','verification_actions','policy_violations',
        'workflow_orchestration','learning_snapshots','accountability_entities',
        'accountability_links','systems','system_dependencies',
        'system_agent_usage','external_entities','external_entity_supplies',
        'incidents','agent_conversations','agent_messages','agent_tool_calls',
        'agent_usage','brain_core_snapshots','orchestrator_snapshots',
        'executive_briefings','executive_sessions','executive_questions',
        'decision_queue','decision_history','context_items','truth_entities',
        'truth_claims','voice_intents','voice_history','documentation_trend',
        'org_health_snapshots','tool_spend'
      )
  loop
    execute format('alter table public.%I enable row level security', t.table_name);
    execute format('drop policy if exists tenant_isolation on public.%I', t.table_name);
    execute format(
      'create policy tenant_isolation on public.%I using (org_id = current_setting(''app.current_org'', true)::uuid)',
      t.table_name
    );
  end loop;
end $$;

-- ── 4. org-first indexes ────────────────────────────────────────────────────
do $$
declare
  t record;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'org_id'
      and table_name != 'audit_log'
  loop
    execute format(
      'create index if not exists idx_%I_org_id on public.%I (org_id)',
      t.table_name, t.table_name
    );
  end loop;
end $$;

create index if not exists idx_audit_log_org on public.audit_log (org_id, occurred_at desc);
create index if not exists idx_app_users_org_id on public.app_users (org_id);

notify pgrst, 'reload schema';

COMMIT;
