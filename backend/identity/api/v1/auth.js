/*
 * /api/v1/auth — authentication surface.
 *   POST /login            password login → authenticated (tokens) | mfa_required
 *   POST /mfa/verify       complete an MFA challenge → tokens
 *   POST /token            OAuth2 client-credentials grant (machine/agent)
 *   POST /refresh          rotate refresh → new tokens
 *   POST /logout           revoke the current session          (auth)
 *   GET  /me               caller identity + permissions       (auth)
 *   POST /mfa/enroll[/confirm], /mfa/disable  MFA self-service (auth)
 */
const express = require('express')
const router = express.Router()
const { pool } = require('../../db/pool')
const login = require('../../services/login.service')
const session = require('../../services/session.service')
const mfa = require('../../services/mfa.service')
const authz = require('../../services/authz.service')
const repos = require('../../repositories')
const { asyncHandler, requireAuth } = require('./deps')

const ctx = (req) => ({ ip: req.ip, userAgent: req.headers['user-agent'] })

async function resolveOrg(body) {
  if (body.organizationId) return body.organizationId
  if (body.orgSlug) {
    const o = await repos.organizations.findBySlug(pool, body.orgSlug)
    return o ? o.id : null
  }
  return null
}

router.post('/login', asyncHandler(async (req, res) => {
  const body = req.body || {}
  const organizationId = await resolveOrg(body)
  if (!organizationId) return res.status(400).json({ error: 'validation_error', message: 'organizationId or orgSlug is required' })
  const result = await login.login(pool, { organizationId, email: body.email, password: body.password, context: ctx(req) })
  res.json(result)
}))

router.post('/mfa/verify', asyncHandler(async (req, res) => {
  const { organizationId, challengeId, code } = req.body || {}
  res.json(await login.completeMfa(pool, { organizationId, challengeId, code, context: ctx(req) }))
}))

router.post('/token', asyncHandler(async (req, res) => {
  const { clientId, clientSecret } = req.body || {}
  res.json(await login.clientCredentialsGrant(pool, { clientId, clientSecret, context: ctx(req) }))
}))

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {}
  res.json(await session.refresh(pool, { refreshToken, ...ctx(req) }))
}))

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await session.logout(pool, { sessionId: req.identity.sessionId, organizationId: req.identity.organizationId })
  res.json({ ok: true })
}))

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { organizationId, principalId, kind } = req.identity
  const permissions = await authz.effectivePermissions(pool, organizationId, principalId)
  res.json({ principalId, organizationId, kind, permissions })
}))

// ── MFA self-service (user identities) ──
async function callerUser(req) {
  return repos.users.findByPrincipalId(pool, req.identity.principalId, req.identity.organizationId)
}

router.post('/mfa/enroll', requireAuth, asyncHandler(async (req, res) => {
  if (req.identity.kind !== 'user') return res.status(400).json({ error: 'validation_error', message: 'MFA applies to user identities' })
  const user = await callerUser(req)
  res.json(await mfa.beginEnrollment(pool, { organizationId: req.identity.organizationId, userId: user.id }))
}))

router.post('/mfa/enroll/confirm', requireAuth, asyncHandler(async (req, res) => {
  const user = await callerUser(req)
  res.json(await mfa.confirmEnrollment(pool, { organizationId: req.identity.organizationId, userId: user.id, code: (req.body || {}).code }))
}))

router.post('/mfa/disable', requireAuth, asyncHandler(async (req, res) => {
  const user = await callerUser(req)
  await mfa.disable(pool, { organizationId: req.identity.organizationId, userId: user.id })
  res.json({ ok: true })
}))

module.exports = router
