-- +migrate up
-- ============================================================================
-- Sentinel Identity & Trust — core domain schema (13 models).
-- All objects live in a dedicated `identity` schema so they can share a single
-- PostgreSQL instance with OBA data without any table-name collisions.
--
-- Subject model: a `principal` supertype unifies the three subject kinds
-- (user / ai_agent / machine) so role assignments, attributes, sessions,
-- federation, and audit all reference one identity with real FK integrity.
-- ============================================================================

create schema if not exists identity;

-- Lifecycle states shared by identity subjects (doc §3E):
--   Create(provisioned) -> Activate(active) -> Suspend -> Disable -> Revoke -> Archive
create domain identity.lifecycle_status as text
  check (value in ('provisioned', 'active', 'suspended', 'disabled', 'revoked', 'archived'));

create domain identity.session_status as text
  check (value in ('active', 'pending_mfa', 'expired', 'revoked'));

-- Auto-maintain updated_at on every UPDATE.
create or replace function identity.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────── Organization (tenant) ──────────────────────
create table identity.organization (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  status      identity.lifecycle_status not null default 'active',
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index uq_organization_slug on identity.organization (lower(slug));

-- ─────────────────────────────── Principal (subject supertype) ──────────────
create table identity.principal (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references identity.organization(id) on delete restrict,
  kind            text not null check (kind in ('user', 'ai_agent', 'machine')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index ix_principal_org on identity.principal (organization_id);

-- ─────────────────────────────── User (human identity) ──────────────────────
create table identity.user_account (
  id                 uuid primary key default gen_random_uuid(),
  principal_id       uuid not null unique references identity.principal(id) on delete cascade,
  organization_id    uuid not null references identity.organization(id) on delete restrict,
  email              text not null,
  full_name          text,
  password_hash      text,                       -- null for SSO/federation-only users
  status             identity.lifecycle_status not null default 'provisioned',
  is_superuser       boolean not null default false,
  mfa_enabled        boolean not null default false,
  mfa_secret_enc     text,                        -- encrypted TOTP seed (Phase 7/9)
  mfa_enrolled_at    timestamptz,
  last_login_at      timestamptz,
  failed_login_count int not null default 0,
  locked_until       timestamptz,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index uq_user_org_email on identity.user_account (organization_id, lower(email));
create index ix_user_org on identity.user_account (organization_id);
create index ix_user_status on identity.user_account (status);

-- ─────────────────────────────── AI Agent identity ──────────────────────────
create table identity.ai_agent (
  id                 uuid primary key default gen_random_uuid(),
  principal_id       uuid not null unique references identity.principal(id) on delete cascade,
  organization_id    uuid not null references identity.organization(id) on delete restrict,
  name               text not null,
  client_id          text not null,
  client_secret_hash text not null,
  guardrail_profile  text,
  allowed_tools      jsonb not null default '[]'::jsonb,
  owner_user_id      uuid references identity.user_account(id) on delete set null,
  status             identity.lifecycle_status not null default 'provisioned',
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index uq_agent_client_id on identity.ai_agent (client_id);
create index ix_agent_org on identity.ai_agent (organization_id);

-- ─────────────────────────────── Machine identity ───────────────────────────
create table identity.machine_identity (
  id                 uuid primary key default gen_random_uuid(),
  principal_id       uuid not null unique references identity.principal(id) on delete cascade,
  organization_id    uuid not null references identity.organization(id) on delete restrict,
  name               text not null,
  client_id          text not null,
  client_secret_hash text not null,
  owner_user_id      uuid references identity.user_account(id) on delete set null,
  status             identity.lifecycle_status not null default 'provisioned',
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index uq_machine_client_id on identity.machine_identity (client_id);
create index ix_machine_org on identity.machine_identity (organization_id);

-- ─────────────────────────────── Role (RBAC) ────────────────────────────────
-- organization_id NULL => global/system role template.
create table identity.role (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references identity.organization(id) on delete cascade,
  name            text not null,
  description     text,
  is_system       boolean not null default false,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Unique role name per organization (globals share the zero-uuid bucket).
create unique index uq_role_org_name on identity.role
  (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index ix_role_org on identity.role (organization_id);

-- ─────────────────────────────── Permission (RBAC) ──────────────────────────
create table identity.permission (
  id          uuid primary key default gen_random_uuid(),
  resource    text not null,
  action      text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index uq_permission_resource_action on identity.permission (resource, action);

-- ─────────────────────────────── Role ↔ Permission ──────────────────────────
create table identity.role_permission (
  role_id       uuid not null references identity.role(id) on delete cascade,
  permission_id uuid not null references identity.permission(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (role_id, permission_id)
);
create index ix_role_permission_perm on identity.role_permission (permission_id);

-- ─────────────────────────────── Role Assignment (Principal ↔ Role) ─────────
create table identity.role_assignment (
  id              uuid primary key default gen_random_uuid(),
  principal_id    uuid not null references identity.principal(id) on delete cascade,
  role_id         uuid not null references identity.role(id) on delete cascade,
  organization_id uuid not null references identity.organization(id) on delete restrict,
  granted_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index uq_assignment_principal_role on identity.role_assignment (principal_id, role_id);
create index ix_assignment_org on identity.role_assignment (organization_id);
create index ix_assignment_role on identity.role_assignment (role_id);

-- ─────────────────────────────── Attribute (ABAC) ───────────────────────────
create table identity.attribute (
  id              uuid primary key default gen_random_uuid(),
  principal_id    uuid not null references identity.principal(id) on delete cascade,
  organization_id uuid not null references identity.organization(id) on delete restrict,
  namespace       text not null default 'subject' check (namespace in ('subject', 'resource', 'env')),
  key             text not null,
  value           text,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index uq_attribute_principal_ns_key on identity.attribute (principal_id, namespace, key);
create index ix_attribute_org on identity.attribute (organization_id);

-- ─────────────────────────────── Session ────────────────────────────────────
create table identity.session (
  id                 uuid primary key default gen_random_uuid(),
  principal_id       uuid not null references identity.principal(id) on delete cascade,
  organization_id    uuid not null references identity.organization(id) on delete restrict,
  status             identity.session_status not null default 'active',
  refresh_token_hash text,
  mfa_required       boolean not null default false,
  mfa_satisfied      boolean not null default false,
  ip                 text,
  user_agent         text,
  issued_at          timestamptz not null default now(),
  expires_at         timestamptz not null,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index uq_session_refresh_hash on identity.session (refresh_token_hash)
  where refresh_token_hash is not null;
create index ix_session_principal on identity.session (principal_id);
create index ix_session_org on identity.session (organization_id);
create index ix_session_status on identity.session (status);

-- ─────────────────────────────── Trust Policy ───────────────────────────────
-- organization_id NULL => global constitutional policy.
create table identity.trust_policy (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references identity.organization(id) on delete cascade,
  name            text not null,
  description     text,
  effect          text not null check (effect in ('allow', 'deny')),
  priority        int not null default 100,
  resource        text,                        -- null => any resource
  action          text,                        -- null => any action
  conditions      jsonb not null default '[]'::jsonb,
  is_active       boolean not null default true,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index uq_policy_org_name on identity.trust_policy
  (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index ix_policy_lookup on identity.trust_policy (organization_id, resource, action) where is_active;

-- ─────────────────────────────── Identity Provider (federation) ─────────────
create table identity.identity_provider (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references identity.organization(id) on delete cascade,
  name               text not null,
  protocol           text not null check (protocol in ('oauth2', 'oidc', 'saml')),
  issuer             text,
  client_id          text,
  client_secret_enc  text,                      -- encrypted provider secret (Phase 9)
  config             jsonb not null default '{}'::jsonb,
  status             identity.lifecycle_status not null default 'provisioned',
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index uq_provider_org_name on identity.identity_provider (organization_id, lower(name));
create index ix_provider_org on identity.identity_provider (organization_id);

-- ─────────────────────────────── Federated Identity ─────────────────────────
create table identity.federated_identity (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid not null references identity.identity_provider(id) on delete cascade,
  principal_id     uuid not null references identity.principal(id) on delete cascade,
  organization_id  uuid not null references identity.organization(id) on delete restrict,
  external_subject text not null,
  claims           jsonb not null default '{}'::jsonb,
  status           identity.lifecycle_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index uq_federated_provider_subject on identity.federated_identity (provider_id, external_subject);
create index ix_federated_principal on identity.federated_identity (principal_id);
create index ix_federated_org on identity.federated_identity (organization_id);

-- ─────────────────────────────── Audit Event (append-only) ──────────────────
create table identity.audit_event (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid references identity.organization(id) on delete set null,
  actor_principal_id uuid references identity.principal(id) on delete set null,
  actor_label        text,
  event              text not null,
  resource           text,
  action             text,
  decision           text,
  reason             text,
  detail             jsonb not null default '{}'::jsonb,
  ip                 text,
  created_at         timestamptz not null default now()
);
create index ix_audit_org_time on identity.audit_event (organization_id, created_at desc);
create index ix_audit_event on identity.audit_event (event);
create index ix_audit_actor on identity.audit_event (actor_principal_id);

-- updated_at triggers (every mutable table; audit_event is append-only, no trigger).
create trigger trg_organization_updated      before update on identity.organization      for each row execute function identity.set_updated_at();
create trigger trg_principal_updated          before update on identity.principal          for each row execute function identity.set_updated_at();
create trigger trg_user_account_updated       before update on identity.user_account       for each row execute function identity.set_updated_at();
create trigger trg_ai_agent_updated           before update on identity.ai_agent           for each row execute function identity.set_updated_at();
create trigger trg_machine_identity_updated   before update on identity.machine_identity   for each row execute function identity.set_updated_at();
create trigger trg_role_updated               before update on identity.role               for each row execute function identity.set_updated_at();
create trigger trg_permission_updated         before update on identity.permission         for each row execute function identity.set_updated_at();
create trigger trg_role_assignment_updated    before update on identity.role_assignment    for each row execute function identity.set_updated_at();
create trigger trg_attribute_updated          before update on identity.attribute          for each row execute function identity.set_updated_at();
create trigger trg_session_updated            before update on identity.session            for each row execute function identity.set_updated_at();
create trigger trg_trust_policy_updated       before update on identity.trust_policy       for each row execute function identity.set_updated_at();
create trigger trg_identity_provider_updated  before update on identity.identity_provider  for each row execute function identity.set_updated_at();
create trigger trg_federated_identity_updated before update on identity.federated_identity for each row execute function identity.set_updated_at();

-- +migrate down
drop schema if exists identity cascade;
