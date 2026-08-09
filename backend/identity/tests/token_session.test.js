/*
 * Tokens + sessions + refresh (doc §9, §10): JWT claims/validation, key rotation,
 * session lifecycle, refresh rotation, logout, and refresh-replay compromise handling.
 */
const token = require('../services/token')
const { createKeyring } = require('../services/keyring')
const session = require('../services/session.service')
const auth = require('../services/auth.service')
const svc = require('../services/identity.service')
const password = require('../services/password')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

const activeUser = (c, orgId, email) =>
  svc.createUser(c, { organizationId: orgId, email, passwordHash: password.hash('Secret_123'), status: 'active' })

// ── token unit tests (no DB) ──────────────────────────────────────────────────
async function tokenClaimsAndValidation() {
  const t = token.issueAccess({ principalId: 'p1', organizationId: 'o1', kind: 'user', sessionId: 's1' })
  const claims = token.verify(t, { expectedType: 'access' })
  assertEqual(claims.sub, 'p1'); assertEqual(claims.org, 'o1'); assertEqual(claims.typ, 'access')
  assert(claims.iss && claims.aud && claims.exp && claims.jti, 'standard claims present')

  // tampered payload → rejected
  const parts = t.split('.')
  const tampered = `${parts[0]}.${parts[1].slice(0, -2)}xx.${parts[2]}`
  await assertThrows(() => token.verify(tampered), 'invalid_token')

  // expired → rejected
  const expired = token.sign({ sub: 'p1', typ: 'access' }, { ttlSec: -10 })
  await assertThrows(() => token.verify(expired), 'invalid_token')

  // wrong expected type → rejected
  await assertThrows(() => token.verify(t, { expectedType: 'refresh' }), 'invalid_token')
}

async function keyRotationVerifiesOldTokens() {
  const krOld = createKeyring([{ kid: 'old', secret: 'secret-old', active: true }])
  const tok = token.sign({ sub: 'p1', typ: 'access' }, { keyring: krOld, ttlSec: 60 })

  // After rotation the new key is active but the old key still verifies its tokens.
  const krRotated = createKeyring([
    { kid: 'new', secret: 'secret-new', active: true },
    { kid: 'old', secret: 'secret-old', active: false },
  ])
  const claims = token.verify(tok, { keyring: krRotated })
  assertEqual(claims.sub, 'p1')

  // Once the old key is removed, its tokens no longer verify.
  const krNewOnly = createKeyring([{ kid: 'new', secret: 'secret-new', active: true }])
  await assertThrows(() => token.verify(tok, { keyring: krNewOnly }), 'invalid_token')
}

// ── session lifecycle (DB) ────────────────────────────────────────────────────
async function sessionStartAndValidate() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await activeUser(c, org.id, `s-${u}@o.io`)
    const r = await session.start(c, { principalId: user.principal_id, organizationId: org.id, kind: 'user' })
    assert(r.accessToken && r.refreshToken, 'tokens issued')
    const { claims, session: s } = await session.validateAccessToken(c, r.accessToken)
    assertEqual(claims.sub, user.principal_id)
    assertEqual(s.id, r.session.id)
  })
}

async function refreshRotation() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await activeUser(c, org.id, `r-${u}@o.io`)
    const r1 = await session.start(c, { principalId: user.principal_id, organizationId: org.id, kind: 'user' })

    const r2 = await session.refresh(c, { refreshToken: r1.refreshToken })
    assert(r2.accessToken && r2.refreshToken, 'new token pair issued')
    assert(r2.refreshToken !== r1.refreshToken, 'refresh token rotated')

    // Old refresh token no longer works; the new one does.
    await assertThrows(() => session.refresh(c, { refreshToken: r1.refreshToken }), 'invalid_credentials')
    const r3 = await session.refresh(c, { refreshToken: r2.refreshToken })
    assert(r3.accessToken, 'rotated refresh still valid')
  })
}

async function logoutAndReplayRevokesAll() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await activeUser(c, org.id, `l-${u}@o.io`)
    const s1 = await session.start(c, { principalId: user.principal_id, organizationId: org.id, kind: 'user' })
    const s2 = await session.start(c, { principalId: user.principal_id, organizationId: org.id, kind: 'user' })

    // Logout s1 → its access token stops validating.
    assert(await session.logout(c, { sessionId: s1.session.id, organizationId: org.id }), 'logout ok')
    await assertThrows(() => session.validateAccessToken(c, s1.accessToken), 'invalid_credentials')

    // Reusing s1's (now revoked) refresh token is treated as compromise → all sessions revoked.
    await assertThrows(() => session.refresh(c, { refreshToken: s1.refreshToken }), 'invalid_credentials')
    await assertThrows(() => session.validateAccessToken(c, s2.accessToken), 'invalid_credentials')
  })
}

async function endToEndLogin() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    await activeUser(c, org.id, `e-${u}@o.io`)

    const authed = await auth.authenticatePassword(c, { organizationId: org.id, email: `e-${u}@o.io`, password: 'Secret_123' })
    assertEqual(authed.status, 'authenticated')
    const started = await session.start(c, { principalId: authed.principalId, organizationId: org.id, kind: authed.kind })
    await session.validateAccessToken(c, started.accessToken)
    const refreshed = await session.refresh(c, { refreshToken: started.refreshToken })
    assert(refreshed.accessToken, 'refreshed after login')
    assert(await session.logout(c, { sessionId: started.session.id, organizationId: org.id }), 'logout after login')
  })
}

module.exports = {
  'JWT claims + validation (tamper / expiry / type)': tokenClaimsAndValidation,
  'key rotation verifies old tokens, rejects removed keys': keyRotationVerifiesOldTokens,
  'session start + revocation-aware validation': sessionStartAndValidate,
  'refresh token rotation invalidates the old token': refreshRotation,
  'logout revokes; refresh replay revokes all sessions': logoutAndReplayRevokesAll,
  'end-to-end: authenticate → session → validate → refresh → logout': endToEndLogin,
}
