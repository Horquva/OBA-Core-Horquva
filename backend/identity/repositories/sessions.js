/*
 * Session repository. Sessions are organization-scoped and revocable. The lifecycle
 * engine calls revokeAllForPrincipal when an identity leaves the active state.
 */
const { runner, requireOrg } = require('./exec')

async function create(exec, { principalId, organizationId, status = 'active', refreshTokenHash = null, mfaRequired = false, mfaSatisfied = false, ip = null, userAgent = null, expiresAt }) {
  requireOrg(organizationId)
  const { rows } = await runner(exec).query(
    `insert into identity.session
       (principal_id, organization_id, status, refresh_token_hash, mfa_required, mfa_satisfied, ip, user_agent, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
    [principalId, organizationId, status, refreshTokenHash, mfaRequired, mfaSatisfied, ip, userAgent, expiresAt]
  )
  return rows[0]
}

async function findById(exec, id, orgId) {
  requireOrg(orgId)
  const { rows } = await runner(exec).query(
    `select * from identity.session where id = $1 and organization_id = $2`,
    [id, orgId]
  )
  return rows[0] || null
}

async function findActiveByRefreshHash(exec, refreshTokenHash) {
  const { rows } = await runner(exec).query(
    `select * from identity.session
     where refresh_token_hash = $1 and status = 'active' and expires_at > now()`,
    [refreshTokenHash]
  )
  return rows[0] || null
}

/** Any-status lookup by refresh hash — used to detect reuse of a revoked/expired token. */
async function findByRefreshHash(exec, refreshTokenHash) {
  const { rows } = await runner(exec).query(
    `select * from identity.session where refresh_token_hash = $1`,
    [refreshTokenHash]
  )
  return rows[0] || null
}

/** Rotate the refresh-token hash bound to a session. */
async function setRefreshHash(exec, id, orgId, refreshTokenHash) {
  requireOrg(orgId)
  const { rows } = await runner(exec).query(
    `update identity.session set refresh_token_hash = $3 where id = $1 and organization_id = $2 returning *`,
    [id, orgId, refreshTokenHash]
  )
  return rows[0] || null
}

/** Active, unexpired sessions for a principal, oldest first (for concurrent-session caps). */
async function listActiveForPrincipal(exec, principalId, orgId) {
  requireOrg(orgId)
  const { rows } = await runner(exec).query(
    `select * from identity.session
     where principal_id = $1 and organization_id = $2 and status = 'active' and expires_at > now()
     order by issued_at asc`,
    [principalId, orgId]
  )
  return rows
}

async function listForPrincipal(exec, principalId, orgId) {
  requireOrg(orgId)
  const { rows } = await runner(exec).query(
    `select * from identity.session where principal_id = $1 and organization_id = $2 order by issued_at desc`,
    [principalId, orgId]
  )
  return rows
}

async function revoke(exec, id, orgId) {
  requireOrg(orgId)
  const { rows } = await runner(exec).query(
    `update identity.session set status = 'revoked', revoked_at = now()
     where id = $1 and organization_id = $2 and status <> 'revoked' returning *`,
    [id, orgId]
  )
  return rows[0] || null
}

async function revokeAllForPrincipal(exec, principalId, orgId) {
  requireOrg(orgId)
  const { rowCount } = await runner(exec).query(
    `update identity.session set status = 'revoked', revoked_at = now()
     where principal_id = $1 and organization_id = $2 and status in ('active', 'pending_mfa')`,
    [principalId, orgId]
  )
  return rowCount
}

module.exports = {
  create,
  findById,
  findActiveByRefreshHash,
  findByRefreshHash,
  setRefreshHash,
  listForPrincipal,
  listActiveForPrincipal,
  revoke,
  revokeAllForPrincipal,
}
