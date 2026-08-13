/*
 * Secret protection (doc §12): secrets are hashed or encrypted at rest, never
 * leak into the audit trail (redaction), and can be rotated.
 */
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const login = require('../services/login.service')
const federation = require('../services/federation.service')
const credential = require('../services/credential.service')
const mfa = require('../services/mfa.service')
const secrets = require('../services/secrets')
const { redact } = require('../redact')
const repos = require('../repositories')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

async function secretsHashedOrEncryptedAtRest() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })

    // client secret → one-way hash
    const machine = await svc.createMachine(c, { organizationId: org.id, name: 'ci', clientId: `m-${u}`, clientSecretHash: secrets.hash('plain-secret') })
    const storedM = await repos.machines.findById(c, machine.id, org.id)
    assert(storedM.client_secret_hash.startsWith('scrypt$'), 'client secret stored as scrypt hash')
    assert(storedM.client_secret_hash !== 'plain-secret', 'client secret not stored in plaintext')

    // provider secret → reversible encryption
    const provider = await federation.registerProvider(c, { organizationId: org.id, name: 'idp', issuer: 'https://idp.example', clientSecret: 'prov-secret' })
    const storedP = await repos.providers.findById(c, provider.id, org.id)
    assert(storedP.client_secret_enc && storedP.client_secret_enc !== 'prov-secret', 'provider secret stored encrypted')
    assertEqual(secrets.decrypt(storedP.client_secret_enc), 'prov-secret', 'provider secret decrypts via the boundary')

    // MFA seed → reversible encryption
    const user = await svc.createUser(c, { organizationId: org.id, email: `s-${u}@o.io`, status: 'active' })
    const { secret } = await mfa.beginEnrollment(c, { organizationId: org.id, userId: user.id })
    const storedU = await repos.users.findById(c, user.id, org.id)
    assert(storedU.mfa_secret_enc !== secret, 'TOTP seed stored encrypted')
    assertEqual(secrets.decrypt(storedU.mfa_secret_enc), secret)
  })
}

async function redactionStripsSecrets() {
  const r = redact({ password: 'p', ok: 'k', nested: { client_secret_hash: 'h', arr: [{ token: 't', keep: 'v' }] } })
  assertEqual(r.password, '[REDACTED]')
  assertEqual(r.ok, 'k')
  assertEqual(r.nested.client_secret_hash, '[REDACTED]')
  assertEqual(r.nested.arr[0].token, '[REDACTED]')
  assertEqual(r.nested.arr[0].keep, 'v')
}

async function auditNeverContainsSecrets() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    // Even if a secret is (wrongly) passed in detail, the audit layer redacts it.
    await repos.audit.record(c, { organizationId: org.id, event: 'test.leak', detail: { password: 'SUPERSECRET', client_secret: 'ALSO-SECRET', note: 'safe' } })
    const dump = JSON.stringify(await repos.audit.listForOrg(c, org.id))
    assert(!dump.includes('SUPERSECRET'), 'password never reaches the audit trail')
    assert(!dump.includes('ALSO-SECRET'), 'client secret never reaches the audit trail')
    assert(dump.includes('[REDACTED]'), 'redaction marker present')
    assert(dump.includes('safe'), 'non-sensitive detail retained')
  })
}

async function clientSecretRotation() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const machine = await svc.createMachine(c, { organizationId: org.id, name: 'ci', clientId: `m-${u}`, clientSecretHash: secrets.hash('old-secret') })
    await life.transitionIdentity(c, { kind: 'machine', id: machine.id, orgId: org.id, to: 'active' })
    await login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'old-secret' }) // works

    const rotated = await credential.rotateClientSecret(c, { organizationId: org.id, kind: 'machine', id: machine.id })
    await assertThrows(() => login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'old-secret' }), 'invalid_credentials')
    const ok = await login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: rotated.clientSecret })
    assertEqual(ok.status, 'authenticated')
  })
}

async function providerSecretRotation() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const provider = await federation.registerProvider(c, { organizationId: org.id, name: 'idp', issuer: 'https://idp.example', clientSecret: 'p1' })
    const rot = await credential.rotateProviderSecret(c, { organizationId: org.id, providerId: provider.id })
    assert(rot.clientSecret !== 'p1', 'new provider secret differs')
    const after = await repos.providers.findById(c, provider.id, org.id)
    assertEqual(secrets.decrypt(after.client_secret_enc), rot.clientSecret, 'stored secret updated to the rotated value')
  })
}

module.exports = {
  'secrets are hashed or encrypted at rest': secretsHashedOrEncryptedAtRest,
  'redaction strips sensitive fields (deep)': redactionStripsSecrets,
  'audit trail never contains secrets': auditNeverContainsSecrets,
  'client secret rotation invalidates the old secret': clientSecretRotation,
  'provider secret rotation replaces the stored value': providerSecretRotation,
}
