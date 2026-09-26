-- SEC-4 / WD-3: append-only security and administration audit records.
create table if not exists audit_log (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  actor_id     text,
  actor_email  text,
  actor_role   text,
  action       text not null,
  outcome      text not null check (outcome in ('success', 'failure', 'denied')),
  reason       text,
  target_type  text,
  target_id    text,
  changes      jsonb,
  http_method  text,
  path         text,
  user_agent   text
);

create index if not exists idx_audit_log_occurred_at on audit_log (occurred_at desc);
create index if not exists idx_audit_log_actor on audit_log (actor_id, occurred_at desc);
create index if not exists idx_audit_log_action on audit_log (action, occurred_at desc);
create index if not exists idx_audit_log_target on audit_log (target_type, target_id);

alter table audit_log enable row level security;
revoke all on audit_log from anon, authenticated;