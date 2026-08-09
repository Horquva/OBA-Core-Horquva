/*
 * Identity lifecycle engine (doc §3E): valid + invalid transitions, and the
 * cascade that revokes sessions when an identity leaves the active family.
 */
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const repos = require('../repositories')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

async function validAndInvalidTransitions() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'L', slug: `l-${u}` })
    const user = await svc.createUser(c, { organizationId: org.id, email: `lu-${u}@l.io`, passwordHash: 'x' })
    assertEqual(user.status, 'provisioned', 'new user starts provisioned')

    const t = (to) => life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to })
    assertEqual((await t('active')).status, 'active', 'provisioned → active')
    assertEqual((await t('suspended')).status, 'suspended', 'active → suspended')
    assertEqual((await t('active')).status, 'active', 'suspended → active (restore)')

    // Illegal: cannot go back to provisioned from active
    await assertThrows(() => t('provisioned'), 'invalid_transition')
  })
}

async function revokeCascadesSessions() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'L2', slug: `l2-${u}` })
    const user = await svc.createUser(c, { organizationId: org.id, email: `lc-${u}@l.io`, passwordHash: 'x' })
    await life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to: 'active' })

    const session = await repos.sessions.create(c, {
      principalId: user.principal_id, organizationId: org.id, status: 'active',
      expiresAt: new Date(Date.now() + 3600 * 1000),
    })
    assertEqual(session.status, 'active', 'session created active')

    // Revoking the identity must cascade to its sessions.
    await life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to: 'revoked' })
    assertEqual((await repos.sessions.findById(c, session.id, org.id)).status, 'revoked', 'session revoked with identity')

    // revoked → active is not allowed.
    await assertThrows(() => life.transitionIdentity(c, { kind: 'user', id: user.id, orgId: org.id, to: 'active' }), 'invalid_transition')
  })
}

module.exports = {
  'valid + invalid lifecycle transitions': validAndInvalidTransitions,
  'revoke cascades session revocation': revokeCascadesSessions,
}
