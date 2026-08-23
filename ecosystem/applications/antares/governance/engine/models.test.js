// governance/engine/models.test.js
'use strict';
//
// No test framework dependency — plain Node.js assertions, run with:
//   node governance/engine/models.test.js
//
// Rebuilds Din 1's scenario (agent requests customer record deletion) using the
// Din 2 models, to prove the models can actually represent a real decision end to end.

const assert = require('assert');
const {
  createGovernanceRule, createTrustSignal, createGovernanceDecision, createEvidence
} = require('./models');

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

// ---- GovernanceRule ----

test('creates a valid GovernanceRule (R-09 from Din 1 scenario)', () => {
  const rule = createGovernanceRule({
    id: 'R-09',
    name: 'PII deletion requires human review',
    description: 'Deletion of sensitive PII records always requires HUMAN_REVIEW.',
    appliesTo: { actions: ['delete_customer_record'], resourceTypes: ['customer_record'] },
    requirement: 'REQUIRE_HUMAN_REVIEW_IF_MATCH',
    severity: 'HIGH',
    active: true
  });
  assert.strictEqual(rule.id, 'R-09');
  assert.strictEqual(rule.requirement, 'REQUIRE_HUMAN_REVIEW_IF_MATCH');
});

test('rejects a GovernanceRule with bad id format', () => {
  assert.throws(() => createGovernanceRule({
    id: 'rule-09', name: 'x', appliesTo: { actions: ['a'] },
    requirement: 'CONDITIONAL', severity: 'LOW', active: true
  }), /Invalid GovernanceRule/);
});

// ---- TrustSignal ----

test('creates MODEL_CONFIDENCE and ORG_TRUST_SCORE as separate signals (never merged)', () => {
  const modelConfidence = createTrustSignal({
    id: 'TS-1', actorId: 'agent-zeeshan-047', signalType: 'MODEL_CONFIDENCE',
    value: 0.91, source: 'agent-zeeshan-047-self-report'
  });
  const orgTrust = createTrustSignal({
    id: 'TS-2', actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE',
    value: 0.87, source: 'trust-intelligence-engine-v1'
  });
  assert.notStrictEqual(modelConfidence.signalType, orgTrust.signalType);
  assert.strictEqual(modelConfidence.value, 0.91);
  assert.strictEqual(orgTrust.value, 0.87);
});

test('rejects a TrustSignal with value out of 0-1 range', () => {
  assert.throws(() => createTrustSignal({
    id: 'TS-3', actorId: 'a', signalType: 'MODEL_CONFIDENCE', value: 1.5, source: 'x'
  }), /Invalid TrustSignal/);
});

// ---- GovernanceDecision ----

test('creates a valid GovernanceDecision (HUMAN_REVIEW from Din 1 scenario)', () => {
  const decision = createGovernanceDecision({
    id: 'D-2026-0813-0091',
    actionRequestId: 'EVT-2026-0813-0091',
    outcome: 'HUMAN_REVIEW',
    reason: 'Rule R-09 requires human review for PII deletion; risk level HIGH.',
    rulesApplied: ['R-09'],
    trustSignalsConsidered: ['TS-1', 'TS-2'],
    accountableOwner: 'governance-platform-lead',
    riskLevel: 'HIGH'
  });
  assert.strictEqual(decision.outcome, 'HUMAN_REVIEW');
  assert.strictEqual(decision.rulesApplied.length, 1);
});

test('rejects a GovernanceDecision with an invalid outcome', () => {
  assert.throws(() => createGovernanceDecision({
    id: 'D-1', actionRequestId: 'EVT-1', outcome: 'MAYBE',
    reason: 'x', accountableOwner: 'y', riskLevel: 'LOW'
  }), /Invalid GovernanceDecision/);
});

// ---- Evidence ----

test('creates immutable Evidence wrapping the full decision chain', () => {
  const evidence = createEvidence({
    id: 'EV-2026-0813-0091',
    decisionId: 'D-2026-0813-0091',
    inputsSnapshot: {
      event: { action: 'delete_customer_record' },
      context: { actor: 'agent-zeeshan-047' },
      policyCheck: { ruleId: 'R-09', result: 'conditional' },
      analysis: { riskLevel: 'HIGH' }
    }
  });
  assert.strictEqual(evidence.decisionId, 'D-2026-0813-0091');
  assert.throws(() => { evidence.decisionId = 'tampered'; }, /Cannot assign/);
});

test('rejects Evidence missing part of inputsSnapshot', () => {
  assert.throws(() => createEvidence({
    id: 'EV-1', decisionId: 'D-1',
    inputsSnapshot: { event: {}, context: {} } // missing policyCheck, analysis
  }), /Invalid Evidence/);
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passing');
if (failed > 0) process.exit(1);
