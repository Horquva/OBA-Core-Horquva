/**
 * SHARED SIGNAL READERS — one implementation of each pillar/signal reader,
 * used by both routes/intelligence/brainCore.js and
 * routes/intelligence/orchestrator.js.
 *
 * Both routes narrate the same headline number (intel.pillars.orgScore —
 * D-02, D-17) through their own weighted-signal registry, and until now
 * each registry carried its OWN copy of these ten reader functions —
 * identical logic, typed out twice, two chances for one copy to drift from
 * the other when a reader needs a fix. The registries themselves
 * (SIGNAL_CONFIG / MODULE_REGISTRY) stay separate in each file — their
 * weights and labels are genuinely different per narrative — only the
 * reader logic (a pure function of `intel` to `{ score, verified, source }`)
 * is shared here.
 *
 * Every reader is a pure function of the one `intel` bundle
 * (domain.intelligence.all()) both routes already load once per request —
 * no I/O, no Supabase, so it stays synchronous and trivially testable.
 */

function pillar(intel, key) {
  const found = (intel.pillars.pillars || []).find((p) => p.resultKey === key)
  return found
    ? { score: found.score, verified: true, source: `domain.intelligence.pillars(${key})` }
    : { score: 0, verified: false, source: `domain.intelligence.pillars(${key})` }
}

const readGovernance = (intel) => pillar(intel, 'GI')
const readMemoryIntelligence = (intel) => pillar(intel, 'MI')
const readDomainIntelligence = (intel) => pillar(intel, 'DI')

const readContinuity = (intel) => ({
  score: intel.orgHealth.continuityScore,
  source: 'domain.intelligence.orgHealth',
  verified: true,
})

const readOrgHealth = (intel) => ({
  score: intel.orgHealth.healthIndex,
  source: 'domain.intelligence.orgHealth',
  verified: true,
})

// Inverted: more CRITICAL agents means a lower score.
function readPredictiveRisk(intel) {
  const scores = intel.predictiveRisk.scores
  if (!scores.length) {
    return { score: 0, source: 'domain.intelligence.predictiveRisk', verified: false }
  }
  const critical = scores.filter((s) => s.threatLevel === 'CRITICAL').length
  return {
    score: Math.round(((scores.length - critical) / scores.length) * 100),
    source: 'domain.intelligence.predictiveRisk',
    verified: true,
  }
}

const readCollaboration = (intel) => ({
  score: intel.collaboration.summary.collaborationScore,
  source: 'domain.intelligence.collaboration',
  verified: intel.collaboration.perEmployee.length > 0,
})

const readAccountability = (intel) => ({
  score: intel.accountability.accountabilityScore,
  source: 'domain.intelligence.accountability',
  verified: intel.accountability.entitiesWithLinks > 0,
})

const readAIAdoption = (intel) => ({
  score: intel.collaboration.summary.aiAdoptionScore,
  source: 'domain.intelligence.collaboration',
  verified: intel.collaboration.perEmployee.length > 0,
})

const readDecisionQuality = (intel) => ({
  score: intel.decisionQuality.score,
  source: 'domain.intelligence.decisionQuality',
  verified: intel.decisionQuality.evidence.sufficient,
})

module.exports = {
  pillar,
  readGovernance,
  readMemoryIntelligence,
  readDomainIntelligence,
  readContinuity,
  readOrgHealth,
  readPredictiveRisk,
  readCollaboration,
  readAccountability,
  readAIAdoption,
  readDecisionQuality,
}
