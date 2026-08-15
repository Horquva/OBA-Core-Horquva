// governance/engine/runtimeEnforcement.test.js
'use strict';
//
// Run with: node governance/engine/runtimeEnforcement.test.js

const assert = require('assert');
const { handleActionRequest } = require('./runtimeEnforcement');
const { createTrustSignal } = require('./models');
const { RULES } = require('./rules');
const { _clearForTests, getAuditTrail } = require('../audit/auditLog');

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

function signals(list) {
  return list.map((s, i) => createTrustSignal({ id: 'TS-' + (i + 1), ...s }));
}

// ---- Stage 1 fail-safe: unverified actor rejected before rules/trust ever run ----
test('unverified actor -> REJECT at authority check, rules/trust never invoked', () => {
  const action = { id: 'EVT-1', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'unverified_agent', resourceType: 'customer_record' };
  const result = handleActionRequest(action, { note: 'test' }, RULES, []);
  assert.strictEqual(result.decision.outcome, 'REJECT');
  assert.strictEqual(result.stageReached, 'authority_check');
  assert.strictEqual(result.evidence.inputsSnapshot.policyCheck.skipped, true);
  assert.strictEqual(getAuditTrail().length, 1);
});

// ---- Unknown actor entirely (not even in registry) -> also REJECT ----
test('actor missing from registry entirely -> REJECT, never assume okay', () => {
  const action = { id: 'EVT-2', action: 'read_customer_record', actorId: 'agent-never-registered', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const result = handleActionRequest(action, {}, RULES, []);
  assert.strictEqual(result.decision.outcome, 'REJECT');
  assert.ok(result.decision.reason.includes('not verified'));
});

// ---- Claimed authority not granted -> REJECT even though actor is verified ----
test('verified actor claiming ungranted authority -> REJECT', () => {
  const action = {
    id: 'EVT-3', action: 'delete_customer_record', actorId: 'agent-1', actorRole: 'verified_agent',
    resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request'
  };
  // agent-1 is only granted 'read_request' in the registry
  const result = handleActionRequest(action, {}, RULES, []);
  assert.strictEqual(result.decision.outcome, 'REJECT');
  assert.ok(result.decision.reason.includes('not been granted'));
});

// ---- Full clean path: authority passes, rules+trust run, audit succeeds ----
test('verified actor with clean read -> full chain reaches ALLOW and is audited', () => {
  const action = { id: 'EVT-4', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const trust = signals([{ actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' }]);
  const result = handleActionRequest(action, {}, RULES, trust);
  assert.strictEqual(result.decision.outcome, 'ALLOW');
  assert.strictEqual(result.stageReached, 'complete');
  assert.strictEqual(result.auditWriteFailed, false);
  assert.strictEqual(getAuditTrail().length, 1);
});

// ---- PII delete still goes to HUMAN_REVIEW even with valid authority ----
test('valid authority + PII delete -> HUMAN_REVIEW (rule still applies)', () => {
  const action = {
    id: 'EVT-5', action: 'delete_customer_record', actorId: 'agent-zeeshan-047', actorRole: 'verified_agent',
    resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request'
  };
  const trust = signals([{ actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE', value: 0.87, source: 'trust-engine' }]);
  const result = handleActionRequest(action, {}, RULES, trust);
  assert.strictEqual(result.decision.outcome, 'HUMAN_REVIEW');
});

// ---- THE key fail-safe: audit write fails on an ALLOW -> downgraded, never silently allowed ----
test('audit write failure on an ALLOW decision -> downgraded to HUMAN_REVIEW', () => {
  const action = { id: 'EVT-6', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const trust = signals([{ actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' }]);
  const result = handleActionRequest(action, {}, RULES, trust, { simulateAuditFailure: true });
  assert.strictEqual(result.decision.outcome, 'HUMAN_REVIEW');
  assert.strictEqual(result.stageReached, 'audit_failed_downgraded');
  assert.ok(result.decision.reason.includes('audit write failed'));
});

// ---- Audit failure on an already-restrictive outcome keeps the outcome, just flags it ----
test('audit write failure on a REJECT decision -> outcome unchanged, flagged', () => {
  const action = { id: 'EVT-7', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'unverified_agent', resourceType: 'customer_record' };
  const result = handleActionRequest(action, {}, RULES, [], { simulateAuditFailure: true });
  assert.strictEqual(result.decision.outcome, 'REJECT');
  assert.strictEqual(result.auditWriteFailed, true);
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passing');
if (failed > 0) process.exit(1);
