/*
 * Authentication service (doc §7, §8).
 * Implements the verification chain up to the point a session/token is issued
 * (Phase 6): Credential → Verification → Identity Resolution → Policy Check → MFA gate.
 *
 * Security properties:
 *   - Account state validated before any credential check (active, not locked).
 *   - Failed attempts counted; account locks after a threshold.
 *   - Failures return a GENERIC error (no account enumeration); the specific
 *     reason is written to the audit trail only.
 *   - password_hash / secrets are never returned or logged.
 */
const { withTransaction } = require('../db/pool')
const config = require('../config')
const repos = require('../repositories')
const password = require('./password')
const abac = require('./abac')
const { AuthenticationError, ForbiddenError } = require('../errors')

const inTx = (exec, fn) => (exec ? fn(exec) : withTransaction(fn))

/** Strip secret material before returning a subject. */
function publicSubject(row) {
  if (!row) return null
  const { password_hash, mfa_secret_enc, client_secret_hash, ...safe } = row
  return safe
}

async function subjectContext(exec, principalId, orgId, context) {
  const attrs = await repos.attributes.listForPrincipal(exec, principalId, orgId, 'subject')
  const subject = {}
  for (const a of attrs) subject[a.key] = a.value
  return { subject, resource: context.resource || {}, env: context.env || { ip: context.ip || null } }
}

/** Contextual authentication gate: an explicit deny policy on (auth, action) blocks login. */
async function matchedDenyPolicy(exec, orgId, action, ctx) {
  const policies = await repos.policies.listApplicable(exec, orgId, 'auth', action)
  for (const p of policies) {
    if (p.effect === 'deny' && abac.evaluateConditions(p.conditions || [], ctx)) return p
  }
  return null
}

/**
 * Authenticate a human user with email + password.
 * Returns { status: 'authenticated' | 'mfa_required', principalId, kind, organizationId, subject, mfaRequired }.
 * Throws AuthenticationError (generic) on any credential/state failure.
 */
async function authenticatePassword(exec, { organizationId, email, password: pass, context = {} }) {
  return inTx(exec, async (client) => {
    const audit = (decision, reason, principalId = null, detail = {}) =>
      repos.audit.record(client, {
        organizationId, actorPrincipalId: principalId, actorLabel: email,
        event: 'auth.login', resource: 'auth', action: 'password', decision, reason,
        ip: context.ip || null, detail,
      }).catch(() => {})

    const user = await repos.users.findByEmail(client, organizationId, email)
    if (!user) { await audit('deny', 'user_not_found'); throw new AuthenticationError() }

    // Account-state validation BEFORE verifying the credential.
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await audit('deny', 'account_locked', user.principal_id)
      throw new AuthenticationError()
    }
    if (user.status !== 'active') {
      await audit('deny', 'inactive', user.principal_id, { status: user.status })
      throw new AuthenticationError()
    }

    // Credential verification.
    if (!user.password_hash || !password.verify(pass, user.password_hash)) {
      const locked = await repos.users.recordFailedLogin(client, user.id, organizationId, config.auth.maxFailedAttempts, config.auth.lockoutMinutes)
      await audit('deny', locked ? 'bad_password_locked' : 'bad_password', user.principal_id)
      throw new AuthenticationError()
    }

    // Policy check (contextual deny, e.g. untrusted network).
    const ctx = await subjectContext(client, user.principal_id, organizationId, context)
    const deny = await matchedDenyPolicy(client, organizationId, 'password', ctx)
    if (deny) {
      await audit('deny', 'denied_by_policy', user.principal_id, { policy: deny.name })
      throw new ForbiddenError('authentication denied by policy')
    }

    // Success — reset lockout counters, stamp last_login_at.
    await repos.users.resetFailedLogin(client, user.id, organizationId)
    const mfaRequired = !!user.mfa_enabled
    await audit(mfaRequired ? 'pending_mfa' : 'ok', mfaRequired ? 'password_ok_mfa_required' : 'password_ok', user.principal_id)

    return {
      status: mfaRequired ? 'mfa_required' : 'authenticated',
      principalId: user.principal_id,
      kind: 'user',
      organizationId,
      subject: publicSubject(user),
      mfaRequired,
    }
  })
}

/**
 * Authenticate a machine or AI-agent via OAuth2-style client credentials.
 * Returns { status: 'authenticated', principalId, kind, organizationId, subject }.
 */
async function authenticateClientCredentials(exec, { clientId, clientSecret, context = {} }) {
  return inTx(exec, async (client) => {
    const agent = await repos.agents.findByClientId(client, clientId)
    const machine = agent ? null : await repos.machines.findByClientId(client, clientId)
    const entity = agent || machine
    const kind = agent ? 'ai_agent' : 'machine'

    const audit = (decision, reason, principalId = null, orgId = null, detail = {}) =>
      repos.audit.record(client, {
        organizationId: orgId, actorPrincipalId: principalId, actorLabel: clientId,
        event: 'auth.client_credentials', resource: 'auth', action: 'client_credentials',
        decision, reason, ip: context.ip || null, detail,
      }).catch(() => {})

    if (!entity) { await audit('deny', 'unknown_client'); throw new AuthenticationError() }

    if (entity.status !== 'active') {
      await audit('deny', 'inactive', entity.principal_id, entity.organization_id, { status: entity.status })
      throw new AuthenticationError()
    }
    if (!entity.client_secret_hash || !password.verifySecret(clientSecret, entity.client_secret_hash)) {
      await audit('deny', 'bad_secret', entity.principal_id, entity.organization_id)
      throw new AuthenticationError()
    }

    const ctx = await subjectContext(client, entity.principal_id, entity.organization_id, context)
    const deny = await matchedDenyPolicy(client, entity.organization_id, 'client_credentials', ctx)
    if (deny) {
      await audit('deny', 'denied_by_policy', entity.principal_id, entity.organization_id, { policy: deny.name })
      throw new ForbiddenError('authentication denied by policy')
    }

    await audit('ok', 'client_credentials_ok', entity.principal_id, entity.organization_id)
    return {
      status: 'authenticated',
      principalId: entity.principal_id,
      kind,
      organizationId: entity.organization_id,
      subject: publicSubject(entity),
    }
  })
}

module.exports = { authenticatePassword, authenticateClientCredentials, publicSubject }
