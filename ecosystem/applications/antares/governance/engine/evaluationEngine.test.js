// governance/engine/evaluationEngine.test.js
'use strict';
//
// No test framework — plain Node assertions. Run with:
//   node governance/engine/evaluationEngine.test.js
//
// Six real scenarios, chosen to force every possible outcome at least once so we can
// prove the engine actually distinguishes them (not just happens to always say ALLOW).

const assert = require('assert');
const { evaluateAction } = require('./evaluationEngine');
const { createTrustSignal } = require('./models');
const { RULES } = require('./rules');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
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

// ---- Scenario A: clean read -> ALLOW ----
test('Scenario A: read by a trusted actor -> ALLOW', () => {
  const action = { id: 'EVT-A', action: 'read_customer_record', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const trust = signals([
    { actorId: 'agent-1', signalType: 'MODEL_CONFIDENCE', value: 0.95, source: 'agent-1' },
    { actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' }
  ]);
  const { decision } = evaluateAction(action, { actor: 'agent-1' }, RULES, trust);
  assert.strictEqual(decision.outcome, 'ALLOW');
  assert.ok(decision.reason.includes('R-01'));
});

// ---- Scenario B: PII delete -> HUMAN_REVIEW (Din 1 scenario) ----
test('Scenario B: PII deletion -> HUMAN_REVIEW regardless of trust', () => {
  const action = { id: 'EVT-B', action: 'delete_customer_record', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const trust = signals([
    { actorId: 'agent-zeeshan-047', signalType: 'MODEL_CONFIDENCE', value: 0.91, source: 'agent-zeeshan-047' },
    { actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE', value: 0.87, source: 'trust-engine' }
  ]);
  const { decision } = evaluateAction(action, { actor: 'agent-zeeshan-047' }, RULES, trust);
  assert.strictEqual(decision.outcome, 'HUMAN_REVIEW');
  assert.ok(decision.reason.includes('R-09'));
});

// ---- Scenario C: unverified actor -> REJECT, even with perfect trust scores ----
test('Scenario C: unverified actor -> REJECT overrides even high trust', () => {
  const action = { id: 'EVT-C', action: 'read_customer_record', actorRole: 'unverified_agent', resourceType: 'customer_record' };
  const trust = signals([
    { actorId: 'agent-x', signalType: 'ORG_TRUST_SCORE', value: 0.99, source: 'trust-engine' }
  ]);
  const { decision } = evaluateAction(action, { actor: 'agent-x' }, RULES, trust);
  assert.strictEqual(decision.outcome, 'REJECT');
  assert.ok(decision.reason.includes('R-13'));
});

// ---- Scenario D: conditional update, low trust -> ESCALATE ----
test('Scenario D: conditional rule + low org trust -> ESCALATE', () => {
  const action = { id: 'EVT-D', action: 'update_customer_record', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const trust = signals([
    { actorId: 'agent-2', signalType: 'ORG_TRUST_SCORE', value: 0.4, source: 'trust-engine' }
  ]);
  const { decision } = evaluateAction(action, { actor: 'agent-2' }, RULES, trust);
  assert.strictEqual(decision.outcome, 'ESCALATE');
});

// ---- Scenario E: conditional update, high trust + no anomaly -> ALLOW ----
test('Scenario E: conditional rule + high org trust, no anomaly -> ALLOW', () => {
  const action = { id: 'EVT-E', action: 'update_customer_record', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const trust = signals([
    { actorId: 'agent-3', signalType: 'ORG_TRUST_SCORE', value: 0.85, source: 'trust-engine' }
  ]);
  const { decision } = evaluateAction(action, { actor: 'agent-3' }, RULES, trust);
  assert.strictEqual(decision.outcome, 'ALLOW');
  assert.ok(decision.reason.includes('R-05'));
});

// ---- Scenario F: completely unknown action -> HUMAN_REVIEW (fail-safe) ----
test('Scenario F: unknown/unmapped action -> HUMAN_REVIEW fail-safe, never ALLOW', () => {
  const action = { id: 'EVT-F', action: 'trigger_wire_transfer', actorRole: 'verified_agent', resourceType: 'bank_account' };
  const trust = signals([
    { actorId: 'agent-4', signalType: 'ORG_TRUST_SCORE', value: 0.99, source: 'trust-engine' }
  ]);
  const { decision } = evaluateAction(action, { actor: 'agent-4' }, RULES, trust);
  assert.strictEqual(decision.outcome, 'HUMAN_REVIEW');
  assert.ok(decision.reason.includes('No governance rule covers'));
});

// ---- Scenario G: anomaly flag pushes a normally-ALLOW action to ESCALATE ----
test('Scenario G: anomaly flag on an otherwise-clean read -> ESCALATE', () => {
  const action = { id: 'EVT-G', action: 'read_customer_record', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const trust = signals([
    { actorId: 'agent-5', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' },
    { actorId: 'agent-5', signalType: 'ANOMALY_FLAG', value: 1, source: 'anomaly-detector' }
  ]);
  const { decision } = evaluateAction(action, { actor: 'agent-5' }, RULES, trust);
  assert.strictEqual(decision.outcome, 'ESCALATE');
});

// ---- Every decision must carry linked, complete Evidence ----
test('Every decision produces matching, complete Evidence', () => {
  const action = { id: 'EVT-H', action: 'read_customer_record', actorRole: 'verified_agent', resourceType: 'customer_record' };
  const trust = signals([{ actorId: 'agent-6', signalType: 'ORG_TRUST_SCORE', value: 0.9, source: 'trust-engine' }]);
  const { decision, evidence } = evaluateAction(action, { actor: 'agent-6' }, RULES, trust);
  assert.strictEqual(evidence.decisionId, decision.id);
  assert.strictEqual(evidence.inputsSnapshot.event.id, 'EVT-H');
  assert.ok(evidence.inputsSnapshot.policyCheck);
  assert.ok(evidence.inputsSnapshot.analysis);
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passing');
if (failed > 0) process.exit(1);
