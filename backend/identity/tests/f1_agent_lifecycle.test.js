/*
 * F1 — agent/machine lifecycle transition + client-secret rotation (the behavior
 * the new /identity/{agents,machines}/:id/{transition,rotate-secret} routes expose).
 * Exercised at the service layer under a rolled-back transaction (no residue).
 */
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const login = require('../services/login.service')
const session = require('../services/session.service')
const credential = require('../services/credential.service')
const password = require('../services/password')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

// Revoking an agent blocks authentication and cascades session revocation.
async function agentRevocationBlocksAuth() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `f1a-${u}` })
    const agent = await svc.createAgent(c, { organizationId: org.id, name: 'bot', clientId: `agt-${u}`, clientSecretHash: password.hashSecret('s1') })
    assertEqual(agent.status, 'provisioned', 'new agent starts provisioned')

    await life.transitionIdentity(c, { kind: 'ai_agent', id: agent.id, orgId: org.id, to: 'active' })
    const grant = await login.clientCredentialsGrant(c, { clientId: `agt-${u}`, clientSecret: 's1' })
    assertEqual(grant.status, 'authenticated', 'active agent authenticates')
    await session.validateAccessToken(c, grant.accessToken) // token valid while active

    // REVOKE (distinct from suspend) → future auth denied AND the live session is killed.
    await life.transitionIdentity(c, { kind: 'ai_agent', id: agent.id, orgId: org.id, to: 'revoked' })
    await assertThrows(() => login.clientCredentialsGrant(c, { clientId: `agt-${u}`, clientSecret: 's1' }), 'invalid_credentials')
    await assertThrows(() => session.validateAccessToken(c, grant.accessToken), 'invalid_credentials')
  })
}

// Rotating a machine's client secret invalidates the predecessor immediately.
async function secretRotationInvalidatesPredecessor() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `f1m-${u}` })
    const machine = await svc.createMachine(c, { organizationId: org.id, name: 'ci', clientId: `mch-${u}`, clientSecretHash: password.hashSecret('old') })
    await life.transitionIdentity(c, { kind: 'machine', id: machine.id, orgId: org.id, to: 'active' })
    await login.clientCredentialsGrant(c, { clientId: `mch-${u}`, clientSecret: 'old' }) // works

    const rotated = await credential.rotateClientSecret(c, { organizationId: org.id, kind: 'machine', id: machine.id })
    assert(rotated.clientSecret && rotated.clientSecret !== 'old', 'a new secret is issued')

    await assertThrows(() => login.clientCredentialsGrant(c, { clientId: `mch-${u}`, clientSecret: 'old' }), 'invalid_credentials')
    const grant = await login.clientCredentialsGrant(c, { clientId: `mch-${u}`, clientSecret: rotated.clientSecret })
    assertEqual(grant.status, 'authenticated', 'the rotated secret authenticates')
  })
}

// Suspend is reversible and distinct from revoke.
async function suspendIsReversible() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `f1s-${u}` })
    const agent = await svc.createAgent(c, { organizationId: org.id, name: 'bot', clientId: `agt-${u}`, clientSecretHash: password.hashSecret('s1') })
    await life.transitionIdentity(c, { kind: 'ai_agent', id: agent.id, orgId: org.id, to: 'active' })
    await life.transitionIdentity(c, { kind: 'ai_agent', id: agent.id, orgId: org.id, to: 'suspended' })
    await assertThrows(() => login.clientCredentialsGrant(c, { clientId: `agt-${u}`, clientSecret: 's1' }), 'invalid_credentials')
    // Reactivate — suspension, unlike revocation, can be undone.
    await life.transitionIdentity(c, { kind: 'ai_agent', id: agent.id, orgId: org.id, to: 'active' })
    const grant = await login.clientCredentialsGrant(c, { clientId: `agt-${u}`, clientSecret: 's1' })
    assertEqual(grant.status, 'authenticated', 'reactivated agent authenticates again')
  })
}

module.exports = {
  'agent revoke blocks auth and cascades session revocation': agentRevocationBlocksAuth,
  'client-secret rotation invalidates the predecessor': secretRotationInvalidatesPredecessor,
  'suspend is reversible (distinct from revoke)': suspendIsReversible,
}
