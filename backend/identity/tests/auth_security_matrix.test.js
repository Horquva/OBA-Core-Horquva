/*
 * Authentication security matrix (doc §15): token issuer/audience/signature,
 * expiry, disabled identity, cross-tenant authentication, key-rotation failure.
 */
const token = require('../services/token')
const { createKeyring } = require('../services/keyring')
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const auth = require('../services/auth.service')
const secrets = require('../services/secrets')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

async function tokenIssuerAudienceSignatureExpiry() {
  // wrong issuer / audience (claims override lets us forge these)
  await assertThrows(() => token.verify(token.sign({ typ: 'access', iss: 'evil' }, { ttlSec: 60 })), 'invalid_token')
  await assertThrows(() => token.verify(token.sign({ typ: 'access', aud: 'someone-else' }, { ttlSec: 60 })), 'invalid_token')
  // expired
  await assertThrows(() => token.verify(token.sign({ typ: 'access' }, { ttlSec: -5 })), 'invalid_token')
  // invalid signature (tamper the signature segment)
  const t = token.issueAccess({ principalId: 'p', organizationId: 'o', kind: 'user', sessionId: 's' })
  const [h, p, sig] = t.split('.')
  const forged = `${h}.${p}.${sig.slice(0, -3)}AAA`
  await assertThrows(() => token.verify(forged), 'invalid_token')
}

async function keyRotationFailureRejected() {
  const krOld = createKeyring([{ kid: 'old', secret: 's-old', active: true }])
  const tok = token.sign({ typ: 'access' }, { keyring: krOld, ttlSec: 60 })
  const krNew = createKeyring([{ kid: 'new', secret: 's-new', active: true }]) // old key removed
  await assertThrows(() => token.verify(tok, { keyring: krNew }), 'invalid_token')
}

async function disabledIdentityCannotAuthenticate() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    await svc.createUser(c, { organizationId: org.id, email: `d-${u}@o.io`, passwordHash: secrets.hash('Secret_123'), status: 'active' })
    // Works while active
    await auth.authenticatePassword(c, { organizationId: org.id, email: `d-${u}@o.io`, password: 'Secret_123' })
    // Disable → denied
    const user = await require('../repositories').users.findByEmail(c, org.id, `d-${u}@o.io`)
    await life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to: 'disabled' })
    await assertThrows(() => auth.authenticatePassword(c, { organizationId: org.id, email: `d-${u}@o.io`, password: 'Secret_123' }), 'invalid_credentials')
  })
}

async function crossTenantAuthenticationDenied() {
  await withRollback(async (c) => {
    const u = Date.now()
    const orgA = await svc.createOrganization(c, { name: 'A', slug: `a-${u}` })
    const orgB = await svc.createOrganization(c, { name: 'B', slug: `b-${u}` })
    await svc.createUser(c, { organizationId: orgA.id, email: `xt-${u}@a.io`, passwordHash: secrets.hash('Secret_123'), status: 'active' })
    // Correct credentials but wrong tenant → denied (user is invisible in org B)
    await assertThrows(() => auth.authenticatePassword(c, { organizationId: orgB.id, email: `xt-${u}@a.io`, password: 'Secret_123' }), 'invalid_credentials')
  })
}

module.exports = {
  'token issuer/audience/signature/expiry rejected': tokenIssuerAudienceSignatureExpiry,
  'key-rotation: token under a removed key is rejected': keyRotationFailureRejected,
  'disabled identity cannot authenticate': disabledIdentityCannotAuthenticate,
  'cross-tenant authentication denied': crossTenantAuthenticationDenied,
}
