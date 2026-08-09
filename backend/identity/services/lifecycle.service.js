/*
 * Identity lifecycle engine (doc §3E).
 * Create(provisioned) → Activate → Suspend → Disable → Revoke → Restore → Archive,
 * enforced by the transition map in domain/enums. Leaving the active family
 * cascades to revoke the identity's sessions (credential trust terminates).
 * Applies to users, AI agents, machine identities, and organizations.
 */
const { LIFECYCLE_TRANSITIONS } = require('../domain/enums')
const { InvalidTransitionError, NotFoundError, ValidationError } = require('../errors')
const { withTransaction } = require('../db/pool')
const repos = require('../repositories')

const inTx = (exec, fn) => (exec ? fn(exec) : withTransaction(fn))
const SUBTYPE = { user: repos.users, ai_agent: repos.agents, machine: repos.machines }
const REVOKING_STATES = ['suspended', 'disabled', 'revoked', 'archived']

function assertAllowed(from, to) {
  if (from === to) return
  const allowed = LIFECYCLE_TRANSITIONS[from] || []
  if (!allowed.includes(to)) throw new InvalidTransitionError(from, to)
}

/** Transition a user / ai_agent / machine identity within its organization. */
async function transitionIdentity(exec, { kind, id, orgId, to }) {
  const repo = SUBTYPE[kind]
  if (!repo) throw new ValidationError(`unknown identity kind: ${kind}`)
  return inTx(exec, async (client) => {
    const current = await repo.findById(client, id, orgId)
    if (!current) throw new NotFoundError(`${kind} not found`)
    assertAllowed(current.status, to)
    const updated = await repo.updateStatus(client, id, orgId, to)
    if (REVOKING_STATES.includes(to)) {
      await repos.sessions.revokeAllForPrincipal(client, current.principal_id, orgId)
    }
    await repos.audit.record(client, {
      organizationId: orgId,
      actorPrincipalId: current.principal_id,
      event: 'identity.lifecycle',
      resource: kind,
      action: to,
      decision: 'applied',
      detail: { from: current.status, to, id },
    })
    return updated
  })
}

/** Transition an organization (tenant) through its lifecycle. */
async function transitionOrganization(exec, { id, to }) {
  return inTx(exec, async (client) => {
    const org = await repos.organizations.findById(client, id)
    if (!org) throw new NotFoundError('organization not found')
    assertAllowed(org.status, to)
    const updated = await repos.organizations.updateStatus(client, id, to)
    await repos.audit.record(client, {
      organizationId: id,
      event: 'organization.lifecycle',
      resource: 'organization',
      action: to,
      decision: 'applied',
      detail: { from: org.status, to },
    })
    return updated
  })
}

module.exports = { transitionIdentity, transitionOrganization }
