-- 05_foreign_keys.sql — declare the foreign keys the API depends on.
--
-- WHY THIS EXISTS
-- 01_schema_migration.sql creates 42 tables and declares zero foreign keys.
-- About 33 route handlers use PostgREST nested embedding — .select('agents(name, risk)')
-- — which resolves ONLY through a declared foreign key. Without these constraints
-- those endpoints return:
--     "Could not find a relationship between 'x' and 'y' in the schema cache"
--
-- The previous Supabase project had these added by hand, outside version control,
-- so the schema in git never described the database that was actually running.
-- Rebuilding from the repo produced a broken API. This file closes that gap.
--
-- Every constraint below was validated against real data before being written:
-- matching column types, and zero orphan rows.
--
-- Constraint names follow Postgres' default <table>_<column>_fkey because
-- PostgREST uses the constraint name to disambiguate when two columns of the
-- same table reference the same target (dependencies, tool_backups).

do $$
declare
  fk record;
begin
  for fk in
    select * from (values
      -- core
      ('agents',                     'owner_id',        'employees'),
      ('owners',                     'employee_id',     'employees'),
      ('knowledge_assets',           'owner_id',        'employees'),
      ('collaboration_scores',       'employee_id',     'employees'),
      ('predictive_risk_scores',     'agent_id',        'agents'),

      -- dependencies: two columns to the same table, names matter
      ('dependencies',               'agent_source',    'agents'),
      ('dependencies',               'agent_target',    'agents'),

      -- tools / platforms
      ('tool_users',                 'platform_id',     'ai_platforms'),
      ('tool_users',                 'employee_id',     'employees'),
      ('tool_ownership',             'platform_id',     'ai_platforms'),
      ('tool_ownership',             'employee_id',     'employees'),
      ('tool_spend',                 'platform_id',     'ai_platforms'),
      ('tool_policies',              'platform_id',     'ai_platforms'),
      ('tool_backups',               'primary_platform','ai_platforms'),
      ('tool_backups',               'backup_platform', 'ai_platforms'),
      ('agent_platform',             'agent_id',        'agents'),
      ('agent_platform',             'platform_id',     'ai_platforms'),
      ('employee_agent',             'employee_id',     'employees'),
      ('employee_agent',             'agent_id',        'agents'),

      -- workflows
      ('workflow_dependencies',      'workflow_id',     'workflows'),
      ('workflow_dependencies',      'agent_id',        'agents'),
      ('workflow_failures',          'workflow_id',     'workflows'),
      ('workflow_runbooks',          'workflow_id',     'workflows'),
      ('workflow_runbooks',          'owner_id',        'employees'),
      ('workflow_orchestration',     'workflow_id',     'workflows'),
      ('workflow_tool_dependencies', 'workflow_id',     'workflows'),
      ('workflow_tool_dependencies', 'platform_id',     'ai_platforms'),
      ('verification_actions',       'workflow_id',     'workflows'),

      -- intelligence modules
      ('accountability_links',       'entity_id',       'accountability_entities'),
      ('accountability_scores',      'entity_id',       'accountability_entities'),
      ('truth_claims',               'entity_id',       'truth_entities'),
      ('governance_gaps',            'assessment_id',   'governance_assessments'),
      ('continuity_plans',           'assessment_id',   'continuity_assessments')
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

-- PostgREST caches the schema; without this the constraints exist but embedding
-- still fails until the next automatic reload.
notify pgrst, 'reload schema';
