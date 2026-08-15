function makeDecision(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    throw new Error('Decision score must be a number')
  }

  if (score >= 80) {
    return {
      decision: 'ACCEPT',
      requiresHumanReview: false,
      reason: 'Score meets acceptance threshold',
    }
  }

  if (score >= 60) {
    return {
      decision: 'REVIEW',
      requiresHumanReview: true,
      reason: 'Score requires human review',
    }
  }

  return {
    decision: 'REJECT',
    requiresHumanReview: true,
    reason: 'Score is below acceptance threshold',
  }
}

module.exports = {
  makeDecision,
}