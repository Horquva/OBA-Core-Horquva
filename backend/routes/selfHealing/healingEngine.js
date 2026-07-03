const supabase = require('../../supabase')
const { receiveIntent } = require('../orchestration/intentReceiver')

async function detectIssues() {
  const issues = []

  // Pull all data
  const { data: orchData, error: orchError } = await supabase
    .from('orchestration_state')
    .select('*')
  if (orchError) throw new Error(`Failed to fetch orchestration: ${orchError.message}`)

  const { data: verData, error: verError } = await supabase
    .from('verification_logs')
    .select('*')
  if (verError) throw new Error(`Failed to fetch verifications: ${verError.message}`)

  const { data: escData, error: escError } = await supabase
    .from('escalation_logs')
    .select('*')
    .eq('status', 'open')
  if (escError) throw new Error(`Failed to fetch escalations: ${escError.message}`)

  // Detect blocked workflows
  const blocked = orchData.filter(r => r.status === 'blocked')
  for (const wf of blocked) {
    issues.push({
      type: 'blocked_workflow',
      workflow_id: wf.workflow_id,
      detail: `Workflow '${wf.workflow_name}' is blocked at step ${wf.current_step} of ${wf.total_steps}`
    })
  }

  // Detect collisions
  const collisions = orchData.filter(r => r.collision_detected)
  for (const wf of collisions) {
    issues.push({
      type: 'collision_detected',
      workflow_id: wf.workflow_id,
      detail: wf.collision_detail || `Collision detected in workflow '${wf.workflow_name}'`
    })
  }

  // Detect single points of failure
  const actorCounts = {}
  for (const wf of orchData) {
    if (wf.next_actor_name) {
      actorCounts[wf.next_actor_name] = (actorCounts[wf.next_actor_name] || 0) + 1
    }
  }
  for (const [actor, count] of Object.entries(actorCounts)) {
    if (count >= 2) {
      issues.push({
        type: 'single_point_of_failure',
        workflow_id: null,
        detail: `Actor '${actor}' is assigned to ${count} workflows — risk of overload`
      })
    }
  }

  // Detect policy violations (deduplicated by workflow_id)
  const violations = verData.filter(r => !r.policy_compliant)
  const seenViolations = new Set()
  for (const v of violations) {
    if (seenViolations.has(v.workflow_id)) continue
    seenViolations.add(v.workflow_id)
    issues.push({
      type: 'policy_violation',
      workflow_id: v.workflow_id,
      detail: v.flag_reason || `Policy violation by ${v.actor_name} in workflow ${v.workflow_id}`
    })
  }

  // Detect unresolved critical escalations (deduplicated by workflow_id)
  const criticalEsc = escData.filter(r => r.severity === 'critical')
  const seenEscalations = new Set()
  for (const esc of criticalEsc) {
    if (seenEscalations.has(esc.workflow_id)) continue
    seenEscalations.add(esc.workflow_id)
    issues.push({
      type: 'unresolved_critical_escalation',
      workflow_id: esc.workflow_id,
      detail: esc.message
    })
  }

  return issues
}

function buildIntent(issue) {
  switch (issue.type) {
    case 'blocked_workflow':
      return {
        source_module: 'M51',
        intent_type: 'unblock_workflow',
        workflow_id: issue.workflow_id,
        action: `Unblock workflow ${issue.workflow_id}`,
        reasoning: issue.detail,
        payload: {}
      }
    case 'collision_detected':
      return {
        source_module: 'M51',
        intent_type: 'reassign_actor',
        workflow_id: issue.workflow_id,
        action: `Resolve collision in workflow ${issue.workflow_id}`,
        reasoning: issue.detail,
        payload: {}
      }
    case 'single_point_of_failure':
      return {
        source_module: 'M51',
        intent_type: 'reassign_actor',
        workflow_id: issue.workflow_id,
        action: `Redistribute workload for overloaded actor`,
        reasoning: issue.detail,
        payload: {}
      }
    case 'policy_violation':
      return {
        source_module: 'M51',
        intent_type: 'pause_workflow',
        workflow_id: issue.workflow_id,
        action: `Pause workflow ${issue.workflow_id} due to policy violation`,
        reasoning: issue.detail,
        payload: {}
      }
    case 'unresolved_critical_escalation':
      return {
        source_module: 'M51',
        intent_type: 'unblock_workflow',
        workflow_id: issue.workflow_id,
        action: `Address critical escalation in workflow ${issue.workflow_id}`,
        reasoning: issue.detail,
        payload: {}
      }
    default:
      return null
  }
}

async function runSelfHealing() {
  const issues = await detectIssues()

  if (issues.length === 0) {
    return {
      issues_found: 0,
      intents_emitted: 0,
      message: 'No issues detected. Organization is healthy.',
      results: []
    }
  }

  const results = []

  for (const issue of issues) {
    const intent = buildIntent(issue)
    if (!intent) continue

    const result = await receiveIntent(intent)
    results.push({
      issue,
      intent: result.intent,
      mode: result.mode,
      message: result.message
    })
  }

  return {
    issues_found: issues.length,
    intents_emitted: results.length,
    message: `M51 detected ${issues.length} issue(s) and emitted ${results.length} intent(s) to M16.`,
    results
  }
}

module.exports = { detectIssues, runSelfHealing }