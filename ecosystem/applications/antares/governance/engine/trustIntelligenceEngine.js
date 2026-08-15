// governance/engine/trustIntelligenceEngine.js
'use strict';
//
// Din 5 deliverable: pulled the trust logic out of evaluationEngine.js into its own,
// separately-testable module, and adds two things that weren't there yet:
//
//   - decisionConfidence: a THIRD number, different from both model confidence and org
//     trust. It answers "how confident is the GOVERNANCE ENGINE in the call it's about
//     to make" and is used only for explainability/audit — it never overrides or
//     replaces the actual ALLOW/REJECT/ESCALATE/HUMAN_REVIEW outcome.
//   - oversightLevel: how much human supervision this action needs (NONE / LOW /
//     STANDARD / MANDATORY), separate from the outcome itself, so downstream platforms
//     (Din 7 integration) can route accordingly without re-deriving it.
//
// Hard rule kept from Din 1: MODEL_CONFIDENCE and ORG_TRUST_SCORE are read as two
// separate signals everywhere in this file. They are never averaged into one "trust
// score" before this point — only decisionConfidence (below) deliberately blends them,
// and it is explicitly a different, clearly-labeled number.

const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function signalValue(trustSignals, signalType) {
  const found = trustSignals.find((s) => s.signalType === signalType);
  return found ? found.value : null;
}

// Raw signal readout. Nothing is combined here — just pulled out and labeled.
function assessTrustSignals(trustSignals) {
  return {
    modelConfidence: signalValue(trustSignals, 'MODEL_CONFIDENCE'),
    orgTrust: signalValue(trustSignals, 'ORG_TRUST_SCORE'),
    historicalAccuracy: signalValue(trustSignals, 'HISTORICAL_ACCURACY'),
    anomaly: signalValue(trustSignals, 'ANOMALY_FLAG') || 0
  };
}

// Risk level from matched rule severity, escalated by anomaly / low org trust.
// (Same logic Din 3-4 had inline — moved here so it lives with the rest of trust logic.)
function evaluateRisk(matchedRules, trustAssessment) {
  const { orgTrust, anomaly } = trustAssessment;

  let baseIndex = matchedRules.length
    ? Math.max(...matchedRules.map((r) => SEVERITY_ORDER.indexOf(r.severity)))
    : SEVERITY_ORDER.indexOf('MEDIUM'); // unknown action defaults to at least MEDIUM risk

  if (anomaly >= 0.5) baseIndex = Math.max(baseIndex + 1, SEVERITY_ORDER.indexOf('HIGH'));
  if (orgTrust !== null && orgTrust < 0.5) baseIndex += 1;

  baseIndex = Math.min(baseIndex, SEVERITY_ORDER.length - 1);
  return SEVERITY_ORDER[baseIndex];
}

// A deliberately separate, third number — NOT model confidence, NOT org trust.
// Org trust is weighted higher than model confidence on purpose: a track record the
// org has actually observed over time is worth more than an actor's self-reported
// certainty in one moment. Missing signals are treated as neutral (0.5), not as 0 or 1,
// so a missing signal lowers confidence without falsely implying distrust.
function computeDecisionConfidence(trustAssessment) {
  const { modelConfidence, orgTrust, anomaly } = trustAssessment;
  const mc = modelConfidence === null ? 0.5 : modelConfidence;
  const ot = orgTrust === null ? 0.5 : orgTrust;
  let confidence = mc * 0.4 + ot * 0.6;
  confidence = confidence * (1 - anomaly * 0.5);
  return Math.round(confidence * 100) / 100;
}

// How much human supervision this action needs, independent of the ALLOW/REJECT/
// ESCALATE/HUMAN_REVIEW outcome itself — downstream platforms use this to route,
// e.g. MANDATORY always goes to a named reviewer queue, LOW can be spot-checked later.
function determineOversight({ riskLevel, ruleRequiresReview, decisionConfidence }) {
  if (ruleRequiresReview) return 'MANDATORY';
  if (riskLevel === 'CRITICAL') return 'MANDATORY';
  if (riskLevel === 'HIGH') return 'STANDARD';
  if (decisionConfidence < 0.5) return 'STANDARD';
  if (riskLevel === 'MEDIUM') return 'LOW';
  return 'NONE';
}

// Single entry point the evaluation engine calls — runs the full trust intelligence
// pass and returns everything downstream code needs.
function runTrustIntelligence(matchedRules, trustSignals, ruleRequiresReview) {
  const trustAssessment = assessTrustSignals(trustSignals);
  const riskLevel = evaluateRisk(matchedRules, trustAssessment);
  const decisionConfidence = computeDecisionConfidence(trustAssessment);
  const oversightLevel = determineOversight({ riskLevel, ruleRequiresReview, decisionConfidence });

  return {
    modelConfidence: trustAssessment.modelConfidence,
    orgTrust: trustAssessment.orgTrust,
    historicalAccuracy: trustAssessment.historicalAccuracy,
    anomaly: trustAssessment.anomaly,
    riskLevel,
    decisionConfidence,
    oversightLevel
  };
}

module.exports = {
  assessTrustSignals,
  evaluateRisk,
  computeDecisionConfidence,
  determineOversight,
  runTrustIntelligence
};
