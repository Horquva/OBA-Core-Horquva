-- 17_decision_queue_raised_at.sql — additive column needed before
-- decision_queue can absorb pending_decisions' readers.
--
-- Owner decision, 2026-09-18: pending_decisions and decision_queue are the
-- same "what needs a decision right now?" data, seeded twice independently
-- (checked row by row -- every one of pending_decisions' 7 rows has a
-- matching, richer counterpart in decision_queue's 9). Merging onto
-- decision_queue (see sql/18_drop_superseded_pending_decisions.sql) means
-- briefing.js/voice.js/automation/index.js/context.js -- all former readers
-- of pending_decisions.raised_at -- need somewhere to read it from.
--
-- DEFAULT now() backfills existing rows to the moment this migration runs,
-- which is the best available answer for seed data that was never really
-- "raised" at a distinct real moment in the first place -- the same
-- non-issue every other DEFAULT-backfilled additive column in this migration
-- history has.

alter table public.decision_queue add column if not exists raised_at timestamptz default now();

notify pgrst, 'reload schema';
