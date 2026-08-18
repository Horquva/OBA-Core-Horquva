function normalizeValidationResult(result) {
  return {
    qualityGate: result.qualityGate,
    score: result.score,
    decision: result.decision,
    requiresHumanReview: result.requiresHumanReview,
    reason: result.reason || null,
    audit: result.audit || null,
  }
}

module.exports = {
  normalizeValidationResult,
}