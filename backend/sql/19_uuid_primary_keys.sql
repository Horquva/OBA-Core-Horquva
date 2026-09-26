-- 19_uuid_primary_keys.sql — convert entity primary keys from SERIAL to UUID.
--
-- WHY THIS EXISTS
-- agents.id, workflows.id, ai_platforms.id and employees.id each use an
-- independent SERIAL 1..N, so the integer 1 is simultaneously an agent, a
-- workflow, a platform and an employee. Cross-type edges in the polymorphic
-- `dependencies` table are therefore ambiguous, and every consumer that walks
-- them had to know which table an integer "belongs" to. The frontend's answer
-- was to silently discard all non-agent edges on the risk and map pages
-- (app/risk/page.tsx, app/map/page.tsx), blinding those dashboards to
-- workflows, tools and platforms. UUIDs remove the ambiguity at the root:
-- an id now identifies exactly one row in exactly one table.
--
-- SCOPE — six entity tables that appear as graph node types:
--   employees, ai_platforms, agents, workflows, systems, external_entities
-- Module and junction tables (predictive_risk_scores, snapshots,
-- organizational_forecasts, knowledge_assets.id, dependencies.id, …) keep
-- their SERIAL PKs: their ids are never compared across type namespaces, and
-- 13/16/18 already dropped the frozen aggregates that did reference across.
-- The polymorphic columns dependencies.(source_id, target_id) and
-- knowledge_assets.asset_id ARE remapped (per *_type discriminator), because
-- those integers mean "a row in one of the six entity tables".
--
-- MECHANICS (single transaction):
--   1. add uuid twin `new_id` to the six entity tables;
--   2. add uuid twins to every referencing column and fill them by joining
--      the entity tables' old int id → new_id (per type for polymorphic);
--   3. drop every FK constraint that references the six entity tables
--      (discovered from pg_constraint, not a hand-list — 05 and 14 both
--      declared FKs and a hand-list drifts);
--   4. drop the old int columns, rename twins into place, swap the PKs;
--   5. re-declare every FK against the uuid ids (same names PostgREST
--      disambiguates by — 05's <table>_<column>_fkey convention) and the
--      matching FK indexes (11's convention);
--   6. notify pgrst to reload the schema cache.
--
-- Seeds stay coherent because 02/04/14 seeded integers BEFORE this file runs;
-- run_migrations.js applies files in filename order and records 19 in
-- schema_migrations, so it can never re-run on an already-converted schema.
--
-- ⛔ DO NOT RUN BY HAND — `node run_migrations.js` (see 01's header).

BEGIN;

-- ── 1. uuid twins on the entity tables ──────────────────────────────────────
alter table public.employees         add column if not exists new_id uuid not null default gen_random_uuid();
alter table public.ai_platforms      add column if not exists new_id uuid not null default gen_random_uuid();
alter table public.agents            add column if not exists new_id uuid not null default gen_random_uuid();
alter table public.workflows         add column if not exists new_id uuid not null default gen_random_uuid();
alter table public.systems           add column if not exists new_id uuid not null default gen_random_uuid();
alter table public.external_entities add column if not exists new_id uuid not null default gen_random_uuid();

-- ── 2. uuid twins on every referencing column ───────────────────────────────
-- People references
alter table public.agents            add column if not exists owner_uuid uuid;
alter table public.owners            add column if not exists employee_uuid uuid;
alter table public.knowledge_assets  add column if not exists owner_uuid uuid;
alter table public.tool_users        add column if not exists employee_uuid uuid;
alter table public.tool_ownership    add column if not exists employee_uuid uuid;
alter table public.workflow_runbooks add column if not exists owner_uuid uuid;
alter table public.employee_agent    add column if not exists employee_uuid uuid;
alter table public.systems           add column if not exists owner_uuid uuid;
alter table public.external_entities add column if not exists relationship_owner_uuid uuid;
alter table public.incidents         add column if not exists owner_uuid uuid;
alter table public.incidents         add column if not exists resolved_by_uuid uuid;

-- Platform references
alter table public.tool_users                 add column if not exists platform_uuid uuid;
alter table public.tool_ownership             add column if not exists platform_uuid uuid;
alter table public.tool_policies              add column if not exists platform_uuid uuid;
alter table public.tool_backups               add column if not exists primary_platform_uuid uuid;
alter table public.tool_backups               add column if not exists backup_platform_uuid uuid;
alter table public.agent_platform             add column if not exists platform_uuid uuid;
alter table public.workflow_tool_dependencies add column if not exists platform_uuid uuid;
alter table public.external_entity_supplies   add column if not exists platform_uuid uuid;

-- Agent references
alter table public.agent_platform             add column if not exists agent_uuid uuid;
alter table public.employee_agent             add column if not exists agent_uuid uuid;
alter table public.workflow_dependencies      add column if not exists agent_uuid uuid;
alter table public.system_agent_usage         add column if not exists agent_uuid uuid;

-- Workflow references
alter table public.workflow_dependencies      add column if not exists workflow_uuid uuid;
alter table public.workflow_failures          add column if not exists workflow_uuid uuid;
alter table public.workflow_runbooks          add column if not exists workflow_uuid uuid;
alter table public.workflow_orchestration     add column if not exists workflow_uuid uuid;
alter table public.workflow_tool_dependencies add column if not exists workflow_uuid uuid;
alter table public.workflow_steps             add column if not exists workflow_uuid uuid;
alter table public.verification_actions       add column if not exists workflow_uuid uuid;

-- Systems / external entities references
alter table public.system_dependencies        add column if not exists system_uuid uuid;
alter table public.system_dependencies        add column if not exists depends_on_system_uuid uuid;
alter table public.system_agent_usage         add column if not exists system_uuid uuid;
alter table public.external_entity_supplies   add column if not exists external_entity_uuid uuid;

-- Polymorphic edges: dependencies + knowledge_assets.asset_id
alter table public.dependencies    add column if not exists source_uuid uuid;
alter table public.dependencies    add column if not exists target_uuid uuid;

-- The FK-embedding twins keep their own twins (they are CONVERTED, not
-- dropped — routes embed agent rows through their declared FKs, see 01's
-- header comment on agent_source/agent_target).
alter table public.dependencies    add column if not exists agent_source_uuid uuid;
alter table public.dependencies    add column if not exists agent_target_uuid uuid;

-- The polymorphic knowledge_assets.asset_id gets its twin here too — the
-- per-type fills below write into it, and step 4 copies it into the renamed
-- asset_id column.
alter table public.knowledge_assets add column if not exists asset_uuid uuid;

-- Fill the typed references by joining old int id → new_id.
update public.agents            t set owner_uuid        = p.new_id from public.employees         p where t.owner_id            = p.id;
update public.owners            t set employee_uuid     = p.new_id from public.employees         p where t.employee_id         = p.id;
update public.knowledge_assets  t set owner_uuid        = p.new_id from public.employees         p where t.owner_id            = p.id;
update public.tool_users        t set employee_uuid     = p.new_id from public.employees         p where t.employee_id         = p.id;
update public.tool_users        t set platform_uuid     = p.new_id from public.ai_platforms      p where t.platform_id         = p.id;
update public.tool_ownership    t set employee_uuid     = p.new_id from public.employees         p where t.employee_id         = p.id;
update public.tool_ownership    t set platform_uuid     = p.new_id from public.ai_platforms      p where t.platform_id         = p.id;
update public.workflow_runbooks t set owner_uuid        = p.new_id from public.employees         p where t.owner_id            = p.id;
update public.employee_agent    t set employee_uuid     = p.new_id from public.employees         p where t.employee_id         = p.id;
update public.systems           t set owner_uuid        = p.new_id from public.employees         p where t.owner_id            = p.id;
update public.external_entities t set relationship_owner_uuid = p.new_id from public.employees   p where t.relationship_owner_id = p.id;
update public.incidents         t set owner_uuid        = p.new_id from public.employees         p where t.owner_id            = p.id;
update public.incidents         t set resolved_by_uuid  = p.new_id from public.employees         p where t.resolved_by_id      = p.id;

update public.tool_policies              t set platform_uuid        = p.new_id from public.ai_platforms      p where t.platform_id          = p.id;
update public.tool_backups               t set primary_platform_uuid = p.new_id from public.ai_platforms     p where t.primary_platform     = p.id;
update public.tool_backups               t set backup_platform_uuid = p.new_id from public.ai_platforms      p where t.backup_platform      = p.id;
update public.agent_platform             t set platform_uuid        = p.new_id from public.ai_platforms      p where t.platform_id          = p.id;
update public.workflow_tool_dependencies t set platform_uuid        = p.new_id from public.ai_platforms      p where t.platform_id          = p.id;
update public.external_entity_supplies   t set platform_uuid        = p.new_id from public.ai_platforms      p where t.platform_id          = p.id;

update public.agent_platform             t set agent_uuid = p.new_id from public.agents p where t.agent_id   = p.id;
update public.employee_agent             t set agent_uuid = p.new_id from public.agents p where t.agent_id   = p.id;
update public.workflow_dependencies      t set agent_uuid = p.new_id from public.agents p where t.agent_id   = p.id;
update public.system_agent_usage         t set agent_uuid = p.new_id from public.agents p where t.agent_id   = p.id;

update public.workflow_dependencies      t set workflow_uuid = p.new_id from public.workflows p where t.workflow_id = p.id;
update public.workflow_failures          t set workflow_uuid = p.new_id from public.workflows p where t.workflow_id = p.id;
update public.workflow_runbooks          t set workflow_uuid = p.new_id from public.workflows p where t.workflow_id = p.id;
update public.workflow_orchestration     t set workflow_uuid = p.new_id from public.workflows p where t.workflow_id = p.id;
update public.workflow_tool_dependencies t set workflow_uuid = p.new_id from public.workflows p where t.workflow_id = p.id;
update public.workflow_steps             t set workflow_uuid = p.new_id from public.workflows p where t.workflow_id = p.id;
update public.verification_actions       t set workflow_uuid = p.new_id from public.workflows p where t.workflow_id = p.id;

update public.system_dependencies        t set system_uuid             = p.new_id from public.systems p where t.system_id             = p.id;
update public.system_dependencies        t set depends_on_system_uuid  = p.new_id from public.systems p where t.depends_on_system_id  = p.id;
update public.system_agent_usage         t set system_uuid             = p.new_id from public.systems p where t.system_id             = p.id;
update public.external_entity_supplies   t set external_entity_uuid    = p.new_id from public.external_entities p where t.external_entity_id = p.id;

-- Polymorphic fills, per *_type discriminator. The type vocabulary in use is
-- exactly 'agent' | 'workflow' | 'platform' (02_seed_data.sql, graphLoader.js);
-- unknown/NULL types leave the uuid NULL — the same semantics the integer had.
update public.dependencies d set source_uuid = a.new_id from public.agents    a where d.source_type = 'agent'    and d.source_id = a.id;
update public.dependencies d set source_uuid = w.new_id from public.workflows w where d.source_type = 'workflow' and d.source_id = w.id;
update public.dependencies d set source_uuid = p.new_id from public.ai_platforms p where d.source_type = 'platform' and d.source_id = p.id;
update public.dependencies d set target_uuid = a.new_id from public.agents    a where d.target_type = 'agent'    and d.target_id = a.id;
update public.dependencies d set target_uuid = w.new_id from public.workflows w where d.target_type = 'workflow' and d.target_id = w.id;
update public.dependencies d set target_uuid = p.new_id from public.ai_platforms p where d.target_type = 'platform' and d.target_id = p.id;

-- Redundant-by-design FK-embedding twins (see 01's header comment on
-- agent_source/agent_target): they duplicate source/target exactly when both
-- ends are agents.
update public.dependencies d set agent_source_uuid = a.new_id, agent_target_uuid = b.new_id
from public.agents a, public.agents b
where d.source_type = 'agent' and d.target_type = 'agent'
  and d.agent_source = a.id and d.agent_target = b.id;

update public.knowledge_assets k set asset_uuid = a.new_id
from public.agents a where k.asset_type = 'agent' and k.asset_id = a.id;
update public.knowledge_assets k set asset_uuid = w.new_id
from public.workflows w where k.asset_type = 'workflow' and k.asset_id = w.id;
update public.knowledge_assets k set asset_uuid = p.new_id
from public.ai_platforms p where k.asset_type = 'platform' and k.asset_id = p.id;

-- ── 3. drop every FK that references the six entity tables ──────────────────
do $$
declare
  fk record;
begin
  for fk in
    select con.conname, con.relid::regclass as child
    from pg_constraint con
    where con.contype = 'f'
      and con.confrelid in (
        'public.employees'::regclass, 'public.ai_platforms'::regclass,
        'public.agents'::regclass,    'public.workflows'::regclass,
        'public.systems'::regclass,   'public.external_entities'::regclass)
  loop
    execute format('alter table %s drop constraint %I', fk.child, fk.conname);
  end loop;
end $$;

-- ── 4. drop int columns, rename twins, swap PKs ─────────────────────────────
-- Referencing columns first (their FKs are gone; the drops also take 11's
-- indexes on those columns with them — re-added in step 5).
alter table public.agents             drop column if exists owner_id;
alter table public.owners             drop column if exists employee_id;
alter table public.knowledge_assets   drop column if exists owner_id;
alter table public.tool_users         drop column if exists employee_id;
alter table public.tool_users         drop column if exists platform_id;
alter table public.tool_ownership     drop column if exists employee_id;
alter table public.tool_ownership     drop column if exists platform_id;
alter table public.workflow_runbooks  drop column if exists owner_id;
alter table public.employee_agent     drop column if exists employee_id;
alter table public.systems            drop column if exists owner_id;
alter table public.external_entities  drop column if exists relationship_owner_id;
alter table public.incidents          drop column if exists owner_id;
alter table public.incidents          drop column if exists resolved_by_id;
alter table public.tool_policies              drop column if exists platform_id;
alter table public.tool_backups               drop column if exists primary_platform;
alter table public.tool_backups               drop column if exists backup_platform;
alter table public.agent_platform             drop column if exists platform_id;
alter table public.workflow_tool_dependencies drop column if exists platform_id;
alter table public.external_entity_supplies   drop column if exists platform_id;
alter table public.agent_platform             drop column if exists agent_id;
alter table public.employee_agent             drop column if exists agent_id;
alter table public.workflow_dependencies      drop column if exists agent_id;
alter table public.system_agent_usage         drop column if exists agent_id;
alter table public.workflow_dependencies      drop column if exists workflow_id;
alter table public.workflow_failures          drop column if exists workflow_id;
alter table public.workflow_runbooks          drop column if exists workflow_id;
alter table public.workflow_orchestration     drop column if exists workflow_id;
alter table public.workflow_tool_dependencies drop column if exists workflow_id;
alter table public.workflow_steps             drop column if exists workflow_id;
alter table public.verification_actions       drop column if exists workflow_id;
alter table public.system_dependencies        drop column if exists system_id;
alter table public.system_dependencies        drop column if exists depends_on_system_id;
alter table public.system_agent_usage         drop column if exists system_id;
alter table public.external_entity_supplies   drop column if exists external_entity_id;
alter table public.dependencies               drop column if exists source_id;
alter table public.dependencies               drop column if exists target_id;
alter table public.knowledge_assets           drop column if exists asset_id;

alter table public.agents             rename column owner_uuid             to owner_id;
alter table public.owners             rename column employee_uuid          to employee_id;
alter table public.knowledge_assets   rename column owner_uuid             to owner_id;
alter table public.tool_users         rename column employee_uuid          to employee_id;
alter table public.tool_users         rename column platform_uuid          to platform_id;
alter table public.tool_ownership     rename column employee_uuid          to employee_id;
alter table public.tool_ownership     rename column platform_uuid          to platform_id;
alter table public.workflow_runbooks  rename column owner_uuid             to owner_id;
alter table public.employee_agent     rename column employee_uuid          to employee_id;
alter table public.systems            rename column owner_uuid             to owner_id;
alter table public.external_entities  rename column relationship_owner_uuid to relationship_owner_id;
alter table public.incidents          rename column owner_uuid             to owner_id;
alter table public.incidents          rename column resolved_by_uuid       to resolved_by_id;
alter table public.tool_policies              rename column platform_uuid         to platform_id;
alter table public.tool_backups               rename column primary_platform_uuid to primary_platform;
alter table public.tool_backups               rename column backup_platform_uuid  to backup_platform;
alter table public.agent_platform             rename column platform_uuid         to platform_id;
alter table public.workflow_tool_dependencies rename column platform_uuid         to platform_id;
alter table public.external_entity_supplies   rename column platform_uuid         to platform_id;
alter table public.agent_platform             rename column agent_uuid            to agent_id;
alter table public.employee_agent             rename column agent_uuid            to agent_id;
alter table public.workflow_dependencies      rename column agent_uuid            to agent_id;
alter table public.system_agent_usage         rename column agent_uuid            to agent_id;
alter table public.workflow_dependencies      rename column workflow_uuid         to workflow_id;
alter table public.workflow_failures          rename column workflow_uuid         to workflow_id;
alter table public.workflow_runbooks          rename column workflow_uuid         to workflow_id;
alter table public.workflow_orchestration     rename column workflow_uuid         to workflow_id;
alter table public.workflow_tool_dependencies rename column workflow_uuid         to workflow_id;
alter table public.workflow_steps             rename column workflow_uuid         to workflow_id;
alter table public.verification_actions       rename column workflow_uuid         to workflow_id;
alter table public.system_dependencies        rename column system_uuid           to system_id;
alter table public.system_dependencies        rename column depends_on_system_uuid to depends_on_system_id;
alter table public.system_agent_usage         rename column system_uuid           to system_id;
alter table public.external_entity_supplies   rename column external_entity_uuid  to external_entity_id;
alter table public.dependencies               rename column source_uuid           to source_id;
alter table public.dependencies               rename column target_uuid           to target_id;
alter table public.dependencies               rename column agent_source_uuid     to agent_source;
alter table public.dependencies               rename column agent_target_uuid     to agent_target;

-- knowledge_assets.asset_id: the twin was named asset_uuid; keep the
-- polymorphic column name stable for readers.
alter table public.knowledge_assets add column if not exists asset_id uuid;
update public.knowledge_assets set asset_id = asset_uuid where asset_id is null;
alter table public.knowledge_assets drop column if exists asset_uuid;

-- Entity PK swaps. Dropping the int id column drops its owned SERIAL sequence.
alter table public.employees         drop constraint if exists employees_pkey;
alter table public.ai_platforms      drop constraint if exists ai_platforms_pkey;
alter table public.agents            drop constraint if exists agents_pkey;
alter table public.workflows         drop constraint if exists workflows_pkey;
alter table public.systems           drop constraint if exists systems_pkey;
alter table public.external_entities drop constraint if exists external_entities_pkey;

alter table public.employees         drop column if exists id;
alter table public.ai_platforms      drop column if exists id;
alter table public.agents            drop column if exists id;
alter table public.workflows         drop column if exists id;
alter table public.systems           drop column if exists id;
alter table public.external_entities drop column if exists id;

alter table public.employees         rename column new_id to id;
alter table public.ai_platforms      rename column new_id to id;
alter table public.agents            rename column new_id to id;
alter table public.workflows         rename column new_id to id;
alter table public.systems           rename column new_id to id;
alter table public.external_entities rename column new_id to id;

alter table public.employees         add primary key (id);
alter table public.ai_platforms      add primary key (id);
alter table public.agents            add primary key (id);
alter table public.workflows         add primary key (id);
alter table public.systems           add primary key (id);
alter table public.external_entities add primary key (id);

-- The seeds setval'd these sequences (01's header); their tables no longer
-- have int ids. Drop any that still exist so a fresh rebuild leaves no orphans.
drop sequence if exists public.employees_id_seq;
drop sequence if exists public.ai_platforms_id_seq;
drop sequence if exists public.agents_id_seq;
drop sequence if exists public.workflows_id_seq;
drop sequence if exists public.systems_id_seq;
drop sequence if exists public.external_entities_id_seq;

-- ── 5. re-declare FKs (05/14 name convention — PostgREST disambiguates by
--      constraint name when two columns reference the same table) ────────────
do $$
declare
  fk record;
begin
  for fk in
    select * from (values
      -- core
      ('agents',                     'owner_id',         'employees'),
      ('owners',                     'employee_id',      'employees'),
      ('knowledge_assets',           'owner_id',         'employees'),

      -- dependencies: two columns to the same table, names matter
      ('dependencies',               'agent_source',     'agents'),
      ('dependencies',               'agent_target',     'agents'),

      -- tools / platforms
      ('tool_users',                 'platform_id',      'ai_platforms'),
      ('tool_users',                 'employee_id',      'employees'),
      ('tool_ownership',             'platform_id',      'ai_platforms'),
      ('tool_ownership',             'employee_id',      'employees'),
      ('tool_policies',              'platform_id',      'ai_platforms'),
      ('tool_backups',               'primary_platform', 'ai_platforms'),
      ('tool_backups',               'backup_platform',  'ai_platforms'),
      ('agent_platform',             'agent_id',         'agents'),
      ('agent_platform',             'platform_id',      'ai_platforms'),
      ('employee_agent',             'employee_id',      'employees'),
      ('employee_agent',             'agent_id',         'agents'),

      -- workflows
      ('workflow_dependencies',      'workflow_id',      'workflows'),
      ('workflow_dependencies',      'agent_id',         'agents'),
      ('workflow_failures',          'workflow_id',      'workflows'),
      ('workflow_runbooks',          'workflow_id',      'workflows'),
      ('workflow_runbooks',          'owner_id',         'employees'),
      ('workflow_orchestration',     'workflow_id',      'workflows'),
      ('workflow_tool_dependencies', 'workflow_id',      'workflows'),
      ('workflow_tool_dependencies', 'platform_id',      'ai_platforms'),
      ('workflow_steps',             'workflow_id',      'workflows'),
      ('verification_actions',       'workflow_id',      'workflows'),

      -- systems / external entities / incidents (14_authored_entities.sql)
      ('systems',                    'owner_id',                 'employees'),
      ('system_dependencies',        'system_id',                'systems'),
      ('system_dependencies',        'depends_on_system_id',     'systems'),
      ('system_agent_usage',         'system_id',                'systems'),
      ('system_agent_usage',         'agent_id',                 'agents'),
      ('external_entities',          'relationship_owner_id',    'employees'),
      ('external_entity_supplies',   'external_entity_id',       'external_entities'),
      ('external_entity_supplies',   'platform_id',              'ai_platforms'),
      ('incidents',                  'owner_id',                 'employees'),
      ('incidents',                  'resolved_by_id',           'employees')
    ) as t(child, col, parent)
  loop
    if not exists (
      select 1 from information_schema.table_constraints
      where constraint_schema = 'public'
        and constraint_name   = fk.child || '_' || fk.col || '_fkey'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id)',
        fk.child, fk.child || '_' || fk.col || '_fkey', fk.col, fk.parent
      );
    end if;
  end loop;
end $$;

-- dependencies.source_id/target_id lost their FK-embedding twins — the polymorphic
-- columns keep NO declared FK (Postgres cannot enforce one through a type
-- discriminator), exactly as before. But workflow_steps.workflow_id and the 14-era
-- FKs never had indexes from 11 (it predates those tables for some columns);
-- re-create the FK indexes for every converted column (11's naming convention).
do $$
declare
  fk record;
begin
  for fk in
    select * from (values
      ('agents',                     'owner_id'),
      ('owners',                     'employee_id'),
      ('knowledge_assets',           'owner_id'),
      ('dependencies',               'agent_source'),
      ('dependencies',               'agent_target'),
      ('dependencies',               'source_id'),
      ('dependencies',               'target_id'),
      ('tool_users',                 'platform_id'),
      ('tool_users',                 'employee_id'),
      ('tool_ownership',             'platform_id'),
      ('tool_ownership',             'employee_id'),
      ('tool_policies',              'platform_id'),
      ('tool_backups',               'primary_platform'),
      ('tool_backups',               'backup_platform'),
      ('agent_platform',             'agent_id'),
      ('agent_platform',             'platform_id'),
      ('employee_agent',             'employee_id'),
      ('employee_agent',             'agent_id'),
      ('workflow_dependencies',      'workflow_id'),
      ('workflow_dependencies',      'agent_id'),
      ('workflow_failures',          'workflow_id'),
      ('workflow_runbooks',          'workflow_id'),
      ('workflow_runbooks',          'owner_id'),
      ('workflow_orchestration',     'workflow_id'),
      ('workflow_tool_dependencies', 'workflow_id'),
      ('workflow_tool_dependencies', 'platform_id'),
      ('workflow_steps',             'workflow_id'),
      ('verification_actions',       'workflow_id'),
      ('systems',                    'owner_id'),
      ('system_dependencies',        'system_id'),
      ('system_dependencies',        'depends_on_system_id'),
      ('system_agent_usage',         'system_id'),
      ('system_agent_usage',         'agent_id'),
      ('external_entities',          'relationship_owner_id'),
      ('external_entity_supplies',   'external_entity_id'),
      ('external_entity_supplies',   'platform_id'),
      ('incidents',                  'owner_id'),
      ('incidents',                  'resolved_by_id')
    ) as t(tbl, col)
  loop
    execute format(
      'create index if not exists %I on public.%I (%I)',
      'idx_' || fk.tbl || '_' || fk.col, fk.tbl, fk.col
    );
  end loop;
end $$;

-- knowledge_assets polymorphic index (type-first, matching how graphLoader
-- and derived.js filter: WHERE asset_type = X AND asset_id = Y).
create index if not exists idx_knowledge_assets_type_id
  on public.knowledge_assets (asset_type, asset_id);
create index if not exists idx_dependencies_type_id
  on public.dependencies (target_type, target_id);
create index if not exists idx_dependencies_source_type_id
  on public.dependencies (source_type, source_id);

notify pgrst, 'reload schema';

COMMIT;
