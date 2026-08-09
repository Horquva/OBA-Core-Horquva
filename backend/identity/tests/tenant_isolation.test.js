/*
 * Tenant isolation — the cross-tenant DENY matrix required by doc §3C:
 * Tenant A → Tenant B  lookup / mutation / authorization / policy / audit → DENY.
 */
const svc = require('../services/identity.service')
const repos = require('../repositories')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

async function crossTenantMatrix() {
  await withRollback(async (c) => {
    const u = Date.now()
    const orgA = await svc.createOrganization(c, { name: 'A', slug: `a-${u}` })
    const orgB = await svc.createOrganization(c, { name: 'B', slug: `b-${u}` })
    const userA = await svc.createUser(c, { organizationId: orgA.id, email: `ua-${u}@a.io`, passwordHash: 'x' })

    // 1) LOOKUP — A's user is invisible from B
    assertEqual(await repos.users.findById(c, userA.id, orgB.id), null, 'cross-tenant lookup must DENY')
    await assertThrows(() => svc.getUser(c, orgB.id, userA.id), 'not_found')

    // 2) MUTATION — mutating A's user scoped to B changes nothing; A stays intact
    assertEqual(await repos.users.updateStatus(c, userA.id, orgB.id, 'active'), null, 'cross-tenant mutation must DENY')
    assertEqual((await repos.users.findById(c, userA.id, orgA.id)).status, 'provisioned', 'A user must be untouched by B')

    // 3) AUTHORIZATION — role assignment/permissions do not leak across tenants
    await svc.assignRole(c, { organizationId: orgA.id, principalId: userA.principal_id, roleName: 'auditor' })
    assertEqual((await repos.assignments.listForPrincipal(c, userA.principal_id, orgB.id)).length, 0, 'cross-tenant role visibility must DENY')
    assertEqual((await repos.assignments.permissionKeysForPrincipal(c, userA.principal_id, orgB.id)).length, 0, 'cross-tenant permission resolution must DENY')
    // sanity: within A it DOES resolve
    assert((await repos.assignments.permissionKeysForPrincipal(c, userA.principal_id, orgA.id)).includes('audit:read'), 'A should resolve its own permissions')

    // 4) ATTRIBUTE (ABAC) — A's attributes invisible from B
    await svc.setAttribute(c, { organizationId: orgA.id, principalId: userA.principal_id, key: 'clearance', value: 'high' })
    assertEqual((await repos.attributes.listForPrincipal(c, userA.principal_id, orgB.id)).length, 0, 'cross-tenant attribute access must DENY')

    // 5) POLICY EVALUATION — A's policy never appears in B's applicable set
    await repos.policies.create(c, { organizationId: orgA.id, name: `a-pol-${u}`, effect: 'deny', resource: 'identity', action: 'read' })
    const bApplicable = await repos.policies.listApplicable(c, orgB.id, 'identity', 'read')
    assert(bApplicable.every((p) => p.organization_id !== orgA.id), 'cross-tenant policy evaluation must DENY')

    // 6) AUDIT — B cannot see A's audit trail
    assert((await repos.audit.listForOrg(c, orgA.id)).length > 0, 'A should have audit events')
    assert((await repos.audit.listForOrg(c, orgB.id)).every((e) => e.organization_id === orgB.id), 'cross-tenant audit access must DENY')
  })
}

async function crossTenantRoleAssignmentDenied() {
  await withRollback(async (c) => {
    const u = Date.now()
    const orgA = await svc.createOrganization(c, { name: 'A', slug: `a2-${u}` })
    const orgB = await svc.createOrganization(c, { name: 'B', slug: `b2-${u}` })
    const userA = await svc.createUser(c, { organizationId: orgA.id, email: `ua2-${u}@a.io`, passwordHash: 'x' })
    // Trying to assign a role to A's principal while acting as org B must fail (principal not found in B)
    await assertThrows(() => svc.assignRole(c, { organizationId: orgB.id, principalId: userA.principal_id, roleName: 'auditor' }), 'not_found')
  })
}

module.exports = {
  'cross-tenant DENY matrix (lookup/mutation/authz/attribute/policy/audit)': crossTenantMatrix,
  'cross-tenant role assignment is denied': crossTenantRoleAssignmentDenied,
}
