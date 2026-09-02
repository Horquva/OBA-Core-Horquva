const supabase = require('../../supabase')

// escalation_logs columns are (workflow_id, severity, status, reason, detail).
// This used to insert escalation_id, actor_type, actor_name, reasons and
// message as well — none of which exist — so every escalation threw. The actor
// and the full reason list now go into `detail`, the column meant to carry them.

function getSeverity(reasons) {
  if (reasons.includes('collision_detected') && reasons.includes('policy_violation')) return 'critical'
  if (reasons.includes('orchestration_blocked') || reasons.includes('policy_violation')) return 'high'
  if (reasons.includes('flagged')) return 'medium'
  return 'low'
}

async function escalate(gateResult) {
  const { workflow_id, reasons, verification, orchestration } = gateResult

  const actor_name = verification?.actor_name || orchestration?.collision?.actor_name || 'unknown'
  const actor_type = verification?.actor_type || orchestration?.collision?.actor_type || 'unknown'
  const severity = getSeverity(reasons)
  const message =
    `[${severity.toUpperCase()}] Workflow ${workflow_id} has been escalated. ` +
    `Actor: ${actor_name} (${actor_type}). Issues detected: ${reasons.join(', ')}. ` +
    `Immediate review required.`

  const { data, error } = await supabase
    .from('escalation_logs')
    .insert([{
      workflow_id: String(workflow_id),
      severity,
      status: 'open',
      reason: reasons.join(', '),
      detail: message,
    }])
    .select()

  if (error) throw new Error(`Escalation failed: ${error.message}`)

  return { ...data[0], message }
}

module.exports = { escalate }
