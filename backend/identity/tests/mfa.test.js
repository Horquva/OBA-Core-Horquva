/*
 * MFA — TOTP enrollment, encrypted seed at rest, login gate, recovery codes,
 * and anti-bypass (doc §11).
 */
const svc = require('../services/identity.service')
const login = require('../services/login.service')
const mfa = require('../services/mfa.service')
const secretbox = require('../services/secretbox')
const config = require('../config')
const password = require('../services/password')
const repos = require('../repositories')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

const activeUser = (c, orgId, email) =>
  svc.createUser(c, { organizationId: orgId, email, passwordHash: password.hash('Secret_123'), status: 'active' })

async function enrollEncryptsSeedAndEnables() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await activeUser(c, org.id, `en-${u}@o.io`)

    const { secret, otpauthUri } = await mfa.beginEnrollment(c, { organizationId: org.id, userId: user.id })
    assert(otpauthUri.startsWith('otpauth://totp/'), 'provisioning URI returned')
    assert(otpauthUri.includes(`secret=${secret}`), 'URI carries the secret')

    // Seed is stored ENCRYPTED, not in plaintext, and decrypts back to the secret.
    const stored = await repos.users.findById(c, user.id, org.id)
    assert(stored.mfa_secret_enc && stored.mfa_secret_enc !== secret, 'seed stored encrypted')
    assertEqual(secretbox.decrypt(stored.mfa_secret_enc, config.mfa.encKey), secret)
    assertEqual(stored.mfa_enabled, false, 'MFA not enabled until confirmed')

    const { recoveryCodes } = await mfa.confirmEnrollment(c, { organizationId: org.id, userId: user.id, code: mfa.totp(secret) })
    assertEqual(recoveryCodes.length, config.mfa.recoveryCodeCount, 'recovery codes issued')
    assertEqual((await repos.users.findById(c, user.id, org.id)).mfa_enabled, true, 'MFA enabled after confirm')

    // Wrong confirm code is rejected.
    await assertThrows(() => mfa.confirmEnrollment(c, { organizationId: org.id, userId: user.id, code: '000000' }), 'validation_error')
  })
}

async function loginGateAndBypassPrevention() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await activeUser(c, org.id, `lg-${u}@o.io`)
    const { secret } = await mfa.beginEnrollment(c, { organizationId: org.id, userId: user.id })
    await mfa.confirmEnrollment(c, { organizationId: org.id, userId: user.id, code: mfa.totp(secret) })

    // Password step returns a challenge and NO tokens (bypass prevented).
    const step1 = await login.login(c, { organizationId: org.id, email: `lg-${u}@o.io`, password: 'Secret_123' })
    assertEqual(step1.status, 'mfa_required')
    assert(step1.challengeId && !step1.accessToken, 'no access token before MFA')

    // Wrong code fails and issues no tokens.
    await assertThrows(() => login.completeMfa(c, { organizationId: org.id, challengeId: step1.challengeId, code: '000000' }), 'invalid_credentials')

    // Correct TOTP completes the login.
    const step2 = await login.completeMfa(c, { organizationId: org.id, challengeId: step1.challengeId, code: mfa.totp(secret) })
    assertEqual(step2.status, 'authenticated')
    assert(step2.accessToken && step2.refreshToken, 'tokens issued after MFA')
  })
}

async function recoveryCodeIsSingleUse() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await activeUser(c, org.id, `rc-${u}@o.io`)
    const { secret } = await mfa.beginEnrollment(c, { organizationId: org.id, userId: user.id })
    const { recoveryCodes } = await mfa.confirmEnrollment(c, { organizationId: org.id, userId: user.id, code: mfa.totp(secret) })
    const code = recoveryCodes[0]

    const s1 = await login.login(c, { organizationId: org.id, email: `rc-${u}@o.io`, password: 'Secret_123' })
    const done = await login.completeMfa(c, { organizationId: org.id, challengeId: s1.challengeId, code })
    assertEqual(done.status, 'authenticated')

    // The same recovery code cannot be used again.
    const s2 = await login.login(c, { organizationId: org.id, email: `rc-${u}@o.io`, password: 'Secret_123' })
    await assertThrows(() => login.completeMfa(c, { organizationId: org.id, challengeId: s2.challengeId, code }), 'invalid_credentials')
  })
}

async function nonMfaUserLoginsDirectly() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    await activeUser(c, org.id, `nm-${u}@o.io`)
    const r = await login.login(c, { organizationId: org.id, email: `nm-${u}@o.io`, password: 'Secret_123' })
    assertEqual(r.status, 'authenticated')
    assert(r.accessToken, 'tokens issued directly when MFA not enabled')
  })
}

module.exports = {
  'enrollment encrypts the seed and enables only after confirm': enrollEncryptsSeedAndEnables,
  'login MFA gate + bypass prevention': loginGateAndBypassPrevention,
  'recovery code is single-use': recoveryCodeIsSingleUse,
  'non-MFA user logs in directly': nonMfaUserLoginsDirectly,
}
