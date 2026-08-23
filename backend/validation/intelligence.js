function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value) {
  return new Set(
    normalizeText(value)
      .split(' ')
      .filter(Boolean)
  )
}

function similarity(a, b) {
  const left = tokenize(a)
  const right = tokenize(b)

  if (!left.size || !right.size) return 0

  let intersection = 0

  for (const token of left) {
    if (right.has(token)) intersection++
  }

  const union = new Set([...left, ...right]).size

  return union ? Math.round((intersection / union) * 100) : 0
}

function normalizeEvidence(evidence = []) {
  return evidence.map((item, index) => ({
    id: item.id || `E${index + 1}`,
    claimId: item.claimId || null,
    supports:
      typeof item.supports === 'boolean'
        ? item.supports
        : null,
    strength:
      typeof item.strength === 'number'
        ? Math.max(0, Math.min(100, item.strength))
        : 0,
    text: normalizeText(item.text || item.content || item.description),
  }))
}

function analyzeRelevance(input = {}, evidence = []) {
  const target =
    input.claim ||
    input.objective ||
    input.description ||
    input.expectedOutcome ||
    ''

  if (!target) return 0

  const scores = evidence
    .map(item => similarity(target, item.text))
    .filter(score => score > 0)

  if (!scores.length) return 0

  return Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  )
}

function detectMissingEvidence(input = {}, evidence = []) {
  const required = Number(input.requiredEvidence || 0)

  if (required > evidence.length) {
    return {
      missing: true,
      required,
      supplied: evidence.length,
      message: 'Required evidence coverage is incomplete',
    }
  }

  return {
    missing: false,
    required,
    supplied: evidence.length,
    message: null,
  }
}

function runEvidenceIntelligence(input = {}) {
  const evidence = normalizeEvidence(input.evidence || [])

  const supporting = evidence.filter(item => item.supports === true)
  const contradicting = evidence.filter(item => item.supports === false)

  const relevanceScore = analyzeRelevance(input, evidence)

  const averageStrength = evidence.length
    ? Math.round(
        evidence.reduce((sum, item) => sum + item.strength, 0) /
          evidence.length
      )
    : 0

  const missingEvidence = detectMissingEvidence(input, evidence)

  const contradictionClaims = new Set(
    supporting
      .filter(support =>
        contradicting.some(
          contradiction => contradiction.claimId === support.claimId
        )
      )
      .map(item => item.claimId)
      .filter(Boolean)
  )

  const contradictions = [...contradictionClaims].map(claimId => ({
    claimId,
    reason: 'Conflicting supporting and contradicting evidence detected',
  }))

  const completenessScore = missingEvidence.missing
    ? Math.min(
        100,
        Math.round(
          (evidence.length / Math.max(missingEvidence.required, 1)) * 100
        )
      )
    : 100

  const intelligenceConfidence = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        averageStrength * 0.4 +
        relevanceScore * 0.3 +
        completenessScore * 0.3 -
        contradictions.length * 20
      )
    )
  )

  return {
    normalizedEvidence: evidence,
    relevanceScore,
    averageStrength,
    completenessScore,
    contradictions,
    missingEvidence,
    intelligenceConfidence,
  }
}

module.exports = {
  normalizeText,
  tokenize,
  similarity,
  normalizeEvidence,
  analyzeRelevance,
  detectMissingEvidence,
  runEvidenceIntelligence,
}
