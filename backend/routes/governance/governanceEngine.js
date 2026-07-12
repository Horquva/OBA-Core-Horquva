const supabase = require('../../supabase')
const { receiveIntent } = require('../orchestration/intentReceiver')

async function detectViolations() {
  const violations = []

  const { data: verData, error: verError } = await supabase
    .from('verification_logs')
    .select('*')
  if (verError) throw new Error(`Failed to fetch verifications: ${verError.message}`)

  const { data: orchData, error: orchError } = await supabase
    .from('orchestration_state')
    .select('*')
  if (orchError) throw new Error(`Failed to fetch orchestration: ${orchError.message}`)

  const { data: escData, error: escError } = await supabase
    .from('escalation_logs')
    .select('*')
    .eq('status', 'open')
  if (escError) throw new Error(`Failed to fetch escalations: ${escError.message}`)

  // Rule 1: Unverified actions should not exist
  const unverified = verData.filter(r => !r.verified)
  const seenUnverified = new Set()
  for (const v of unverified) {
    if (seenUnverified.has(v.workflow_id)) continue
    seenUnverified.add(v.workflow_id)
    violations.push({
      rule: 'no_unverified_actions',
      severity: 'high',
      workflow_id: v.workflow_id,
      detail: `Unverified action detected by ${v.actor_name} in workflow ${v.workflow_id}`
    })
  }

  // Rule 2: Policy non-compliant actions must be flagged
  const nonCompliant = verData.filter(r => !r.policy_compliant && r.status !== 'flagged')
  const seenNonCompliant = new Set()
  for (const v of nonCompliant) {
    if (seenNonCompliant.has(v.workflow_id)) continue
    seenNonCompliant.add(v.workflow_id)
    violations.push({
      rule: 'policy_compliance_required',
      severity: 'critical',
      workflow_id: v.workflow_id,
      detail: `Policy non-compliant action not flagged in workflow ${v.workflow_id}`
    })
  }

  // Rule 3: Blocked workflows must not have running steps
  const blocked = orchData.filter(r => r.status === 'blocked' && r.current_step > 1)
  for (const wf of blocked) {
    violations.push({
      rule: 'no_progress_on_blocked_workflow',
      severity: 'high',
      workflow_id: wf.workflow_id,
      detail: `Blocked workflow '${wf.workflow_name}' has progressed to step ${wf.current_step}`
    })
  }

  // Rule 4: Open critical escalations must be resolved within policy
  const seenEsc = new Set()
  for (const esc of escData.filter(r => r.severity === 'critical')) {
    if (seenEsc.has(esc.workflow_id)) continue
    seenEsc.add(esc.workflow_id)
    violations.push({
      rule: 'critical_escalation_unresolved',
      severity: 'critical',
      workflow_id: esc.workflow_id,
      detail: `Critical escalation for workflow ${esc.workflow_id} remains unresolved`
    })
  }

  // Rule 5: Collisions must not exist in running workflows
  const runningCollisions = orchData.filter(r => r.collision_detected)
  for (const wf of runningCollisions) {
    violations.push({
      rule: 'no_collisions_allowed',
      severity: 'high',
      workflow_id: wf.workflow_id,
      detail: `Collision detected in workflow '${wf.workflow_name}': ${wf.collision_detail}`
    })
  }

  return violations
}

function buildGovernanceIntent(violation) {
  switch (violation.rule) {
    case 'no_unverified_actions':
      return {
        source_module: 'M52',
        intent_type: 'pause_workflow',
        workflow_id: violation.workflow_id,
        action: `Pause workflow ${violation.workflow_id} — unverified action detected`,
        reasoning: violation.detail,
        payload: { rule: violation.rule }
      }
    case 'policy_compliance_required':
      return {
        source_module: 'M52',
        intent_type: 'pause_workflow',
        workflow_id: violation.workflow_id,
        action: `Pause workflow ${violation.workflow_id} — policy compliance violation`,
        reasoning: violation.detail,
        payload: { rule: violation.rule }
      }
    case 'no_progress_on_blocked_workflow':
      return {
        source_module: 'M52',
        intent_type: 'pause_workflow',
        workflow_id: violation.workflow_id,
        action: `Pause workflow ${violation.workflow_id} — blocked workflow progressing`,
        reasoning: violation.detail,
        payload: { rule: violation.rule }
      }
    case 'critical_escalation_unresolved':
      return {
        source_module: 'M52',
        intent_type: 'pause_workflow',
        workflow_id: violation.workflow_id,
        action: `Pause workflow ${violation.workflow_id} — unresolved critical escalation`,
        reasoning: violation.detail,
        payload: { rule: violation.rule }
      }
    case 'no_collisions_allowed':
      return {
        source_module: 'M52',
        intent_type: 'reassign_actor',
        workflow_id: violation.workflow_id,
        action: `Resolve collision in workflow ${violation.workflow_id}`,
        reasoning: violation.detail,
        payload: { rule: violation.rule }
      }
    default:
      return null
  }
}

async function enforceGovernance() {
  const violations = await detectViolations()

  if (violations.length === 0) {
    return {
      violations_found: 0,
      intents_emitted: 0,
      message: 'No governance violations detected. All policies are being followed.',
      results: []
    }
  }

  const results = []

  for (const violation of violations) {
    const intent = buildGovernanceIntent(violation)
    if (!intent) continue

    const result = await receiveIntent(intent)
    results.push({
      violation,
      intent: result.intent,
      mode: result.mode,
      message: result.message
    })
  }

  return {
    violations_found: violations.length,
    intents_emitted: results.length,
    message: `M52 detected ${violations.length} governance violation(s) and emitted ${results.length} intent(s) to M16.`,
    results
  }
}

async function generateReport() {
  const violations = await detectViolations()

  const by_severity = {
    critical: violations.filter(v => v.severity === 'critical').length,
    high: violations.filter(v => v.severity === 'high').length,
    medium: violations.filter(v => v.severity === 'medium').length,
    low: violations.filter(v => v.severity === 'low').length
  }

  const by_rule = {}
  for (const v of violations) {
    by_rule[v.rule] = (by_rule[v.rule] || 0) + 1
  }

  return {
    generated_at: new Date().toISOString(),
    total_violations: violations.length,
    by_severity,
    by_rule,
    governance_status: violations.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
    summary: violations.length === 0
      ? 'Organization is fully governance compliant.'
      : `${violations.length} governance violation(s) detected. Immediate enforcement required.`,
    violations
  }
}

module.exports = { detectViolations, enforceGovernance, generateReport }