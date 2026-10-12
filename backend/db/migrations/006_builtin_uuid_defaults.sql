-- =============================================================================
-- Horquva Continuity Platform — Migration 006: built-in UUID defaults
-- =============================================================================
-- Every id default used uuid-ossp's uuid_generate_v4(). On some platforms it is
-- very slow (measured 0.58 ms per call on Postgres 18 / Windows, so a 20,000-node
-- first sync spent ~20 s just making ids). gen_random_uuid() is built into
-- Postgres 13+ and took 24 ms for the same 15,000 ids. Same type and format.
-- =============================================================================

DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT c.table_name, c.column_name, c.column_default
      FROM information_schema.columns c
     WHERE c.table_schema = current_schema()
       AND c.column_default LIKE '%uuid_generate_v4()%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT %s',
      col.table_name,
      col.column_name,
      replace(col.column_default, 'uuid_generate_v4()', 'gen_random_uuid()')
    );
  END LOOP;
END $$;
