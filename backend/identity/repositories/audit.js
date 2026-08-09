/*
 * Audit repository (append-only). Every security-relevant decision is recorded.
 * Reads are organization-scoped; there is no cross-tenant audit visibility.
 */
const { runner, requireOrg } = require('./exec')
const { redact } = require('../redact')

async function record(exec, { organizationId = null, actorPrincipalId = null, actorLabel = null, event, resource = null, action = null, decision = null, reason = null, detail = {}, ip = null }) {
  // Defense in depth: never let a secret reach the audit trail.
  const safeDetail = redact(detail)
  const { rows } = await runner(exec).query(
    `insert into identity.audit_event
       (organization_id, actor_principal_id, actor_label, event, resource, action, decision, reason, detail, ip)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10) returning id, created_at`,
    [organizationId, actorPrincipalId, actorLabel, event, resource, action, decision, reason, JSON.stringify(safeDetail), ip]
  )
  return rows[0]
}

async function listForOrg(exec, orgId, { limit = 100 } = {}) {
  requireOrg(orgId)
  const { rows } = await runner(exec).query(
    `select * from identity.audit_event where organization_id = $1 order by created_at desc limit $2`,
    [orgId, limit]
  )
  return rows
}

module.exports = { record, listForOrg }
