const supabase = require('../../supabase')
const { receiveIntent } = require('../orchestration/intentReceiver')

async function detectContinuityRisks() {
  const risks = []

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

  // Risk 1: Stalled workflows (blocked with no resolution)
  const stalled = orchData.filter(r => r.status === 'blocked')
  const seenStalled = new Set()
  for (const wf of stalled) {
    if (seenStalled.has(wf.workflow_id)) continue
    seenStalled.add(wf.workflow_id)
    risks.push({
      type: 'stalled_workflow',
      severity: 'high',
      workflow_id: wf.workflow_id,
      detail: `Workflow '${wf.workflow_name}' is stalled at step ${wf.current_step} of ${wf.total_steps}`,
      continuity_action: 'resume_or_reassign'
    })
  }

  // Risk 2: Single points of failure (actors assigned to multiple workflows)
  const actorWorkflows = {}
  for (const wf of orchData) {
    if (wf.next_actor_name) {
      if (!actorWorkflows[wf.next_actor_name]) {
        actorWorkflows[wf.next_actor_name] = []
      }
      actorWorkflows[wf.next_actor_name].push(wf.workflow_id)
    }
  }
  for (const [actor, workflowIds] of Object.entries(actorWorkflows)) {
    if (workflowIds.length >= 2) {
      risks.push({
        type: 'single_point_of_failure',
        severity: 'critical',
        workflow_id: null,
        detail: `Actor '${actor}' is the sole owner of ${workflowIds.length} workflows (${workflowIds.join(', ')}). If unavailable, all workflows stop.`,
        continuity_action: 'assign_backup_owner'
      })
    }
  }

  // Risk 3: Workflows with no next actor assigned
  const noActor = orchData.filter(r => !r.next_actor_name && r.status !== 'completed')
  const seenNoActor = new Set()
  for (const wf of noActor) {
    if (seenNoActor.has(wf.workflow_id)) continue
    seenNoActor.add(wf.workflow_id)
    risks.push({
      type: 'no_actor_assigned',
      severity: 'high',
      workflow_id: wf.workflow_id,
      detail: `Workflow '${wf.workflow_name}' has no actor assigned for next step — cannot proceed`,
      continuity_action: 'assign_actor'
    })
  }

  // Risk 4: Unresolved critical escalations blocking continuity
  const seenEsc = new Set()
  for (const esc of escData.filter(r => r.severity === 'critical')) {
    if (seenEsc.has(esc.workflow_id)) continue
    seenEsc.add(esc.workflow_id)
    risks.push({
      type: 'unresolved_escalation_blocking_continuity',
      severity: 'critical',
      workflow_id: esc.workflow_id,
      detail: `Unresolved critical escalation is blocking continuity for workflow ${esc.workflow_id}`,
      continuity_action: 'resolve_escalation'
    })
  }

  // Risk 5: Paused workflows with no resume plan
  const paused = orchData.filter(r => r.status === 'paused')
  const seenPaused = new Set()
  for (const wf of paused) {
    if (seenPaused.has(wf.workflow_id)) continue
    seenPaused.add(wf.workflow_id)
    risks.push({
      type: 'paused_workflow_no_plan',
      severity: 'medium',
      workflow_id: wf.workflow_id,
      detail: `Workflow '${wf.workflow_name}' is paused with no resume plan in place`,
      continuity_action: 'resume_workflow'
    })
  }

  return risks
}

function buildContinuityIntent(risk) {
  switch (risk.type) {
    case 'stalled_workflow':
      return {
        source_module: 'M53',
        intent_type: 'unblock_workflow',
        workflow_id: risk.workflow_id,
        action: `Unblock stalled workflow ${risk.workflow_id} to restore continuity`,
        reasoning: risk.detail,
        payload: { continuity_action: risk.continuity_action }
      }
    case 'single_point_of_failure':
      return {
        source_module: 'M53',
        intent_type: 'reassign_actor',
        workflow_id: risk.workflow_id,
        action: `Assign backup owner to eliminate single point of failure`,
        reasoning: risk.detail,
        payload: { continuity_action: risk.continuity_action }
      }
    case 'no_actor_assigned':
      return {
        source_module: 'M53',
        intent_type: 'reassign_actor',
        workflow_id: risk.workflow_id,
        action: `Assign actor to workflow ${risk.workflow_id} to restore continuity`,
        reasoning: risk.detail,
        payload: { continuity_action: risk.continuity_action }
      }
    case 'unresolved_escalation_blocking_continuity':
      return {
        source_module: 'M53',
        intent_type: 'unblock_workflow',
        workflow_id: risk.workflow_id,
        action: `Resolve escalation blocking continuity for workflow ${risk.workflow_id}`,
        reasoning: risk.detail,
        payload: { continuity_action: risk.continuity_action }
      }
    case 'paused_workflow_no_plan':
      return {
        source_module: 'M53',
        intent_type: 'resume_workflow',
        workflow_id: risk.workflow_id,
        action: `Resume paused workflow ${risk.workflow_id}`,
        reasoning: risk.detail,
        payload: { continuity_action: risk.continuity_action }
      }
    default:
      return null
  }
}

async function generateContinuityPlan() {
  const risks = await detectContinuityRisks()

  if (risks.length === 0) {
    return {
      risks_found: 0,
      intents_emitted: 0,
      continuity_status: 'STABLE',
      message: 'No continuity risks detected. Organization is running stably.',
      results: []
    }
  }

  const results = []

  for (const risk of risks) {
    const intent = buildContinuityIntent(risk)
    if (!intent) continue

    const result = await receiveIntent(intent)
    results.push({
      risk,
      intent: result.intent,
      mode: result.mode,
      message: result.message
    })
  }

  return {
    risks_found: risks.length,
    intents_emitted: results.length,
    continuity_status: risks.some(r => r.severity === 'critical') ? 'CRITICAL' : 'AT_RISK',
    message: `M53 detected ${risks.length} continuity risk(s) and emitted ${results.length} intent(s) to M16.`,
    results
  }
}

async function getContinuityStatus() {
  const risks = await detectContinuityRisks()

  const by_severity = {
    critical: risks.filter(r => r.severity === 'critical').length,
    high: risks.filter(r => r.severity === 'high').length,
    medium: risks.filter(r => r.severity === 'medium').length,
    low: risks.filter(r => r.severity === 'low').length
  }

  const by_type = {}
  for (const r of risks) {
    by_type[r.type] = (by_type[r.type] || 0) + 1
  }

  const status = risks.length === 0 ? 'STABLE'
    : risks.some(r => r.severity === 'critical') ? 'CRITICAL'
    : 'AT_RISK'

  return {
    generated_at: new Date().toISOString(),
    continuity_status: status,
    total_risks: risks.length,
    by_severity,
    by_type,
    summary: risks.length === 0
      ? 'Organization continuity is stable. No risks detected.'
      : `Continuity is ${status}. ${risks.length} risk(s) require attention.`,
    risks
  }
}

module.exports = { detectContinuityRisks, generateContinuityPlan, getContinuityStatus }