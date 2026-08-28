-- 08_execution_mode_set_by.sql — add the column POST /mode already writes to.
--
-- WHY THIS EXISTS
-- routes/orchestration/index.js's `POST /mode` does:
--     .insert([{ mode, set_by: set_by || 'system' }])
-- but execution_mode (schema.sql:62) never declared a set_by column. Found while
-- live-testing the accountability fix in 07: the insert fails outright with
-- PGRST204 "Could not find the 'set_by' column of 'execution_mode' in the schema
-- cache" — so POST /mode has never actually worked, mounted or not. GET /mode
-- (in orchestration/orchestration.js, live today) only reads `mode`, so this was
-- never noticed.

alter table public.execution_mode add column if not exists set_by text;

notify pgrst, 'reload schema';
