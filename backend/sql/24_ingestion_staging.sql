-- 24_ingestion_staging.sql — Phase 4: the ingestion layer's storage.
--
-- WHY THIS EXISTS
-- The product had zero infrastructure to receive external data. Before any
-- connector (Jira, GitHub, Slack, Zapier, n8n, Agentforce, HR/Workday) is
-- written, its raw events need a landing zone and its user identities need a
-- bridge to Horquva employees:
--
--   raw_vendor_payloads — Stage 1 of the blueprint's 4-stage pipeline: every
--     inbound webhook lands here EXACTLY as received (verbatim JSONB),
--     giving replayability, audit compliance and schema-drift isolation.
--     Processing status lives alongside; the payload itself is immutable.
--
--   identity_bridge — Stage 2: maps vendor user ids (Slack U08ABC123, GitHub
--     octocat, Jira account ids) to employees.id. Match methods in increasing
--     confidence: exact email / exact SSO subject (automatic), probabilistic
--     (Fellegi–Sunter via the Splink sidecar — proposals below a confidence
--     floor queue for MANUAL confirmation, never auto-linked), manual.
--
-- Translation to graph mutations (Stage 3) happens through
-- domain/mutations.js — which triggers Feature 3's change log (Stage 4).
--
-- ⛔ DO NOT RUN BY HAND — `node run_migrations.js` (see 01's header).

BEGIN;

-- ── Stage 1: raw staging ────────────────────────────────────────────────────
create table if not exists public.raw_vendor_payloads (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.orgs(id) default '00000000-0000-4000-8000-000000000001',
  source            text not null check (source in ('jira','slack','github','zapier','n8n','agentforce','hr_csv','generic')),
  external_event_id text,
  payload           jsonb not null,
  status            text not null default 'pending' check (status in ('pending','processed','failed','skipped')),
  error_message     text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz
);

create index if not exists idx_raw_payloads_status
  on public.raw_vendor_payloads (org_id, status, received_at);
create index if not exists idx_raw_payloads_source
  on public.raw_vendor_payloads (org_id, source, received_at desc);

-- ── employees.email: the exact-match anchor for the identity bridge ─────────
alter table public.employees add column if not exists email text;
create unique index if not exists uq_employees_email on public.employees (org_id, email) where email is not null;

-- ── Stage 2: identity bridge ────────────────────────────────────────────────
create table if not exists public.identity_bridge (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.orgs(id) default '00000000-0000-4000-8000-000000000001',
  external_system   text not null,
  external_user_id  text not null,
  employee_id       uuid references public.employees(id),
  verified_email    text,
  match_method      text not null default 'manual'
                    check (match_method in ('exact_email','exact_sso','probabilistic','manual')),
  match_confidence  numeric,
  created_at        timestamptz not null default now(),
  unique (org_id, external_system, external_user_id)
);

create index if not exists idx_identity_bridge_employee
  on public.identity_bridge (org_id, employee_id);

-- ── RLS (defense-in-depth; the backend scopes reads via lib/tenant.js) ──────
alter table public.raw_vendor_payloads enable row level security;
drop policy if exists tenant_isolation on public.raw_vendor_payloads;
create policy tenant_isolation on public.raw_vendor_payloads
  using (org_id = current_setting('app.current_org', true)::uuid);

alter table public.identity_bridge enable row level security;
drop policy if exists tenant_isolation on public.identity_bridge;
create policy tenant_isolation on public.identity_bridge
  using (org_id = current_setting('app.current_org', true)::uuid);

revoke all on public.raw_vendor_payloads from anon, authenticated;
revoke all on public.identity_bridge from anon, authenticated;

notify pgrst, 'reload schema';

COMMIT;
