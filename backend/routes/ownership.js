const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/ownership — all owners with their agents and concentration detection.
//
// `agents.owner_id` references `employees.id`, NOT `owners.id`. Both id spaces
// start at 1, so joining on the wrong one never errors — it silently returns a
// different, plausible person. `owners` is a 10-row subset of `employees`
// carrying role/backup/risk, linked through `owners.employee_id`.
//
// We key on the employee id and report every employee who owns at least one
// agent, not just the ones listed in `owners` — 7 of 15 agents are owned by
// employees who have no `owners` row, and keying on `owners` alone drops them.
router.get('/', async (req, res) => {
  try {
    const { data: owners, error: ownersErr } = await supabase
      .from('owners')
      .select('id, name, role, backup_owner, risk, employee_id')

    if (ownersErr) return res.status(500).json({ error: ownersErr.message })

    const { data: agents, error: agentsErr } = await supabase
      .from('agents')
      .select('id, name, status, risk, owner_id')

    if (agentsErr) return res.status(500).json({ error: agentsErr.message })

    const { data: employees, error: employeesErr } = await supabase
      .from('employees')
      .select('id, name, role')

    if (employeesErr) return res.status(500).json({ error: employeesErr.message })

    const agentList = agents || []
    const employeeById = new Map((employees || []).map((e) => [e.id, e]))
    const ownerByEmployee = new Map(
      (owners || []).filter((o) => o.employee_id != null).map((o) => [o.employee_id, o])
    )

    // Declared owners, plus anyone who owns an agent without being listed as one.
    const employeeIds = [
      ...new Set(
        [...ownerByEmployee.keys(), ...agentList.map((a) => a.owner_id)].filter((id) => id != null)
      ),
    ]

    const enriched = employeeIds.map((employeeId) => {
      const declared = ownerByEmployee.get(employeeId) || null
      const employee = employeeById.get(employeeId) || null
      const ownedAgents = agentList
        .filter((a) => a.owner_id === employeeId)
        .map((a) => ({ id: a.id, name: a.name, status: a.status, risk: a.risk }))
      const agentCount = ownedAgents.length
      return {
        id: declared ? declared.id : null,
        employeeId,
        name: (declared && declared.name) || (employee && employee.name) || null,
        role: (declared && declared.role) || (employee && employee.role) || null,
        backup_owner: declared ? declared.backup_owner : null,
        risk: declared ? declared.risk : null,
        // false = owns things but has no row in `owners`, so no backup is recorded
        declaredOwner: !!declared,
        agents: ownedAgents,
        agentCount,
        hasBackup: !!(declared && declared.backup_owner),
        concentrationRisk:
          agentCount >= 4 ? 'high' : agentCount >= 2 ? 'medium' : 'low',
      }
    })

    enriched.sort((a, b) => b.agentCount - a.agentCount || String(a.name).localeCompare(String(b.name)))

    // Only a person who actually owns something can be a continuity gap.
    const noBackup = enriched.filter((o) => !o.hasBackup && o.agentCount > 0)
    const overloaded = enriched.filter((o) => o.concentrationRisk === 'high')
    const undeclared = enriched.filter((o) => !o.declaredOwner && o.agentCount > 0)

    res.json({
      owners: enriched,
      gaps: {
        ownersWithoutBackup: noBackup.map((o) => ({
          name: o.name,
          role: o.role,
          agentCount: o.agentCount,
          declaredOwner: o.declaredOwner,
        })),
        overloadedOwners: overloaded.map((o) => ({
          name: o.name,
          role: o.role,
          agentCount: o.agentCount,
        })),
        // Own agents but have no `owners` row, so no backup is recorded for them.
        undeclaredOwners: undeclared.map((o) => ({
          name: o.name,
          role: o.role,
          agentCount: o.agentCount,
        })),
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
