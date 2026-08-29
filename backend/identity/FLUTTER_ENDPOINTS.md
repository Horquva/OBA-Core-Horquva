# Sentinel Identity & Trust — API Endpoints for Flutter (M.Ali & Anas)

> **Owner:** Areeb Ahmad · **Contract version:** `v1` · **Date:** 2026-08-25
> **Base URL:** `<host>/api/v1` (local dev: `http://localhost:3000/api/v1`)
> **Golden rule:** the app **consumes** these decisions — it must **not** implement authentication or authorization
> itself. Show/hide UI from `permissions` / `authz/check`, but the real security boundary is the server. A tampered
> client still cannot act.

## Auth model

- **Access token** — short-lived (**15 min**) JWT. Send on every protected call: `Authorization: Bearer <accessToken>`.
- **Refresh token** — long-lived (**7 days**), opaque. Store securely (e.g. `flutter_secure_storage`). Used only to get a new access token; it is **rotated on every use** (old one becomes invalid immediately).
- On a `401` from a protected endpoint → call `POST /auth/refresh`; if that also fails, send the user back to login.
- Tenant/organization context comes **from the token** — never send it as a client-controlled field on protected calls.

## Error model (all endpoints)

```json
{ "error": "<code>", "message": "<human message>" }
```
| HTTP | `error` | Meaning |
|---|---|---|
| 400 | `validation_error` | bad/missing input |
| 401 | `authentication_required` | no token on a protected route |
| 401 | `invalid_token` / `invalid_credentials` | bad/expired/revoked token or bad login |
| 403 | `forbidden` | authenticated but not permitted (includes `reason`) |
| 404 | `not_found` | resource not found (also used for cross-tenant, fail-closed) |
| 500 | `internal_error` | server error (message is generic) |

---

## Endpoints the app needs

### 1. `POST /auth/login` — password login  *(public)*
Request:
```json
{ "orgSlug": "horquva", "email": "user@org.io", "password": "••••••" }
```
(`organizationId` may be sent instead of `orgSlug`.)
Success — no MFA:
```json
{ "status": "authenticated", "sessionId": "…", "accessToken": "…", "refreshToken": "…",
  "tokenType": "Bearer", "expiresIn": 900 }
```
Success — MFA required (no tokens yet):
```json
{ "status": "mfa_required", "challengeId": "…" }
```
Errors: `400 validation_error` (no org), `401 invalid_credentials` (generic — same for wrong password, unknown user, locked, or inactive account — **do not** infer which).

### 2. `POST /auth/mfa/verify` — complete MFA  *(public; needs `challengeId`)*
Request:
```json
{ "organizationId": "…", "challengeId": "…", "code": "123456" }
```
Success: same token payload as login (`status:"authenticated"`, tokens). Error: `401` on bad/expired code or challenge.

### 3. `POST /auth/refresh` — rotate tokens  *(public; needs refresh token)*
Request: `{ "refreshToken": "…" }`
Success:
```json
{ "accessToken": "…", "refreshToken": "…", "tokenType": "Bearer", "expiresIn": 900 }
```
Error: `401 invalid_credentials`. ⚠️ **Reusing an already-rotated refresh token revokes ALL of that user's sessions** (replay protection) — always store the newest refresh token and never retry with an old one.

### 4. `GET /auth/me` — current identity + permissions  *(auth)*
Header: `Authorization: Bearer <accessToken>`
Success:
```json
{ "principalId": "…", "organizationId": "…", "kind": "user", "permissions": ["audit:read", "identity:manage", …] }
```
Use `permissions` to drive UI visibility.

### 5. `POST /authz/check` — "can I do X?"  *(auth)*
Request: `{ "resource": "audit", "action": "read", "context": { } }`  (`context` optional)
Success:
```json
{ "decision": "allow", "reason": "rbac_grant", "matched": { "rbac": true, "abac": false, "policy": "none" } }
```
**Only `decision === "allow"` means allowed.** Everything else (`deny`, any error) = not allowed. Use for gating a specific action's UI/flow.

### 6. `GET /authz/permissions` — caller's effective permissions  *(auth)*
Success: `{ "permissions": ["audit:read", …] }`

### 7. `POST /auth/logout` — revoke current session  *(auth)*
Header: `Authorization: Bearer <accessToken>` → `{ "ok": true }`. After this the access + refresh tokens stop working immediately. Clear stored tokens client-side.

### 8. MFA self-service (user identities)  *(auth)*
- `POST /auth/mfa/enroll` → `{ "secret": "BASE32…", "otpauthUri": "otpauth://totp/…" }` — render `otpauthUri` as a QR code for an authenticator app.
- `POST /auth/mfa/enroll/confirm` `{ "code": "123456" }` → `{ "recoveryCodes": ["…", …] }` — **shown once**; tell the user to save them.
- `POST /auth/mfa/disable` → `{ "ok": true }`.

### 9. Health  *(public — for connectivity checks only)*
- `GET /health` → `{ "status": "ok", "service": "sentinel-identity" }`
- `GET /health/ready` → `{ "status": "ready", "database": true }` (503 if not ready).

---

## Typical app flows

**Login (no MFA):** `POST /auth/login` → store `accessToken` + `refreshToken` → `GET /auth/me` for identity/permissions.

**Login (MFA):** `POST /auth/login` → `{status:"mfa_required", challengeId}` → prompt for code → `POST /auth/mfa/verify` → store tokens.

**Any protected call returns 401:** `POST /auth/refresh` with the stored refresh token → replace both tokens → retry once. If refresh fails → route to login.

**Logout:** `POST /auth/logout` → clear stored tokens.

---

## Not for the app (server/admin surface — listed for completeness)
- `POST /auth/token` — OAuth2 **client-credentials** grant for machine/AI-agent identities (backend workloads, not the app).
- `/identity/*` and `/trust/*` — admin CRUD for orgs/users/agents/machines/roles/permissions/attributes/policies/providers; each is permission-guarded. Only relevant if the app has an admin console; ask Areeb for that subset if needed.

Questions or a field you need that isn't here → ping Areeb. Do not add local JWT decoding, role checks, or a second auth store in the app — call these endpoints.
