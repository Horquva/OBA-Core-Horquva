/*
 * Attribute repository (ABAC). Attributes belong to a principal and are strictly
 * organization-scoped — listing another tenant's attributes returns nothing.
 */
const { runner, requireOrg } = require('./exec')

async function upsert(exec, { principalId, organizationId, namespace = 'subject', key, value, createdBy = null }) {
  requireOrg(organizationId)
  const { rows } = await runner(exec).query(
    `insert into identity.attribute (principal_id, organization_id, namespace, key, value, created_by)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (principal_id, namespace, key) do update set value = excluded.value
     returning *`,
    [principalId, organizationId, namespace, key, value, createdBy]
  )
  return rows[0]
}

async function listForPrincipal(exec, principalId, orgId, namespace = null) {
  requireOrg(orgId)
  const { rows } = await runner(exec).query(
    `select * from identity.attribute
     where principal_id = $1 and organization_id = $2
       and ($3::text is null or namespace = $3)
     order by namespace, key`,
    [principalId, orgId, namespace]
  )
  return rows
}

async function remove(exec, { principalId, organizationId, namespace, key }) {
  requireOrg(organizationId)
  const { rowCount } = await runner(exec).query(
    `delete from identity.attribute
     where principal_id = $1 and organization_id = $2 and namespace = $3 and key = $4`,
    [principalId, organizationId, namespace, key]
  )
  return rowCount > 0
}

module.exports = { upsert, listForPrincipal, remove }
