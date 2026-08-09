/*
 * Session + refresh engineering (doc §10).
 * Login → Session → Access Token → Refresh (rotation) → Logout → Revocation.
 *
 * - Sessions persisted and expiring; access tokens short-lived and stateless.
 * - Refresh tokens are high-entropy opaque strings, stored only as a SHA-256 hash,
 *   bound 1:1 to a session, and ROTATED on every use.
 * - Reuse of a revoked/expired refresh token is treated as compromise: every
 *   session for that principal is revoked (replay/abuse prevention).
 * - validateAccessToken() is revocation-aware (checks the session is still active).
 */
const crypto = require('crypto')
const config = require('../config')
const { withTransaction } = require('../db/pool')
const repos = require('../repositories')
const token = require('./token')
const { AuthenticationError } = require('../errors')

const inTx = (exec, fn) => (exec ? fn(exec) : withTransaction(fn))
const generateRefresh = () => crypto.randomBytes(32).toString('hex')
const hashRefresh = (t) => crypto.createHash('sha256').update(String(t)).digest('hex')

function tokenResponse(accessToken, refreshToken) {
  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: config.jwt.accessTtlSec }
}

/** Create a session for an authenticated principal and issue access + refresh tokens. */
async function start(exec, { principalId, organizationId, kind, ip = null, userAgent = null }) {
  return inTx(exec, async (client) => {
    // Concurrent-session cap: revoke oldest sessions beyond the limit.
    if (config.session.maxConcurrent > 0) {
      const active = await repos.sessions.listActiveForPrincipal(client, principalId, organizationId)
      const excess = active.length - (config.session.maxConcurrent - 1)
      for (let i = 0; i < excess; i++) await repos.sessions.revoke(client, active[i].id, organizationId)
    }

    const refreshToken = generateRefresh()
    const expiresAt = new Date(Date.now() + config.jwt.refreshTtlSec * 1000)
    const session = await repos.sessions.create(client, {
      principalId, organizationId, status: 'active',
      refreshTokenHash: hashRefresh(refreshToken), mfaRequired: false, mfaSatisfied: true,
      ip, userAgent, expiresAt,
    })
    const accessToken = token.issueAccess({ principalId, organizationId, kind, sessionId: session.id })
    await repos.audit.record(client, { organizationId, actorPrincipalId: principalId, event: 'session.created', resource: 'session', action: 'create', decision: 'ok', detail: { sessionId: session.id } })
    return { session, ...tokenResponse(accessToken, refreshToken) }
  })
}

/** Rotate a refresh token, issuing a fresh access + refresh pair. */
async function refresh(exec, { refreshToken, ip = null, userAgent = null }) {
  return inTx(exec, async (client) => {
    const h = hashRefresh(refreshToken)
    const session = await repos.sessions.findByRefreshHash(client, h)
    if (!session) throw new AuthenticationError('invalid refresh token')

    // Reuse of a non-active token → compromise: revoke the whole principal's sessions.
    if (session.status !== 'active' || new Date(session.expires_at) <= new Date()) {
      await repos.sessions.revokeAllForPrincipal(client, session.principal_id, session.organization_id)
      await repos.audit.record(client, { organizationId: session.organization_id, actorPrincipalId: session.principal_id, event: 'session.refresh_replay', resource: 'session', action: 'refresh', decision: 'deny', reason: 'replay_detected', detail: { sessionId: session.id } })
      throw new AuthenticationError('refresh token no longer valid')
    }

    const newRefresh = generateRefresh()
    await repos.sessions.setRefreshHash(client, session.id, session.organization_id, hashRefresh(newRefresh))
    const principal = await repos.principals.findById(client, session.principal_id, session.organization_id)
    const accessToken = token.issueAccess({ principalId: session.principal_id, organizationId: session.organization_id, kind: principal.kind, sessionId: session.id })
    await repos.audit.record(client, { organizationId: session.organization_id, actorPrincipalId: session.principal_id, event: 'session.refreshed', resource: 'session', action: 'refresh', decision: 'ok', detail: { sessionId: session.id } })
    return tokenResponse(accessToken, newRefresh)
  })
}

/** Verify an access token AND confirm its session is still active (revocation-aware). */
async function validateAccessToken(exec, accessToken) {
  const claims = token.verify(accessToken, { expectedType: 'access' })
  const session = await repos.sessions.findById(exec, claims.sid, claims.org)
  if (!session || session.status !== 'active' || new Date(session.expires_at) <= new Date()) {
    throw new AuthenticationError('session is not active')
  }
  return { claims, session }
}

/** Log out: revoke the session (its refresh token stops working immediately). */
async function logout(exec, { sessionId, organizationId }) {
  const s = await repos.sessions.revoke(exec, sessionId, organizationId)
  if (s) {
    await repos.audit.record(exec, { organizationId, actorPrincipalId: s.principal_id, event: 'session.logout', resource: 'session', action: 'logout', decision: 'ok', detail: { sessionId } })
  }
  return !!s
}

/** Revoke every session for a principal (e.g. on compromise or identity revocation). */
async function revokeAllForPrincipal(exec, principalId, organizationId) {
  return repos.sessions.revokeAllForPrincipal(exec, principalId, organizationId)
}

module.exports = { start, refresh, validateAccessToken, logout, revokeAllForPrincipal }
