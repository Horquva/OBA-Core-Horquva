/*
 * Machine/AI-agent trust (doc §14) and federation/OIDC (doc §13):
 * client-credentials token grants, revocation, provider registration, claim
 * mapping, federated login, and the federation controls (untrusted provider,
 * claim-elevation prevention, JIT off-by-default, expiry).
 */
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const login = require('../services/login.service')
const session = require('../services/session.service')
const federation = require('../services/federation.service')
const authz = require('../services/authz.service')
const password = require('../services/password')
const repos = require('../repositories')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

const nowSec = () => Math.floor(Date.now() / 1000)

async function machineAndAgentGrants() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })

    const machine = await svc.createMachine(c, { organizationId: org.id, name: 'ci', clientId: `m-${u}`, clientSecretHash: password.hashSecret('m-secret') })
    await life.transitionIdentity(c, { kind: 'machine', id: machine.id, orgId: org.id, to: 'active' })
    const mg = await login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'm-secret' })
    assertEqual(mg.status, 'authenticated'); assertEqual(mg.kind, 'machine')
    const { claims } = await session.validateAccessToken(c, mg.accessToken)
    assertEqual(claims.kind, 'machine')

    const agent = await svc.createAgent(c, { organizationId: org.id, name: 'bot', clientId: `a-${u}`, clientSecretHash: password.hashSecret('a-secret') })
    await life.transitionIdentity(c, { kind: 'ai_agent', id: agent.id, orgId: org.id, to: 'active' })
    const ag = await login.clientCredentialsGrant(c, { clientId: `a-${u}`, clientSecret: 'a-secret' })
    assertEqual(ag.kind, 'ai_agent')

    // Wrong secret rejected.
    await assertThrows(() => login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'nope' }), 'invalid_credentials')
  })
}

async function revokedMachineCannotAuthenticate() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const machine = await svc.createMachine(c, { organizationId: org.id, name: 'ci', clientId: `m-${u}`, clientSecretHash: password.hashSecret('m-secret') })
    await life.transitionIdentity(c, { kind: 'machine', id: machine.id, orgId: org.id, to: 'active' })
    await login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'm-secret' }) // works
    await life.transitionIdentity(c, { kind: 'machine', id: machine.id, orgId: org.id, to: 'revoked' })
    await assertThrows(() => login.clientCredentialsGrant(c, { clientId: `m-${u}`, clientSecret: 'm-secret' }), 'invalid_credentials')
  })
}

async function federatedLinkAndLogin() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const provider = await federation.registerProvider(c, { organizationId: org.id, name: 'corp-idp', issuer: 'https://idp.example', audience: 'aud1' })
    const user = await svc.createUser(c, { organizationId: org.id, email: `fed-${u}@o.io`, status: 'active' })
    await federation.linkFederatedIdentity(c, { organizationId: org.id, providerId: provider.id, userId: user.id, externalSubject: 'ext-1' })

    const r = await federation.assertFederatedLogin(c, { organizationId: org.id, providerId: provider.id, claims: { iss: 'https://idp.example', aud: 'aud1', sub: 'ext-1', exp: nowSec() + 300 } })
    assertEqual(r.status, 'authenticated'); assert(r.accessToken, 'tokens issued on federated login')
  })
}

async function federationControls() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const provider = await federation.registerProvider(c, { organizationId: org.id, name: 'idp', issuer: 'https://idp.example', audience: 'aud1' })
    const user = await svc.createUser(c, { organizationId: org.id, email: `fc-${u}@o.io`, status: 'active' })
    await federation.linkFederatedIdentity(c, { organizationId: org.id, providerId: provider.id, userId: user.id, externalSubject: 'ext-1' })

    // Untrusted issuer → rejected
    await assertThrows(() => federation.assertFederatedLogin(c, { organizationId: org.id, providerId: provider.id, claims: { iss: 'https://evil', aud: 'aud1', sub: 'ext-1' } }), 'forbidden')

    // Expired assertion → rejected
    await assertThrows(() => federation.assertFederatedLogin(c, { organizationId: org.id, providerId: provider.id, claims: { iss: 'https://idp.example', aud: 'aud1', sub: 'ext-1', exp: nowSec() - 10 } }), 'invalid_credentials')

    // Claim elevation ignored: role/superuser claims must NOT grant anything
    await federation.assertFederatedLogin(c, { organizationId: org.id, providerId: provider.id, claims: { iss: 'https://idp.example', aud: 'aud1', sub: 'ext-1', role: 'platform_admin', is_superuser: true, exp: nowSec() + 300 } })
    const reloaded = await repos.users.findById(c, user.id, org.id)
    assertEqual(reloaded.is_superuser, false, 'superuser claim must be ignored')
    assertEqual((await authz.effectivePermissions(c, org.id, user.principal_id)).length, 0, 'no permissions granted from claims')

    // JIT off by default: unknown subject rejected
    await assertThrows(() => federation.assertFederatedLogin(c, { organizationId: org.id, providerId: provider.id, claims: { iss: 'https://idp.example', aud: 'aud1', sub: 'ext-unknown', email: `new-${u}@o.io`, exp: nowSec() + 300 } }), 'forbidden')
  })
}

async function jitProvisioningWhenEnabled() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const provider = await federation.registerProvider(c, { organizationId: org.id, name: 'idp', issuer: 'https://idp.example', audience: 'aud1', allowJitProvisioning: true })

    const r = await federation.assertFederatedLogin(c, { organizationId: org.id, providerId: provider.id, claims: { iss: 'https://idp.example', aud: 'aud1', sub: 'ext-jit', email: `jit-${u}@o.io`, name: 'JIT User', exp: nowSec() + 300 } })
    assertEqual(r.status, 'authenticated')
    const provisioned = await repos.users.findByEmail(c, org.id, `jit-${u}@o.io`)
    assert(provisioned && provisioned.status === 'active', 'user JIT-provisioned and active')
    assertEqual(provisioned.is_superuser, false, 'JIT user is not privileged')
  })
}

module.exports = {
  'machine + AI-agent client-credentials token grants': machineAndAgentGrants,
  'revoked machine cannot authenticate': revokedMachineCannotAuthenticate,
  'federated identity link + login issues tokens': federatedLinkAndLogin,
  'federation controls (untrusted / expired / claim-elevation / JIT-off)': federationControls,
  'JIT provisioning only when the provider opts in': jitProvisioningWhenEnabled,
}
