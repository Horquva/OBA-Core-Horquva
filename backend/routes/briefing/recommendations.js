async function generateRecommendations(riskSummary, orgHealth) {
  const recommendations = []

  // Critical escalations
  if (riskSummary.by_severity.critical > 0) {
    recommendations.push({
      priority: 1,
      type: 'immediate_action',
      message: `${riskSummary.by_severity.critical} critical escalation(s) require your immediate attention. Review and resolve before proceeding with any workflow approvals.`
    })
  }

  // Blocked workflows
  if (orgHealth.blocked > 0) {
    recommendations.push({
      priority: 2,
      type: 'workflow_review',
      message: `${orgHealth.blocked} workflow(s) are currently blocked. Assign backup owners or resolve collisions to unblock execution.`
    })
  }

  // Collisions
  if (orgHealth.collisions_detected > 0) {
    recommendations.push({
      priority: 3,
      type: 'collision_resolution',
      message: `${orgHealth.collisions_detected} collision(s) detected — one or more actors are overloaded across workflows. Redistribute responsibilities.`
    })
  }

  // Policy violations
  if (orgHealth.policy_violations > 0) {
    recommendations.push({
      priority: 4,
      type: 'policy_review',
      message: `${orgHealth.policy_violations} policy violation(s) found in verification logs. Review flagged actions and update ownership policies.`
    })
  }

  // High escalations
  if (riskSummary.by_severity.high > 0) {
    recommendations.push({
      priority: 5,
      type: 'escalation_review',
      message: `${riskSummary.by_severity.high} high severity escalation(s) are open. Schedule a review within 24 hours.`
    })
  }

  // All clear
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 1,
      type: 'all_clear',
      message: 'No immediate actions required. All workflows are running within acceptable parameters.'
    })
  }

  return recommendations.sort((a, b) => a.priority - b.priority)
}

module.exports = { generateRecommendations }