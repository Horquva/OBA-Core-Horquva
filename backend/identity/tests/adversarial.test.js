/*
 * Adversarial / negative engineering (doc §17): the platform must reject forged
 * and confused tokens, tampered claims, revoked sessions, and expired refresh
 * tokens. "If trust cannot be established, access is denied."
 */
const token = require('../services/token')
const { createKeyring } = require('../services/keyring')
const svc = require('../services/identity.service')
const session = require('../services/session.service')
const secrets = require('../services/secrets')
const repos = require('../repositories')
const { withRollback, assertThrows } = require('./helpers')

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const nowSec = () => Math.floor(Date.now() / 1000)

async function algNoneAndUnknownKidRejected() {
  // alg:none with an empty signature must not be accepted
  const noneTok = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: 'sentinel-identity', aud: 'horquva-platforms', sub: 'x', typ: 'access', exp: nowSec() + 60 })}.`
  await assertThrows(() => token.verify(noneTok), 'invalid_token')

  // Token signed under a kid the default keyring does not know
  const foreign = createKeyring([{ kid: 'attacker', secret: 'nope', active: true }])
  const tok = token.sign({ typ: 'access' }, { keyring: foreign, ttlSec: 60 })
  await assertThrows(() => token.verify(tok), 'invalid_token')
}

async function tamperedClaimsRejected() {
  const t = token.issueAccess({ principalId: 'p', organizationId: 'o', kind: 'user', sessionId: 's' })
  const [h, p, sig] = t.split('.')
  const body = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
  body.sub = 'attacker' // privilege grab via claim tampering
  const forged = `${h}.${b64(body)}.${sig}`
  await assertThrows(() => token.verify(forged), 'invalid_token')
}

async function revokedSessionTokenRejected() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await svc.createUser(c, { organizationId: org.id, email: `r-${u}@o.io`, passwordHash: secrets.hash('x'), status: 'active' })
    const s = await session.start(c, { principalId: user.principal_id, organizationId: org.id, kind: 'user' })
    await session.logout(c, { sessionId: s.session.id, organizationId: org.id })
    // Token is cryptographically valid but the session is revoked → denied.
    await assertThrows(() => session.validateAccessToken(c, s.accessToken), 'invalid_credentials')
  })
}

async function expiredRefreshRejected() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await svc.createUser(c, { organizationId: org.id, email: `e-${u}@o.io`, passwordHash: secrets.hash('x'), status: 'active' })
    const s = await session.start(c, { principalId: user.principal_id, organizationId: org.id, kind: 'user' })
    // Force the session past its expiry.
    await c.query(`update identity.session set expires_at = now() - interval '1 minute' where id = $1`, [s.session.id])
    await assertThrows(() => session.refresh(c, { refreshToken: s.refreshToken }), 'invalid_credentials')
  })
}

module.exports = {
  'alg:none and unknown-kid tokens rejected': algNoneAndUnknownKidRejected,
  'tampered claims rejected (signature breaks)': tamperedClaimsRejected,
  'revoked-session access token rejected': revokedSessionTokenRejected,
  'expired refresh token rejected': expiredRefreshRejected,
}
