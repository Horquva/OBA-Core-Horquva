/*
 * API middleware for /api/v1.
 * - requireAuth: validates the bearer access token (revocation-aware) and sets
 *   req.identity = { principalId, organizationId, kind, sessionId }. Tenant context
 *   ALWAYS comes from the token, never from client input.
 * - requirePermission: enforces authorization at the API boundary via the authz engine.
 * - errorHandler: maps typed domain errors to HTTP status codes.
 */
const { pool } = require('../../db/pool')
const session = require('../../services/session.service')
const authz = require('../../services/authz.service')

const extractToken = (req) => {
  const h = req.headers.authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7) : null
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

async function requireAuth(req, res, next) {
  try {
    const t = extractToken(req)
    if (!t) return res.status(401).json({ error: 'authentication_required' })
    const { claims } = await session.validateAccessToken(pool, t)
    req.identity = { principalId: claims.sub, organizationId: claims.org, kind: claims.kind, sessionId: claims.sid }
    return next()
  } catch (_) {
    return res.status(401).json({ error: 'invalid_token' })
  }
}

function requirePermission(resource, action) {
  return asyncHandler(async (req, res, next) => {
    const { organizationId, principalId } = req.identity
    const decision = await authz.authorize(pool, { organizationId, principalId, resource, action })
    if (decision.decision !== 'allow') return res.status(403).json({ error: 'forbidden', reason: decision.reason })
    return next()
  })
}

function errorHandler(err, req, res, _next) {
  const status = err.status || 500
  if (status >= 500) console.error('[identity/api]', err.message)
  res.status(status).json({
    error: err.code || 'internal_error',
    message: status < 500 ? err.message : 'Internal Server Error',
  })
}

module.exports = { extractToken, asyncHandler, requireAuth, requirePermission, errorHandler }
