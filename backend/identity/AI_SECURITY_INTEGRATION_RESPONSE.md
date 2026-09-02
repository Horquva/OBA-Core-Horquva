# Response to AI Security Technical Inquiry — Identity & Trust Platform

> **From:** Areeb Ahmad — Identity & Trust Platform Lead
> **To:** Taimour Mushtaq — AI Security Engineering Lead (`horquva_security_py` / `agent_identity_service`)
> **Re:** *Areeb's Inquiry — Technical Specifications & Platform Integration Requirements* (Part 2 Pre-Integration Gate)
> **Date:** 2026-09 · **Contract version:** `v1` · **Companion artifacts:** `openapi.v1.yaml`, `INTEGRATION.md`, `contracts/`, `VERIFICATION_PACKAGE.md`

**Bottom line up front:** the platform is the right authoritative source for agent identity and it already implements
your non-negotiables — one identity source (no parallel identity), authoritative tenant binding, and deterministic
**fail-closed** behavior. Please **retire** the in-memory store in `agent_identity_service` and do **not** build against
`backend/lib/jwt.js` (that is a legacy MVP, unrelated to this platform). Items that need a small build or a joint
decision before merge are listed explicitly in §"Follow-ups" — nothing here is hand-waved.

---

## Inquiry 1 — Platform identity, ownership, repository coordinates

- **What it is:** an **expansion of the existing Node/Express backend**, not a standalone external service and **not** `lib/jwt.js`.
- **Repository coordinate:** monorepo `Horquva/OBA-Core-Horquva`, path **`backend/identity/**`**, branch **`sentinel/identity-access-management`** (open **PR #64**, base `feature/architecture/sentinel-devsecops`).
- **Why your "Areeb" search found nothing:** commits are attributed to the GitHub identity **DevAreebAhmad**, and all code lives under `backend/identity/` (not tagged with the name "Areeb"). `backend/lib/jwt.js` + `backend/middleware/auth.js` are the **legacy MVP** (standard user login, no agent/tenant concepts, mounted at `/api/auth`, separate `JWT_SECRET`). See `SOURCE_OF_TRUTH.md` — the platform is a distinct namespace (`/api/v1`, `IDENTITY_JWT_SECRET`, dedicated `identity` Postgres schema).
- **Network address:** HTTP surface **`/api/v1`**. Dev: `http://localhost:3000/api/v1`. A shared staging URL is a DevSecOps deployment step (see Follow-ups F3).

## Inquiry 2 — API specification & endpoint schema mapping

- **Formal spec:** OpenAPI v3 is provided as **`openapi.v1.yaml`** (companion to this doc). Protobuf is not used (REST/JSON).
- **Note on the AI-agent model:** it already carries **`guardrail_profile`** and **`allowed_tools`** (JSONB) fields — designed for your consumption. Agent id ↔ tenant binding is immutable (Inquiry 4).
- **Operation mapping:**

| Your operation | Platform endpoint | Notes |
|---|---|---|
| 1. Agent registration + metadata | `POST /api/v1/identity/agents` (perm `agent:create`) | returns `clientId` + `clientSecret` **once** |
| 2. Credential issuance / secret gen | same call | secret shown once, stored only as a scrypt hash |
| 3. Real-time credential verification | `POST /api/v1/auth/token` (client-credentials → JWT), then `POST /api/v1/authz/check` | see Inquiry 3 for verification model |
| 4. Rotation + predecessor invalidation | **Follow-up F1** (service exists; HTTP route pending) | refresh tokens already rotate + replay-revoke |
| 5. Cryptographic revocation (≠ suspension) | lifecycle state **`revoked`** (distinct from `suspended`); **Follow-up F1** for the agent HTTP route | revoke **cascades session revocation** immediately |
| 6. Dynamic trust level querying/scoring | **Not a numeric score.** Trust is policy-based (RBAC + ABAC + trust policies → allow/deny) via `POST /api/v1/authz/check` | if you need a scalar score, that is a design discussion, not currently in scope |

Request/response JSON samples are in `openapi.v1.yaml` and `INTEGRATION.md`.

## Inquiry 3 — Inter-service M2M authentication

- **Enforced mechanism:** ✅ **OAuth 2.0 Client-Credentials Grant with signed JWT** — your option 2. Not mTLS, not pre-shared HMAC.
  `POST /api/v1/auth/token` `{ clientId, clientSecret }` → `{ accessToken (JWT), refreshToken, tokenType:"Bearer", expiresIn:900 }`.
- **Token verification model (committed):** we will roll out **RS256 + JWKS** — the platform will publish `GET /.well-known/jwks.json` so `agent_identity_service` verifies signatures **locally** (no per-call hop on the inference path), then confirms revocation. This is the agreed pre-merge deliverable (**Follow-up F2**; already the documented path in `DECISIONS.md`).
  - **Today (dev):** tokens are **HS256**, verified server-side — so in dev, verify by calling the platform (`/authz/check` or `/auth/me`). Switch to local JWKS verification lands with F2 before integration merge.
- **Service-identity renewal/rotation:** the AI Security subsystem gets its own machine/agent client credential; access tokens are short-lived (**15 min**), refresh tokens rotate on every use with replay→revoke-all. Client-secret rotation endpoint is **Follow-up F1**.

## Inquiry 4 — Multi-tenant architecture & authoritative agent binding

This directly resolves your `context_memory_isolation_service` impersonation risk:
- **Tenant model:** `organization` is a first-class tenant. **Every** identity (incl. `ai_agent`) has a non-null `organization_id` FK.
- **Immutable binding:** `ai_agent → principal → organization_id` via FK integrity — an agent cannot be re-parented to another tenant.
- **Verified tenant claims:** ✅ the access token carries an authoritative **`org`** claim; the platform derives tenant context **only** from the token, never from caller-supplied parameters. `POST /authz/check` and `GET /auth/me` return the verified org. **Stop trusting caller-supplied tenant strings** — read the `org` claim (or call `/auth/me`) instead. Cross-tenant access fails closed (proven: `tenant_isolation`, `integration_scenarios › Scenario C`).

## Inquiry 5 — Error semantics, HTTP status codes, lifecycle mapping

**Current model (implemented):**

| Condition | HTTP | Body |
|---|---|---|
| No token on protected route | 401 | `{ "error": "authentication_required" }` |
| Invalid/expired/forged/revoked token | 401 | `{ "error": "invalid_token" }` |
| Authenticated but not permitted | 403 | `{ "error": "forbidden", "reason": "<no_permission\|explicit_deny_policy\|identity_not_active>" }` |
| Cross-tenant / not found (fail-closed) | 404 | `{ "error": "not_found", "message": "…" }` |
| Bad input | 400 | `{ "error": "validation_error", "message": "…" }` |
| Platform not ready (DB unreachable) | 503 | `{ "status": "not_ready", "database": false }` |

**Lifecycle:** states are `provisioned → active → suspended → disabled → revoked → archived`. **`revoked` is distinct from `suspended`** and cascades session revocation. Authorization denies any non-active identity with `reason: "identity_not_active"`.

**Your granular codes** (`CREDENTIAL_EXPIRED`, `AGENT_REVOKED`, `AGENT_DEACTIVATED`, `TENANT_MISMATCH`) are **not yet emitted** — the current codes above cover the same semantics at a coarser grain. Adding the granular codes is a good idea and is **Follow-up F4** (your doc also scopes this as P1-joint). Proposed mapping is included there.

## Inquiry 6 — Failure modes, latency SLA, fail-closed resiliency

- **Fail-closed: confirmed and proven.** The platform never fails open. On an internal dependency failure (DB/keyring unavailable) authorization returns **deny** (`reason: evaluation_error`), token/session validation hard-fails, and readiness returns **503** — deterministic. Evidence: `tests/dependency_failure.test.js` (6 cases), reproducible via `VERIFICATION_PACKAGE.md`.
- **Contract you asked to confirm:** ✅ the platform emits deterministic failure states (401/403/503, never a spurious 200/allow) so your Python client can enforce a strict fail-closed block on any degraded/unreachable/timeout condition. **Recommended client rule:** treat *anything that is not an explicit `decision:"allow"` / 2xx* — including timeouts and 5xx — as **DENY/HALT**.
- **Latency SLA (p95/p99):** **not yet established** — no load testing has been run. **Follow-up F5.** Interim guidance: set a client timeout of ~**2–3 s** and fail closed on breach. During maintenance / replication lag you will get `503` or a connection error — both must be treated as DENY.

## Inquiry 7 — Sandbox endpoints, test credentials, local fixtures

- **Dev base URL:** `http://localhost:3000/api/v1`. Seeded org slug `horquva`, bootstrap admin, 26 permissions / 4 roles.
- **Isolated test tenants + synthetic agents:** the platform provisions tenants and agents via `/api/v1/identity/*`; the internal test suite runs against the real DB inside **rolled-back transactions** (no residue) — a model you can mirror. I will provide a **synthetic-agent fixture script** (create org → create agent → activate → grant role → mint token) for your CI (**Follow-up F6**).
- **Staging URL + M2M test credentials:** no deployed staging environment yet — this needs DevSecOps (**Follow-up F3**). Until then, dev is fully functional for integration development.

---

## Follow-ups (tracked; owners/timing)

| ID | Item | For | Owner | Priority |
|---|---|---|---|---|
| **F1** | Wire agent/machine **transition** (activate/suspend/**revoke**) + **client-secret rotation** HTTP routes (services already exist; only users have the transition route today) | Inq 2/5/7 destructive tests | Areeb | P0-before-merge |
| **F2** | **RS256 + JWKS** rollout — publish `/.well-known/jwks.json` for local token verification | Inq 3 | Areeb | P1-before-merge |
| **F3** | Provision **dev/staging** deployment + M2M service credential | Inq 1/7 | DevSecOps (Ali) + Areeb | P0 |
| **F4** | Granular machine-readable **error codes** (`AGENT_REVOKED`, `TENANT_MISMATCH`, …) mapped to current states | Inq 5 | Joint (Areeb + Taimour) | P1 |
| **F5** | **Latency SLA** (p95/p99) via load testing; publish client timeout guidance | Inq 6 | Areeb + DevSecOps | P1 |
| **F6** | **Synthetic-agent CI fixture** script | Inq 7 | Areeb | P1 |

## What is signed-off now (P0 gate)
Inquiries **1, 3, 4** and the **fail-closed contract (6)** are answered and demonstrable today. Inquiry **2** ships with `openapi.v1.yaml`. **5 and 7** are answered with the follow-ups above. I propose we treat **F1 + F3** as the blockers to your Part-2 integration merge, and **F2/F4/F5/F6** as the joint pre-merge track — matching the sequencing in your own §3.

**Constitutional confirmation:** `agent_identity_service` must consume these contracts and **must not** create a second identity system, JWT verifier, or tenancy store. The platform is the single authoritative source for agent identity, authentication, tenant binding, and authorization.
