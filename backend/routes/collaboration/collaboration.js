const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchAllScores() {
  const { data, error } = await supabase
    .from('collaboration_scores')
    .select(`
      id,
      employee_id,
      adoption_score,
      dependency_score,
      collaboration_score,
      ai_tools_used,
      ai_agents_used,
      critical_agents_owned,
      has_backup,
      computed_at,
      employees ( name, role, department, risk )
    `)

  if (error) throw new Error(error.message)
  return data
}

async function fetchSummary() {
  const { data, error } = await supabase
    .from('collaboration_summary')
    .select('*')
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()

  if (error) throw new Error(error.message)
  return data
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