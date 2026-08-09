/*
 * Organization repository. The organization is the tenant root; its own id IS the
 * scope, so reads are by id (not org-scoped by a parent).
 */
const { runner } = require('./exec')

async function create(exec, { name, slug, status = 'active', createdBy = null }) {
  const { rows } = await runner(exec).query(
    `insert into identity.organization (name, slug, status, created_by)
     values ($1, $2, $3, $4) returning *`,
    [name, slug, status, createdBy]
  )
  return rows[0]
}

async function findById(exec, id) {
  const { rows } = await runner(exec).query(`select * from identity.organization where id = $1`, [id])
  return rows[0] || null
}

async function findBySlug(exec, slug) {
  const { rows } = await runner(exec).query(
    `select * from identity.organization where lower(slug) = lower($1)`,
    [slug]
  )
  return rows[0] || null
}

async function updateStatus(exec, id, status) {
  const { rows } = await runner(exec).query(
    `update identity.organization set status = $2 where id = $1 returning *`,
    [id, status]
  )
  return rows[0] || null
}

async function list(exec) {
  const { rows } = await runner(exec).query(`select * from identity.organization order by created_at`)
  return rows
}

module.exports = { create, findById, findBySlug, updateStatus, list }
