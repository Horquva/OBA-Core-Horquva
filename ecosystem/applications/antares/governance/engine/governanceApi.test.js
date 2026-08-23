// governance/engine/governanceApi.test.js
'use strict';
//
// Run with: node governance/engine/governanceApi.test.js
//
// Each test simulates the kind of call the named partner platform will actually make.

const assert = require('assert');
const {
  requestGovernanceDecision,
  previewGovernanceOutcome,
  queryAuditTrail
} = require('./governanceApi');
const { _clearForTests } = require('../audit/auditLog');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    _clearForTests();
    fn();
    console.log('PASS - ' + name);
    passed++;
  } catch (err) {
    console.log('FAIL - ' + name + ' -> ' + err.message);
    failed++;
  }
}

// ---- Zeeshan's Agent Platform: a real action, full chain, gets audited ----
test('Zeeshan: real action request reaches a decision and is audited', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'EVT-Z1', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: { platform: 'zeeshan-agent-platform' },
    trustSignals: [{ actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' }]
  });
  assert.strictEqual(response.outcome, 'ALLOW');
  assert.ok(response.auditEntryId, 'expected a real audit entry to be written');
  assert.strictEqual(queryAuditTrail().length, 1);
});

test('Zeeshan: a malformed trust signal is dropped, not fatal', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'EVT-Z2', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {},
    trustSignals: [
      { actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' },
      { actorId: 'agent-1', signalType: 'NOT_A_REAL_TYPE', value: 5, source: 'bad-caller' } // invalid on purpose
    ]
  });
  assert.strictEqual(response.outcome, 'ALLOW'); // still works using the one valid signal
});

// ---- Zara's Capability Validation: preview only, nothing written ----
test('Zara: preview shows what WOULD happen without creating any audit entry', () => {
  const response = previewGovernanceOutcome({
    actionRequest: { id: 'EVT-ZA1', action: 'delete_customer_record', actorId: 'agent-zeeshan-047', actorRole: 'verified_agent', resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request' },
    context: { platform: 'zara-capability-validation' },
    trustSignals: [{ actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE', value: 0.87, source: 'trust-engine' }]
  });
  assert.strictEqual(response.outcome, 'HUMAN_REVIEW');
  assert.strictEqual(response.auditEntryId, null);
  assert.strictEqual(queryAuditTrail().length, 0, 'a preview must never write to the audit log');
});

test('Zara: preview of an unverified actor still catches the authority failure', () => {
  const response = previewGovernanceOutcome({
    actionRequest: { id: 'EVT-ZA2', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'unverified_agent', resourceType: 'customer_record' },
    context: {},
    trustSignals: []
  });
  assert.strictEqual(response.outcome, 'REJECT');
  assert.strictEqual(queryAuditTrail().length, 0);
});

// ---- Abbas's Operationalization: read-only reporting over real decisions ----
test('Abbas: can query the full audit trail after some real activity happened', () => {
  requestGovernanceDecision({
    actionRequest: { id: 'EVT-AB1', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: [{ actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' }]
  });
  requestGovernanceDecision({
    actionRequest: { id: 'EVT-AB2', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'unverified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: []
  });
  const trail = queryAuditTrail();
  assert.strictEqual(trail.length, 2);
});

test('Abbas: can look up one decision by id, without pulling the whole trail', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'EVT-AB3', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: [{ actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' }]
  });
  const filtered = queryAuditTrail({ decisionId: response.decisionId });
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].decisionId, response.decisionId);
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passing');
if (failed > 0) process.exit(1);
