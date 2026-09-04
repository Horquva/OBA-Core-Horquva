/*
 * Credential rotation (doc §12 — rotation / replacement behavior).
 * Rotates machine/agent client secrets (stored as hashes) and provider secrets
 * (stored encrypted). New secrets are high-entropy, returned ONCE to the caller,
 * and never logged. All rotations are audited.
 */
const { withTransaction } = require('../db/pool')
const repos = require('../repositories')
const secrets = require('./secrets')
const { NotFoundError, ValidationError } = require('../errors')

const inTx = (exec, fn) => (exec ? fn(exec) : withTransaction(fn))
const SUBTYPE = { machine: repos.machines, ai_agent: repos.agents }

/** Rotate a machine or AI-agent client secret. Returns { clientId, clientSecret } once. */
async function rotateClientSecret(exec, { organizationId, kind, id }) {
  const repo = SUBTYPE[kind]
  if (!repo) throw new ValidationError('kind must be "machine" or "ai_agent"')
  return inTx(exec, async (client) => {
    const entity = await repo.findById(client, id, organizationId)
    if (!entity) throw new NotFoundError(`${kind} not found`)
    const newSecret = secrets.generateClientSecret()
    await repo.setClientSecretHash(client, id, organizationId, secrets.hash(newSecret))
    await repos.audit.record(client, { organizationId, actorPrincipalId: entity.principal_id, event: 'credential.rotated', resource: kind, action: 'rotate_secret', decision: 'ok', detail: { id } })
    return { clientId: entity.client_id, clientSecret: newSecret }
  })
}

/** Rotate a federation provider's client secret (stored encrypted). Returns the new secret once. */
async function rotateProviderSecret(exec, { organizationId, providerId }) {
  return inTx(exec, async (client) => {
    const provider = await repos.providers.findById(client, providerId, organizationId)
    if (!provider) throw new NotFoundError('provider not found')
    const newSecret = secrets.generateClientSecret()
    await repos.providers.setClientSecretEnc(client, providerId, organizationId, secrets.encrypt(newSecret))
    await repos.audit.record(client, { organizationId, event: 'credential.rotated', resource: 'provider', action: 'rotate_secret', decision: 'ok', detail: { providerId } })
    return { providerId, clientSecret: newSecret }
  })
}

module.exports = { rotateClientSecret, rotateProviderSecret }
