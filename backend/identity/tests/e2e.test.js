/*
 * End-to-end Identity & Trust validation (doc §16): one flow proving the whole
 * lifecycle — identity (define → activate → revoke → archive), authentication
 * (password + MFA → session → token → validate), authorization (allow/deny),
 * credential lifecycle (refresh → logout), machine trust, and federation.
 */
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const login = require('../services/login.service')
const session = require('../services/session.service')
const mfa = require('../services/mfa.service')
const federation = require('../services/federation.service')
const authz = require('../services/authz.service')
const secrets = require('../services/secrets')
const repos = require('../repositories')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

const nowSec = () => Math.floor(Date.now() / 1000)

async function fullLifecycle() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'E2E', slug: `e2e-${u}` })

    // Identity: define/register (provisioned) → set password → activate
    const user = await svc.createUser(c, { organizationId: org.id, email: `e2e-${u}@o.io` })
    assertEqual(user.status, 'provisioned')
    await repos.users.setPasswordHash(c, user.id, org.id, secrets.hash('Secret_123'))
    await life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to: 'active' })

    // Enroll MFA
    const { secret } = await mfa.beginEnrollment(c, { organizationId: org.id, userId: user.id })
    await mfa.confirmEnrollment(c, { organizationId: org.id, userId: user.id, code: mfa.totp(secret) })

    // Authentication: password → MFA gate → tokens
    const step1 = await login.login(c, { organizationId: org.id, email: `e2e-${u}@o.io`, password: 'Secret_123' })
    assertEqual(step1.status, 'mfa_required')
    const step2 = await login.completeMfa(c, { organizationId: org.id, challengeId: step1.challengeId, code: mfa.totp(secret) })
    assertEqual(step2.status, 'authenticated')
    await session.validateAccessToken(c, step2.accessToken)

    // Authorization: grant auditor → allow audit:read, deny identity:manage
    await svc.assignRole(c, { organizationId: org.id, principalId: user.principal_id, roleName: 'auditor' })
    assertEqual((await authz.authorize(c, { organizationId: org.id, principalId: user.principal_id, resource: 'audit', action: 'read' })).decision, 'allow')
    assertEqual((await authz.authorize(c, { organizationId: org.id, principalId: user.principal_id, resource: 'identity', action: 'manage' })).decision, 'deny')

    // Credential lifecycle: refresh → logout
    assert((await session.refresh(c, { refreshToken: step2.refreshToken })).accessToken, 'refresh works')
    assert(await session.logout(c, { sessionId: step2.sessionId, organizationId: org.id }), 'logout works')

    // Identity revoke → archive; login denied afterward
    await life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to: 'revoked' })
    await assertThrows(() => login.login(c, { organizationId: org.id, email: `e2e-${u}@o.io`, password: 'Secret_123' }), 'invalid_credentials')
    await life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to: 'archived' })

    // Machine trust: create → activate → grant → revoke → denied
    const m = await svc.createMachine(c, { organizationId: org.id, name: 'ci', clientId: `m-${u}`, clientSecretHash: secrets.hash('msecret') })
    await life.transitionIdentity(c, { kind: 'machine', id: m.id, orgId: org.id, to: 'active' })
    assertEqual((await login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'msecret' })).status, 'authenticated')
    await life.transitionIdentity(c, { kind: 'machine', id: m.id, orgId: org.id, to: 'revoked' })
    await assertThrows(() => login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'msecret' }), 'invalid_credentials')

    // Federation: register → link → login
    const prov = await federation.registerProvider(c, { organizationId: org.id, name: 'idp', issuer: 'https://idp.example', audience: 'aud1' })
    const fu = await svc.createUser(c, { organizationId: org.id, email: `fed-${u}@o.io`, status: 'active' })
    await federation.linkFederatedIdentity(c, { organizationId: org.id, providerId: prov.id, userId: fu.id, externalSubject: 'x1' })
    const fl = await federation.assertFederatedLogin(c, { organizationId: org.id, providerId: prov.id, claims: { iss: 'https://idp.example', aud: 'aud1', sub: 'x1', exp: nowSec() + 300 } })
    assertEqual(fl.status, 'authenticated')
  })
}

module.exports = { 'end-to-end identity & trust lifecycle': fullLifecycle }
