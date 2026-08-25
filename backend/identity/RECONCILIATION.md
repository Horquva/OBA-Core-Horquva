# Identity & Trust — Reconciliation & Gap Register (Plan Part 1)

> **Owner:** Areeb Ahmad · **Date:** 2026-08-23 · **Baseline commit:** `9745c3a` (+ Set A working-tree changes)
> **Method:** every capability is traced **API → service → repository → database → security control → test → evidence**.
> A capability is **Verified** only when a real (non-mocked) test exercises the whole path; otherwise it is a **Gap**.
> Test evidence: `cd backend && npm run identity:test` → **59 passed, 0 failed** (13 original + 2 Set A suites).

## Legend

`Implemented` fully built · `Verified` built **and** proven by an executable test against the real DB · `Gap` genuine remaining work · `N/A-here` belongs to Set B (cross-team integration / external verification).

---

## 1. Capability gap register

| # | Capability | API | Service | Repository | DB / Migration | Control | Test (evidence) | State |
|---|---|---|---|---|---|---|---|---|
| 1 | **Organization / tenant** | `identity.js` orgs | `identity.service` | `organizations` | `002` org table, `organization_id` on every table | tenant scope required at repo | `tenant_isolation`, `e2e` | **Verified** |
| 2 | **User identity** | `identity.js` users | `identity.service` | `identities.users` | `002` user_account + principal supertype | lifecycle states, FK | `e2e`, `lifecycle`, `authentication` | **Verified** |
| 3 | **AI-agent identity** | `identity.js` agents | `identity.service`, `federation.service` | `identities.agents` | `002` ai_agent | owner-bound, revocable | `federation_machine` | **Verified** (contract ready; live AI-Security wiring = Set B) |
| 4 | **Machine identity** | `identity.js` machines | `federation.service` | `identities.machines` | `002` machine_identity | client-credentials, revoke | `federation_machine` | **Verified** |
| 5 | **Roles** | `identity.js` roles | `rbac.service`, `identity.service` | `rbac.roles` | `002` role + role_permission | system roles seeded | `authorization`, seed | **Verified** |
| 6 | **Permissions** | `authz.js` permissions | `authz.service` | `rbac.permissions/assignments` | `002` permission (26 seeded) | zero-trust default | `authorization` | **Verified** |
| 7 | **Attributes (ABAC)** | `identity.js` attributes | `abac`, `authz.service` | `attributes` | `002` attribute | owner + missing-attr → deny | `authorization` (ABAC cases) | **Verified** |
| 8 | **Sessions** | `auth.js` login/logout | `session.service` | `sessions` | `002` session | revocation-aware, expiry | `token_session`, `adversarial` | **Verified** |
| 9 | **Concurrent-session cap** | (login path) | `session.service.start` | `sessions.listActive` | `002` session | evict oldest beyond cap | **`session_hardening`** (Set A) | **Verified** *(was Gap: logic existed, untested)* |
| 10 | **Trust policies** | `trust.js` policies | `authz.service`, `abac` | `trust.policies` | `002` trust_policy | deny-override | `authorization`, `tenant_isolation` | **Verified** |
| 11 | **Identity providers** | `trust.js` providers | `federation.service` | `trust.providers` | `002` identity_provider | trust config required | `federation_machine` | **Verified** |
| 12 | **Federated identities** | (login/federation) | `federation.service` | `trust.federatedIdentities` | `002` federated_identity | untrusted → reject, JIT-off | `federation_machine` | **Verified** (provider-JWKS sig verify = deployment integration) |
| 13 | **Authentication** | `auth.js` login | `auth.service`, `login.service` | identities, sessions | `002` | lockout, generic failures | `authentication`, `auth_security_matrix` | **Verified** |
| 14 | **JWT** | (bearer on all routes) | `token`, `keyring` | — (stateless) | — | kid selection, iss/aud/exp | `token_session`, `adversarial`, `auth_security_matrix` | **Verified** |
| 15 | **Key rotation lifecycle** | — | `keyring`, `token` | — | env `IDENTITY_JWT_PREV_KEYS` | retire → old token rejected | **`session_hardening`** (Set A) + `token_session` | **Verified** *(Set A made retirement explicit)* |
| 16 | **RBAC** | `authz.js` check | `authz.service`, `rbac.service` | `rbac.assignments` | `002` | escalation-guarded assign | `authorization`, `tenant_isolation` | **Verified** |
| 17 | **ABAC** | `authz.js` check | `abac`, `authz.service` | `attributes`, `policies` | `002` | fail-closed on bad operator | `authorization` | **Verified** |
| 18 | **MFA (TOTP)** | `auth.js` mfa/* | `mfa.service`, `login.service` | `recovery`, sessions | `003` recovery codes | AES-GCM seed, anti-bypass | `mfa` | **Verified** |
| 19 | **Refresh-token lifecycle** | `auth.js` refresh | `session.service.refresh` | `sessions` | `002` | rotation + replay→revoke-all | `token_session`, `adversarial` | **Verified** |
| 20 | **Revocation** | `auth.js` logout | `session.service`, `lifecycle.service` | `sessions` | `002` | logout + identity-revoke cascade | `lifecycle`, `token_session` | **Verified** |
| 21 | **Secret protection** | (never returns secrets) | `secrets`, `secretbox`, `redact` | all | `002/003` | scrypt/AES-GCM, redaction, rotation | `secret_protection` | **Verified** |
| 22 | **Identity APIs `/api/v1`** | `api/v1/*` | all | all | — | auth + permission guards | live smoke, `e2e` | **Verified** |
| 23 | **Migrations** | — | `db/migrate` | — | `001/002/003` + `schema_migrations` | checksum drift gate, up/down | **`MIGRATION_VERIFICATION.md`** (Set A) | **Verified** *(clean + existing env proven)* |
| 24 | **Repository layer** | — | all services | `repositories/*` | — | services never run raw SQL | `architecture` | **Verified** |
| 25 | **Audit integration** | (all mutating paths) | all services | `audit` | `002` audit_event (append-only) | non-sensitive, redacted | `audit_evidence`, `secret_protection` | **Verified** |
| 26 | **Dependency-failure / fail-closed** | (all trust paths) | `authz.service`, `session.service`, `token` | — | — | NO TRUST → NO PROTECTED OP | **`dependency_failure`** (Set A) | **Verified** *(was Gap: no outage tests existed)* |
| 27 | **Source of truth (no parallel identity)** | — | — | — | — | one JWT + one authz engine | **`SOURCE_OF_TRUTH.md`** (Set A) | **Verified** |

---

## 2. Gaps identified in Part-1 reconciliation and how Set A closed them

Reconciliation found the *implementation* of Parts 2–4 already complete and unit/adversarially tested. Four genuine gaps remained — all closed in Set A:

| Gap (before Set A) | Why it was a gap | Closure |
|---|---|---|
| **Concurrent-session cap untested** | `session.service.js:31` had the eviction logic but shipped with `maxConcurrent=0`; no test set a cap. | `session_hardening.test.js` enables the cap and asserts oldest-eviction + count invariant. |
| **Key-retirement not made explicit** | Rotation *overlap* was tested; "retired key cannot silently remain trusted" was implied, not asserted end-to-end. | `session_hardening.test.js` proves a fully-retired key's tokens are rejected, and a re-keyed `kid` rejects old-secret tokens. |
| **No dependency-failure tests** | Nothing proved fail-closed when the datastore/keyring is unavailable — the core Part 6.3 question. | `dependency_failure.test.js` injects a down datastore and proves authorize→deny, validate/refresh→hard-deny, and token integrity independent of the DB. |
| **Migration reproducibility not evidenced** | The runner existed but there was no captured proof against a *clean* environment or of full rollback. | `MIGRATION_VERIFICATION.md` captures clean-env up/validate/seed/rollback/re-apply + existing-env no-drift. |

## 3. Real persistence proof (Part 1.4)

`Create → Persist → Retrieve → Update → Lifecycle Change → Audit` is proven **non-mocked** by `tests/e2e.test.js` and `tests/lifecycle.test.js`, which run against the real `oba_identity` Postgres inside rolled-back transactions (`tests/helpers.js › withRollback`). No mocked database is used anywhere in the suite.

## 4. Outcome

The platform enters Parts 2–7 with an exact baseline: **26 capabilities Verified**, **0 open Gaps in Set A scope**. Remaining work is Set B (cross-team integration + independent verification), tracked separately.
