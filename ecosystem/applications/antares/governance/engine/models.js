// governance/engine/models.js
'use strict';
//
// Dependency-free factory + validator functions for the 4 core governance models:
// GovernanceRule, TrustSignal, GovernanceDecision, Evidence.
//
// These mirror the .schema.json files in this folder. The schemas are the source of
// truth for external/machine consumers (other platforms integrating on Din 7); this
// file is what our own engine code imports and calls directly.

const ENUMS = {
  requirement: ['ALLOW_IF_MATCH', 'REJECT_IF_MATCH', 'REQUIRE_HUMAN_REVIEW_IF_MATCH', 'CONDITIONAL'],
  severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  signalType: ['MODEL_CONFIDENCE', 'ORG_TRUST_SCORE', 'HISTORICAL_ACCURACY', 'ANOMALY_FLAG'],
  outcome: ['ALLOW', 'REJECT', 'ESCALATE', 'HUMAN_REVIEW'],
  riskLevel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
};

function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}

function assert(condition, errors, message) {
  if (!condition) errors.push(message);
}

// ---------- Governance Rule ----------

function createGovernanceRule(data) {
  const errors = validateGovernanceRule(data);
  if (errors.length) throw new Error('Invalid GovernanceRule: ' + errors.join('; '));
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    appliesTo: {
      actions: data.appliesTo.actions,
      actorRoles: data.appliesTo.actorRoles || [],
      resourceTypes: data.appliesTo.resourceTypes || []
    },
    requirement: data.requirement,
    severity: data.severity,
    active: data.active,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}

function validateGovernanceRule(data) {
  const errors = [];
  if (!data) return ['data is required'];
  assert(/^R-[0-9]+$/.test(data.id || ''), errors, 'id must match R-<number>');
  assert(isNonEmptyString(data.name), errors, 'name is required');
  assert(data.appliesTo && Array.isArray(data.appliesTo.actions) && data.appliesTo.actions.length > 0,
    errors, 'appliesTo.actions must be a non-empty array');
  assert(ENUMS.requirement.includes(data.requirement), errors, 'requirement must be one of ' + ENUMS.requirement.join(', '));
  assert(ENUMS.severity.includes(data.severity), errors, 'severity must be one of ' + ENUMS.severity.join(', '));
  assert(typeof data.active === 'boolean', errors, 'active must be boolean');
  return errors;
}

// ---------- Trust Signal ----------

function createTrustSignal(data) {
  const errors = validateTrustSignal(data);
  if (errors.length) throw new Error('Invalid TrustSignal: ' + errors.join('; '));
  return {
    id: data.id,
    actorId: data.actorId,
    actionRequestId: data.actionRequestId || null,
    signalType: data.signalType,
    value: data.value,
    source: data.source,
    computedAt: data.computedAt || new Date().toISOString()
  };
}

function validateTrustSignal(data) {
  const errors = [];
  if (!data) return ['data is required'];
  assert(/^TS-[0-9]+$/.test(data.id || ''), errors, 'id must match TS-<number>');
  assert(isNonEmptyString(data.actorId), errors, 'actorId is required');
  assert(ENUMS.signalType.includes(data.signalType), errors, 'signalType must be one of ' + ENUMS.signalType.join(', '));
  assert(typeof data.value === 'number' && data.value >= 0 && data.value <= 1, errors, 'value must be a number between 0 and 1');
  assert(isNonEmptyString(data.source), errors, 'source is required');
  return errors;
}

// ---------- Governance Decision ----------

function createGovernanceDecision(data) {
  const errors = validateGovernanceDecision(data);
  if (errors.length) throw new Error('Invalid GovernanceDecision: ' + errors.join('; '));
  return {
    id: data.id,
    actionRequestId: data.actionRequestId,
    outcome: data.outcome,
    reason: data.reason,
    rulesApplied: data.rulesApplied || [],
    trustSignalsConsidered: data.trustSignalsConsidered || [],
    accountableOwner: data.accountableOwner,
    riskLevel: data.riskLevel,
    decidedAt: data.decidedAt || new Date().toISOString()
  };
}

function validateGovernanceDecision(data) {
  const errors = [];
  if (!data) return ['data is required'];
  assert(isNonEmptyString(data.id), errors, 'id is required');
  assert(isNonEmptyString(data.actionRequestId), errors, 'actionRequestId is required');
  assert(ENUMS.outcome.includes(data.outcome), errors, 'outcome must be one of ' + ENUMS.outcome.join(', '));
  assert(isNonEmptyString(data.reason), errors, 'reason is required');
  assert(isNonEmptyString(data.accountableOwner), errors, 'accountableOwner is required');
  assert(ENUMS.riskLevel.includes(data.riskLevel), errors, 'riskLevel must be one of ' + ENUMS.riskLevel.join(', '));
  return errors;
}

// ---------- Evidence ----------

function createEvidence(data) {
  const errors = validateEvidence(data);
  if (errors.length) throw new Error('Invalid Evidence: ' + errors.join('; '));
  return Object.freeze({
    id: data.id,
    decisionId: data.decisionId,
    inputsSnapshot: data.inputsSnapshot,
    createdAt: data.createdAt || new Date().toISOString()
  });
}

function validateEvidence(data) {
  const errors = [];
  if (!data) return ['data is required'];
  assert(isNonEmptyString(data.id), errors, 'id is required');
  assert(isNonEmptyString(data.decisionId), errors, 'decisionId is required');
  const snap = data.inputsSnapshot;
  assert(snap && snap.event && snap.context && snap.policyCheck && snap.analysis,
    errors, 'inputsSnapshot must include event, context, policyCheck, analysis');
  return errors;
}

module.exports = {
  ENUMS,
  createGovernanceRule, validateGovernanceRule,
  createTrustSignal, validateTrustSignal,
  createGovernanceDecision, validateGovernanceDecision,
  createEvidence, validateEvidence
};
