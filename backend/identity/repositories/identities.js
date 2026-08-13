/*
 * Identity-subject repositories: principal (supertype) + user / ai_agent / machine.
 * EVERY subtype read and mutation is organization-scoped — there is no un-scoped
 * path to a subject. A wrong-org id yields null / 0 rows (fail closed).
 */
const { runner, requireOrg } = require('./exec')

// ── principal (subject supertype) ─────────────────────────────────────────────
const principals = {
  async create(exec, { organizationId, kind }) {
    requireOrg(organizationId)
    const { rows } = await runner(exec).query(
      `insert into identity.principal (organization_id, kind) values ($1, $2) returning *`,
      [organizationId, kind]
    )
    return rows[0]
  },
  async findById(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.principal where id = $1 and organization_id = $2`,
      [id, orgId]
    )
    return rows[0] || null
  },
}

// ── user_account ──────────────────────────────────────────────────────────────
const users = {
  async create(exec, { principalId, organizationId, email, fullName = null, passwordHash = null, status = 'provisioned', isSuperuser = false, createdBy = null }) {
    requireOrg(organizationId)
    const { rows } = await runner(exec).query(
      `insert into identity.user_account
         (principal_id, organization_id, email, full_name, password_hash, status, is_superuser, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
      [principalId, organizationId, email, fullName, passwordHash, status, isSuperuser, createdBy]
    )
    return rows[0]
  },
  async findById(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.user_account where id = $1 and organization_id = $2`,
      [id, orgId]
    )
    return rows[0] || null
  },
  async findByPrincipalId(exec, principalId, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.user_account where principal_id = $1 and organization_id = $2`,
      [principalId, orgId]
    )
    return rows[0] || null
  },
  async findByEmail(exec, orgId, email) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.user_account where organization_id = $1 and lower(email) = lower($2)`,
      [orgId, email]
    )
    return rows[0] || null
  },
  async updateStatus(exec, id, orgId, status) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.user_account set status = $3 where id = $1 and organization_id = $2 returning *`,
      [id, orgId, status]
    )
    return rows[0] || null
  },
  async setPasswordHash(exec, id, orgId, passwordHash) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.user_account set password_hash = $3 where id = $1 and organization_id = $2 returning id`,
      [id, orgId, passwordHash]
    )
    return rows[0] || null
  },
  /** Increment failed-login counter; lock the account when the threshold is reached. */
  async recordFailedLogin(exec, id, orgId, maxAttempts, lockoutMinutes) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.user_account
         set failed_login_count = failed_login_count + 1,
             locked_until = case when failed_login_count + 1 >= $3
                                 then now() + ($4 || ' minutes')::interval
                                 else locked_until end
       where id = $1 and organization_id = $2
       returning failed_login_count, locked_until`,
      [id, orgId, maxAttempts, String(lockoutMinutes)]
    )
    const row = rows[0]
    return !!(row && row.locked_until && new Date(row.locked_until) > new Date())
  },
  /** Clear the failed-login counter and stamp last_login_at on a successful login. */
  async resetFailedLogin(exec, id, orgId) {
    requireOrg(orgId)
    await runner(exec).query(
      `update identity.user_account
         set failed_login_count = 0, locked_until = null, last_login_at = now()
       where id = $1 and organization_id = $2`,
      [id, orgId]
    )
  },
  // Store the (encrypted) TOTP seed during enrollment; MFA stays disabled until confirmed.
  async setMfaSecret(exec, id, orgId, secretEnc) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.user_account
         set mfa_secret_enc = $3, mfa_enabled = false, mfa_enrolled_at = null
       where id = $1 and organization_id = $2 returning *`,
      [id, orgId, secretEnc]
    )
    return rows[0] || null
  },
  async enableMfa(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.user_account set mfa_enabled = true, mfa_enrolled_at = now()
       where id = $1 and organization_id = $2 returning *`,
      [id, orgId]
    )
    return rows[0] || null
  },
  async clearMfa(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.user_account
         set mfa_enabled = false, mfa_secret_enc = null, mfa_enrolled_at = null
       where id = $1 and organization_id = $2 returning *`,
      [id, orgId]
    )
    return rows[0] || null
  },
  async list(exec, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.user_account where organization_id = $1 order by created_at`,
      [orgId]
    )
    return rows
  },
}

// ── ai_agent ──────────────────────────────────────────────────────────────────
const agents = {
  async create(exec, { principalId, organizationId, name, clientId, clientSecretHash, guardrailProfile = null, allowedTools = [], ownerUserId = null, status = 'provisioned', createdBy = null }) {
    requireOrg(organizationId)
    const { rows } = await runner(exec).query(
      `insert into identity.ai_agent
         (principal_id, organization_id, name, client_id, client_secret_hash, guardrail_profile, allowed_tools, owner_user_id, status, created_by)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10) returning *`,
      [principalId, organizationId, name, clientId, clientSecretHash, guardrailProfile, JSON.stringify(allowedTools), ownerUserId, status, createdBy]
    )
    return rows[0]
  },
  async findById(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.ai_agent where id = $1 and organization_id = $2`,
      [id, orgId]
    )
    return rows[0] || null
  },
  async findByPrincipalId(exec, principalId, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.ai_agent where principal_id = $1 and organization_id = $2`,
      [principalId, orgId]
    )
    return rows[0] || null
  },
  async findByClientId(exec, clientId) {
    const { rows } = await runner(exec).query(
      `select * from identity.ai_agent where client_id = $1`,
      [clientId]
    )
    return rows[0] || null
  },
  async updateStatus(exec, id, orgId, status) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.ai_agent set status = $3 where id = $1 and organization_id = $2 returning *`,
      [id, orgId, status]
    )
    return rows[0] || null
  },
  async setClientSecretHash(exec, id, orgId, clientSecretHash) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.ai_agent set client_secret_hash = $3 where id = $1 and organization_id = $2 returning id`,
      [id, orgId, clientSecretHash]
    )
    return rows[0] || null
  },
  async list(exec, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.ai_agent where organization_id = $1 order by created_at`,
      [orgId]
    )
    return rows
  },
}

// ── machine_identity ──────────────────────────────────────────────────────────
const machines = {
  async create(exec, { principalId, organizationId, name, clientId, clientSecretHash, ownerUserId = null, status = 'provisioned', createdBy = null }) {
    requireOrg(organizationId)
    const { rows } = await runner(exec).query(
      `insert into identity.machine_identity
         (principal_id, organization_id, name, client_id, client_secret_hash, owner_user_id, status, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
      [principalId, organizationId, name, clientId, clientSecretHash, ownerUserId, status, createdBy]
    )
    return rows[0]
  },
  async findById(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.machine_identity where id = $1 and organization_id = $2`,
      [id, orgId]
    )
    return rows[0] || null
  },
  async findByPrincipalId(exec, principalId, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.machine_identity where principal_id = $1 and organization_id = $2`,
      [principalId, orgId]
    )
    return rows[0] || null
  },
  async findByClientId(exec, clientId) {
    const { rows } = await runner(exec).query(
      `select * from identity.machine_identity where client_id = $1`,
      [clientId]
    )
    return rows[0] || null
  },
  async updateStatus(exec, id, orgId, status) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.machine_identity set status = $3 where id = $1 and organization_id = $2 returning *`,
      [id, orgId, status]
    )
    return rows[0] || null
  },
  async setClientSecretHash(exec, id, orgId, clientSecretHash) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.machine_identity set client_secret_hash = $3 where id = $1 and organization_id = $2 returning id`,
      [id, orgId, clientSecretHash]
    )
    return rows[0] || null
  },
  async list(exec, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.machine_identity where organization_id = $1 order by created_at`,
      [orgId]
    )
    return rows
  },
}

module.exports = { principals, users, agents, machines }
