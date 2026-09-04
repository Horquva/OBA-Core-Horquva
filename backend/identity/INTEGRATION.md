# Sentinel Identity & Trust — Integration Guide (Plan Part 5)

> **Owner:** Areeb Ahmad · **Date:** 2026-08-25 · **Contract version:** `v1`
> This is the hand-off each Sentinel platform follows to consume identity **without recreating it**.
> Constitutional rule: consumers **must not** reproduce JWT trust, RBAC, ABAC, identity resolution, or session
> logic. They call the contract below. Frontend restrictions are UX only — never the security boundary.

## Two ways to consume — pick by process boundary

| Consumer runs… | Use | Import |
|---|---|---|
| **in-process** with the identity backend (same Node app) | `contracts/index.js` | `require('./identity/contracts')` |
| **out-of-process** (separate service / language / Flutter BFF) | HTTP `/api/v1` via the reference client | `contracts/identity-client.js` → `IdentityClient` |

Both delegate every decision to the same engines. Neither performs local crypto or policy evaluation.

### In-process contract surface (`contracts/index.js`)

```js
const identity = require('./identity/contracts')

// Express route guards (Application Security):
router.post('/things', identity.requireAuth, identity.requirePermission('thing', 'create'), handler)

// Programmatic decisions (AI-Security tool gating, Infra workload checks):
const { decision } = await identity.authorizeToken({ token, resource: 'tool', action: 'invoke', context })
if (decision !== 'allow') deny()

await identity.validateToken(token)          // → { principalId, organizationId, kind, sessionId }
await identity.effectivePermissions(token)   // → ['audit:read', ...]
await identity.isAllowed({ token, resource, action })  // → boolean, never throws into allow
```

### Out-of-process client (`contracts/identity-client.js`)

```js
const { IdentityClient } = require('./identity/contracts/identity-client')
const id = new IdentityClient({ baseUrl: 'https://identity.internal/api/v1' })

const { accessToken } = await id.login({ orgSlug, email, password })
const { decision }    = await id.authorize(accessToken, { resource: 'workload', action: 'run' })
```

---

## Per-consumer hand-off

### 1. Application Security — Syed (Part 5.1)
**Flow:** `Request → Identity → Authentication → Authorization → AppSec decision`
- Protect every enforced route with `identity.requireAuth` then `identity.requirePermission(resource, action)`.
- Read identity from `req.identity` (set by the contract). **Do not** parse JWTs, resolve roles, or evaluate ABAC in AppSec.
- Deny reason is returned as `{ error:'forbidden', reason }` for logging.
- **Must not reproduce:** JWT trust · RBAC · ABAC · identity resolution.

### 2. Infrastructure Security — Ali (Part 5.2)
**Flow:** `Workload → Machine Identity → Authorization → Runtime operation`
- Each workload gets a **machine identity** (client id + secret). Obtain a token with `id.machineToken({ clientId, clientSecret })`.
- Before a runtime operation, call `id.authorize(token, { resource, action })`; proceed only on `allow`.
- Unauthorized / revoked machine credentials fail closed (proven: `integration_scenarios › Scenario F`, `federation_machine › revoked machine cannot authenticate`).

### 3. AI Security — Taimour (Part 5.3 / 4.3)
**Flow:** `AI Agent → Identity → Authorization → Guardrail → Tool permission → Risk decision`
- Every agent has a **real** `ai_agent` identity (no hardcoded identity, no mock trust). Mint tokens via client-credentials.
- Gate each tool call with `identity.authorizeToken({ token, resource:'tool:<name>', action:'invoke', context })`.
- **Only explicitly-authorized actions proceed** — there is no ambient authority (proven: `integration_scenarios › Scenario E`).
- Taimour consumes these decisions for guardrails / risk / containment; he **must not** create a second identity system.

### 4. Flutter — M.Ali & Anas (Part 5.4)
The app calls the HTTP contract for **all** identity state; it renders UX from responses and never decides authorization itself.

| Need | Endpoint | Returns |
|---|---|---|
| Login | `POST /api/v1/auth/login` | tokens or `{ status:'mfa_required', challengeId }` |
| MFA | `POST /api/v1/auth/mfa/verify` | tokens |
| Refresh | `POST /api/v1/auth/refresh` | new token pair |
| Current identity + permissions | `GET /api/v1/auth/me` | `{ principalId, organizationId, kind, permissions }` |
| Can I do X? | `POST /api/v1/authz/check` | `{ decision, reason, matched }` |
| Logout | `POST /api/v1/auth/logout` | `{ ok:true }` |

> Use `permissions` / `authz/check` to **show/hide** UI. The real enforcement is server-side; a tampered client still cannot act.

### 5. Audit & Evidence (Part 5.5)
Every decision above is written to the append-only audit trail by the engines the contract wraps (authn success/failure, MFA, token issue/reject, session create/refresh/revoke, authz allow/deny, role/permission changes, machine/agent auth, federation). Consumers get audit coverage **for free** by using the contract — no extra work. Evidence: `tests/audit_evidence.test.js`.

---

## Live contract evidence (server on `:3000`, 2026-08-25)

```
GET  /api/v1/health          → {"status":"ok","service":"sentinel-identity"}
GET  /api/v1/health/ready     → {"status":"ready","database":true}
POST /api/v1/auth/login       → {"status":"authenticated", accessToken, refreshToken}
GET  /api/v1/auth/me          → {"kind":"user","organizationId":"…","permissions":[26 keys]}
POST /api/v1/authz/check org:create → {"decision":"allow","reason":"superuser"}
GET  /api/v1/auth/me (forged token) → 401
GET  /api/v1/auth/me (no token)     → 401
```

## What remains (the human hand-off)
This guide + the contract + `integration_scenarios.test.js` make each integration **plug-in**. The remaining Set-B work is the live wiring and joint sign-off with each owner (Syed, Ali, Taimour, M.Ali, Anas) and independent verification by Mustafa (see `VERIFICATION_PACKAGE.md`).
