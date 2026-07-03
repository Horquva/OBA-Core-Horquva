const supabase = require('../../supabase')

async function checkGate(workflow_id) {
  const { data: verifications, error: vErr } = await supabase
    .from('verification_logs')
    .select('*')
    .eq('workflow_id', workflow_id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (vErr) throw new Error(`Verification lookup failed: ${vErr.message}`)

  const { data: orchestration, error: oErr } = await supabase
    .from('orchestration_state')
    .select('*')
    .eq('workflow_id', workflow_id)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (oErr) throw new Error(`Orchestration lookup failed: ${oErr.message}`)

  const verification = verifications?.[0] || null
  const orchState = orchestration?.[0] || null

  const reasons = []

  if (!verification) reasons.push('no_verification_record')
  else {
    if (!verification.verified) reasons.push('not_verified')
    if (!verification.policy_compliant) reasons.push('policy_violation')
    if (verification.status === 'flagged') reasons.push('flagged')
    if (verification.status === 'failed') reasons.push('failed')
  }

  if (!orchState) reasons.push('no_orchestration_record')
  else {
    if (orchState.status === 'blocked') reasons.push('orchestration_blocked')
    if (orchState.collision_detected) reasons.push('collision_detected')
  }

  return {
    workflow_id,
    can_act: reasons.length === 0,
    reasons,
    verification,
    orchestration: orchState
  }
}

module.exports = { checkGate }