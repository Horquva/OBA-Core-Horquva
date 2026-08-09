/*
 * /api/v1/authz — authorization surface.
 *   POST /check        evaluate access (self by default; another principal needs policy:evaluate)
 *   GET  /permissions  caller's effective permissions
 */
const express = require('express')
const router = express.Router()
const { pool } = require('../../db/pool')
const authz = require('../../services/authz.service')
const { asyncHandler, requireAuth } = require('./deps')

router.use(requireAuth)

router.post('/check', asyncHandler(async (req, res) => {
  const { resource, action, context, principalId } = req.body || {}
  const organizationId = req.identity.organizationId
  let target = req.identity.principalId

  if (principalId && principalId !== req.identity.principalId) {
    const gate = await authz.authorize(pool, { organizationId, principalId: req.identity.principalId, resource: 'policy', action: 'evaluate' })
    if (gate.decision !== 'allow') return res.status(403).json({ error: 'forbidden', message: 'not permitted to evaluate other principals' })
    target = principalId
  }

  res.json(await authz.authorize(pool, { organizationId, principalId: target, resource, action, context }))
}))

router.get('/permissions', asyncHandler(async (req, res) => {
  res.json({ permissions: await authz.effectivePermissions(pool, req.identity.organizationId, req.identity.principalId) })
}))

module.exports = router
