# Sentinel Identity & Trust — Engineering Decisions & Risk Closure

**Owner:** Areeb Ahmad — Identity & Trust Platform
**Scope:** `backend/identity/**` and the `/api/v1` identity surface
**Status:** Phase 1 (Foundations). Locks ownership, principles, and the W2 carry-forward risk decisions before implementation.

This document is the constitutional reference for the identity platform. Every later phase must stay consistent with it; changes here are deliberate engineering decisions, not incidental.

---

## 0. Constitutional ownership — LOCK FIRST

**Areeb (this platform) owns:** human / organization / AI-agent / machine identity; roles, permissions, attributes; sessions and tokens; trust policies; identity providers and federated identities; the identity lifecycle; authentication and authorization; RBAC and ABAC; MFA; token issuance/validation; refresh-token lifecycle; revocation and rotation; OAuth2 client-credentials, OIDC, and federation foundations; the identity/trust APIs; identity audit integration, security controls, reliability, evidence, and production readiness.

**Explicitly NOT owned here** (do not absorb): Application Security, Infrastructure Security, AI Security, DevSecOps, Security Quality/Compliance certification, Sentinel-wide engineering governance, repository-wide engineering ownership.

**Constitutional boundary (enforced by design):**
- One Identity & Trust source of truth — the `oba_identity` database and this service.
- Consuming platforms integrate only through the approved `/api/v1` contract.
- Consumers must not recreate authentication, recreate authorization, create parallel identity stores, or import identity internals.
- Preserve the shared JWT trust contract across platforms.

---

## 1. Security principles — enforced everywhere

Architecture before implementation · one source of truth · zero-trust by default · least privilege · explicit authorization · deny-overrides · organization/tenant isolation · human governance · auditable decisions · revocable trust · short-lived access credentials · controlled credential lifecycle · no implicit trust · no silent privilege escalation · no undocumented authorization bypass · no uncontrolled federation trust · no secret leakage · no cross-tenant access · **fail closed** on security-critical failures · evidence-based verification.

**Core security invariant:** Identity establishes the subject → Authentication establishes confidence → Authorization establishes permitted action → Trust policy establishes contextual permission → Audit establishes accountability.

---

## 2. W2 carry-forward risks — decisions

The Week-2 architecture is complete. These risks are closed here so implementation is authorized.

### 2.1 Token trust
- **Signing strategy:** Phase 1 uses **HS256 (symmetric)** for intra-platform tokens — simplest correct default for a single issuer. A migration path to **RS256 + JWKS** is defined for cross-platform verification (consumers verify with a public key without sharing the secret). Implemented in Phase 6.
- **Signing-key ownership:** the Identity & Trust platform is the **sole issuer**. No consumer signs tokens.
- **Verification-key distribution:** HS256 shared secret now, distributed via the Secrets Service boundary; RS256 public keys later via a public **`/api/v1/.well-known/jwks.json`** endpoint.
- **Key rotation lifecycle:** keys carry a **`kid`**; rotation keeps the previous key valid for an overlap window so in-flight tokens still verify, then retires it. Rotation events are audited.
- **Access tokens stay short-lived** (default 900s) and stateless; longer-lived trust lives in revocable refresh tokens/sessions.

### 2.2 Tenant isolation
- **Organization scoping:** every identity table carries `organization_id`; every repository method is organization-scoped by a required tenant parameter — there is no un-scoped read/write path.
- **Enforcement points:** (1) repository layer (all queries filter by org), (2) authorization layer (decisions evaluated within the caller's org), (3) API layer (tenant context derived from the authenticated token, never from client input).
- **Cross-tenant behavior:** a reference to another tenant's resource is treated as **not found / denied** — never a partial leak. Fail closed.
- **Test strategy:** an explicit Tenant A → Tenant B DENY matrix (lookup, mutation, authorization, policy evaluation, audit access) in Phase 3/11.

### 2.3 Federation
- **Onboarding:** providers are registered **per organization** with explicit, reviewed trust configuration; nothing is trusted implicitly.
- **Provider registration & claim mapping:** an `identity_provider` record holds issuer/protocol/config; a claim-mapping defines how external claims map to internal identity fields. Unmapped/unexpected claims are ignored, never elevated.
- **Trust boundaries:** only registered, active providers are accepted; provider signature/issuer/audience are validated.
- **Federated identity lifecycle:** federated identities follow the same lifecycle states as native identities and are revocable. **JIT provisioning is OFF by default.**

### 2.4 Secrets
- **Protected secrets:** MFA seeds, client secrets, provider secrets, signing keys, federation credentials.
- **Handling:** secrets that must be verified but never revealed are **hashed** (e.g. client secrets). Secrets that must be recovered are **encrypted at rest** (AES-256-GCM) under a key from the Secrets Service boundary — never stored in plaintext, never in ordinary application fields where prohibited.
- **No leakage:** secrets never appear in logs, errors, API responses, tests, or telemetry. Structured logging redacts known-sensitive fields.
- **Rotation/replacement** behavior is defined per secret type (Phase 9).

### 2.5 Database & migrations
- **Formal migration system:** goose-style versioned SQL migrations in `identity/migrations/` run by `identity/db/migrate.js`. State tracked in `schema_migrations` with per-file **checksums**.
- **Schema versioning:** monotonic numbered files (`NNN_name.sql`), each with `-- +migrate up` / `-- +migrate down`.
- **Upgrade validation & drift detection:** `migrate validate` fails if an applied migration's on-disk checksum changed — enforcing **no uncontrolled manual schema changes**.
- **Rollback:** supported via the `down` section where reversible; irreversible steps are documented.
- **CI validation:** CI runs `migrate up` then `migrate validate` against an ephemeral database (wired in Phase 2/11).
- **Seed strategy:** deterministic baseline seed (system roles, permission catalogue) applied separately from schema.

---

## W2 exit
- ☑ Architecture complete.
- ☑ Carry-forward risks resolved (decisions above).
- ☑ Implementation authorized — proceed phase by phase.
