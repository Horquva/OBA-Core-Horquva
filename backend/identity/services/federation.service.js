/*
 * Federation + OIDC foundation (doc §13).
 * - Providers are registered PER ORGANIZATION with explicit trust config; only
 *   registered, active providers are accepted (no uncontrolled federation trust).
 * - External assertions are validated (issuer, audience, expiry) and mapped to an
 *   internal identity through an EXPLICIT claim map — role/superuser claims are
 *   never honored (no uncontrolled claim elevation).
 * - JIT provisioning is OFF unless a provider opts in.
 * - Federated identities are org-scoped and lifecycle-controlled; every event audited.
 *
 * Note: signature verification against the provider's JWKS is the deployment
 * integration point (an OIDC library supplies verified claims); this service owns
 * trust, mapping, resolution, org binding, and issuance.
 */
const { withTransaction } = require('../db/pool')
const config = require('../config')
const repos = require('../repositories')
const secretbox = require('./secretbox')
const session = require('./session.service')
const auth = require('./auth.service')
const { NotFoundError, ValidationError, ForbiddenError, AuthenticationError } = require('../errors')

const inTx = (exec, fn) => (exec ? fn(exec) : withTransaction(fn))

async function registerProvider(exec, { organizationId, name, protocol = 'oidc', issuer, audience = null, clientId = null, clientSecret = null, claimMap = {}, allowJitProvisioning = false, createdBy = null }) {
  if (!organizationId || !name || !issuer) throw new ValidationError('organizationId, name, and issuer are required')
  const providerConfig = { audience, claimMap, allowJitProvisioning }
  const clientSecretEnc = clientSecret ? secretbox.encrypt(clientSecret, config.mfa.encKey) : null
  const provider = await repos.providers.create(exec, { organizationId, name, protocol, issuer, clientId, clientSecretEnc, config: providerConfig, status: 'active', createdBy })
  await repos.audit.record(exec, { organizationId, event: 'federation.provider_registered', resource: 'provider', action: 'create', decision: 'ok', detail: { providerId: provider.id, issuer, protocol } })
  return provider
}

/** Explicitly onboard an external subject to an existing internal user (controlled path). */
async function linkFederatedIdentity(exec, { organizationId, providerId, userId, externalSubject, claims = {} }) {
  return inTx(exec, async (client) => {
    const provider = await repos.providers.findById(client, providerId, organizationId)
    if (!provider) throw new NotFoundError('provider not found')
    const user = await repos.users.findById(client, userId, organizationId)
    if (!user) throw new NotFoundError('user not found')
    const fed = await repos.federatedIdentities.create(client, { providerId, principalId: user.principal_id, organizationId, externalSubject, claims })
    await repos.audit.record(client, { organizationId, actorPrincipalId: user.principal_id, event: 'federation.linked', resource: 'federated_identity', action: 'create', decision: 'ok', detail: { providerId, externalSubject } })
    return fed
  })
}

function mapClaims(provider, claims) {
  const cm = (provider.config && provider.config.claimMap) || {}
  return {
    subject: claims[cm.subject || 'sub'],
    email: claims[cm.email || 'email'],
    fullName: claims[cm.name || 'name'],
  }
}

function validateClaims(provider, claims) {
  if (claims.iss !== provider.issuer) throw new ForbiddenError('untrusted issuer')
  const aud = provider.config && provider.config.audience
  if (aud && claims.aud !== aud) throw new ForbiddenError('audience mismatch')
  if (claims.exp && Math.floor(Date.now() / 1000) >= claims.exp) throw new AuthenticationError('assertion expired')
}

/**
 * Complete a federated login from a (provider-verified) claims set.
 * Resolves the internal identity, enforces org binding + controls, and issues tokens.
 */
async function assertFederatedLogin(exec, { organizationId, providerId, claims, context = {} }) {
  return inTx(exec, async (client) => {
    const provider = await repos.providers.findById(client, providerId, organizationId)
    if (!provider || provider.status !== 'active') throw new ForbiddenError('unknown or untrusted provider')

    validateClaims(provider, claims)
    const { subject, email, fullName } = mapClaims(provider, claims)
    if (!subject) throw new ValidationError('assertion is missing the subject claim')

    const audit = (decision, reason, principalId = null, detail = {}) =>
      repos.audit.record(client, { organizationId, actorPrincipalId: principalId, actorLabel: subject, event: 'federation.login', resource: 'auth', action: 'federated', decision, reason, ip: context.ip || null, detail }).catch(() => {})

    let fed = await repos.federatedIdentities.findByProviderSubject(client, providerId, subject, organizationId)
    let user

    if (fed) {
      user = await repos.users.findByPrincipalId(client, fed.principal_id, organizationId)
    } else if (provider.config && provider.config.allowJitProvisioning) {
      // Controlled JIT: only email/name are mapped; never roles or privilege.
      if (!email) { await audit('deny', 'jit_missing_email'); throw new ValidationError('cannot provision without an email claim') }
      const identityService = require('./identity.service')
      user = await identityService.createUser(client, { organizationId, email, fullName, status: 'active' })
      fed = await repos.federatedIdentities.create(client, { providerId, principalId: user.principal_id, organizationId, externalSubject: subject, claims })
      await audit('ok', 'jit_provisioned', user.principal_id)
    } else {
      await audit('deny', 'no_federated_identity')
      throw new ForbiddenError('no federated identity mapped for this subject')
    }

    if (!user) { await audit('deny', 'user_missing'); throw new AuthenticationError() }
    if (user.status !== 'active') { await audit('deny', 'identity_not_active', user.principal_id); throw new AuthenticationError('identity not active') }

    const tokens = await session.start(client, { principalId: user.principal_id, organizationId, kind: 'user', ip: context.ip, userAgent: context.userAgent })
    await audit('ok', 'federated_login', user.principal_id, { providerId })
    return {
      status: 'authenticated',
      subject: auth.publicSubject(user),
      sessionId: tokens.session.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
    }
  })
}

module.exports = { registerProvider, linkFederatedIdentity, assertFederatedLogin }
