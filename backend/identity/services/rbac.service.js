/*
 * RBAC administration (doc §4 RBAC): create roles/permissions, map permissions to
 * roles, and revoke. Organization-scoped; all mutations go through repositories.
 */
const { withTransaction } = require('../db/pool')
const { NotFoundError, ValidationError, ConflictError } = require('../errors')
const repos = require('../repositories')

const inTx = (exec, fn) => (exec ? fn(exec) : withTransaction(fn))
const mapUnique = (err, message) => (err && err.code === '23505' ? new ConflictError(message) : err)

async function createRole(exec, { organizationId, name, description = null, createdBy = null }) {
  if (!organizationId || !name) throw new ValidationError('organizationId and name are required')
  try {
    return await repos.roles.create(exec, { organizationId, name, description, isSystem: false, createdBy })
  } catch (e) {
    throw mapUnique(e, 'a role with that name already exists in this organization')
  }
}

async function createPermission(exec, { resource, action, description = null }) {
  if (!resource || !action) throw new ValidationError('resource and action are required')
  return repos.permissions.create(exec, { resource, action, description })
}

/** Grant a permission (by resource:action) to an org-scoped role. */
async function grantPermission(exec, { organizationId, roleId, resource, action }) {
  return inTx(exec, async (client) => {
    const role = await repos.roles.findByIdForOrg(client, roleId, organizationId)
    if (!role) throw new NotFoundError('role not found')
    const perm = await repos.permissions.findByKey(client, resource, action)
    if (!perm) throw new NotFoundError(`permission ${resource}:${action} not found`)
    await repos.roles.addPermission(client, role.id, perm.id)
    return { roleId: role.id, permission: `${resource}:${action}` }
  })
}

async function revokePermission(exec, { organizationId, roleId, resource, action }) {
  return inTx(exec, async (client) => {
    const role = await repos.roles.findByIdForOrg(client, roleId, organizationId)
    if (!role) throw new NotFoundError('role not found')
    const perm = await repos.permissions.findByKey(client, resource, action)
    if (!perm) throw new NotFoundError(`permission ${resource}:${action} not found`)
    const removed = await repos.roles.removePermission(client, role.id, perm.id)
    return { roleId: role.id, permission: `${resource}:${action}`, removed }
  })
}

/** Revoke a role assignment from a principal (organization-scoped). */
async function revokeRole(exec, { organizationId, principalId, roleId }) {
  const removed = await repos.assignments.revoke(exec, principalId, roleId, organizationId)
  if (removed) {
    await repos.audit.record(exec, { organizationId, actorPrincipalId: principalId, event: 'role.revoked', resource: 'role', action: 'revoke', decision: 'ok', detail: { roleId } })
  }
  return removed
}

module.exports = { createRole, createPermission, grantPermission, revokePermission, revokeRole }
