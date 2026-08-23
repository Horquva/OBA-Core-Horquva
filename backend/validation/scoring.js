function calculateScore(input) {
  const weights = {
    evidenceQuality: 0.25,
    relevance: 0.20,
    completeness: 0.20,
    risk: 0.15,
    confidence: 0.20,
  }

  const score =
    input.evidenceQuality * weights.evidenceQuality +
    input.relevance * weights.relevance +
    input.completeness * weights.completeness +
    (100 - input.risk) * weights.risk +
    input.confidence * weights.confidence

  return Math.round(score)
}

module.exports = {
  calculateScore,
}