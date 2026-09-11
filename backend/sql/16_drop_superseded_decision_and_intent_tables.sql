-- 16_drop_superseded_decision_and_intent_tables.sql — F-15: drop three more
-- orphaned tables found during the 2026-09-03 system diagnostic, following
-- the exact pattern 13_drop_frozen_aggregates.sql already established for
-- this class of table.
--
-- WHY THIS EXISTS
--
-- organizational_decisions (15 rows) and decision_factors (19 rows) are the
-- frozen precursor of what GET /api/decision-intelligence (D-58) already
-- computes live. The correspondence is exact, not approximate:
--   organizational_decisions.decision_score / quality_tier
--     <-> the live route's per-decision `score` / `quality`
--         (same four tiers: GOOD/ACCEPTABLE/POOR/HARMFUL — see
--         routes/decisionIntelligence.js's qualityTier())
--   decision_factors.factor_name / factor_status / score_impact
--     <-> the live route's `influences: [{ factor, impact, detail }]`
--         (routes/decisionIntelligence.js's scoreAgentDecision() and its
--         workflow/tool equivalents)
-- Same seeded demo entities (DeployBot, SecurityScanner, Incident Response)
-- as the rest of 02_seed_data.sql's fictional company. Zero code anywhere
-- reads either table, and 05_foreign_keys.sql declares no constraint on
-- them — the exact "seeded once, superseded by live computation, never
-- cleaned up" shape migration 13 already found seven other examples of.
--
-- execution_intents (0 rows) is a different case: not a superseded
-- duplicate, but a genuinely never-built feature stub -- an approval queue
-- for M51/M52/M53 to emit automation intents into, for M16 to consume. Those
-- three brain modules were retired/renamed to routes/selfHealing and
-- routes/automation/*, which return read-only advisory JSON directly and
-- never emit into this table, so nothing in the current architecture would
-- ever populate it. schema.sql's own header already flagged it as
-- "⚠ UNUSED: no route in this codebase reads or writes this table" and kept
-- it only because 07_intent_accountability.sql alters it.
--
-- That ALTER (07_intent_accountability.sql, already applied and recorded in
-- schema_migrations) is not edited here or by any other file -- migrations
-- are permanent history once applied; rewriting one wouldn't change what
-- already ran against a live database, only misrepresent it. Dropping the
-- table here makes that ALTER's effect moot going forward without needing
-- to touch it: a fresh deploy still runs schema.sql (creates the table) ->
-- 07 (alters it) -> this migration (drops it) in order, cleanly, and the
-- already-migrated live database simply loses a table three columns of
-- which nothing ever read either.

drop table if exists decision_factors cascade;
drop table if exists organizational_decisions cascade;
drop table if exists execution_intents cascade;

notify pgrst, 'reload schema';
