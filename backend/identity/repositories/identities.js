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
