// governance/engine/demo.js
'use strict';
//
// Din 10 — final demo. Run with: node governance/engine/demo.js
//
// Walks 3 real proposed actions through the full chain
//   Action Request -> Authority Check -> Rules Check -> Trust Check -> Decision -> Audit
// and prints each stage so the whole chain is visible, not just the final answer —
// that's what makes the decision explainable.

const { handleActionRequest } = require('./runtimeEnforcement');
const { createTrustSignal } = require('./models');
const { RULES } = require('./rules');
const { queryAuditTrail } = require('./governanceApi');

function line() { console.log('-'.repeat(72)); }

function narrate(title, actionRequest, context, trustSignals) {
  line();
  console.log(title);
  line();
  console.log('1. ACTION REQUEST');
  console.log('   actor:  ' + actionRequest.actorId + ' (role: ' + actionRequest.actorRole + ')');
  console.log('   action: ' + actionRequest.action + ' on ' + actionRequest.resourceType);
  if (actionRequest.claimedAuthority) console.log('   claims authority: ' + actionRequest.claimedAuthority);

  const result = handleActionRequest(actionRequest, context, RULES, trustSignals);

  console.log('\n2-3. AUTHORITY CHECK + RULES/TRUST CHECK');
  if (result.stageReached === 'authority_check') {
    console.log('   -> stopped at authority check, rules/trust never ran');
  } else {
    console.log('   rules matched: ' + (result.decision.rulesApplied.length ? result.decision.rulesApplied.join(', ') : 'none'));
    console.log('   risk level:    ' + result.decision.riskLevel);
  }

  console.log('\n4. DECISION');
  console.log('   outcome: ' + result.decision.outcome);
  console.log('   reason:  ' + result.decision.reason);
  console.log('   accountable owner: ' + result.decision.accountableOwner);

  console.log('\n5. EVIDENCE + AUDIT');
  console.log('   evidence id: ' + result.evidence.id);
  console.log('   audit entry: ' + (result.auditEntryId || '(none)'));
  console.log('');

  return result;
}

function runDemo() {
  console.log('\n=== ANTARES GOVERNANCE ENGINE — LIVE DEMO ===\n');

  // Scenario 1: the original Din 1 story — PII deletion needs a human
  narrate(
    'SCENARIO 1: Agent proposes deleting a customer record (Din 1\'s original story)',
    { id: 'DEMO-1', action: 'delete_customer_record', actorId: 'agent-zeeshan-047', actorRole: 'verified_agent', resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request' },
    { platform: 'zeeshan-agent-platform', demo: true },
    [createTrustSignal({ id: 'TS-1', actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE', value: 0.87, source: 'trust-engine' })]
  );

  // Scenario 2: a clean, low-risk read — should sail through
  narrate(
    'SCENARIO 2: A trusted agent reads a customer record',
    { id: 'DEMO-2', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' },
    { platform: 'zeeshan-agent-platform', demo: true },
    [createTrustSignal({ id: 'TS-2', actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.92, source: 'trust-engine' })]
  );

  // Scenario 3: an unverified actor attempts an action — caught before rules even run
  narrate(
    'SCENARIO 3: An unverified actor attempts to read a customer record (adversarial case)',
    { id: 'DEMO-3', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'unverified_agent', resourceType: 'customer_record' },
    { platform: 'zeeshan-agent-platform', demo: true },
    []
  );

  line();
  console.log('FULL AUDIT TRAIL FOR THIS DEMO RUN');
  line();
  queryAuditTrail().forEach((entry) => {
    console.log('  ' + entry.auditEntryId + '  ' + entry.outcome.padEnd(14) + entry.decisionId);
  });
  console.log('\n=== END OF DEMO ===\n');
}

if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };
