const express = require('express')
const router = express.Router()
const { requireRole } = require('../../middleware/requireRole')
const { recordAudit } = require('../../lib/audit')
const { isUuid } = require('../../lib/uuid')
const { MutationError } = require('../../domain/mutations')
const domain = require('../../domain')

// Phase 4.2 — structural CRUD for workflows, dependencies, platforms and
// employees. Every write flows through domain/mutations.applyMutation(): the
// change log, impact computation, idempotent retries and cache invalidation
// are the mutation layer's contract, not these routes' concern. This file is
// a thin REST skin: validate the shape, pass an Idempotency-Key through,
// gate the role, audit.
//
// RBAC: structural writes are leadership/operator actions. The app's role
// vocabulary (app_users.role) is member | admin | executive — members keep
// read-only surfaces.
const WRITE = requireRole('admin', 'executive')

const IDMP = (req) => req.get('Idempotency-Key') || null
const actorOf = (req) => (req.user ? String(req.user.sub ?? req.user.id ?? '') : null)

async function run(req, res, spec) {
  try {
    const result = await domain.mutations.applyMutation({
      ...spec,
      actorId: actorOf(req),
      idempotencyKey: IDMP(req),
    })
    await recordAudit(req, {
      action: `crud.${spec.mutationType.toLowerCase()}`,
      outcome: 'success',
      targetType: spec.targetType,
      targetId: spec.targetId ?? null,
    })
    res.status(result.replayed ? 200 : 201).json({
      ok: true,
      replayed: result.replayed,
      changeId: result.change?.id ?? null,
      impact: {
        blastRadiusScore: result.impact?.blastRadiusScore ?? null,
        healthDelta: result.impact?.healthDelta ?? null,
        mitigation: result.impact?.mitigation ?? null,
      },
    })
  } catch (err) {
    const status = err instanceof MutationError ? err.status : 500
    await recordAudit(req, {
      action: `crud.${spec.mutationType.toLowerCase()}`,
      outcome: status < 500 ? 'failure' : 'failure',
      reason: status < 500 ? 'validation' : 'server_error',
      targetType: spec.targetType,
      targetId: spec.targetId ?? null,
    })
    res.status(status).json({ error: err.message })
  }
}

// ── Workflows ────────────────────────────────────────────────────────────────
router.post('/workflows', WRITE, (req, res) => {
  const { name, status = 'active', risk = 'low', department = null, frequency = null } = req.body ?? {}
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' })
  return run(req, res, {
    mutationType: 'ENTITY_CREATED',
    targetType: 'workflow',
    targetId: null,
    payload: { row: { name, status, risk, department, frequency } },
  })
})

router.put('/workflows/:id', WRITE, (req, res) => {
  const id = req.params.id
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid workflow id' })
  const { name, status, risk, department, frequency } = req.body ?? {}
  const patch = {}
  if (name !== undefined) patch.name = name
  if (status !== undefined) patch.status = status
  if (risk !== undefined) patch.risk = risk
  if (department !== undefined) patch.department = department
  if (frequency !== undefined) patch.frequency = frequency
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'No updatable fields in body' })
  return run(req, res, { mutationType: 'ENTITY_UPDATED', targetType: 'workflow', targetId: id, payload: { patch } })
})

router.delete('/workflows/:id', WRITE, (req, res) => {
  const id = req.params.id
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid workflow id' })
  return run(req, res, { mutationType: 'ENTITY_DELETED', targetType: 'workflow', targetId: id, payload: {} })
})

// ── Dependencies (edges) ─────────────────────────────────────────────────────
router.post('/dependencies', WRITE, (req, res) => {
  const { sourceType, sourceId, targetType, targetId, dependencyType = 'normal', strength = null } = req.body ?? {}
  if (!sourceType || !sourceId || !targetType || !targetId) {
    return res.status(400).json({ error: 'sourceType, sourceId, targetType and targetId are required' })
  }
  if (!isUuid(sourceId) || !isUuid(targetId)) {
    return res.status(400).json({ error: 'sourceId and targetId must be uuids' })
  }
  return run(req, res, {
    mutationType: 'DEPENDENCY_ADDED',
    targetType: targetType,
    targetId: targetId,
    payload: { edge: { sourceType, sourceId, targetType, targetId, dependencyType, strength } },
  })
})

router.delete('/dependencies/:id', WRITE, (req, res) => {
  const id = req.params.id
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid dependency id' })
  return run(req, res, { mutationType: 'DEPENDENCY_BROKEN', targetType: 'workflow', targetId: null, payload: { edgeId: id } })
})

// ── Platforms (tools/models) ────────────────────────────────────────────────
router.post('/platforms', WRITE, (req, res) => {
  const { name, type = null, status = 'active', costMonthly = null } = req.body ?? {}
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' })
  return run(req, res, {
    mutationType: 'ENTITY_CREATED',
    targetType: 'platform',
    targetId: null,
    payload: { row: { name, type, status, cost_monthly: costMonthly } },
  })
})

router.put('/platforms/:id', WRITE, (req, res) => {
  const id = req.params.id
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid platform id' })
  const { name, type, status, costMonthly } = req.body ?? {}
  const patch = {}
  if (name !== undefined) patch.name = name
  if (type !== undefined) patch.type = type
  if (status !== undefined) patch.status = status
  if (costMonthly !== undefined) patch.cost_monthly = costMonthly
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'No updatable fields in body' })
  return run(req, res, { mutationType: 'ENTITY_UPDATED', targetType: 'platform', targetId: id, payload: { patch } })
})

router.delete('/platforms/:id', WRITE, (req, res) => {
  const id = req.params.id
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid platform id' })
  return run(req, res, { mutationType: 'ENTITY_DELETED', targetType: 'platform', targetId: id, payload: {} })
})

// ── Employees (minimal: create + update; no delete — departures are
//    simulated/soft, see simulations.js) ─────────────────────────────────────
router.post('/employees', WRITE, (req, res) => {
  const { name, role = null, department = null } = req.body ?? {}
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' })
  return run(req, res, {
    mutationType: 'EMPLOYEE_CREATED',
    targetType: 'employee',
    targetId: null,
    payload: { row: { name, role, department } },
  })
})

router.put('/employees/:id', WRITE, (req, res) => {
  const id = req.params.id
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid employee id' })
  const { name, role, department } = req.body ?? {}
  const patch = {}
  if (name !== undefined) patch.name = name
  if (role !== undefined) patch.role = role
  if (department !== undefined) patch.department = department
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'No updatable fields in body' })
  return run(req, res, { mutationType: 'EMPLOYEE_UPDATED', targetType: 'employee', targetId: id, payload: { patch } })
})

module.exports = router
