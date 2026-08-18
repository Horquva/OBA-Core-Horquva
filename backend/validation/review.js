function createReview(decision, score, pipelineResult) {
  if (decision === 'ACCEPT') {
    return {
      requiresHumanReview: false,
      reviewReason: null,
    }
  }

  if (decision === 'REJECT') {
    return {
      requiresHumanReview: true,
      reviewReason: 'Validation score is below acceptance threshold',
    }
  }

  return {
    requiresHumanReview: true,
    reviewReason: 'Validation score requires human review',
  }
}

module.exports = {
  createReview,
}