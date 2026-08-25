/*
 * Set B — Sentinel integration scenarios (Plan Part 5.6 / Part 7.2).
 *
 * These exercise the CONSUMER CONTRACT (contracts/index.js) exactly as another
 * Sentinel platform would — proving a consumer that uses the contract gets the
 * correct ALLOW / DENY without recreating any identity logic. They stand in for
 * the live cross-team wiring (AppSec/Syed, Infra/Ali, AI-Security/Taimour,
 * Flutter/M.Ali+Anas), which is the human hand-off; the trust decisions here are
 * real and run against the real database inside rolled-back transactions.
 *
 * Scenario A  Valid user            → ALLOW
 * Scenario B  Unauthorized user     → DENY
 * Scenario C  Cross-tenant          → DENY (tenant pinned to token)
 * Scenario D  Revoked session       → DENY
 * Scenario E  AI agent              → only explicitly-authorized action proceeds
 * Scenario F  Machine workload      → unauthorized DENY, authorized ALLOW
 * Client      HTTP client delegates the decision to /api/v1 (no local crypto)
 */
const contracts = require('../contracts')
const { IdentityClient } = require('../contracts/identity-client')
const svc = require('../services/identity.service')
const life = require('../services/lifecycle.service')
const login = require('../services/login.service')
const session = require('../services/session.service')
const password = require('../services/password')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

const activeUser = (c, orgId, email) =>
  svc.createUser(c, { organizationId: orgId, email, passwordHash: password.hash('Secret_123'), status: 'active' })

// Scenario A — a valid, authorized user reaches a protected operation.
async function scenarioA_validUserAllow() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `A-${u}` })
    const user = await activeUser(c, org.id, `a-${u}@o.io`)
    await svc.assignRole(c, { organizationId: org.id, principalId: user.principal_id, roleName: 'auditor' })

    const authed = await login.login(c, { organizationId: org.id, email: `a-${u}@o.io`, password: 'Secret_123' })
    assertEqual(authed.status, 'authenticated', 'login issued tokens')

    const out = await contracts.authorizeToken({ token: authed.accessToken, resource: 'audit', action: 'read' }, { exec: c })
    assertEqual(out.decision, 'allow', 'authorized user is allowed')
    assertEqual(out.identity.organizationId, org.id, 'tenant context comes from the token')
  })
}

// Scenario B — a valid user WITHOUT the permission is denied.
async function scenarioB_unauthorizedDeny() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `B-${u}` })
    const user = await activeUser(c, org.id, `b-${u}@o.io`)
    await svc.assignRole(c, { organizationId: org.id, principalId: user.principal_id, roleName: 'auditor' })
    const authed = await login.login(c, { organizationId: org.id, email: `b-${u}@o.io`, password: 'Secret_123' })

    const out = await contracts.authorizeToken({ token: authed.accessToken, resource: 'identity', action: 'manage' }, { exec: c })
    assertEqual(out.decision, 'deny', 'action the role lacks is denied')
    assertEqual(out.reason, 'no_permission', 'zero-trust default reason')
  })
}

// Scenario C — cross-tenant access is structurally impossible via the contract.
async function scenarioC_crossTenantDeny() {
  await withRollback(async (c) => {
    const u = Date.now()
    const orgA = await svc.createOrganization(c, { name: 'A', slug: `CA-${u}` })
    const orgB = await svc.createOrganization(c, { name: 'B', slug: `CB-${u}` })
    const userA = await activeUser(c, orgA.id, `ca-${u}@o.io`)
    await svc.assignRole(c, { organizationId: orgA.id, principalId: userA.principal_id, roleName: 'auditor' })
    const authed = await login.login(c, { organizationId: orgA.id, email: `ca-${u}@o.io`, password: 'Secret_123' })

    // The token pins the tenant to org A — the consumer cannot target org B with it.
    const inA = await contracts.authorizeToken({ token: authed.accessToken, resource: 'audit', action: 'read' }, { exec: c })
    assertEqual(inA.identity.organizationId, orgA.id, 'tenant is pinned to the token, not caller input')
    assertEqual(inA.decision, 'allow', 'allowed within its own tenant')

    // Even a raw cross-tenant authorize (A principal against org B) fails closed.
    const crossed = await contracts.authorize(
      { organizationId: orgB.id, principalId: userA.principal_id, resource: 'audit', action: 'read' },
      { exec: c }
    )
    assertEqual(crossed.decision, 'deny', 'org-A identity cannot act in org B')
  })
}

// Scenario D — a revoked session denies access even with a cryptographically valid token.
async function scenarioD_revokedSessionDeny() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `D-${u}` })
    const user = await activeUser(c, org.id, `d-${u}@o.io`)
    await svc.assignRole(c, { organizationId: org.id, principalId: user.principal_id, roleName: 'auditor' })
    const authed = await login.login(c, { organizationId: org.id, email: `d-${u}@o.io`, password: 'Secret_123' })

    await session.logout(c, { sessionId: authed.sessionId, organizationId: org.id })

    await assertThrows(() => contracts.validateToken(authed.accessToken, { exec: c }))
    const allowed = await contracts.isAllowed({ token: authed.accessToken, resource: 'audit', action: 'read' }, { exec: c })
    assertEqual(allowed, false, 'revoked session → deny')
  })
}

// Scenario E — an AI agent has a real identity; only explicitly-authorized actions proceed.
async function scenarioE_aiAgentScopedAuthorization() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `E-${u}` })
    const agent = await svc.createAgent(c, { organizationId: org.id, name: 'bot', clientId: `ag-${u}`, clientSecretHash: password.hashSecret('ag-secret') })
    await life.transitionIdentity(c, { kind: 'ai_agent', id: agent.id, orgId: org.id, to: 'active' })
    // The agent is granted exactly one capability.
    await svc.assignRole(c, { organizationId: org.id, principalId: agent.principal_id, roleName: 'auditor' })

    const grant = await login.clientCredentialsGrant(c, { clientId: `ag-${u}`, clientSecret: 'ag-secret' })
    assertEqual(grant.kind, 'ai_agent', 'agent authenticated as a real identity')

    const permitted = await contracts.authorizeToken({ token: grant.accessToken, resource: 'audit', action: 'read' }, { exec: c })
    assertEqual(permitted.decision, 'allow', 'explicitly-authorized tool action proceeds')

    const forbidden = await contracts.authorizeToken({ token: grant.accessToken, resource: 'identity', action: 'manage' }, { exec: c })
    assertEqual(forbidden.decision, 'deny', 'non-granted action is denied — no ambient authority')
  })
}

// Scenario F — an infrastructure workload (machine identity): unauthorized denied, authorized allowed.
async function scenarioF_machineWorkload() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `F-${u}` })
    const machine = await svc.createMachine(c, { organizationId: org.id, name: 'ci', clientId: `mc-${u}`, clientSecretHash: password.hashSecret('mc-secret') })
    await life.transitionIdentity(c, { kind: 'machine', id: machine.id, orgId: org.id, to: 'active' })

    // Before any role: the workload has no authority (unauthorized workload → DENY).
    const grant1 = await login.clientCredentialsGrant(c, { clientId: `mc-${u}`, clientSecret: 'mc-secret' })
    const denied = await contracts.authorizeToken({ token: grant1.accessToken, resource: 'audit', action: 'read' }, { exec: c })
    assertEqual(denied.decision, 'deny', 'unauthorized workload denied')

    // After an explicit grant: the same workload is allowed only for that capability.
    await svc.assignRole(c, { organizationId: org.id, principalId: machine.principal_id, roleName: 'auditor' })
    const grant2 = await login.clientCredentialsGrant(c, { clientId: `mc-${u}`, clientSecret: 'mc-secret' })
    const allowed = await contracts.authorizeToken({ token: grant2.accessToken, resource: 'audit', action: 'read' }, { exec: c })
    assertEqual(allowed.decision, 'allow', 'authorized workload allowed')
  })
}

// The HTTP client delegates the decision to the server and carries NO local logic.
async function clientDelegatesToServer() {
  const calls = []
  const stubFetch = async (url, opts) => {
    calls.push({ url, opts })
    return { ok: true, status: 200, json: async () => ({ decision: 'allow', reason: 'rbac_grant', matched: { rbac: true } }) }
  }
  const client = new IdentityClient({ baseUrl: 'http://id.local/api/v1', fetchImpl: stubFetch })
  const out = await client.authorize('tok-123', { resource: 'audit', action: 'read' })

  assertEqual(out.decision, 'allow', 'client returns the server decision verbatim')
  assertEqual(calls.length, 1, 'exactly one server round-trip')
  assertEqual(calls[0].url, 'http://id.local/api/v1/authz/check', 'delegates to the authz contract')
  assertEqual(calls[0].opts.method, 'POST')
  assertEqual(calls[0].opts.headers.authorization, 'Bearer tok-123', 'forwards the caller token')
  const body = JSON.parse(calls[0].opts.body)
  assertEqual(body.resource, 'audit'); assertEqual(body.action, 'read')
}

module.exports = {
  'Scenario A — valid user reaches protected operation (ALLOW)': scenarioA_validUserAllow,
  'Scenario B — user without permission (DENY)': scenarioB_unauthorizedDeny,
  'Scenario C — cross-tenant access (DENY, tenant pinned to token)': scenarioC_crossTenantDeny,
  'Scenario D — revoked session (DENY)': scenarioD_revokedSessionDeny,
  'Scenario E — AI agent, only explicitly-authorized action proceeds': scenarioE_aiAgentScopedAuthorization,
  'Scenario F — machine workload, unauthorized DENY then authorized ALLOW': scenarioF_machineWorkload,
  'HTTP client delegates the decision to /api/v1 (no local crypto)': clientDelegatesToServer,
}
