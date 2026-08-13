/*
 * Sentinel Identity & Trust — domain enums (single source of truth for states).
 * Mirrors the CHECK constraints / domains in migration 002.
 */

// Identity lifecycle (doc §3E): Create → Activate → Suspend → Disable → Revoke → Archive
const LIFECYCLE = Object.freeze({
  PROVISIONED: 'provisioned',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DISABLED: 'disabled',
  REVOKED: 'revoked',
  ARCHIVED: 'archived',
})

// States in which an identity is allowed to authenticate / be authorized.
const ACTIVE_STATES = Object.freeze([LIFECYCLE.ACTIVE])

// Allowed lifecycle transitions (enforced by the lifecycle engine in Phase 3).
const LIFECYCLE_TRANSITIONS = Object.freeze({
  provisioned: ['active', 'disabled', 'archived'],
  active: ['suspended', 'disabled', 'revoked', 'archived'],
  suspended: ['active', 'disabled', 'revoked', 'archived'],
  disabled: ['active', 'revoked', 'archived'],
  revoked: ['archived'],
  archived: [],
})

const SESSION_STATUS = Object.freeze({
  ACTIVE: 'active',
  PENDING_MFA: 'pending_mfa',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
})

const PRINCIPAL_KIND = Object.freeze({
  USER: 'user',
  AI_AGENT: 'ai_agent',
  MACHINE: 'machine',
})

const POLICY_EFFECT = Object.freeze({ ALLOW: 'allow', DENY: 'deny' })

const PROVIDER_PROTOCOL = Object.freeze({ OAUTH2: 'oauth2', OIDC: 'oidc', SAML: 'saml' })

const ATTRIBUTE_NAMESPACE = Object.freeze({ SUBJECT: 'subject', RESOURCE: 'resource', ENV: 'env' })

module.exports = {
  LIFECYCLE,
  ACTIVE_STATES,
  LIFECYCLE_TRANSITIONS,
  SESSION_STATUS,
  PRINCIPAL_KIND,
  POLICY_EFFECT,
  PROVIDER_PROTOCOL,
  ATTRIBUTE_NAMESPACE,
}
