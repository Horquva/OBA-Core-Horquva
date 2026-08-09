/*
 * RBAC repositories: role, permission, role_assignment.
 * Roles are visible to an org when they are that org's role OR a global/system role.
 * Assignments are strictly organization-scoped.
 */
const { runner, requireOrg } = require('./exec')

const roles = {
  async create(exec, { organizationId = null, name, description = null, isSystem = false, createdBy = null }) {
    const { rows } = await runner(exec).query(
      `insert into identity.role (organization_id, name, description, is_system, created_by)
       values ($1, $2, $3, $4, $5) returning *`,
      [organizationId, name, description, isSystem, createdBy]
    )
    return rows[0]
  },
  /** A role is usable by an org if it belongs to that org or is global (org is null). */
  async findByIdForOrg(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.role where id = $1 and (organization_id = $2 or organization_id is null)`,
      [id, orgId]
    )
    return rows[0] || null
  },
  async findSystemByName(exec, name) {
    const { rows } = await runner(exec).query(
      `select * from identity.role where organization_id is null and lower(name) = lower($1)`,
      [name]
    )
    return rows[0] || null
  },
  async listForOrg(exec, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.role where organization_id = $1 or organization_id is null order by is_system desc, name`,
      [orgId]
    )
    return rows
  },
  /** Effective permission keys for a role, as `resource:action`. */
  async permissionKeys(exec, roleId) {
    const { rows } = await runner(exec).query(
      `select p.resource, p.action from identity.role_permission rp
       join identity.permission p on p.id = rp.permission_id
       where rp.role_id = $1`,
      [roleId]
    )
    return rows.map((r) => `${r.resource}:${r.action}`)
  },
  async addPermission(exec, roleId, permissionId) {
    await runner(exec).query(
      `insert into identity.role_permission (role_id, permission_id) values ($1, $2)
       on conflict (role_id, permission_id) do nothing`,
      [roleId, permissionId]
    )
  },
  async removePermission(exec, roleId, permissionId) {
    const { rowCount } = await runner(exec).query(
      `delete from identity.role_permission where role_id = $1 and permission_id = $2`,
      [roleId, permissionId]
    )
    return rowCount > 0
  },
}

const permissions = {
  async create(exec, { resource, action, description = null }) {
    const { rows } = await runner(exec).query(
      `insert into identity.permission (resource, action, description) values ($1, $2, $3)
       on conflict (resource, action) do update set description = excluded.description
       returning *`,
      [resource, action, description]
    )
    return rows[0]
  },
  async list(exec) {
    const { rows } = await runner(exec).query(
      `select * from identity.permission order by resource, action`
    )
    return rows
  },
  async findByKey(exec, resource, action) {
    const { rows } = await runner(exec).query(
      `select * from identity.permission where resource = $1 and action = $2`,
      [resource, action]
    )
    return rows[0] || null
  },
}

const assignments = {
  async assign(exec, { principalId, roleId, organizationId, grantedBy = null }) {
    requireOrg(organizationId)
    const { rows } = await runner(exec).query(
      `insert into identity.role_assignment (principal_id, role_id, organization_id, granted_by)
       values ($1, $2, $3, $4)
       on conflict (principal_id, role_id) do nothing
       returning *`,
      [principalId, roleId, organizationId, grantedBy]
    )
    return rows[0] || null
  },
  /** Roles assigned to a principal WITHIN the given org (tenant-scoped). */
  async listForPrincipal(exec, principalId, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select ra.*, r.name as role_name
       from identity.role_assignment ra
       join identity.role r on r.id = ra.role_id
       where ra.principal_id = $1 and ra.organization_id = $2`,
      [principalId, orgId]
    )
    return rows
  },
  /** All permission keys a principal holds within an org (RBAC resolution). */
  async permissionKeysForPrincipal(exec, principalId, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select distinct p.resource, p.action
       from identity.role_assignment ra
       join identity.role_permission rp on rp.role_id = ra.role_id
       join identity.permission p on p.id = rp.permission_id
       where ra.principal_id = $1 and ra.organization_id = $2`,
      [principalId, orgId]
    )
    return rows.map((r) => `${r.resource}:${r.action}`)
  },
  async revoke(exec, principalId, roleId, orgId) {
    requireOrg(orgId)
    const { rowCount } = await runner(exec).query(
      `delete from identity.role_assignment where principal_id = $1 and role_id = $2 and organization_id = $3`,
      [principalId, roleId, orgId]
    )
    return rowCount > 0
  },
}

module.exports = { roles, permissions, assignments }
