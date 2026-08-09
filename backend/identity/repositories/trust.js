/*
 * Trust repositories: trust_policy, identity_provider, federated_identity.
 * Policy evaluation sees an org's own policies plus global (org = null) policies.
 * Providers and federated identities are strictly organization-scoped.
 */
const { runner, requireOrg } = require('./exec')

const policies = {
  async create(exec, { organizationId = null, name, description = null, effect, priority = 100, resource = null, action = null, conditions = [], isActive = true, createdBy = null }) {
    const { rows } = await runner(exec).query(
      `insert into identity.trust_policy
         (organization_id, name, description, effect, priority, resource, action, conditions, is_active, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10) returning *`,
      [organizationId, name, description, effect, priority, resource, action, JSON.stringify(conditions), isActive, createdBy]
    )
    return rows[0]
  },
  async findByIdForOrg(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.trust_policy where id = $1 and (organization_id = $2 or organization_id is null)`,
      [id, orgId]
    )
    return rows[0] || null
  },
  /** Active policies applicable to (org + globals) for a resource/action, priority desc. */
  async listApplicable(exec, orgId, resource, action) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.trust_policy
       where is_active
         and (organization_id = $1 or organization_id is null)
         and (resource is null or resource = $2)
         and (action is null or action = $3)
       order by priority desc, created_at`,
      [orgId, resource, action]
    )
    return rows
  },
}

const providers = {
  async create(exec, { organizationId, name, protocol, issuer = null, clientId = null, clientSecretEnc = null, config = {}, status = 'provisioned', createdBy = null }) {
    requireOrg(organizationId)
    const { rows } = await runner(exec).query(
      `insert into identity.identity_provider
         (organization_id, name, protocol, issuer, client_id, client_secret_enc, config, status, created_by)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9) returning *`,
      [organizationId, name, protocol, issuer, clientId, clientSecretEnc, JSON.stringify(config), status, createdBy]
    )
    return rows[0]
  },
  async findById(exec, id, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.identity_provider where id = $1 and organization_id = $2`,
      [id, orgId]
    )
    return rows[0] || null
  },
  async list(exec, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.identity_provider where organization_id = $1 order by name`,
      [orgId]
    )
    return rows
  },
  async setClientSecretEnc(exec, id, orgId, clientSecretEnc) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `update identity.identity_provider set client_secret_enc = $3 where id = $1 and organization_id = $2 returning id`,
      [id, orgId, clientSecretEnc]
    )
    return rows[0] || null
  },
}

const federatedIdentities = {
  async create(exec, { providerId, principalId, organizationId, externalSubject, claims = {}, status = 'active' }) {
    requireOrg(organizationId)
    const { rows } = await runner(exec).query(
      `insert into identity.federated_identity
         (provider_id, principal_id, organization_id, external_subject, claims, status)
       values ($1, $2, $3, $4, $5::jsonb, $6) returning *`,
      [providerId, principalId, organizationId, externalSubject, JSON.stringify(claims), status]
    )
    return rows[0]
  },
  async findByProviderSubject(exec, providerId, externalSubject, orgId) {
    requireOrg(orgId)
    const { rows } = await runner(exec).query(
      `select * from identity.federated_identity
       where provider_id = $1 and external_subject = $2 and organization_id = $3`,
      [providerId, externalSubject, orgId]
    )
    return rows[0] || null
  },
}

module.exports = { policies, providers, federatedIdentities }
