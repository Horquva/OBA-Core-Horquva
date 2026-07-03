const supabase = require('../../supabase')

async function getRiskSummary() {
  const { data, error } = await supabase
    .from('escalation_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Risk summary failed: ${error.message}`)

  const open = data.filter(r => r.status === 'open')

  return {
    total_escalations: data.length,
    open_escalations: open.length,
    by_severity: {
      critical: data.filter(r => r.severity === 'critical').length,
      high: data.filter(r => r.severity === 'high').length,
      medium: data.filter(r => r.severity === 'medium').length,
      low: data.filter(r => r.severity === 'low').length,
    },
    latest: data.slice(0, 3),
    summary_text: open.length === 0
      ? 'No open escalations. All risks resolved.'
      : `${open.length} open escalation(s) require attention. ${data.filter(r => r.severity === 'critical' && r.status === 'open').length} are critical.`
  }
}

async function getOrgHealth() {
  const { data: orchData, error: orchError } = await supabase
    .from('orchestration_state')
    .select('*')

  if (orchError) throw new Error(`Org health failed: ${orchError.message}`)

  const { data: verData, error: verError } = await supabase
    .from('verification_logs')
    .select('*')

  if (verError) throw new Error(`Verification fetch failed: ${verError.message}`)

  const blocked = orchData.filter(r => r.status === 'blocked').length
  const running = orchData.filter(r => r.status === 'running').length
  const completed = orchData.filter(r => r.status === 'completed').length
  const collisions = orchData.filter(r => r.collision_detected).length
  const flagged = verData.filter(r => r.status === 'flagged').length
  const policy_violations = verData.filter(r => !r.policy_compliant).length

  const health_score = orchData.length === 0 ? 0 :
    Math.round(((running + completed) / orchData.length) * 100)

  return {
    total_workflows: orchData.length,
    running,
    blocked,
    completed,
    collisions_detected: collisions,
    flagged_actions: flagged,
    policy_violations,
    health_score: `${health_score}%`,
    summary_text: blocked > 0
      ? `Org health is at ${health_score}%. ${blocked} workflow(s) are blocked and ${collisions} collision(s) detected. Immediate review recommended.`
      : `Org health is at ${health_score}%. All workflows running smoothly.`
  }
}

module.exports = { getRiskSummary, getOrgHealth }