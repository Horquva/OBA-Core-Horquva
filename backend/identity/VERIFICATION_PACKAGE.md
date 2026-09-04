# Sentinel Identity & Trust — Independent Verification Package (Plan Part 6.6)

> **Prepared by:** Areeb Ahmad · **For:** Mustafa (independent verifier) · **Date:** 2026-08-25
> **Baseline commit:** `9745c3a` + Set A/B hardening · **Areeb does not self-certify final acceptance.**
> This package gives you everything to reproduce and independently judge the critical Identity & Trust results:
> exact commands, expected results, evidence locations, and commit references.

## 0. One-command reproduction

```bash
cd backend
npm install
npm run identity:migrate           # apply 001,002,003
npm run identity:migrate:validate  # checksum drift gate → "Validation OK"
npm run identity:seed              # 26 perms, 4 roles, 45 mappings, bootstrap admin
npm run identity:test              # EXPECT: 66 passed, 0 failed
```

Prereq: PostgreSQL reachable via `IDENTITY_DATABASE_URL` (dev: `postgresql://admin:admin@127.0.0.1:5432/oba_identity`).
Tests run against the real DB inside rolled-back transactions — no residue.

## 1. Critical results to verify (command → expected)

| # | Security claim | Command / suite | Expected |
|---|---|---|---|
| 1 | Invalid/forged/expired/alg:none JWT → DENY | `identity:test` › `adversarial`, `token_session` | reject |
| 2 | Revoked session → DENY | `adversarial › revoked-session…` | reject |
| 3 | Refresh replay → revoke-all | `token_session › replay revokes all` | all sessions revoked |
| 4 | Deny-override beats RBAC **and** superuser | `authorization › explicit deny…` | deny |
| 5 | Cross-tenant → DENY | `tenant_isolation`, `integration_scenarios › Scenario C` | deny |
| 6 | Privilege escalation → DENY | `authorization › guarded assignment…` | forbidden |
| 7 | MFA cannot be bypassed | `mfa › login gate + bypass prevention` | gated |
| 8 | Key rotation: retired key not trusted | `session_hardening › key rotation lifecycle` | reject |
| 9 | Concurrent-session cap evicts oldest | `session_hardening › cap evicts oldest` | capped |
| 10 | Dependency down → FAIL CLOSED | `dependency_failure` (6 cases) | deny / hard-fail |
| 11 | Secrets never leak | `secret_protection` (5 cases) | absent |
| 12 | AI-agent / machine: only authorized action proceeds | `integration_scenarios › Scenario E, F` | scoped allow/deny |
| 13 | Consumers delegate (no parallel identity) | `integration_scenarios › HTTP client delegates…`; `architecture` | delegated / gate holds |
| 14 | Migrations reproducible (clean + rollback) | `MIGRATION_VERIFICATION.md` | clean up/down |
| 15 | Audit covers critical events | `audit_evidence` | traceable |

## 2. Live HTTP verification (optional, stronger evidence)

```bash
cd backend && node index.js &            # server on :3000
BASE=http://localhost:3000/api/v1

# valid login → tokens
curl -s -X POST $BASE/auth/login -H 'content-type: application/json' \
  -d '{"orgSlug":"horquva","email":"admin@horquva.io","password":"ChangeMe_Admin123"}'
# → {"status":"authenticated","accessToken":"…","refreshToken":"…"}

# authorize with the token
curl -s -X POST $BASE/authz/check -H "authorization: Bearer <token>" \
  -H 'content-type: application/json' -d '{"resource":"org","action":"create"}'
# → {"decision":"allow","reason":"superuser",...}

# forged / missing token → 401
curl -s -o /dev/null -w '%{http_code}\n' $BASE/auth/me -H 'authorization: Bearer forged'   # 401
curl -s -o /dev/null -w '%{http_code}\n' $BASE/auth/me                                      # 401
```

Observed 2026-08-25: login `authenticated`; `/auth/me` → `kind:user`, 26 permissions; `org:create` → `allow`; forged & missing → `401`.

## 3. Evidence artifacts (in-repo)

| Artifact | Covers |
|---|---|
| `RECONCILIATION.md` | Part 1 gap register (27 capabilities traced) |
| `SOURCE_OF_TRUTH.md` | Part 1.2 — single-source audit, no parallel identity |
| `MIGRATION_VERIFICATION.md` | Part 1.3–1.4 — clean/existing env, rollback, reproducibility |
| `ACCEPTANCE_MATRIX.md` | Part 7 — acceptance matrix + Requirement→…→Commit ledger |
| `INTEGRATION.md` | Part 5 — consumer contract + per-team hand-off |
| `contracts/index.js`, `contracts/identity-client.js` | the single consumption surface (wrap engines; no local crypto) |
| `tests/*.test.js` (16 suites, 66 tests) | executable evidence |
| `DECISIONS.md`, `PRODUCTION_READINESS.md` | locked decisions + readiness gate |

## 4. Verifier sign-off (to be completed by Mustafa)

| Result | Reproduced? | Verdict | Notes |
|---|---|---|---|
| `npm run identity:test` → 66/0 | ☐ | ☐ pass / ☐ fail | |
| Live HTTP smoke (§2) | ☐ | ☐ pass / ☐ fail | |
| Dependency-failure fail-closed (§1 #10) | ☐ | ☐ pass / ☐ fail | |
| Cross-tenant + escalation denials | ☐ | ☐ pass / ☐ fail | |
| No parallel identity mechanism | ☐ | ☐ pass / ☐ fail | |

> Independent verification is required before final acceptance. Areeb provides the evidence above and does not
> self-certify. Findings return to Areeb as release-blocking (fix) or accepted (sign-off).

## 5. Known environment note
The shared dev database `oba_identity` carries one stray test-artifact policy (`deny-audit-…`, an explicit deny on
`audit:read`, created 2026-08-10 during development). It is fail-safe (an extra deny) and does not affect the test
suite (tests roll back), but it will make a live `audit:read` check on the bootstrap admin return
`explicit_deny_policy`. Recommended cleanup before a live demo: delete that single `trust_policy` row (see the
session notes). It is not present in a freshly-migrated+seeded database.
