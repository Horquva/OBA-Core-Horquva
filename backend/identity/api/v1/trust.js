/*
 * /api/v1/trust — trust policies & federation providers (auth + permission-guarded,
 * org-scoped from the token).
 *   GET/POST /policies         list / create trust policies
 *   POST     /policies/evaluate run the authorization engine
 *   GET/POST /providers        list / register federation providers
 */
const express = require('express')
const router = express.Router()
const { pool } = require('../../db/pool')
const repos = require('../../repositories')
const authz = require('../../services/authz.service')
const federation = require('../../services/federation.service')
const { asyncHandler, requireAuth, requirePermission } = require('./deps')

router.use(requireAuth)
const orgOf = (req) => req.identity.organizationId

// ── Trust policies ──
router.get('/policies', requirePermission('policy', 'read'), asyncHandler(async (req, res) => {
  res.json(await repos.policies.listForOrg(pool, orgOf(req)))
}))

router.post('/policies', requirePermission('policy', 'create'), asyncHandler(async (req, res) => {
  const { name, description, effect, priority, resource, action, conditions } = req.body || {}
  const policy = await repos.policies.create(pool, { organizationId: orgOf(req), name, description, effect, priority, resource, action, conditions, createdBy: req.identity.principalId })
  await repos.audit.record(pool, { organizationId: orgOf(req), actorPrincipalId: req.identity.principalId, event: 'policy.created', resource: 'policy', action: 'create', decision: 'ok', detail: { name, effect } })
  res.status(201).json(policy)
}))

router.post('/policies/evaluate', requirePermission('policy', 'evaluate'), asyncHandler(async (req, res) => {
  const { principalId, resource, action, context } = req.body || {}
  res.json(await authz.authorize(pool, { organizationId: orgOf(req), principalId: principalId || req.identity.principalId, resource, action, context }))
}))

// ── Federation providers ──
router.get('/providers', requirePermission('provider', 'manage'), asyncHandler(async (req, res) => {
  // Providers may hold encrypted secrets; strip that field from the listing.
  const providers = await repos.providers.list(pool, orgOf(req))
  res.json(providers.map(({ client_secret_enc, ...p }) => p))
}))

router.post('/providers', requirePermission('provider', 'create'), asyncHandler(async (req, res) => {
  const { name, protocol, issuer, audience, clientId, clientSecret, claimMap, allowJitProvisioning } = req.body || {}
  const provider = await federation.registerProvider(pool, { organizationId: orgOf(req), name, protocol, issuer, audience, clientId, clientSecret, claimMap, allowJitProvisioning, createdBy: req.identity.principalId })
  const { client_secret_enc, ...safe } = provider
  res.status(201).json(safe)
}))

module.exports = router
