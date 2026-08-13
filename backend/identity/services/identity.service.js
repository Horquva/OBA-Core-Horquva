/*
 * Identity service — orchestrates the repository layer to create and manage
 * identities, roles, and attributes. All operations are organization-scoped and
 * atomic (principal + subtype are created in one transaction). Services never run
 * SQL directly; they compose repositories only (enforced by an architecture test).
 */
const { withTransaction } = require('../db/pool')
const { PRINCIPAL_KIND } = require('../domain/enums')
const { ConflictError, NotFoundError, ValidationError } = require('../errors')
const repos = require('../repositories')

const inTx = (exec, fn) => (exec ? fn(exec) : withTransaction(fn))

/** Map Postgres unique-violation (23505) to a friendly ConflictError. */
function mapUnique(err, message) {
  return err && err.code === '23505' ? new ConflictError(message) : err
}

async function createOrganization(exec, { name, slug, createdBy = null }) {
  if (!name || !slug) throw new ValidationError('name and slug are required')
  try {
    return await repos.organizations.create(exec, { name, slug, createdBy })
  } catch (e) {
    throw mapUnique(e, 'organization slug already exists')
  }
}

async function createUser(exec, { organizationId, email, fullName = null, passwordHash = null, isSuperuser = false, status = 'provisioned', createdBy = null }) {
  if (!organizationId || !email) throw new ValidationError('organizationId and email are required')
  return inTx(exec, async (client) => {
    const org = await repos.organizations.findById(client, organizationId)
    if (!org) throw new NotFoundError('organization not found')
    try {
      const principal = await repos.principals.create(client, { organizationId, kind: PRINCIPAL_KIND.USER })
      const user = await repos.users.create(client, { principalId: principal.id, organizationId, email, fullName, passwordHash, isSuperuser, status, createdBy })
      await repos.audit.record(client, { organizationId, actorPrincipalId: principal.id, event: 'identity.created', resource: 'user', action: 'create', decision: 'ok', detail: { email } })
      return user
    } catch (e) {
      throw mapUnique(e, 'a user with that email already exists in this organization')
    }
  })
}

async function createAgent(exec, { organizationId, name, clientId, clientSecretHash, guardrailProfile = null, allowedTools = [], ownerUserId = null, createdBy = null }) {
  if (!organizationId || !name || !clientId || !clientSecretHash) {
    throw new ValidationError('organizationId, name, clientId, clientSecretHash are required')
  }
  return inTx(exec, async (client) => {
    const org = await repos.organizations.findById(client, organizationId)
    if (!org) throw new NotFoundError('organization not found')
    try {
      const principal = await repos.principals.create(client, { organizationId, kind: PRINCIPAL_KIND.AI_AGENT })
      const agent = await repos.agents.create(client, { principalId: principal.id, organizationId, name, clientId, clientSecretHash, guardrailProfile, allowedTools, ownerUserId, createdBy })
      await repos.audit.record(client, { organizationId, actorPrincipalId: principal.id, event: 'identity.created', resource: 'ai_agent', action: 'create', decision: 'ok', detail: { name, clientId } })
      return agent
    } catch (e) {
      throw mapUnique(e, 'an agent with that client_id already exists')
    }
  })
}

async function createMachine(exec, { organizationId, name, clientId, clientSecretHash, ownerUserId = null, createdBy = null }) {
  if (!organizationId || !name || !clientId || !clientSecretHash) {
    throw new ValidationError('organizationId, name, clientId, clientSecretHash are required')
  }
  return inTx(exec, async (client) => {
    const org = await repos.organizations.findById(client, organizationId)
    if (!org) throw new NotFoundError('organization not found')
    try {
      const principal = await repos.principals.create(client, { organizationId, kind: PRINCIPAL_KIND.MACHINE })
      const machine = await repos.machines.create(client, { principalId: principal.id, organizationId, name, clientId, clientSecretHash, ownerUserId, createdBy })
      await repos.audit.record(client, { organizationId, actorPrincipalId: principal.id, event: 'identity.created', resource: 'machine', action: 'create', decision: 'ok', detail: { name, clientId } })
      return machine
    } catch (e) {
      throw mapUnique(e, 'a machine with that client_id already exists')
    }
  })
}

async function getUser(exec, orgId, id) {
  const user = await repos.users.findById(exec, id, orgId)
  if (!user) throw new NotFoundError('user not found')
  return user
}

async function listUsers(exec, orgId) {
  return repos.users.list(exec, orgId)
}

/** Assign a role (by id within the org, or a global system role by name) to a principal. */
async function assignRole(exec, { organizationId, principalId, roleId = null, roleName = null, grantedBy = null }) {
  return inTx(exec, async (client) => {
    const principal = await repos.principals.findById(client, principalId, organizationId)
    if (!principal) throw new NotFoundError('principal not found in this organization')
    const role = roleId
      ? await repos.roles.findByIdForOrg(client, roleId, organizationId)
      : roleName
        ? await repos.roles.findSystemByName(client, roleName)
        : null
    if (!role) throw new NotFoundError('role not found')
    const assignment = await repos.assignments.assign(client, { principalId, roleId: role.id, organizationId, grantedBy })
    await repos.audit.record(client, { organizationId, actorPrincipalId: principal.id, event: 'role.assigned', resource: 'role', action: 'assign', decision: 'ok', detail: { roleId: role.id, roleName: role.name } })
    return assignment
  })
}

/** Attach or update an ABAC attribute on a principal (organization-scoped). */
async function setAttribute(exec, { organizationId, principalId, namespace = 'subject', key, value, createdBy = null }) {
  if (!key) throw new ValidationError('attribute key is required')
  return inTx(exec, async (client) => {
    const principal = await repos.principals.findById(client, principalId, organizationId)
    if (!principal) throw new NotFoundError('principal not found in this organization')
    return repos.attributes.upsert(client, { principalId, organizationId, namespace, key, value, createdBy })
  })
}

module.exports = {
  createOrganization,
  createUser,
  createAgent,
  createMachine,
  getUser,
  listUsers,
  assignRole,
  setAttribute,
}
