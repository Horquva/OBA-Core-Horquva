# Identity & Trust — Source-of-Truth Audit (Plan Part 1.2)

> **Owner:** Areeb Ahmad · **Date:** 2026-08-23 · **Baseline commit:** `9745c3a`
> **Goal:** confirm the Sentinel Identity & Trust platform (`backend/identity/`, `/api/v1`) is the **single authoritative
> source** for identity, authentication, authorization, roles, permissions, attributes, sessions, trust, token
> validation, and identity lifecycle — and that no consumer recreates competing security logic.

## Search method (reproducible)

Run from repo root:

```bash
# JWT verification engines
rg -l "jsonwebtoken|jwt\.verify|verifyToken|decodeToken|\bjose\b" backend --glob '*.js'
# Authorization / role / permission logic
rg -l "hasPermission|checkRole|requireRole|isAuthorized|permissionKeysFor|assignRole" backend --glob '*.js'
# Session / identity stores
rg -l "createSession|refresh_token|identityStore" backend --glob '*.js'
```

## Findings

### A. Inside `backend/identity/` — exactly ONE of each engine (authoritative)

| Concern | Single implementation | Enforced by |
|---|---|---|
| JWT sign/verify | `services/token.js` (+ `services/keyring.js`) | only module doing HMAC/JWT in the platform |
| Authorization decision | `services/authz.service.js` (RBAC+ABAC+trust, deny-override, fail-closed) | `tests/authorization.test.js` |
| Role/permission resolution | `repositories/rbac.js` via `authz.service` / `identity.service` | architecture test |
| Session/refresh lifecycle | `services/session.service.js` | `tests/token_session.test.js` |
| Data access (SQL) | `repositories/*` only — **no service runs raw SQL** | **`tests/architecture.test.js`** (hard gate) |

The architecture test (`services do not bypass the repository layer`) is the structural guarantee that no second data path or identity mechanism can appear inside the platform without failing CI.

### B. Outside `backend/identity/` — the pre-existing OBA MVP auth (legacy, separate namespace)

The sweep surfaced exactly three legacy files, all pre-dating this platform:

| File | What it is | Namespace / secret | Status |
|---|---|---|---|
| `backend/lib/jwt.js` | Minimal HS256 helper for the OBA MVP | mounted under `/api/auth`, uses `JWT_SECRET` | **Legacy MVP — not the Sentinel source of truth** |
| `backend/middleware/auth.js` | `requireAuth`/`requireRole`/`orgContext` for MVP routes | `JWT_SECRET` | **Legacy MVP** |
| `backend/routes/auth/auth.js` | Supabase-based MVP login | `/api/auth` | **Legacy MVP** |
| `backend/tests/auth.unit.test.js` | Unit test for `lib/jwt.js` | — | test of legacy |

**Key distinctions that prove these are not a competing Sentinel mechanism:**

1. **Different mount point** — legacy is `/api/auth`; Sentinel is `/api/v1`. They do not overlap.
2. **Different secret & issuer** — legacy uses `JWT_SECRET`; Sentinel uses `IDENTITY_JWT_SECRET` / `IDENTITY_JWT_ISSUER=sentinel-identity`. A legacy token cannot pass Sentinel verification (wrong issuer/audience/signature) and vice-versa.
3. **Different datastore** — legacy is Supabase-backed; Sentinel owns the dedicated `identity` schema.
4. **Pre-existing** — these files predate the identity platform; the Set-A work introduced **no new** parallel identity code (all identity work is under `backend/identity/`).

## Conclusion

- Within the Sentinel Identity & Trust platform there is **one** JWT engine, **one** authorization engine, **one** session store, and a repository layer that is the **only** SQL surface — structurally enforced.
- The only identity-adjacent code elsewhere is the **legacy OBA MVP** auth, isolated by mount point, secret, issuer, and datastore. It is **not** the Sentinel source of truth and does not compete with `/api/v1`.

## Reconciliation action (carried into Set B)

This audit records the **decision boundary** that Set B integrators (AppSec/Syed, Infra/Ali, AI-Security/Taimour, Flutter/M.Ali & Anas) must honor:

> **Consume the `/api/v1` identity + authorization contracts. Do not verify JWTs, resolve roles/permissions, evaluate authorization, or manage sessions independently. The legacy `/api/auth` + `middleware/auth.js` path must not be extended for Sentinel-protected operations.**

Enforcing this at integration time is the Set-B task; the source-of-truth boundary is established and documented here.
