const supabase = require('../../supabase')

function buildMessage(workflow_id, actor_name, reasons, severity) {
  const reasonText = reasons.join(', ')
  return `[${severity.toUpperCase()}] Workflow ${workflow_id} has been escalated. Actor: ${actor_name}. Issues detected: ${reasonText}. Immediate review required.`
}

function getSeverity(reasons) {
  if (reasons.includes('collision_detected') && reasons.includes('policy_violation')) return 'critical'
  if (reasons.includes('orchestration_blocked') || reasons.includes('policy_violation')) return 'high'
  if (reasons.includes('flagged')) return 'medium'
  return 'low'
}

async function escalate(gateResult) {
  const { workflow_id, reasons, verification, orchestration } = gateResult

  const actor_name = verification?.actor_name || orchestration?.next_actor_name || 'unknown'
  const actor_type = verification?.actor_type || orchestration?.next_actor_type || 'unknown'
  const severity = getSeverity(reasons)
  const message = buildMessage(workflow_id, actor_name, reasons, severity)
  const escalation_id = `esc_${Date.now()}`

  const { data, error } = await supabase
    .from('escalation_logs')
    .insert([{
      escalation_id,
      workflow_id,
      actor_type,
      actor_name,
      reasons,
      severity,
      status: 'open',
      message
    }])
    .select()

  if (error) throw new Error(`Escalation failed: ${error.message}`)

  return data[0]
}

module.exports = { escalate }