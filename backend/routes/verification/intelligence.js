const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// High-risk / SPOF owners — pulled dynamically, not hardcoded
async function getHighRiskActorNames() {
  const { data: employees, error } = await supabase
    .from('employees')
    .select('name, risk')
    .in('risk', ['high', 'critical'])

  if (error) throw new Error(error.message)
  return employees.map(e => e.name)
}

// Attach violations to their parent action
function attachViolations(actions, violations) {
  return actions.map(action => ({
    ...action,
    violations: violations.filter(v => v.action_id === action.id)
  }))
}

// Determine if an action should be treated as flagged
function isFlagged(action, highRiskNames) {
  if (action.policy_compliant === false) return true
  if (action.verification_status === 'FLAGGED') return true
  if (highRiskNames.includes(action.actor_name)) return true
  return false
}

async function fetchActionsWithWorkflow() {
  const { data, error } = await supabase
    .from('verification_actions')
    .select(`
      id,
      workflow_id,
      actor_type,
      actor_name,
      action_name,
      outcome,
      verification_status,
      policy_compliant,
      created_at,
      workflows ( name, department )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

async function fetchAllViolations() {
  const { data, error } = await supabase
    .from('policy_violations')
    .select('id, action_id, violation_reason, severity, created_at')

  if (error) throw new Error(error.message)
  return data
}

// ─────────────────────────────────────────────
// GET /api/verification/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const actions = await fetchActionsWithWorkflow()
    const violations = await fetchAllViolations()
    const highRiskNames = await getHighRiskActorNames()

    const totalActions = actions.length
    const completedActions = actions.filter(a => a.verification_status === 'COMPLETED').length
    const failedActions = actions.filter(a => a.verification_status === 'FAILED').length
    const pendingActions = actions.filter(a => a.verification_status === 'PENDING').length
    const flaggedActions = actions.filter(a => isFlagged(a, highRiskNames)).length

    res.json({
      totalActions,
      completedActions,
      flaggedActions,
      failedActions,
      pendingActions,
      policyViolationsCount: violations.length
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/verification/actions
// ─────────────────────────────────────────────

router.get('/actions', async (req, res) => {
  try {
    const actions = await fetchActionsWithWorkflow()

    const formatted = actions.map(a => ({
      actorType: a.actor_type,
      actorName: a.actor_name,
      workflow: a.workflows?.name ?? null,
      actionName: a.action_name,
      outcome: a.outcome,
      verificationStatus: a.verification_status,
      policyCompliant: a.policy_compliant,
      createdAt: a.created_at
    }))

    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/verification/flagged
// ─────────────────────────────────────────────

router.get('/flagged', async (req, res) => {
  try {
    const actions = await fetchActionsWithWorkflow()
    const violations = await fetchAllViolations()
    const highRiskNames = await getHighRiskActorNames()

    const flaggedActions = actions.filter(a => isFlagged(a, highRiskNames))
    const withViolations = attachViolations(flaggedActions, violations)

    const formatted = withViolations.map(a => ({
      actorType: a.actor_type,
      actorName: a.actor_name,
      workflow: a.workflows?.name ?? null,
      actionName: a.action_name,
      outcome: a.outcome,
      verificationStatus: a.verification_status,
      policyCompliant: a.policy_compliant,
      createdAt: a.created_at,
      violations: a.violations.map(v => ({
        reason: v.violation_reason,
        severity: v.severity,
        createdAt: v.created_at
      }))
    }))

    res.json({
      totalFlagged: formatted.length,
      flaggedActions: formatted
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/verification/actor/:name
// ─────────────────────────────────────────────

router.get('/actor/:name', async (req, res) => {
  try {
    const { name } = req.params

    const { data: actorActions, error } = await supabase
      .from('verification_actions')
      .select(`
        id,
        workflow_id,
        actor_type,
        actor_name,
        action_name,
        outcome,
        verification_status,
        policy_compliant,
        created_at,
        workflows ( name, department )
      `)
      .ilike('actor_name', name)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    if (!actorActions.length) {
      return res.status(404).json({ error: 'No actions found for this actor' })
    }

    const violations = await fetchAllViolations()
    const highRiskNames = await getHighRiskActorNames()

    const withViolations = attachViolations(actorActions, violations)

    const flaggedActions = withViolations.filter(a => isFlagged(a, highRiskNames))
    const totalViolations = withViolations.reduce((sum, a) => sum + a.violations.length, 0)

    const verificationHistory = withViolations.map(a => ({
      actionName: a.action_name,
      workflow: a.workflows?.name ?? null,
      outcome: a.outcome,
      verificationStatus: a.verification_status,
      policyCompliant: a.policy_compliant,
      createdAt: a.created_at,
      violations: a.violations.map(v => ({
        reason: v.violation_reason,
        severity: v.severity,
        createdAt: v.created_at
      }))
    }))

    res.json({
      actorName: name,
      actionsPerformed: actorActions.length,
      flaggedActionsCount: flaggedActions.length,
      violationsCount: totalViolations,
      isHighRiskActor: highRiskNames.includes(actorActions[0].actor_name),
      verificationHistory
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router