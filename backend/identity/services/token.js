/*
 * JWT engineering (doc §9) — HS256 with kid-based key selection.
 * Approved claims: iss, aud, sub, iat, nbf, exp, jti, plus org, kind, sid, typ.
 * Verification checks signature (by kid), expiry, not-before, issuer, audience,
 * and (optionally) token type. Any failure throws TokenError → HTTP 401.
 */
const crypto = require('crypto')
const config = require('../config')
const { defaultKeyring } = require('./keyring')

class TokenError extends Error {
  constructor(message = 'Invalid or expired token') {
    super(message)
    this.name = 'TokenError'
    this.code = 'invalid_token'
    this.status = 401
  }
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const b64urlJson = (obj) => b64url(JSON.stringify(obj))
const fromB64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

function hmac(input, secret) {
  return b64url(crypto.createHmac('sha256', secret).update(input).digest())
}

const nowSec = () => Math.floor(Date.now() / 1000)

/** Low-level sign. `claims.ttlSec` sets exp; pass a keyring to sign under a chosen key. */
function sign(claims, { keyring = defaultKeyring, ttlSec } = {}) {
  const key = keyring.active()
  const header = { alg: 'HS256', typ: 'JWT', kid: key.kid }
  const iat = nowSec()
  const body = {
    iss: config.jwt.issuer,
    aud: config.jwt.audience,
    iat,
    nbf: iat,
    exp: iat + (ttlSec != null ? ttlSec : config.jwt.accessTtlSec),
    jti: crypto.randomUUID(),
    ...claims,
  }
  const signingInput = `${b64urlJson(header)}.${b64urlJson(body)}`
  return `${signingInput}.${hmac(signingInput, key.secret)}`
}

/** Verify signature + standard claims. Options: { keyring, expectedType }. */
function verify(token, { keyring = defaultKeyring, expectedType } = {}) {
  if (typeof token !== 'string' || token.split('.').length !== 3) throw new TokenError('malformed token')
  const [h, p, sig] = token.split('.')

  let header
  let claims
  try {
    header = JSON.parse(fromB64url(h).toString('utf8'))
    claims = JSON.parse(fromB64url(p).toString('utf8'))
  } catch (_) {
    throw new TokenError('malformed token')
  }

  const key = header.kid ? keyring.get(header.kid) : keyring.active()
  if (!key) throw new TokenError('unknown signing key')

  const expected = hmac(`${h}.${p}`, key.secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new TokenError('bad signature')

  const t = nowSec()
  if (claims.nbf && t < claims.nbf) throw new TokenError('token not yet valid')
  if (claims.exp && t >= claims.exp) throw new TokenError('token expired')
  if (claims.iss !== config.jwt.issuer) throw new TokenError('bad issuer')
  if (claims.aud !== config.jwt.audience) throw new TokenError('bad audience')
  if (expectedType && claims.typ !== expectedType) throw new TokenError('unexpected token type')

  return claims
}

/** Issue a short-lived access token bound to a session. */
function issueAccess({ principalId, organizationId, kind, sessionId }, opts = {}) {
  return sign(
    { sub: principalId, org: organizationId, kind, sid: sessionId, typ: 'access' },
    { ttlSec: config.jwt.accessTtlSec, ...opts }
  )
}

module.exports = { sign, verify, issueAccess, TokenError }
