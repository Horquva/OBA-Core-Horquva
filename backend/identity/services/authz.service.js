/*
 * Authorization decision engine (doc §4 — policy composition).
 *
 * authorize() composes three mechanisms with these rules:
 *   1. Explicit DENY policy overrides everything (including superuser).
 *   2. Otherwise RBAC grant is REQUIRED (zero-trust default; a bare allow-policy
 *      never grants a permission RBAC lacks).
 *   3. Any error during evaluation → DENY (fail closed).
 * Every decision is written to the audit trail.
 */
const repos = require('../repositories')
const abac = require('./abac')
const { ForbiddenError, NotFoundError } = require('../errors')

const SUBTYPE = { user: repos.users, ai_agent: repos.agents, machine: repos.machines }

async function loadSubject(exec, principal, orgId) {
  const repo = SUBTYPE[principal.kind]
  return repo ? repo.findByPrincipalId(exec, principal.id, orgId) : null
}

async function buildContext(exec, principalId, orgId, provided = {}) {
  const attrs = await repos.attributes.listForPrincipal(exec, principalId, orgId, 'subject')
  const subject = {}
  for (const a of attrs) subject[a.key] = a.value
  return {
    subject: { ...subject, ...(provided.subject || {}) },
    resource: provided.resource || {},
    env: provided.env || {},
  }
}

/** Core decision. Returns { decision, reason, matched:{ rbac, abac, policy } }. */
async function authorize(exec, { organizationId, principalId, resource, action, context = {} }) {
  const audit = (decision, reason, matched) =>
    repos.audit
      .record(exec, {
        organizationId,
        actorPrincipalId: principalId,
        event: 'authz.decision',
        resource,
        action,
        decision,
        reason,
        detail: { matched },
      })
      .catch(() => {})

  try {
    const principal = await repos.principals.findById(exec, principalId, organizationId)
    if (!principal) {
      await audit('deny', 'unknown_principal', { rbac: false, abac: false, policy: 'none' })
      return { decision: 'deny', reason: 'unknown_principal', matched: { rbac: false, abac: false, policy: 'none' } }
    }

    // Defense in depth: only active identities can be authorized.
    const subject = await loadSubject(exec, principal, organizationId)
    if (subject && subject.status && subject.status !== 'active') {
      await audit('deny', 'identity_not_active', { rbac: false, abac: false, policy: 'none' })
      return { decision: 'deny', reason: 'identity_not_active', matched: { rbac: false, abac: false, policy: 'none' } }
    }
    const isSuperuser = !!(subject && subject.is_superuser)

    // RBAC
    const keys = await repos.assignments.permissionKeysForPrincipal(exec, principalId, organizationId)
    const rbacAllow = isSuperuser || keys.includes(`${resource}:${action}`)

    // ABAC + trust policies (deny-override across matched policies)
    const ctx = await buildContext(exec, principalId, organizationId, context)
    const policies = await repos.policies.listApplicable(exec, organizationId, resource, action)
    let policyDecision = 'none'
    let abacMatched = false
    for (const p of policies) {
      if (!abac.evaluateConditions(p.conditions || [], ctx)) continue
      abacMatched = true
      if (p.effect === 'deny') { policyDecision = 'deny'; break } // deny wins immediately
      if (policyDecision !== 'deny') policyDecision = 'allow'
    }

    // Compose
    let decision
    let reason
    if (policyDecision === 'deny') { decision = 'deny'; reason = 'explicit_deny_policy' }
    else if (!rbacAllow) { decision = 'deny'; reason = 'no_permission' }
    else { decision = 'allow'; reason = isSuperuser ? 'superuser' : (policyDecision === 'allow' ? 'rbac+policy_allow' : 'rbac_grant') }

    const matched = { rbac: rbacAllow, abac: abacMatched, policy: policyDecision }
    await audit(decision, reason, matched)
    return { decision, reason, matched }
  } catch (err) {
    await audit('deny', 'evaluation_error', { rbac: false, abac: false, policy: 'error' })
    return { decision: 'deny', reason: 'evaluation_error', matched: { rbac: false, abac: false, policy: 'error' } }
  }
}

/** Convenience boolean form. */
async function can(exec, params) {
  return (await authorize(exec, params)).decision === 'allow'
}

/** Effective permission keys a principal holds within an org. */
async function effectivePermissions(exec, orgId, principalId) {
  return repos.assignments.permissionKeysForPrincipal(exec, principalId, orgId)
}

/**
 * Guarded role assignment (doc §4: unauthorized-assignment & privilege-escalation
 * prevention). The actor must (a) be permitted to assign roles, and (b) already
 * hold every permission the target role grants (unless the actor is a superuser).
 */
async function assignRoleGuarded(exec, { actorPrincipalId, organizationId, targetPrincipalId, roleId = null, roleName = null }) {
  const identityService = require('./identity.service') // lazy require to avoid cycle

  // (a) actor must be allowed to assign roles
  const decision = await authorize(exec, { organizationId, principalId: actorPrincipalId, resource: 'role', action: 'assign' })
  if (decision.decision !== 'allow') throw new ForbiddenError('not permitted to assign roles')

  // Resolve the target role
  const role = roleId
    ? await repos.roles.findByIdForOrg(exec, roleId, organizationId)
    : roleName
      ? await repos.roles.findSystemByName(exec, roleName)
      : null
  if (!role) throw new NotFoundError('role not found')

  // (b) privilege-escalation prevention
  const actorPrincipal = await repos.principals.findById(exec, actorPrincipalId, organizationId)
  const actorSubject = actorPrincipal ? await loadSubject(exec, actorPrincipal, organizationId) : null
  const actorSuper = !!(actorSubject && actorSubject.is_superuser)
  if (!actorSuper) {
    const rolePerms = await repos.roles.permissionKeys(exec, role.id)
    const actorPerms = new Set(await repos.assignments.permissionKeysForPrincipal(exec, actorPrincipalId, organizationId))
    const escalating = rolePerms.filter((p) => !actorPerms.has(p))
    if (escalating.length) {
      throw new ForbiddenError(`privilege escalation prevented: cannot grant permissions you do not hold (${escalating.join(', ')})`)
    }
  }

  return identityService.assignRole(exec, { organizationId, principalId: targetPrincipalId, roleId: role.id, grantedBy: actorPrincipalId })
}

module.exports = { authorize, can, effectivePermissions, assignRoleGuarded }
