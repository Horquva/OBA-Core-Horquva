# Sentinel Identity & Trust — Production Readiness & Acceptance

**Owner:** Areeb Ahmad — Identity & Trust Platform
**Scope:** `backend/identity/**`, surface `/api/v1`, datastore `oba_identity` (PostgreSQL)

This document is the evidence gate for the Identity & Trust platform. Every claim maps to
the mechanism that implements it and the automated test that proves it. Reproduce all
evidence with:

```bash
cd backend
npm run identity:migrate      # schema (versioned, checksum-validated)
npm run identity:seed         # permission catalogue + system roles (+ dev bootstrap admin)
npm run identity:test         # 49 automated tests (unit, security, adversarial, e2e)
```

---

## §18 Evidence properties

The audit trail (`identity.audit_event`, append-only) and the test suite together satisfy:

- **Traceable** — every security event records org, actor principal, event, resource, action, decision, and timestamp.
- **Reproducible** — `npm run identity:test` re-runs every scenario against the real database inside rolled-back transactions.
- **Auditable** — `audit_evidence.test.js` asserts the trail contains every required event and both allow/deny decisions.
- **Non-sensitive** — `redact.js` runs in the audit layer; tests assert no plaintext secret ever appears in the trail.

**Audit coverage** (produced by services, verified by `audit_evidence.test.js`):

| Event | Emitted by |
|---|---|
| `identity.created` | user/agent/machine creation |
| `identity.lifecycle` | lifecycle transitions (+ session cascade) |
| `auth.login` (ok/deny) | password authentication |
| `auth.mfa` | MFA verification |
| `auth.client_credentials` | machine/agent authentication |
| `session.created` / `session.refreshed` / `session.logout` / `session.refresh_replay` | session lifecycle |
| `authz.decision` (allow/deny) | every authorization decision |
| `role.assigned` / `role.revoked` / `permission.granted` / `permission.revoked` | RBAC changes |
| `mfa.enroll_begin` / `mfa.enabled` / `mfa.disabled` | MFA enrollment |
| `federation.provider_registered` / `federation.linked` / `federation.login` | federation |
| `credential.rotated` | secret rotation |

---

## §19 Production-readiness checklist

| Criterion | Status | Mechanism | Evidence (test) |
|---|---|---|---|
| Database persistence works | ✅ | `pg` pool → `oba_identity` | live `/health/ready`; all DB tests |
| Migrations are controlled | ✅ | versioned runner + checksum drift gate | `migrate validate`; runner round-trip |
| Tenant isolation is enforced | ✅ | org-scoped repositories (fail closed) | `tenant_isolation.test.js` |
| Identity lifecycle is operational | ✅ | lifecycle engine + transition map | `lifecycle.test.js`, `e2e.test.js` |
| RBAC is operational | ✅ | roles/permissions/assignments + resolution | `authorization.test.js` |
| ABAC is operational | ✅ | attribute condition evaluator | `authorization.test.js` |
| Trust policies are operational | ✅ | policy engine, deny-override | `authorization.test.js` |
| Authentication is operational | ✅ | password chain + account-state + lockout | `authentication.test.js` |
| MFA is operational | ✅ | TOTP + recovery codes + login gate | `mfa.test.js` |
| JWT issuance/validation is operational | ✅ | HS256 + iss/aud/exp/sig checks | `token_session.test.js`, `auth_security_matrix.test.js` |
| Sessions are operational | ✅ | persisted, revocation-aware validation | `token_session.test.js` |
| Refresh lifecycle is operational | ✅ | rotation + replay detection | `token_session.test.js` |
| Revocation is operational | ✅ | logout + session revoke + cascade | `token_session.test.js`, `lifecycle.test.js` |
| Key rotation is operational | ✅ | kid keyring (retired keys verify) | `token_session.test.js`, `auth_security_matrix.test.js` |
| Secrets are protected | ✅ | Secrets boundary (hash/AES-GCM) + redaction | `secret_protection.test.js` |
| Federation foundation is operational | ✅ | provider registration + resolution + controls | `federation_machine.test.js` |
| OIDC foundation is operational | ✅ | claim validation + mapping (JWKS = deploy hook) | `federation_machine.test.js` |
| Machine identity authentication | ✅ | client-credentials grant | `federation_machine.test.js` |
| AI-agent authentication | ✅ | client-credentials grant | `federation_machine.test.js` |
| APIs are contract-compliant | ✅ | `/api/v1` routers, permission-guarded | live HTTP smoke; `api/v1/**` |
| Audit integration is operational | ✅ | audit on every security event | `audit_evidence.test.js` |
| Failure paths are tested | ✅ | generic failures, fail-closed | `authentication.test.js`, `authorization.test.js` |
| Security boundaries are tested | ✅ | adversarial/negative suite | `adversarial.test.js`, `auth_security_matrix.test.js` |
| Evidence exists for every critical claim | ✅ | this document + 49 tests | `npm run identity:test` |

**Operational (deployment-time) items:** signing-key material, the Secrets-Service backend, and
key-rotation cadence are resolved through configuration (`IDENTITY_*` env, `services/secrets.js`,
`services/keyring.js`) — the platform is built to consume them without code change (see `DECISIONS.md`).

---

## §20 Final acceptance gate

| DONE criterion | Met | Evidence |
|---|---|---|
| Identity & Trust is executable, not merely designed | ✅ | running `/api/v1`; 49 tests |
| Identity is the single source of truth | ✅ | one schema, one catalogue, one trust contract |
| Organizations are isolated | ✅ | `tenant_isolation.test.js` |
| Authentication is enforced | ✅ | `authentication.test.js` |
| MFA is enforced where required | ✅ | `mfa.test.js` (login gate + bypass prevention) |
| Tokens securely issued and validated | ✅ | `token_session.test.js`, `auth_security_matrix.test.js` |
| Sessions/refresh controllable and revocable | ✅ | `token_session.test.js` |
| RBAC / ABAC / trust policies work | ✅ | `authorization.test.js` |
| Deny-overrides work | ✅ | `authorization.test.js` |
| Machine / AI-agent identities work | ✅ | `federation_machine.test.js` |
| OIDC / federation foundation works | ✅ | `federation_machine.test.js` |
| Secrets are protected; key lifecycle controlled | ✅ | `secret_protection.test.js` |
| Unauthorized access fails closed | ✅ | `authorization.test.js`, `adversarial.test.js` |
| Privilege escalation is prevented | ✅ | `authorization.test.js` (guarded assignment) |
| Cross-tenant access is impossible via approved paths | ✅ | `tenant_isolation.test.js`, `auth_security_matrix.test.js` |
| Identity APIs expose approved contracts | ✅ | `api/v1/**`, live smoke |
| Consuming platforms do not bypass internals | ✅ | service→repository boundary (`architecture.test.js`) |
| Audit integration is functioning | ✅ | `audit_evidence.test.js` |
| Identity / authentication / authorization / federation lifecycles tested | ✅ | `e2e.test.js` + suite |
| Production-readiness evidence is complete | ✅ | this document |

**Result.** Sentinel Identity & Trust is executable, tested, and evidence-backed. Remaining
gates are constitutional: platform review and **CTO approval** per the Sentinel governance matrix,
plus deployment-time provisioning of production key material and the Secrets-Service backend.

**Engineering standard upheld:** No identity without lifecycle · No authentication without
verification · No authorization without explicit policy · No trust without validation · No
privilege without permission · No cross-tenant access · No secret leakage · No silent bypass ·
No irreversible trust · No production claim without evidence.
