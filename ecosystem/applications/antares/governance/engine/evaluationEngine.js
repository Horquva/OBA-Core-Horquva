// governance/engine/evaluationEngine.js
'use strict';
//
// Din 3-4 deliverable: takes a proposed action + context + trust signals, runs it
// through Policy Check + Trust/Risk Analysis, and returns a final GovernanceDecision
// (ALLOW / REJECT / ESCALATE / HUMAN_REVIEW) plus the Evidence record behind it.
//
// Decision precedence (highest wins, never overridden by anything below it):
//   1. Any REJECT_IF_MATCH rule matched      -> REJECT   (a hard rule always wins over trust)
//   2. No rule matched this action at all    -> HUMAN_REVIEW (fail-safe: unknown = not safe)
//   3. Any REQUIRE_HUMAN_REVIEW_IF_MATCH matched -> HUMAN_REVIEW
//   4. Computed risk level is HIGH/CRITICAL  -> ESCALATE (trust/risk can escalate even an
//                                                otherwise-clean action, but can never
//                                                downgrade a REJECT or a mandated review)
//   5. A CONDITIONAL rule matched            -> ALLOW if trust is high & no anomaly,
//                                                else ESCALATE
//   6. An ALLOW_IF_MATCH rule matched        -> ALLOW
//   7. Anything else (shouldn't happen)      -> HUMAN_REVIEW fail-safe

const {
  createGovernanceDecision,
  createEvidence
} = require('./models');

const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

let decisionCounter = 0;
let evidenceCounter = 0;

function nextDecisionId() {
  decisionCounter += 1;
  return 'D-' + Date.now() + '-' + decisionCounter;
}

function nextEvidenceId() {
  evidenceCounter += 1;
  return 'EV-' + Date.now() + '-' + evidenceCounter;
}

function ruleMatches(rule, actionRequest) {
  const actions = rule.appliesTo.actions || [];
  const actorRoles = rule.appliesTo.actorRoles || [];
  const resourceTypes = rule.appliesTo.resourceTypes || [];

  if (actions.length && !actions.includes('*') && !actions.includes(actionRequest.action)) {
    return false;
  }
  if (actorRoles.length && !actorRoles.includes(actionRequest.actorRole)) {
    return false;
  }
  if (resourceTypes.length && !resourceTypes.includes(actionRequest.resourceType)) {
    return false;
  }
  return true;
}

function matchRules(rules, actionRequest) {
  return rules.filter((r) => r.active && ruleMatches(r, actionRequest));
}

function signalValue(trustSignals, signalType) {
  const found = trustSignals.find((s) => s.signalType === signalType);
  return found ? found.value : null;
}

// Returns { riskLevel, orgTrust, modelConfidence, anomaly } — model confidence and org
// trust are read as two separate signals here on purpose, never combined into one score.
function assessTrust(trustSignals, matchedRules) {
  const orgTrust = signalValue(trustSignals, 'ORG_TRUST_SCORE');
  const modelConfidence = signalValue(trustSignals, 'MODEL_CONFIDENCE');
  const anomaly = signalValue(trustSignals, 'ANOMALY_FLAG') || 0;

  let baseIndex = matchedRules.length
    ? Math.max(...matchedRules.map((r) => SEVERITY_ORDER.indexOf(r.severity)))
    : SEVERITY_ORDER.indexOf('MEDIUM'); // unknown action defaults to at least MEDIUM risk

  // An anomaly is a strong signal on its own — it always pushes risk to at least HIGH,
  // not just one level up from whatever the rule severity happened to be.
  if (anomaly >= 0.5) baseIndex = Math.max(baseIndex + 1, SEVERITY_ORDER.indexOf('HIGH'));
  if (orgTrust !== null && orgTrust < 0.5) baseIndex += 1;

  baseIndex = Math.min(baseIndex, SEVERITY_ORDER.length - 1);
  return {
    riskLevel: SEVERITY_ORDER[baseIndex],
    orgTrust,
    modelConfidence,
    anomaly
  };
}

function evaluateAction(actionRequest, context, rules, trustSignals) {
  const matched = matchRules(rules, actionRequest);
  const rejectRules = matched.filter((r) => r.requirement === 'REJECT_IF_MATCH');
  const reviewRules = matched.filter((r) => r.requirement === 'REQUIRE_HUMAN_REVIEW_IF_MATCH');
  const conditionalRules = matched.filter((r) => r.requirement === 'CONDITIONAL');
  const allowRules = matched.filter((r) => r.requirement === 'ALLOW_IF_MATCH');

  const trust = assessTrust(trustSignals, matched);

  let outcome;
  let reason;

  if (rejectRules.length) {
    outcome = 'REJECT';
    reason = 'Rejected by rule(s) ' + rejectRules.map((r) => r.id).join(', ') +
      ' — a REJECT rule always wins regardless of trust signals.';
  } else if (matched.length === 0) {
    outcome = 'HUMAN_REVIEW';
    reason = 'No governance rule covers action "' + actionRequest.action +
      '" — fail-safe default is HUMAN_REVIEW, never ALLOW, when nothing is known about an action.';
  } else if (reviewRules.length) {
    outcome = 'HUMAN_REVIEW';
    reason = 'Rule(s) ' + reviewRules.map((r) => r.id).join(', ') +
      ' mandate human review for this action, independent of trust score.';
  } else if (trust.riskLevel === 'HIGH' || trust.riskLevel === 'CRITICAL') {
    outcome = 'ESCALATE';
    reason = 'Computed risk level is ' + trust.riskLevel +
      ' (org trust=' + trust.orgTrust + ', anomaly=' + trust.anomaly +
      ') — escalated for a second look even though no rule outright blocked it.';
  } else if (conditionalRules.length) {
    const trusted = trust.orgTrust !== null && trust.orgTrust >= 0.7 && trust.anomaly < 0.5;
    if (trusted) {
      outcome = 'ALLOW';
      reason = 'Conditional rule(s) ' + conditionalRules.map((r) => r.id).join(', ') +
        ' satisfied — org trust ' + trust.orgTrust + ' is high and no anomaly present.';
    } else {
      outcome = 'ESCALATE';
      reason = 'Conditional rule(s) ' + conditionalRules.map((r) => r.id).join(', ') +
        ' matched but trust was not high enough to auto-approve (org trust=' +
        trust.orgTrust + ', anomaly=' + trust.anomaly + ').';
    }
  } else if (allowRules.length) {
    outcome = 'ALLOW';
    reason = 'Allowed by rule(s) ' + allowRules.map((r) => r.id).join(', ') +
      ', risk level ' + trust.riskLevel + ', no blocking or review rule matched.';
  } else {
    outcome = 'HUMAN_REVIEW';
    reason = 'No rule produced a clear outcome — fail-safe default is HUMAN_REVIEW.';
  }

  const accountableOwner = (outcome === 'ALLOW' || outcome === 'REJECT')
    ? 'governance-engine (auto-decided)'
    : 'governance-platform-lead';

  const decision = createGovernanceDecision({
    id: nextDecisionId(),
    actionRequestId: actionRequest.id,
    outcome,
    reason,
    rulesApplied: matched.map((r) => r.id),
    trustSignalsConsidered: trustSignals.map((s) => s.id),
    accountableOwner,
    riskLevel: trust.riskLevel
  });

  const evidence = createEvidence({
    id: nextEvidenceId(),
    decisionId: decision.id,
    inputsSnapshot: {
      event: actionRequest,
      context: context,
      policyCheck: {
        matchedRuleIds: matched.map((r) => r.id),
        rejectRules: rejectRules.map((r) => r.id),
        reviewRules: reviewRules.map((r) => r.id),
        conditionalRules: conditionalRules.map((r) => r.id),
        allowRules: allowRules.map((r) => r.id)
      },
      analysis: trust
    }
  });

  return { decision, evidence };
}

module.exports = { evaluateAction, matchRules, assessTrust, ruleMatches };
