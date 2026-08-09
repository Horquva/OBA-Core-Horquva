/*
 * Sentinel Identity & Trust — baseline seed (idempotent).
 * Seeds the global RBAC vocabulary only: permission catalogue, system role
 * templates, and their role→permission mappings. Organizations and users are
 * runtime data, not seeded here. Safe to run repeatedly (ON CONFLICT DO NOTHING).
 *
 * Usage:  npm run identity:seed   (from backend/)
 */
const db = require('./pool')
const { PERMISSIONS, SYSTEM_ROLES, resolveRolePermissions } = require('../domain/catalog')

async function seed() {
  await db.withTransaction(async (client) => {
    // 1) Permissions
    for (const p of PERMISSIONS) {
      await client.query(
        `insert into identity.permission (resource, action, description)
         values ($1, $2, $3)
         on conflict (resource, action) do update set description = excluded.description`,
        [p.resource, p.action, p.description]
      )
    }

    // 2) System roles (global templates: organization_id = NULL, is_system = true)
    for (const role of SYSTEM_ROLES) {
      await client.query(
        `insert into identity.role (organization_id, name, description, is_system)
         values (null, $1, $2, true)
         on conflict (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
         do update set description = excluded.description`,
        [role.name, role.description]
      )

      const { rows: roleRows } = await client.query(
        `select id from identity.role where organization_id is null and lower(name) = lower($1)`,
        [role.name]
      )
      const roleId = roleRows[0].id

      // 3) Role → permission mappings
      const keys = resolveRolePermissions(role)
      for (const key of keys) {
        const [resource, action] = key.split(':')
        await client.query(
          `insert into identity.role_permission (role_id, permission_id)
           select $1, p.id from identity.permission p
           where p.resource = $2 and p.action = $3
           on conflict (role_id, permission_id) do nothing`,
          [roleId, resource, action]
        )
      }
    }
  })

  // Report
  const counts = await db.query(`
    select
      (select count(*) from identity.permission)      as permissions,
      (select count(*) from identity.role where is_system) as system_roles,
      (select count(*) from identity.role_permission) as role_permissions
  `)
  const c = counts.rows[0]
  console.log(
    `Seed complete — permissions=${c.permissions}, system_roles=${c.system_roles}, role_permissions=${c.role_permissions}`
  )
}

seed()
  .catch((err) => {
    console.error('seed error:', err.message)
    process.exitCode = 1
  })
  .finally(() => db.pool.end())
