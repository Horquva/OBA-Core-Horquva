-- 11_foreign_key_indexes.sql — index every foreign-key column declared in
-- 05_foreign_keys.sql, plus the enum-like status columns queried by name.
--
-- WHY THIS EXISTS
-- Postgres does not automatically index the referencing side of a foreign
-- key — only the referenced table's own primary key gets one. Every one of
-- the ~30 foreign-key columns 05_foreign_keys.sql declared has been doing a
-- full sequential scan on every PostgREST nested-embed
-- (.select('agents(name)')) and every FK constraint check since this schema
-- was created. Invisible at seed-data volume (dozens of rows per table);
-- becomes a real latency and lock-contention problem the moment any of these
-- tables grows to production size.
--
-- Uses the same (table, column) pairs as 05_foreign_keys.sql's dynamic block,
-- so the two files stay in lockstep by construction rather than by memory.
-- `create index if not exists` makes this safe to re-run.

do $$
declare
  fk record;
begin
  for fk in
    select * from (values
      ('agents',                     'owner_id'),
      ('owners',                     'employee_id'),
      ('knowledge_assets',           'owner_id'),
      ('collaboration_scores',       'employee_id'),
      ('predictive_risk_scores',     'agent_id'),

      ('dependencies',               'agent_source'),
      ('dependencies',               'agent_target'),

      ('tool_users',                 'platform_id'),
      ('tool_users',                 'employee_id'),
      ('tool_ownership',             'platform_id'),
      ('tool_ownership',             'employee_id'),
      ('tool_spend',                 'platform_id'),
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
      ('verification_actions',       'workflow_id'),

      ('accountability_links',       'entity_id'),
      ('accountability_scores',      'entity_id'),
      ('truth_claims',               'entity_id'),
      ('governance_gaps',            'assessment_id'),
      ('continuity_plans',           'assessment_id')
    ) as t(tbl, col)
  loop
    execute format(
      'create index if not exists %I on public.%I (%I)',
      'idx_' || fk.tbl || '_' || fk.col, fk.tbl, fk.col
    );
  end loop;
end $$;

-- Enum-like status columns, filtered by name (status = 'active', etc.) across
-- the dashboard and health routes, with no index of their own.
create index if not exists idx_agents_status     on public.agents (status);
create index if not exists idx_workflows_status  on public.workflows (status);
create index if not exists idx_ai_platforms_status on public.ai_platforms (status);
