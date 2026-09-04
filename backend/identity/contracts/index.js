/*
 * Sentinel Identity & Trust — CONSUMER CONTRACT (Plan Part 5).
 * Owner: Areeb Ahmad.
 *
 * This is the SINGLE approved surface for other Sentinel platforms that run
 * in-process with the identity backend (e.g. Application Security route guards).
 * It is a thin wrapper over the real engines — `session.service` (token +
 * revocation-aware validation) and `authz.service` (RBAC + ABAC + trust policy,
 * deny-override, fail-closed). It performs NO independent JWT verification, role
 * resolution, or authorization logic.
 *
 * Constitutional rule (Part 5 / DECISIONS.md): consumers MUST NOT reproduce JWT
 * trust, RBAC, ABAC, or identity resolution. They call these functions instead.
 *
 * Every function takes an optional { exec } (a pg client / tx) and defaults to the
 * shared pool, so the same contract is used by the live server and by tests under
 * a rolled-back transaction.
 *
 * Out-of-process consumers (separate services, Flutter, other repos) must use the
 * HTTP contract via ./identity-client.js instead of importing this module.
 */
const { pool } = require('../db/pool')
const session = require('../services/session.service')
const authz = require('../services/authz.service')
const { requireAuth, requirePermission, errorHandler } = require('../api/v1/deps')

const CONTRACT_VERSION = 'v1'

/**
 * Validate a bearer access token (signature + claims + revocation-aware session
 * check). Returns the resolved identity, with tenant context taken ONLY from the
 * token — never from caller input. Throws on any failure (fail closed).
 */
async function validateToken(token, { exec = pool } = {}) {
  const { claims, session: s } = await session.validateAccessToken(exec, token)
  return {
    principalId: claims.sub,
    organizationId: claims.org,
    kind: claims.kind,
    sessionId: claims.sid,
    session: s,
  }
}

/**
 * Raw authorization decision for an already-resolved principal within its org.
 * Returns { decision, reason, matched } — enough for a consumer to act without
 * recreating the engine. Any evaluation error resolves to a DENY (fail closed).
 */
async function authorize({ organizationId, principalId, resource, action, context }, { exec = pool } = {}) {
  return authz.authorize(exec, { organizationId, principalId, resource, action, context })
}

/**
 * Token-scoped authorization: validate the token, then authorize the action within
 * the TOKEN'S organization. Tenant is pinned to the token, so cross-tenant access
 * is structurally impossible through this contract. Returns { identity, decision,
 * reason, matched }. Throws only if the token itself is invalid/revoked (deny).
 */
async function authorizeToken({ token, resource, action, context }, { exec = pool } = {}) {
  const identity = await validateToken(token, { exec })
  const decision = await authz.authorize(exec, {
    organizationId: identity.organizationId,
    principalId: identity.principalId,
    resource,
    action,
    context,
  })
  return { identity, ...decision }
}

/** Boolean convenience form of authorizeToken. Never throws into an allow. */
async function isAllowed(params, opts) {
  try {
    return (await authorizeToken(params, opts)).decision === 'allow'
  } catch (_) {
    return false // invalid/revoked token → deny
  }
}

/** Effective permission keys for the token's principal, scoped to its org. */
async function effectivePermissions(token, { exec = pool } = {}) {
  const identity = await validateToken(token, { exec })
  return authz.effectivePermissions(exec, identity.organizationId, identity.principalId)
}

module.exports = {
  CONTRACT_VERSION,
  // programmatic contract (AI-Security tool gating, Infra workload checks, etc.)
  validateToken,
  authorize,
  authorizeToken,
  isAllowed,
  effectivePermissions,
  // Express guards (Application Security route protection)
  requireAuth,
  requirePermission,
  errorHandler,
}
