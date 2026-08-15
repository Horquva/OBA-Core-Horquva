// governance/engine/governanceApi.js
'use strict';
//
// Din 7 deliverable: THE public surface other platforms call. Nobody outside this
// engine should ever call handleActionRequest/evaluateAction/authorityCheck directly —
// they go through here, so this engine can change its internals freely later without
// breaking the 3 integration partners.
//
// Three entry points, one per partner, because each has a different need:
//
//   requestGovernanceDecision()  -> Zeeshan's Agent Platform
//     A real action is being proposed right now. Runs the full chain, writes to audit.
//
//   previewGovernanceOutcome()   -> Zara's Capability Validation
//     "If an agent were to attempt this, what WOULD happen?" No real action exists yet,
//     so this is a dry run: full chain runs (including authority check), but nothing
//     is written to the audit log. This engine only answers what the outcome would be —
//     it does NOT implement general capability validation logic itself; that stays
//     Zara's own responsibility.
//
//   queryAuditTrail()            -> Abbas's Operationalization
//     Read-only access to past real decisions for reporting/knowledge work. This engine
//     does not do the operationalization/reporting itself — it only exposes the data.

const { RULES } = require('./rules');
const { createTrustSignal } = require('./models');
const { handleActionRequest } = require('./runtimeEnforcement');
const { getAuditTrail, findAuditEntry } = require('../audit/auditLog');

// Raw trust signal payloads (plain objects from the caller) are converted through the
// Din 2 factory so bad/malformed signals are caught here rather than deep inside the
// engine. A signal that fails validation is dropped and logged — dropped means that
// signal type is simply absent to the trust engine, which already treats missing
// signals as neutral/unknown, never as auto-trust. This never crashes the API.
function toValidatedSignals(rawSignals) {
  if (!Array.isArray(rawSignals)) return [];
  const valid = [];
  rawSignals.forEach((raw, i) => {
    try {
      valid.push(createTrustSignal(Object.assign({ id: raw.id || 'TS-' + (Date.now() + i) }, raw)));
    } catch (err) {
      console.warn('[governanceApi] dropped invalid trust signal at index ' + i + ': ' + err.message);
    }
  });
  return valid;
}

// Strips internal-only fields before handing a response back to an external caller.
function toExternalResponse(result) {
  return {
    outcome: result.decision.outcome,
    reason: result.decision.reason,
    riskLevel: result.decision.riskLevel,
    accountableOwner: result.decision.accountableOwner,
    decisionId: result.decision.id,
    evidenceId: result.evidence.id,
    auditEntryId: result.auditEntryId,
    auditWriteFailed: result.auditWriteFailed
  };
}

// --- Entry point 1: Zeeshan's Agent Platform ---
// governanceRequest: { actionRequest, context, trustSignals }
function requestGovernanceDecision(governanceRequest) {
  if (!governanceRequest || !governanceRequest.actionRequest) {
    throw new Error('governanceRequest.actionRequest is required');
  }
  const signals = toValidatedSignals(governanceRequest.trustSignals);
  const result = handleActionRequest(
    governanceRequest.actionRequest,
    governanceRequest.context || {},
    RULES,
    signals
  );
  return toExternalResponse(result);
}

// --- Entry point 2: Zara's Capability Validation ---
// Same shape as above, but nothing is written anywhere — pure preview.
function previewGovernanceOutcome(governanceRequest) {
  if (!governanceRequest || !governanceRequest.actionRequest) {
    throw new Error('governanceRequest.actionRequest is required');
  }
  const signals = toValidatedSignals(governanceRequest.trustSignals);
  const result = handleActionRequest(
    governanceRequest.actionRequest,
    governanceRequest.context || {},
    RULES,
    signals,
    { dryRun: true }
  );
  return toExternalResponse(result);
}

// --- Entry point 3: Abbas's Operationalization ---
// Read-only. filters.decisionId narrows to one entry; otherwise returns everything.
function queryAuditTrail(filters) {
  const f = filters || {};
  if (f.decisionId) {
    const entry = findAuditEntry(f.decisionId);
    return entry ? [entry] : [];
  }
  return getAuditTrail();
}

module.exports = { requestGovernanceDecision, previewGovernanceOutcome, queryAuditTrail };
