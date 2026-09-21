-- OBA Core — Auth schema
-- Run this once in the Supabase SQL editor.

create table if not exists app_users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  name         text,
  role         text not null default 'member',   -- member | admin | executive
  org          text,                             -- organization / tenant id
  password_hash text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_app_users_email on app_users (email);
create index if not exists idx_app_users_org on app_users (org);
