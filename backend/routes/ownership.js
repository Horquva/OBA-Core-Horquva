const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { loadOwners } = require('../lib/ownerBackups')
const domain = require('../domain')

// A "human SPOF": one person carrying so much unbacked ownership that their
// own absence is a single point of failure, distinct from an individual
// agent's SPOF status. Previously computed independently (and, by
// coincidence of backup_owner being owner-level not per-agent -- see
// loadEnrichedAgents()'s comment in agents.js -- mathematically identically)
// in three frontend components: OwnershipOverview.tsx, OwnershipList.tsx,
// DependencyPipeline.tsx. One canonical threshold now.
const HUMAN_SPOF_MIN_AGENTS = 3

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
    const [ownerByEmployee, agentsRes, employeesRes, intel] = await Promise.all([
      // Same owners row loadOwnerBackupByEmployee() narrows for its own
      // callers -- one query behind lib/ownerBackups.js, not a second
      // hand-rolled copy.
      loadOwners(),
      supabase.from('agents').select('id, name, status, risk, owner_id'),
      supabase.from('employees').select('id, name, role'),
      domain.intelligence.all(),
    ])

    if (agentsRes.error) return res.status(500).json({ error: agentsRes.error.message })
    if (employeesRes.error) return res.status(500).json({ error: employeesRes.error.message })

    const agentList = agentsRes.data || []
    const employeeById = new Map((employeesRes.data || []).map((e) => [e.id, e]))
    // Per-person aggregate exposure across everything they own (agents,
    // workflows, tools) -- see derived.js's humanDependencyRisk() for why
    // this replaced two independently-invented frontend scoring schemes.
    const dependencyRiskByEmployee = new Map(
      intel.humanDependencyRisk.map((p) => [p.employeeId, p])
    )

    // Declared owners, plus anyone who owns an agent without being listed as one.
    const employeeIds = [
      ...new Set(
        [...Object.keys(ownerByEmployee).map(Number), ...agentList.map((a) => a.owner_id)].filter((id) => id != null)
      ),
    ]

    const enriched = employeeIds.map((employeeId) => {
      const declared = ownerByEmployee[employeeId] || null
      const employee = employeeById.get(employeeId) || null
      const ownedAgents = agentList
        .filter((a) => a.owner_id === employeeId)
        .map((a) => ({ id: a.id, name: a.name, status: a.status, risk: a.risk }))
      const agentCount = ownedAgents.length
      const hasBackup = !!(declared && declared.backup_owner)
      const dependencyRisk = dependencyRiskByEmployee.get(employeeId) || null
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
        hasBackup,
        concentrationRisk:
          agentCount >= 4 ? 'high' : agentCount >= 2 ? 'medium' : 'low',
        isHumanSpof: !hasBackup && agentCount >= HUMAN_SPOF_MIN_AGENTS,
        dependencyRiskScore: dependencyRisk ? dependencyRisk.totalRiskScore : null,
        dependencyRiskTier: dependencyRisk ? dependencyRisk.tier : null,
        ownedWorkflowCount: dependencyRisk ? dependencyRisk.ownedWorkflowCount : 0,
        criticalWorkflowCount: dependencyRisk ? dependencyRisk.criticalWorkflowCount : 0,
        ownedToolCount: dependencyRisk ? dependencyRisk.ownedToolCount : 0,
        unbackedToolCount: dependencyRisk ? dependencyRisk.unbackedToolCount : 0,
      }
    })

    enriched.sort((a, b) => b.agentCount - a.agentCount || String(a.name).localeCompare(String(b.name)))

    // Only a person who actually owns something can be a continuity gap.
    const noBackup = enriched.filter((o) => !o.hasBackup && o.agentCount > 0)
    const overloaded = enriched.filter((o) => o.concentrationRisk === 'high')
    const undeclared = enriched.filter((o) => !o.declaredOwner && o.agentCount > 0)
    const humanSpofs = enriched.filter((o) => o.isHumanSpof)

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
        humanSpofs: humanSpofs.map((o) => ({
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
