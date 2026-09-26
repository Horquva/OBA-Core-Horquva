-- 19_change_impact.sql — AI-6: Change → Impact persistence.
--
-- WHY THIS EXISTS
-- AI-6's diff engine (domain/changeImpact.js) computes what a real change did
-- to risk, but has nowhere to keep it. AI-7 (Volatility Intelligence) is
-- specified to "pattern-read the change history AI-6 is already writing", and
-- detecting a change at all needs the previous state kept somewhere to diff
-- against. Design and every decision below:
-- docs/superpowers/specs/2026-09-21-ai-6-change-impact-persistence-design.md
--
-- NOT an audit log. audit_log (17_audit_log.sql, SEC-4) records WHO did WHAT
-- through WHICH endpoint. This records WHAT A CHANGE DID TO RISK. No actor,
-- endpoint, IP or user-agent columns here, by design (§3).
--
-- Numbered 19_: 17_ and 18_ are both taken upstream (D5).

-- One append-only row per detected change and its computed impact.
create table if not exists change_events (
  id             bigint generated always as identity primary key,
  detected_at    timestamptz not null default now(),
  scan_id        uuid not null,        -- every row written by one scan shares this

  change_type    text not null check (change_type in (
                   'owner_changed', 'backup_removed', 'tool_backup_removed',
                   'model_swapped', 'vendor_changed')),
  target_type    text not null,        -- 'agent' | 'employee' | 'platform'
  target_id      text not null,
  change         jsonb not null,       -- the change object exactly as detectChanges() returned it
  description    text not null,        -- e.g. 'Owner of CodeReviewAgent changed from Aisha Patel to no one'

  priced         boolean not null,     -- false: no existing calculation scores this change
  health_before  numeric,              -- null when the engine's evidence gate withholds a score
  health_after   numeric,
  health_delta   numeric,
  impact         jsonb not null,       -- { agents, people, spofChanges, downstream } from diffChange()

  dedup_key      text not null unique  -- makes a repeated scan idempotent (§6)
);

create index if not exists idx_change_events_detected_at on change_events (detected_at desc);
create index if not exists idx_change_events_type        on change_events (change_type, detected_at desc);
create index if not exists idx_change_events_target      on change_events (target_type, target_id);

-- The last-seen values of every watched field. Exactly one row (§5).
create table if not exists change_baseline (
  id         smallint primary key default 1 check (id = 1),
  taken_at   timestamptz not null default now(),
  snapshot   jsonb not null
);

-- Same posture as audit_log: the backend's service-role key bypasses RLS;
-- this closes the anon/authenticated path.
alter table change_events   enable row level security;
alter table change_baseline enable row level security;
revoke all on change_events   from anon, authenticated;
revoke all on change_baseline from anon, authenticated;

notify pgrst, 'reload schema';
