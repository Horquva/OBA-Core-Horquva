// governance/audit/auditLog.js
'use strict';
//
// Din 6 deliverable: the final stage of the chain. Append-only — there is
// deliberately no update or delete function exported. Once a decision + evidence pair
// is written, it stays exactly as written.
//
// This in-memory version is a stand-in for a real audit store (DB/file/log-shipping
// service) that will replace it before production use. The `simulateFailure` option
// exists ONLY to make the fail-safe behavior in runtimeEnforcement.js testable today —
// a real store's actual failure modes (disk full, network down, permissions) will
// naturally trigger the same code path once this is swapped out.

const auditLog = [];
let entryCounter = 0;

function appendAuditEntry(decision, evidence, options) {
  const opts = options || {};
  if (opts.simulateFailure) {
    return { success: false, reason: 'Simulated audit write failure (test/demo only).' };
  }

  entryCounter += 1;
  const entry = Object.freeze({
    auditEntryId: 'AUD-' + Date.now() + '-' + entryCounter,
    decisionId: decision.id,
    evidenceId: evidence.id,
    outcome: decision.outcome,
    accountableOwner: decision.accountableOwner,
    recordedAt: new Date().toISOString()
  });
  auditLog.push(entry);
  return { success: true, auditEntryId: entry.auditEntryId };
}

function getAuditTrail() {
  return auditLog.slice(); // copy — caller cannot mutate the real log
}

function findAuditEntry(decisionId) {
  return auditLog.find((e) => e.decisionId === decisionId) || null;
}

// Test-only helper. Never call this outside of tests — a real audit log has no reset.
function _clearForTests() {
  auditLog.length = 0;
  entryCounter = 0;
}

module.exports = { appendAuditEntry, getAuditTrail, findAuditEntry, _clearForTests };
