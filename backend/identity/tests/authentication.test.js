/*
 * Authentication + password security (doc §7, §8): password hashing, the login
 * chain, account-state validation, failed-attempt lockout, generic failures
 * (no enumeration), MFA gating, contextual deny policy, and client credentials.
 */
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const auth = require('../services/auth.service')
const password = require('../services/password')
const repos = require('../repositories')
const config = require('../config')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

async function passwordHashRoundtrip() {
  const stored = password.hash('Secret_123')
  assert(stored.startsWith('scrypt$'), 'stored hash is scrypt-encoded')
  assert(!stored.includes('Secret_123'), 'plaintext never appears in the hash')
  assert(password.verify('Secret_123', stored), 'correct password verifies')
  assert(!password.verify('wrong', stored), 'wrong password rejected')
}

async function successfulLoginHidesSecrets() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await svc.createUser(c, { organizationId: org.id, email: `a-${u}@o.io`, passwordHash: password.hash('Secret_123'), status: 'active' })
    const r = await auth.authenticatePassword(c, { organizationId: org.id, email: `a-${u}@o.io`, password: 'Secret_123' })
    assertEqual(r.status, 'authenticated')
    assertEqual(r.principalId, user.principal_id)
    assertEqual(r.subject.password_hash, undefined, 'password_hash must never be returned')
  })
}

async function wrongPasswordCountsAndIsGeneric() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await svc.createUser(c, { organizationId: org.id, email: `b-${u}@o.io`, passwordHash: password.hash('Secret_123'), status: 'active' })
    const e = await assertThrows(() => auth.authenticatePassword(c, { organizationId: org.id, email: `b-${u}@o.io`, password: 'nope' }), 'invalid_credentials')
    assert(!/nope|password/i.test(e.message) || e.message === 'Invalid credentials', 'error message is generic')
    assertEqual((await repos.users.findById(c, user.id, org.id)).failed_login_count, 1, 'failed count incremented')
  })
}

async function lockoutAfterThreshold() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await svc.createUser(c, { organizationId: org.id, email: `c-${u}@o.io`, passwordHash: password.hash('Secret_123'), status: 'active' })
    for (let i = 0; i < config.auth.maxFailedAttempts; i++) {
      await assertThrows(() => auth.authenticatePassword(c, { organizationId: org.id, email: `c-${u}@o.io`, password: 'nope' }), 'invalid_credentials')
    }
    const locked = await repos.users.findById(c, user.id, org.id)
    assert(locked.locked_until && new Date(locked.locked_until) > new Date(), 'account is locked after threshold')
    // Correct password is still rejected while locked.
    await assertThrows(() => auth.authenticatePassword(c, { organizationId: org.id, email: `c-${u}@o.io`, password: 'Secret_123' }), 'invalid_credentials')
  })
}

async function inactiveAccountDenied() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    // default status = provisioned (not active)
    await svc.createUser(c, { organizationId: org.id, email: `d-${u}@o.io`, passwordHash: password.hash('Secret_123') })
    await assertThrows(() => auth.authenticatePassword(c, { organizationId: org.id, email: `d-${u}@o.io`, password: 'Secret_123' }), 'invalid_credentials')
  })
}

async function mfaRequiredGate() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await svc.createUser(c, { organizationId: org.id, email: `m-${u}@o.io`, passwordHash: password.hash('Secret_123'), status: 'active' })
    await c.query(`update identity.user_account set mfa_enabled = true where id = $1`, [user.id])
    const r = await auth.authenticatePassword(c, { organizationId: org.id, email: `m-${u}@o.io`, password: 'Secret_123' })
    assertEqual(r.status, 'mfa_required')
    assert(r.mfaRequired, 'mfaRequired flag set')
  })
}

async function contextualDenyPolicyBlocksLogin() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    await svc.createUser(c, { organizationId: org.id, email: `p-${u}@o.io`, passwordHash: password.hash('Secret_123'), status: 'active' })
    await repos.policies.create(c, { organizationId: org.id, name: `deny-ip-${u}`, effect: 'deny', resource: 'auth', action: 'password', conditions: [{ attribute: 'env.ip', operator: 'eq', value: '10.0.0.1' }] })

    // From the blocked IP → denied by policy
    await assertThrows(() => auth.authenticatePassword(c, { organizationId: org.id, email: `p-${u}@o.io`, password: 'Secret_123', context: { ip: '10.0.0.1' } }), 'forbidden')
    // From a different IP → allowed
    const r = await auth.authenticatePassword(c, { organizationId: org.id, email: `p-${u}@o.io`, password: 'Secret_123', context: { ip: '1.2.3.4' } })
    assertEqual(r.status, 'authenticated')
  })
}

async function clientCredentialsAuth() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const machine = await svc.createMachine(c, { organizationId: org.id, name: 'ci-runner', clientId: `cid-${u}`, clientSecretHash: password.hashSecret('s3cret') })
    await life.transitionIdentity(c, { kind: 'machine', id: machine.id, orgId: org.id, to: 'active' })

    const ok = await auth.authenticateClientCredentials(c, { clientId: `cid-${u}`, clientSecret: 's3cret' })
    assertEqual(ok.status, 'authenticated'); assertEqual(ok.kind, 'machine')
    assertEqual(ok.subject.client_secret_hash, undefined, 'secret hash must never be returned')

    await assertThrows(() => auth.authenticateClientCredentials(c, { clientId: `cid-${u}`, clientSecret: 'wrong' }), 'invalid_credentials')
    await assertThrows(() => auth.authenticateClientCredentials(c, { clientId: 'does-not-exist', clientSecret: 'x' }), 'invalid_credentials')
  })
}

module.exports = {
  'password hash roundtrip (no plaintext)': passwordHashRoundtrip,
  'successful login hides secrets': successfulLoginHidesSecrets,
  'wrong password counts and returns a generic error': wrongPasswordCountsAndIsGeneric,
  'account locks after failed-attempt threshold': lockoutAfterThreshold,
  'inactive account is denied': inactiveAccountDenied,
  'MFA-enabled user is gated to mfa_required': mfaRequiredGate,
  'contextual deny policy blocks login': contextualDenyPolicyBlocksLogin,
  'client-credentials authentication (success + failures)': clientCredentialsAuth,
}
