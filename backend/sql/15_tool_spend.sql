-- 15_tool_spend.sql — create tool_spend, which routes/toolIntelligence.js
-- already reads and has for some time.
--
-- WHY THIS EXISTS
-- The live database carries a `tool_spend` table (id, platform_id, amount_usd,
-- month) with 72 rows — six months of per-platform spend, 2026-01 through
-- 2026-06 — that no file in sql/ ever created. Every other table the backend
-- reads has a migration; this one was added directly against the database at
-- some point and the schema in git stopped describing what was actually
-- running, the same gap 05_foreign_keys.sql closed for foreign keys. Running
-- run_migrations.js against a fresh Supabase project currently produces a
-- database where GET /api/tool-intelligence 500s on a missing relation.
--
-- Columns and types match the live table: `month` is TEXT in the same
-- '2026-06' shape used by documentation_trend.recorded_month and
-- brain_core_snapshots.snapshot_month (03_fizza_modules_schema.sql), not a
-- DATE — there is no day component to a month of spend. `amount_usd` is
-- NUMERIC, matching ai_platforms.cost_monthly.
--
-- UNIQUE(platform_id, month) is new, not inferred from the live data by
-- coincidence — it encodes what the table actually means (one spend figure
-- per platform per month) and is exactly the constraint whose absence let
-- routes/toolIntelligence.js's totalMonthlySpend silently sum six months into
-- a field it calls "monthly" (see that file's fix in this same change) without
-- the database ever being able to say the query was doing something odd.

CREATE TABLE IF NOT EXISTS tool_spend (
  id          SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id),
  amount_usd  NUMERIC NOT NULL,
  month       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS tool_spend_platform_id_idx ON tool_spend(platform_id);

-- CREATE TABLE IF NOT EXISTS is a no-op against the live database, which
-- already has this table without the constraint below -- add it here too so
-- both a fresh deploy and the existing database end up with the same shape.
-- Verified against the live 72 rows first: zero (platform_id, month)
-- duplicates, so this does not fail on real data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tool_spend_platform_id_month_key'
  ) THEN
    ALTER TABLE tool_spend ADD CONSTRAINT tool_spend_platform_id_month_key UNIQUE (platform_id, month);
  END IF;
END $$;
