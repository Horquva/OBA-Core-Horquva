/*
 * Audit + evidence (doc §18). Exercise the whole platform and prove the audit
 * trail captures every required security event, records both allow and deny
 * authorization decisions, and never contains a plaintext secret. This test is
 * itself reproducible, non-sensitive evidence.
 */
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const login = require('../services/login.service')
const session = require('../services/session.service')
const mfa = require('../services/mfa.service')
const federation = require('../services/federation.service')
const credential = require('../services/credential.service')
const authz = require('../services/authz.service')
const rbacSvc = require('../services/rbac.service')
const secrets = require('../services/secrets')
const repos = require('../repositories')
const { withRollback, assert } = require('./helpers')

const REQUIRED_EVENTS = [
  'identity.created',
  'identity.lifecycle',
  'auth.login',
  'auth.mfa',
  'session.created',
  'session.refreshed',
  'session.logout',
  'authz.decision',
  'role.assigned',
  'permission.granted',
  'auth.client_credentials',
  'credential.rotated',
  'federation.provider_registered',
  'federation.linked',
  'federation.login',
]

async function auditCoverage() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'AUD', slug: `aud-${u}` })

    // Identity + lifecycle + MFA
    const user = await svc.createUser(c, { organizationId: org.id, email: `u-${u}@o.io` })
    await repos.users.setPasswordHash(c, user.id, org.id, secrets.hash('Secret_123'))
    await life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to: 'active' })
    const { secret } = await mfa.beginEnrollment(c, { organizationId: org.id, userId: user.id })
    await mfa.confirmEnrollment(c, { organizationId: org.id, userId: user.id, code: mfa.totp(secret) })

    // Authentication (failure + MFA success)
    try { await login.login(c, { organizationId: org.id, email: `u-${u}@o.io`, password: 'wrong' }) } catch (_) { /* audited deny */ }
    const s1 = await login.login(c, { organizationId: org.id, email: `u-${u}@o.io`, password: 'Secret_123' })
    await login.completeMfa(c, { organizationId: org.id, challengeId: s1.challengeId, code: mfa.totp(secret) })

    // Authorization (allow + deny) + role/permission changes
    await svc.assignRole(c, { organizationId: org.id, principalId: user.principal_id, roleName: 'auditor' })
    await authz.authorize(c, { organizationId: org.id, principalId: user.principal_id, resource: 'audit', action: 'read' })
    await authz.authorize(c, { organizationId: org.id, principalId: user.principal_id, resource: 'identity', action: 'manage' })
    const role = await rbacSvc.createRole(c, { organizationId: org.id, name: `r-${u}` })
    await rbacSvc.grantPermission(c, { organizationId: org.id, roleId: role.id, resource: 'identity', action: 'read' })

    // Machine session lifecycle + secret rotation
    const m = await svc.createMachine(c, { organizationId: org.id, name: 'ci', clientId: `m-${u}`, clientSecretHash: secrets.hash('msecret') })
    await life.transitionIdentity(c, { kind: 'machine', id: m.id, orgId: org.id, to: 'active' })
    const mg = await login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'msecret' })
    await session.refresh(c, { refreshToken: mg.refreshToken })
    await session.logout(c, { sessionId: mg.sessionId, organizationId: org.id })
    await credential.rotateClientSecret(c, { organizationId: org.id, kind: 'machine', id: m.id })

    // Federation
    const prov = await federation.registerProvider(c, { organizationId: org.id, name: 'idp', issuer: 'https://idp', audience: 'a' })
    const fu = await svc.createUser(c, { organizationId: org.id, email: `f-${u}@o.io`, status: 'active' })
    await federation.linkFederatedIdentity(c, { organizationId: org.id, providerId: prov.id, userId: fu.id, externalSubject: 'x1' })
    await federation.assertFederatedLogin(c, { organizationId: org.id, providerId: prov.id, claims: { iss: 'https://idp', aud: 'a', sub: 'x1', exp: Math.floor(Date.now() / 1000) + 300 } })

    // ── Evidence assertions ──
    const events = await repos.audit.listForOrg(c, org.id, { limit: 500 })
    const kinds = new Set(events.map((e) => e.event))
    for (const required of REQUIRED_EVENTS) {
      assert(kinds.has(required), `audit trail missing required event: ${required}`)
    }
    const decisions = new Set(events.filter((e) => e.event === 'authz.decision').map((e) => e.decision))
    assert(decisions.has('allow') && decisions.has('deny'), 'authorization allow AND deny decisions are audited')

    // Non-sensitive: no plaintext secret anywhere in the trail.
    const dump = JSON.stringify(events)
    assert(!dump.includes('Secret_123'), 'no plaintext password in audit trail')
    assert(!dump.includes('msecret'), 'no plaintext client secret in audit trail')
  })
}

module.exports = { 'audit trail covers every required security event (non-sensitive)': auditCoverage }
