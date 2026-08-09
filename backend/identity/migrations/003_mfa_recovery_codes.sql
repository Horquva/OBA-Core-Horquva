-- +migrate up
-- One-time MFA recovery codes (stored only as hashes; single-use).
create table identity.mfa_recovery_code (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references identity.user_account(id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index ix_recovery_user_unused on identity.mfa_recovery_code (user_id) where used_at is null;

-- +migrate down
drop table if exists identity.mfa_recovery_code;
