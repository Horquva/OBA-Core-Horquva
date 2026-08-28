/**
 * In-memory revoked-token store — closes the "logout doesn't actually log
 * you out" gap without a database migration. Keyed by JWT `jti` (see
 * lib/jwt.js), not the raw token, so entries stay small.
 *
 * Not durable across restarts and not shared across processes — same
 * single-instance-MVP tradeoff as middleware/rateLimit.js. A restart or a
 * second instance both fail open (a revoked token would work again), which
 * is acceptable given tokens already expire within TOKEN_TTL (default 1h);
 * swap for a real store (Redis / a Supabase table) before scaling out.
 */

const revoked = new Map() // jti -> expiresAtEpochSeconds

function revoke(jti, expiresAtEpochSeconds) {
  if (!jti) return
  revoked.set(jti, expiresAtEpochSeconds || Math.floor(Date.now() / 1000) + 3600)
}

function isRevoked(jti) {
  if (!jti) return false
  const exp = revoked.get(jti)
  if (exp === undefined) return false
  if (exp <= Math.floor(Date.now() / 1000)) {
    revoked.delete(jti) // naturally expired — no need to keep tracking it
    return false
  }
  return true
}

module.exports = { revoke, isRevoked }
