/*
 * /api/v1/identity — identity management surface (all endpoints require auth;
 * each is permission-guarded and scoped to the caller's organization from the token).
 * Organizations · Users · AI Agents · Machines · Roles · Assignments · Attributes.
 */
const crypto = require('crypto')
const express = require('express')
const router = express.Router()
const { pool } = require('../../db/pool')
const svc = require('../../services/identity.service')
const rbacSvc = require('../../services/rbac.service')
const authz = require('../../services/authz.service')
const life = require('../../services/lifecycle.service')
const secrets = require('../../services/secrets')
const repos = require('../../repositories')
const { publicSubject: sanitize } = require('../../services/auth.service')
const { asyncHandler, requireAuth, requirePermission } = require('./deps')

router.use(requireAuth)
const orgOf = (req) => req.identity.organizationId
const clientId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString('hex')}`

// ── Organizations ──
router.post('/organizations', requirePermission('org', 'create'), asyncHandler(async (req, res) => {
  const { name, slug } = req.body || {}
  res.status(201).json(await svc.createOrganization(pool, { name, slug, createdBy: req.identity.principalId }))
}))
router.get('/organizations/me', asyncHandler(async (req, res) => {
  res.json(await repos.organizations.findById(pool, orgOf(req)))
}))

// ── Users ──
router.post('/users', requirePermission('identity', 'create'), asyncHandler(async (req, res) => {
  const { email, fullName, password } = req.body || {}
  const passwordHash = password ? secrets.hash(password) : null
  const user = await svc.createUser(pool, { organizationId: orgOf(req), email, fullName, passwordHash, createdBy: req.identity.principalId })
  res.status(201).json(sanitize(user))
}))
router.get('/users', requirePermission('identity', 'read'), asyncHandler(async (req, res) => {
  res.json((await svc.listUsers(pool, orgOf(req))).map(sanitize))
}))
router.get('/users/:id', requirePermission('identity', 'read'), asyncHandler(async (req, res) => {
  res.json(sanitize(await svc.getUser(pool, orgOf(req), req.params.id)))
}))
router.post('/users/:id/transition', requirePermission('identity', 'manage'), asyncHandler(async (req, res) => {
  res.json(sanitize(await life.transitionIdentity(pool, { kind: 'user', id: req.params.id, orgId: orgOf(req), to: (req.body || {}).to })))
}))

// ── AI Agents ── (client secret returned ONCE)
router.post('/agents', requirePermission('agent', 'create'), asyncHandler(async (req, res) => {
  const { name, guardrailProfile, allowedTools } = req.body || {}
  const cid = clientId('agt')
  const secret = secrets.generateClientSecret()
  const agent = await svc.createAgent(pool, { organizationId: orgOf(req), name, clientId: cid, clientSecretHash: secrets.hash(secret), guardrailProfile, allowedTools, createdBy: req.identity.principalId })
  res.status(201).json({ ...sanitize(agent), clientId: cid, clientSecret: secret })
}))
router.get('/agents', requirePermission('identity', 'read'), asyncHandler(async (req, res) => {
  res.json((await repos.agents.list(pool, orgOf(req))).map(sanitize))
}))

// ── Machines ── (client secret returned ONCE)
router.post('/machines', requirePermission('machine', 'create'), asyncHandler(async (req, res) => {
  const { name } = req.body || {}
  const cid = clientId('mch')
  const secret = secrets.generateClientSecret()
  const machine = await svc.createMachine(pool, { organizationId: orgOf(req), name, clientId: cid, clientSecretHash: secrets.hash(secret), createdBy: req.identity.principalId })
  res.status(201).json({ ...sanitize(machine), clientId: cid, clientSecret: secret })
}))

// ── Roles & permissions ──
router.get('/roles', requirePermission('role', 'read'), asyncHandler(async (req, res) => {
  res.json(await repos.roles.listForOrg(pool, orgOf(req)))
}))
router.post('/roles', requirePermission('role', 'manage'), asyncHandler(async (req, res) => {
  const { name, description } = req.body || {}
  res.status(201).json(await rbacSvc.createRole(pool, { organizationId: orgOf(req), name, description, createdBy: req.identity.principalId }))
}))
router.post('/roles/:id/permissions', requirePermission('role', 'manage'), asyncHandler(async (req, res) => {
  const { resource, action } = req.body || {}
  res.json(await rbacSvc.grantPermission(pool, { organizationId: orgOf(req), roleId: req.params.id, resource, action }))
}))
router.delete('/roles/:id/permissions', requirePermission('role', 'manage'), asyncHandler(async (req, res) => {
  const { resource, action } = req.body || {}
  res.json(await rbacSvc.revokePermission(pool, { organizationId: orgOf(req), roleId: req.params.id, resource, action }))
}))

// ── Assignments ── (guarded: escalation prevented at the service layer)
router.post('/assignments', requirePermission('role', 'assign'), asyncHandler(async (req, res) => {
  const { principalId, roleId, roleName } = req.body || {}
  const result = await authz.assignRoleGuarded(pool, { actorPrincipalId: req.identity.principalId, organizationId: orgOf(req), targetPrincipalId: principalId, roleId, roleName })
  res.status(201).json(result || { ok: true })
}))
router.delete('/assignments', requirePermission('role', 'assign'), asyncHandler(async (req, res) => {
  const { principalId, roleId } = req.body || {}
  res.json({ removed: await rbacSvc.revokeRole(pool, { organizationId: orgOf(req), principalId, roleId }) })
}))

// ── Attributes (ABAC) ──
router.post('/attributes', requirePermission('attribute', 'create'), asyncHandler(async (req, res) => {
  const { principalId, namespace, key, value } = req.body || {}
  res.status(201).json(await svc.setAttribute(pool, { organizationId: orgOf(req), principalId, namespace, key, value, createdBy: req.identity.principalId }))
}))
router.get('/attributes', requirePermission('attribute', 'read'), asyncHandler(async (req, res) => {
  res.json(await repos.attributes.listForPrincipal(pool, req.query.principalId, orgOf(req)))
}))

module.exports = router
