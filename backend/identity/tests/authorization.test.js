/*
 * Authorization engine (doc §4): RBAC resolution, ABAC contextual policies,
 * deny-override, zero-trust default, fail-closed, and privilege-escalation /
 * unauthorized-assignment prevention.
 */
const svc = require('../services/identity.service')
const rbacSvc = require('../services/rbac.service')
const authz = require('../services/authz.service')
const repos = require('../repositories')
const { withRollback, assert, assertEqual, assertThrows } = require('./helpers')

const activeUser = (c, orgId, email, opts = {}) =>
  svc.createUser(c, { organizationId: orgId, email, passwordHash: 'x', status: 'active', ...opts })

async function rbacGrantAndZeroTrust() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'O', slug: `o-${u}` })
    const user = await activeUser(c, org.id, `z-${u}@o.io`)
    const P = { organizationId: org.id, principalId: user.principal_id }

    // zero-trust: no roles → deny
    let d = await authz.authorize(c, { ...P, resource: 'audit', action: 'read' })
    assertEqual(d.decision, 'deny'); assertEqual(d.reason, 'no_permission')

    // grant via auditor role → allow
    await svc.assignRole(c, { organizationId: org.id, principalId: user.principal_id, roleName: 'auditor' })
    d = await authz.authorize(c, { ...P, resource: 'audit', action: 'read' })
    assertEqual(d.decision, 'allow'); assert(d.matched.rbac, 'rbac should grant')

    // action the role lacks → deny
    d = await authz.authorize(c, { ...P, resource: 'identity', action: 'manage' })
    assertEqual(d.decision, 'deny'); assertEqual(d.reason, 'no_permission')
  })
}

async function superuserAllow() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'S', slug: `s-${u}` })
    const su = await activeUser(c, org.id, `su-${u}@o.io`, { isSuperuser: true })
    const d = await authz.authorize(c, { organizationId: org.id, principalId: su.principal_id, resource: 'org', action: 'create' })
    assertEqual(d.decision, 'allow'); assertEqual(d.reason, 'superuser')
  })
}

async function denyPolicyOverridesRbacAndSuperuser() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'D', slug: `d-${u}` })
    await repos.policies.create(c, { organizationId: org.id, name: `deny-audit-${u}`, effect: 'deny', resource: 'audit', action: 'read' })

    // RBAC-granted user is still denied
    const user = await activeUser(c, org.id, `d1-${u}@o.io`)
    await svc.assignRole(c, { organizationId: org.id, principalId: user.principal_id, roleName: 'auditor' })
    let d = await authz.authorize(c, { organizationId: org.id, principalId: user.principal_id, resource: 'audit', action: 'read' })
    assertEqual(d.decision, 'deny'); assertEqual(d.reason, 'explicit_deny_policy')

    // Superuser is also overridden by explicit deny
    const su = await activeUser(c, org.id, `d2-${u}@o.io`, { isSuperuser: true })
    d = await authz.authorize(c, { organizationId: org.id, principalId: su.principal_id, resource: 'audit', action: 'read' })
    assertEqual(d.decision, 'deny'); assertEqual(d.reason, 'explicit_deny_policy')
  })
}

async function abacContextualDeny() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'A', slug: `a-${u}` })
    await repos.policies.create(c, {
      organizationId: org.id, name: `deny-lowclear-${u}`, effect: 'deny', resource: 'identity', action: 'read',
      conditions: [{ attribute: 'subject.clearance', operator: 'eq', value: 'low' }],
    })

    // user with identity:read (identity_manager) and clearance=low → DENY
    const low = await activeUser(c, org.id, `low-${u}@o.io`)
    await svc.assignRole(c, { organizationId: org.id, principalId: low.principal_id, roleName: 'identity_manager' })
    await svc.setAttribute(c, { organizationId: org.id, principalId: low.principal_id, key: 'clearance', value: 'low' })
    let d = await authz.authorize(c, { organizationId: org.id, principalId: low.principal_id, resource: 'identity', action: 'read' })
    assertEqual(d.decision, 'deny'); assertEqual(d.reason, 'explicit_deny_policy'); assert(d.matched.abac, 'abac condition matched')

    // clearance=high → condition not met → ALLOW
    await svc.setAttribute(c, { organizationId: org.id, principalId: low.principal_id, key: 'clearance', value: 'high' })
    d = await authz.authorize(c, { organizationId: org.id, principalId: low.principal_id, resource: 'identity', action: 'read' })
    assertEqual(d.decision, 'allow')

    // missing attribute → condition false → ALLOW (missing-attribute behavior)
    const none = await activeUser(c, org.id, `none-${u}@o.io`)
    await svc.assignRole(c, { organizationId: org.id, principalId: none.principal_id, roleName: 'identity_manager' })
    d = await authz.authorize(c, { organizationId: org.id, principalId: none.principal_id, resource: 'identity', action: 'read' })
    assertEqual(d.decision, 'allow')
  })
}

async function failClosedOnBadOperator() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'F', slug: `f-${u}` })
    await repos.policies.create(c, {
      organizationId: org.id, name: `bad-op-${u}`, effect: 'deny', resource: 'identity', action: 'read',
      conditions: [{ attribute: 'subject.x', operator: 'bogus', value: 1 }],
    })
    const user = await activeUser(c, org.id, `f-${u}@o.io`)
    await svc.assignRole(c, { organizationId: org.id, principalId: user.principal_id, roleName: 'identity_manager' })
    await svc.setAttribute(c, { organizationId: org.id, principalId: user.principal_id, key: 'x', value: '1' })
    const d = await authz.authorize(c, { organizationId: org.id, principalId: user.principal_id, resource: 'identity', action: 'read' })
    assertEqual(d.decision, 'deny'); assertEqual(d.reason, 'evaluation_error')
  })
}

async function guardedRoleAssignment() {
  await withRollback(async (c) => {
    const u = Date.now()
    const org = await svc.createOrganization(c, { name: 'G', slug: `g-${u}` })

    // Actor holds a custom role with role:assign + identity:read
    const actor = await activeUser(c, org.id, `actor-${u}@o.io`)
    const assigner = await rbacSvc.createRole(c, { organizationId: org.id, name: `assigner-${u}` })
    await rbacSvc.grantPermission(c, { organizationId: org.id, roleId: assigner.id, resource: 'role', action: 'assign' })
    await rbacSvc.grantPermission(c, { organizationId: org.id, roleId: assigner.id, resource: 'identity', action: 'read' })
    await svc.assignRole(c, { organizationId: org.id, principalId: actor.principal_id, roleId: assigner.id })

    const target = await activeUser(c, org.id, `target-${u}@o.io`)

    // Unauthorized: a plain auditor cannot assign roles
    const plain = await activeUser(c, org.id, `plain-${u}@o.io`)
    await svc.assignRole(c, { organizationId: org.id, principalId: plain.principal_id, roleName: 'auditor' })
    await assertThrows(
      () => authz.assignRoleGuarded(c, { actorPrincipalId: plain.principal_id, organizationId: org.id, targetPrincipalId: target.principal_id, roleName: 'auditor' }),
      'forbidden'
    )

    // Escalation: actor cannot grant platform_admin (perms it does not hold)
    await assertThrows(
      () => authz.assignRoleGuarded(c, { actorPrincipalId: actor.principal_id, organizationId: org.id, targetPrincipalId: target.principal_id, roleName: 'platform_admin' }),
      'forbidden'
    )

    // Success: actor grants a role containing only identity:read (which it holds)
    const reader = await rbacSvc.createRole(c, { organizationId: org.id, name: `reader-${u}` })
    await rbacSvc.grantPermission(c, { organizationId: org.id, roleId: reader.id, resource: 'identity', action: 'read' })
    await authz.assignRoleGuarded(c, { actorPrincipalId: actor.principal_id, organizationId: org.id, targetPrincipalId: target.principal_id, roleId: reader.id })
    const perms = await authz.effectivePermissions(c, org.id, target.principal_id)
    assert(perms.includes('identity:read'), 'target should now hold identity:read')
  })
}

module.exports = {
  'RBAC grant + zero-trust default': rbacGrantAndZeroTrust,
  'superuser allow': superuserAllow,
  'explicit deny policy overrides RBAC and superuser': denyPolicyOverridesRbacAndSuperuser,
  'ABAC contextual deny (match / no-match / missing attribute)': abacContextualDeny,
  'fail closed on invalid condition operator': failClosedOnBadOperator,
  'guarded assignment: unauthorized + escalation prevented, valid succeeds': guardedRoleAssignment,
}
