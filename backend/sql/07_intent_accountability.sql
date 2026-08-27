-- 07_intent_accountability.sql — record who approved or rejected an intent.
--
-- WHY THIS EXISTS
-- execution_intents (schema.sql:46) has a status column that moves through
-- advisory -> pending -> approved/rejected -> executed, but nothing on the row
-- ever recorded WHO moved it. approveIntent/rejectIntent in
-- routes/orchestration/executionEngine.js did `.update({ status: 'approved' })`
-- and nothing else — even a fully trusted single admin approving something left
-- zero record of who did it. This is an accountability gap, not an auth gap.

alter table public.execution_intents add column if not exists approved_by text;
alter table public.execution_intents add column if not exists rejected_by text;
alter table public.execution_intents add column if not exists decided_at  timestamptz;

notify pgrst, 'reload schema';
