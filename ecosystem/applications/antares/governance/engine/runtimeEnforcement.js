// governance/engine/runtimeEnforcement.js
'use strict';
//
// Din 6 deliverable: wires the whole chain together.
//
//   Action Request -> Authority Check -> Rules Check -> Trust Check -> Decision -> Audit
//
// Authority Check runs first and can short-circuit everything after it. Rules Check +
// Trust Check are Din 3-5's evaluationEngine.evaluateAction (which already runs rules
// then trust intelligence internally, per Din 3-4/5). Audit is the final, mandatory step.
//
// FAIL-SAFE BEHAVIOR (this is the Din 6 requirement — what happens when info is missing):
//   - Authority check fails / actor unknown  -> REJECT immediately, rules/trust never run.
//   - No rule matches the action              -> HUMAN_REVIEW (handled in evaluationEngine).
//   - Audit write fails on an ALLOW decision   -> DOWNGRADED to HUMAN_REVIEW. An action that
//                                                  cannot be recorded is never allowed to
//                                                  proceed silently — "if we can't prove it
//                                                  happened the right way, a human looks at it."
//   - Audit write fails on REJECT/ESCALATE/
//     HUMAN_REVIEW                             -> outcome is kept (it was already the safe/
//                                                  restrictive choice), but the failure is
//                                                  surfaced to the caller via auditWriteFailed.

const { authorityCheck } = require('../../security/authorityCheck');
const { evaluateAction } = require('./evaluationEngine');
const { createGovernanceDecision, createEvidence } = require('./models');
const { appendAuditEntry } = require('../audit/auditLog');

let decisionCounter = 0;
let evidenceCounter = 0;

function nextDecisionId() {
  decisionCounter += 1;
  return 'D-AUTH-' + Date.now() + '-' + decisionCounter;
}
function nextEvidenceId() {
  evidenceCounter += 1;
  return 'EV-AUTH-' + Date.now() + '-' + evidenceCounter;
}

// Builds an immediate REJECT decision when the authority check fails, without ever
// invoking the rules/trust engine.
function buildAuthorityRejection(actionRequest, context, authorityResult) {
  const decision = createGovernanceDecision({
    id: nextDecisionId(),
    actionRequestId: actionRequest.id,
    outcome: 'REJECT',
    reason: 'Authority check failed: ' + authorityResult.reason,
    rulesApplied: [],
    trustSignalsConsidered: [],
    accountableOwner: 'governance-engine (auto-decided)',
    riskLevel: 'CRITICAL'
  });

  const evidence = createEvidence({
    id: nextEvidenceId(),
    decisionId: decision.id,
    inputsSnapshot: {
      event: actionRequest,
      context: context,
      policyCheck: { skipped: true, reason: 'Authority check failed before policy check ran.' },
      analysis: { skipped: true, reason: 'Authority check failed before trust analysis ran.' }
    }
  });

  return { decision, evidence };
}

// Downgrades an ALLOW decision to HUMAN_REVIEW because it could not be audited.
// Never mutates the original decision — builds a new, distinct one.
function downgradeForAuditFailure(originalDecision, actionRequest, context) {
  const decision = createGovernanceDecision({
    id: nextDecisionId(),
    actionRequestId: actionRequest.id,
    outcome: 'HUMAN_REVIEW',
    reason: 'Original decision was ALLOW (' + originalDecision.id + ') but the audit write failed. ' +
      'An action that cannot be recorded is never auto-approved — downgraded to HUMAN_REVIEW per fail-safe policy.',
    rulesApplied: originalDecision.rulesApplied,
    trustSignalsConsidered: originalDecision.trustSignalsConsidered,
    accountableOwner: 'governance-platform-lead',
    riskLevel: 'HIGH'
  });

  const evidence = createEvidence({
    id: nextEvidenceId(),
    decisionId: decision.id,
    inputsSnapshot: {
      event: actionRequest,
      context: context,
      policyCheck: { note: 'Carried forward from original decision ' + originalDecision.id },
      analysis: { note: 'Audit write failure triggered fail-safe downgrade.' }
    }
  });

  return { decision, evidence };
}

function handleActionRequest(actionRequest, context, rules, trustSignals, options) {
  const opts = options || {};

  // Stage 1: Authority Check
  const authResult = authorityCheck(actionRequest, opts.authorityRegistry);
  if (!authResult.passed) {
    const { decision, evidence } = buildAuthorityRejection(actionRequest, context, authResult);
    const auditResult = appendAuditEntry(decision, evidence, { simulateFailure: opts.simulateAuditFailure });
    return {
      decision,
      evidence,
      stageReached: 'authority_check',
      auditWriteFailed: !auditResult.success,
      auditEntryId: auditResult.auditEntryId || null
    };
  }

  // Stage 2 & 3: Rules Check + Trust Check (Din 3-5's evaluation engine)
  const { decision, evidence } = evaluateAction(actionRequest, context, rules, trustSignals);

  // Stage 4: Audit (mandatory — every decision must attempt to be recorded)
  let auditResult = appendAuditEntry(decision, evidence, { simulateFailure: opts.simulateAuditFailure });

  if (!auditResult.success && decision.outcome === 'ALLOW') {
    // Fail-safe: cannot let an unaudited ALLOW stand.
    const downgraded = downgradeForAuditFailure(decision, actionRequest, context);
    const retryAudit = appendAuditEntry(downgraded.decision, downgraded.evidence, {}); // best-effort, real write this time
    return {
      decision: downgraded.decision,
      evidence: downgraded.evidence,
      stageReached: 'audit_failed_downgraded',
      auditWriteFailed: !retryAudit.success,
      auditEntryId: retryAudit.auditEntryId || null,
      originalDecisionBeforeDowngrade: decision.id
    };
  }

  return {
    decision,
    evidence,
    stageReached: 'complete',
    auditWriteFailed: !auditResult.success,
    auditEntryId: auditResult.auditEntryId || null
  };
}

module.exports = { handleActionRequest, buildAuthorityRejection, downgradeForAuditFailure };
