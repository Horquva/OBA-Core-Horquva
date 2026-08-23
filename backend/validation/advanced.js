function assertEvidenceInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Advanced validation input must be an object')
  }

  if (!Array.isArray(input.evidence)) {
    throw new Error('Evidence must be an array')
  }
}

function analyzeEvidence(evidence) {
  const total = evidence.length

  const supporting = evidence.filter(
    item => item && item.supports === true
  )

  const contradicting = evidence.filter(
    item => item && item.supports === false
  )

  const usable = evidence.filter(
    item =>
      item &&
      typeof item.strength === 'number' &&
      item.strength >= 0 &&
      item.strength <= 100
  )

  const averageStrength = usable.length
    ? usable.reduce((sum, item) => sum + item.strength, 0) / usable.length
    : 0

  return {
    total,
    supporting: supporting.length,
    contradicting: contradicting.length,
    usable: usable.length,
    averageStrength: Math.round(averageStrength * 100) / 100,
  }
}

function detectContradictions(evidence) {
  const contradictions = []

  const groups = new Map()

  for (const item of evidence) {
    if (!item || !item.claimId) continue

    if (!groups.has(item.claimId)) {
      groups.set(item.claimId, [])
    }

    groups.get(item.claimId).push(item)
  }

  for (const [claimId, items] of groups.entries()) {
    const hasSupport = items.some(item => item.supports === true)
    const hasContradiction = items.some(item => item.supports === false)

    if (hasSupport && hasContradiction) {
      contradictions.push({
        claimId,
        reason: 'Conflicting supporting and contradicting evidence detected',
      })
    }
  }

  return contradictions
}

function detectValidationGaps(input, evidenceSummary) {
  const gaps = []

  if (evidenceSummary.total === 0) {
    gaps.push('No evidence supplied')
  }

  if (evidenceSummary.supporting === 0) {
    gaps.push('No supporting evidence supplied')
  }

  if (evidenceSummary.contradicting > 0) {
    gaps.push('Contradicting evidence requires review')
  }

  if (evidenceSummary.averageStrength < 50) {
    gaps.push('Evidence strength is below the minimum threshold')
  }

  if (input.requiredEvidence && evidenceSummary.total < input.requiredEvidence) {
    gaps.push('Required evidence coverage is incomplete')
  }

  return gaps
}

function calibrateConfidence(input, evidenceSummary, contradictions, gaps) {
  let confidence =
    typeof input.confidence === 'number'
      ? input.confidence
      : 50

  if (evidenceSummary.supporting > 0) {
    confidence += 10
  }

  if (evidenceSummary.averageStrength >= 80) {
    confidence += 10
  } else if (evidenceSummary.averageStrength < 50) {
    confidence -= 15
  }

  if (contradictions.length > 0) {
    confidence -= 20
  }

  if (gaps.length > 0) {
    confidence -= Math.min(gaps.length * 5, 20)
  }

  confidence = Math.max(0, Math.min(100, confidence))

  return Math.round(confidence)
}

function advancedValidate(input) {
  assertEvidenceInput(input)

  const evidenceSummary = analyzeEvidence(input.evidence)

  const contradictions = detectContradictions(input.evidence)

  const gaps = detectValidationGaps(
    input,
    evidenceSummary
  )

  const calibratedConfidence = calibrateConfidence(
    input,
    evidenceSummary,
    contradictions,
    gaps
  )

  const requiresHumanReview =
    contradictions.length > 0 ||
    gaps.length > 0 ||
    calibratedConfidence < 60

  return {
    evidenceSummary,
    contradictions,
    validationGaps: gaps,
    calibratedConfidence,
    requiresHumanReview,
  }
}

module.exports = {
  advancedValidate,
  analyzeEvidence,
  detectContradictions,
  detectValidationGaps,
  calibrateConfidence,
}