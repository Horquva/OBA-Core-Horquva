const express = require('express')
const router = express.Router()
const domain = require('../../domain')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// `collaboration_scores` and `collaboration_summary` were both seeded once by
// SQL and written by nothing afterwards. Adoption could not rise when somebody
// started using a tool, and dependency could not fall when a backup owner was
// finally named — the two things this page exists to show were the two things
// it could not see.
//
// Both now come from one live computation. The row shape below is deliberately
// kept identical to the old SELECT (snake_case, nested `employees`) so the
// scoring and weak-area logic further down this file stays untouched; the only
// thing that changed is where the numbers come from.

async function fetchAllScores() {
  const intel = await domain.intelligence.all()
  return intel.collaboration.perEmployee.map(e => ({
    employee_id:           e.employeeId,
    adoption_score:        e.adoptionScore,
    dependency_score:      e.dependencyScore,
    collaboration_score:   e.collaborationScore,
    ai_tools_used:         e.aiToolsUsed,
    ai_agents_used:        e.aiAgentsUsed,
    critical_agents_owned: e.criticalAgentsOwned,
    has_backup:            e.hasBackup,
    computed_at:           intel.collaboration.computedAt,
    employees: { name: e.name, department: e.department, role: null, risk: null },
  }))
}

async function fetchSummary() {
  const intel = await domain.intelligence.all()
  const s = intel.collaboration.summary
  return {
    ai_adoption_score:           s.aiAdoptionScore,
    adoption_level:              s.adoptionLevel,
    human_dependency_score:      s.humanDependencyScore,
    highest_dependency_employee: s.highestDependencyEmployee,
    collaboration_score:         s.collaborationScore,
    collaboration_level:         s.collaborationLevel,
    computed_at:                 intel.collaboration.computedAt,
    source:                      intel.collaboration.source,
  }
}

function collaborationLevelLabel(score) {
  if (score >= 80) return 'EXCELLENT'
  if (score >= 60) return 'GOOD'
  if (score >= 40) return 'FAIR'
  return 'POOR'
}

function buildWeakAreas(scores) {
  const weak = []

  const undocumented = scores.filter(s => s.critical_agents_owned > 0 && !s.has_backup).length
  if (undocumented > 0) weak.push(`${undocumented} employees own critical agents without backup coverage`)

  const noBackup = scores.filter(s => !s.has_backup).length
  if (noBackup > 0) weak.push(`${noBackup} employees have no backup owner assigned`)

  const highDependency = scores.filter(s => s.dependency_score >= 50).length
  if (highDependency > 0) weak.push(`${highDependency} employees carry above-average dependency risk`)

  return weak
}

// ─────────────────────────────────────────────
// GET /api/collaboration/adoption
// ─────────────────────────────────────────────

router.get('/adoption', async (req, res) => {
  try {
    const scores = await fetchAllScores()
    const summary = await fetchSummary()

    const departmentAdoption = {}
    scores.forEach(s => {
      const dept = s.employees?.department ?? 'Unknown'
      if (!departmentAdoption[dept]) {
        departmentAdoption[dept] = { totalEmployees: 0, totalAdoptionScore: 0 }
      }
      departmentAdoption[dept].totalEmployees += 1
      departmentAdoption[dept].totalAdoptionScore += s.adoption_score
    })

    const departmentBreakdown = Object.entries(departmentAdoption).map(([dept, d]) => ({
      department: dept,
      avgAdoptionScore: Math.round(d.totalAdoptionScore / d.totalEmployees),
      employeeCount: d.totalEmployees
    }))

    res.json({
      aiAdoptionScore: summary.ai_adoption_score,
      adoptionLevel: summary.adoption_level,
      totalEmployees: scores.length,
      employeesUsingAITools: scores.filter(s => s.ai_tools_used > 0).length,
      employeesUsingAIAgents: scores.filter(s => s.ai_agents_used > 0).length,
      departmentBreakdown
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/collaboration/dependency
// ─────────────────────────────────────────────

router.get('/dependency', async (req, res) => {
  try {
    const scores = await fetchAllScores()
    const summary = await fetchSummary()

    const sorted = [...scores].sort((a, b) => b.dependency_score - a.dependency_score)

    const departmentDependency = {}
    scores.forEach(s => {
      const dept = s.employees?.department ?? 'Unknown'
      if (!departmentDependency[dept]) {
        departmentDependency[dept] = { total: 0, count: 0 }
      }
      departmentDependency[dept].total += s.dependency_score
      departmentDependency[dept].count += 1
    })

    const departmentBreakdown = Object.entries(departmentDependency).map(([dept, d]) => ({
      department: dept,
      avgDependencyScore: Math.round(d.total / d.count)
    }))

    res.json({
      humanDependencyScore: summary.human_dependency_score,
      highestDependencyEmployee: summary.highest_dependency_employee,
      topDependencyIndividuals: sorted.slice(0, 5).map(s => ({
        name: s.employees?.name,
        department: s.employees?.department,
        dependencyScore: s.dependency_score,
        criticalAgentsOwned: s.critical_agents_owned,
        hasBackup: s.has_backup
      })),
      departmentBreakdown
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/collaboration/score
// ─────────────────────────────────────────────

router.get('/score', async (req, res) => {
  try {
    const summary = await fetchSummary()
    const scores = await fetchAllScores()

    const weakAreas = buildWeakAreas(scores)

    res.json({
      collaborationScore: summary.collaboration_score,
      collaborationLevel: summary.collaboration_level,
      aiAdoptionScore: summary.ai_adoption_score,
      humanDependencyScore: summary.human_dependency_score,
      weakestCollaborationAreas: weakAreas,
      computedAt: summary.computed_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/collaboration/people
// ─────────────────────────────────────────────

router.get('/people', async (req, res) => {
  try {
    const scores = await fetchAllScores()

    const formatted = scores
      .sort((a, b) => b.dependency_score - a.dependency_score)
      .map(s => ({
        name: s.employees?.name,
        role: s.employees?.role,
        department: s.employees?.department,
        adoptionScore: s.adoption_score,
        dependencyScore: s.dependency_score,
        collaborationScore: s.collaboration_score,
        collaborationLevel: collaborationLevelLabel(s.collaboration_score),
        aiToolsUsed: s.ai_tools_used,
        aiAgentsUsed: s.ai_agents_used,
        criticalAgentsOwned: s.critical_agents_owned,
        hasBackup: s.has_backup
      }))

    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/collaboration/departments
// ─────────────────────────────────────────────

router.get('/departments', async (req, res) => {
  try {
    const scores = await fetchAllScores()

    const departments = {}
    scores.forEach(s => {
      const dept = s.employees?.department ?? 'Unknown'
      if (!departments[dept]) {
        departments[dept] = {
          employeeCount: 0,
          totalAdoption: 0,
          totalDependency: 0,
          totalCollaboration: 0,
          criticalAgentsOwned: 0,
          noBackupCount: 0
        }
      }
      const d = departments[dept]
      d.employeeCount += 1
      d.totalAdoption += s.adoption_score
      d.totalDependency += s.dependency_score
      d.totalCollaboration += s.collaboration_score
      d.criticalAgentsOwned += s.critical_agents_owned
      if (!s.has_backup) d.noBackupCount += 1
    })

    const formatted = Object.entries(departments).map(([dept, d]) => ({
      department: dept,
      employeeCount: d.employeeCount,
      avgAdoptionScore: Math.round(d.totalAdoption / d.employeeCount),
      avgDependencyScore: Math.round(d.totalDependency / d.employeeCount),
      avgCollaborationScore: Math.round(d.totalCollaboration / d.employeeCount),
      criticalAgentsOwned: d.criticalAgentsOwned,
      employeesWithoutBackup: d.noBackupCount
    }))

    const lowestAdoption = [...formatted].sort((a, b) => a.avgAdoptionScore - b.avgAdoptionScore)[0]

    res.json({
      departments: formatted,
      lowestAdoptionDepartment: lowestAdoption?.department ?? null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router