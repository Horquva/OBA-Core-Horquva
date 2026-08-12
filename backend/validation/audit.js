function createAuditRecord(input, score, decision) {
  return {
    timestamp: new Date().toISOString(),
    score,
    decision: decision.decision,
    requiresHumanReview: decision.requiresHumanReview,
    reason: decision.reason,
    input: {
      evidenceQuality: input.evidenceQuality,
      relevance: input.relevance,
      completeness: input.completeness,
      risk: input.risk,
      confidence: input.confidence,
    },
  }
}

module.exports = {
  createAuditRecord,
}