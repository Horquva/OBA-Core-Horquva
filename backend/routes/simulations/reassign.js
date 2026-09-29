const express = require('express')
const router = express.Router()
const domain = require('../../domain')
const { requireRole } = require('../../middleware/requireRole')
const { recordAudit } = require('../../lib/audit')
const { isUuid } = require('../../lib/uuid')

// POST /api/simulations/reassign — the D-70 succession mechanic, over REST
// (Phase 1.6). Wraps domain/simulations.js's employeeLeavesWithSuccessor():
// clones the roots bundle, transfers the departing employee's agents and
// runbook ownerships to a named successor, clears their own backup slot and
// stale backups pointing at them, then re-runs the Engine A/B pipeline and
// pillars() on the mutated bundle.
//
// Nothing persists — this is a sandboxed what-if (same contract as the other
// simulation routes). It is still role-gated beyond requireAuth: it exposes
// the org's full ownership topology and concentration posture, and choosing
// a successor is a leadership action. Role vocabulary is app_users.role
// (member | admin | executive); members keep the read-only simulation views,
// admin/executive can run successions. Every invocation lands in audit_log.
//
// Body: { employeeId, successorId, employeeName?, successorName? } — pass
// uuids (preferred) or names; names are resolved against the current roots
// bundle, uuids are validated as uuids. Response carries the leave-only
// comparison (comparedToNoSuccessor) so the UI can show the delta the
// succession buys.
router.post('/', requireRole('admin', 'executive'), async (req, res) => {
  try {
    const body = req.body ?? {}
    const roots = await domain.simulations.loadRoots()

    const byIdOrName = (id, name) => {
      if (id != null) {
        if (!isUuid(id)) return null
        return roots.employees.find((e) => e.id === id) || null
      }
      if (typeof name === 'string' && name.length) {
        return roots.employees.find((e) => e.name.toLowerCase() === name.toLowerCase()) || null
      }
      return null
    }

    const employee = byIdOrName(body.employeeId, body.employeeName)
    const successor = byIdOrName(body.successorId, body.successorName)
    if (!employee) return res.status(404).json({ error: 'Employee not found' })
    if (!successor) return res.status(404).json({ error: 'Successor not found' })
    if (employee.id === successor.id) {
      return res.status(400).json({ error: 'Successor must be a different employee than the departing one' })
    }

    const result = domain.simulations.employeeLeavesWithSuccessor(employee.id, successor.id, roots)
    if (!result) return res.status(404).json({ error: 'Employee not found' })

    await recordAudit(req, {
      action: 'simulation.reassign',
      outcome: 'success',
      targetType: 'employee',
      targetId: employee.id,
      changes: { successor: { from: null, to: successor.id } },
    })

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
