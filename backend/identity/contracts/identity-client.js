/*
 * Sentinel Identity & Trust — HTTP REFERENCE CLIENT (Plan Part 5).
 * Owner: Areeb Ahmad.
 *
 * For consumers that run OUT OF PROCESS from the identity backend (separate
 * services, Infrastructure workloads, AI-Security, a Flutter backend-for-frontend).
 * Every method delegates a trust decision to the identity platform over the
 * approved `/api/v1` contract. It performs NO local JWT verification, role
 * resolution, or authorization — the single source of truth stays server-side.
 *
 * Node 18+/22 provides a global `fetch`; inject a compatible `fetchImpl` in other
 * runtimes or in tests. This file is a reference implementation other teams copy
 * or port; it deliberately has no dependency on identity internals.
 */
class IdentityError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'IdentityError'
    this.status = status
    this.body = body
  }
}

class IdentityClient {
  /** @param {{ baseUrl?: string, fetchImpl?: typeof fetch, timeoutMs?: number }} opts */
  constructor({ baseUrl = 'http://localhost:3000/api/v1', fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required')
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetch = fetchImpl
    this.timeoutMs = timeoutMs
  }

  async _req(method, path, { token, body } = {}) {
    const headers = { 'content-type': 'application/json' }
    if (token) headers.authorization = `Bearer ${token}`
    const res = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    let data = null
    try { data = await res.json() } catch (_) { /* empty body */ }
    if (!res.ok) throw new IdentityError(data?.error || `HTTP ${res.status}`, res.status, data)
    return data
  }

  // ── Authentication ──────────────────────────────────────────────────────────
  /** Human login. Returns { status:'authenticated', accessToken, refreshToken, ... } or { status:'mfa_required', challengeId }. */
  login({ orgSlug, organizationId, email, password }) {
    return this._req('POST', '/auth/login', { body: { orgSlug, organizationId, email, password } })
  }

  /** Complete an MFA challenge → tokens. */
  completeMfa({ organizationId, challengeId, code }) {
    return this._req('POST', '/auth/mfa/verify', { body: { organizationId, challengeId, code } })
  }

  /** OAuth2 client-credentials grant for machine / AI-agent identities → tokens. */
  machineToken({ clientId, clientSecret }) {
    return this._req('POST', '/auth/token', { body: { clientId, clientSecret } })
  }

  /** Rotate a refresh token → new token pair. */
  refresh(refreshToken) {
    return this._req('POST', '/auth/refresh', { body: { refreshToken } })
  }

  /** Revoke the caller's session. */
  logout(accessToken) {
    return this._req('POST', '/auth/logout', { token: accessToken })
  }

  // ── Identity / Authorization (the decisions consumers must NOT recompute) ─────
  /** Resolve the caller's identity + effective permissions from a token. */
  me(accessToken) {
    return this._req('GET', '/auth/me', { token: accessToken })
  }

  /**
   * Authorization decision from the engine. Returns { decision, reason, matched }.
   * `decision === 'allow'` is the ONLY grant signal a consumer should honor.
   * Pass `principalId` only to check another principal (needs policy:evaluate).
   */
  authorize(accessToken, { resource, action, context, principalId } = {}) {
    return this._req('POST', '/authz/check', { token: accessToken, body: { resource, action, context, principalId } })
  }

  /** The caller's effective permission keys. */
  permissions(accessToken) {
    return this._req('GET', '/authz/permissions', { token: accessToken })
  }
}

module.exports = { IdentityClient, IdentityError }
