// governance/engine/trustIntelligenceEngine.test.js
'use strict';
//
// Run with: node governance/engine/trustIntelligenceEngine.test.js

const assert = require('assert');
const {
  computeDecisionConfidence,
  determineOversight,
  evaluateRisk
} = require('./trustIntelligenceEngine');

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

// ---- computeDecisionConfidence: proves model confidence and org trust are weighted
// differently, and that they are never silently merged into "one trust number" before
// this explicit, labeled step. ----

test('decisionConfidence is high when both model confidence and org trust are high', () => {
  const c = computeDecisionConfidence({ modelConfidence: 0.9, orgTrust: 0.9, anomaly: 0 });
  assert.ok(c >= 0.85, 'expected high confidence, got ' + c);
});

test('org trust is weighted higher than model confidence (0.6 vs 0.4)', () => {
  // Same average (0.6) achieved two different ways — org-trust-heavy case should score higher.
  const orgHeavy = computeDecisionConfidence({ modelConfidence: 0.3, orgTrust: 0.9, anomaly: 0 });
  const modelHeavy = computeDecisionConfidence({ modelConfidence: 0.9, orgTrust: 0.3, anomaly: 0 });
  assert.ok(orgHeavy > modelHeavy, 'expected org-trust-heavy (' + orgHeavy + ') > model-heavy (' + modelHeavy + ')');
});

test('missing signals are treated as neutral (0.5), not as distrust', () => {
  const c = computeDecisionConfidence({ modelConfidence: null, orgTrust: null, anomaly: 0 });
  assert.strictEqual(c, 0.5);
});

test('an anomaly always reduces decisionConfidence', () => {
  const clean = computeDecisionConfidence({ modelConfidence: 0.9, orgTrust: 0.9, anomaly: 0 });
  const anomalous = computeDecisionConfidence({ modelConfidence: 0.9, orgTrust: 0.9, anomaly: 1 });
  assert.ok(anomalous < clean, 'expected anomaly to lower confidence');
});

// ---- determineOversight ----

test('a rule that requires review always forces MANDATORY oversight', () => {
  const level = determineOversight({ riskLevel: 'LOW', ruleRequiresReview: true, decisionConfidence: 0.99 });
  assert.strictEqual(level, 'MANDATORY');
});

test('CRITICAL risk forces MANDATORY oversight even with no matching rule', () => {
  const level = determineOversight({ riskLevel: 'CRITICAL', ruleRequiresReview: false, decisionConfidence: 0.9 });
  assert.strictEqual(level, 'MANDATORY');
});

test('HIGH risk gets STANDARD oversight', () => {
  const level = determineOversight({ riskLevel: 'HIGH', ruleRequiresReview: false, decisionConfidence: 0.9 });
  assert.strictEqual(level, 'STANDARD');
});

test('low decisionConfidence forces at least STANDARD oversight, even at LOW risk', () => {
  const level = determineOversight({ riskLevel: 'LOW', ruleRequiresReview: false, decisionConfidence: 0.2 });
  assert.strictEqual(level, 'STANDARD');
});

test('clean LOW risk + high confidence needs NO oversight', () => {
  const level = determineOversight({ riskLevel: 'LOW', ruleRequiresReview: false, decisionConfidence: 0.9 });
  assert.strictEqual(level, 'NONE');
});

// ---- evaluateRisk ----

test('an unmatched action defaults to at least MEDIUM risk (fail-safe)', () => {
  const risk = evaluateRisk([], { orgTrust: 0.9, anomaly: 0 });
  assert.strictEqual(risk, 'MEDIUM');
});

test('an anomaly pushes risk to at least HIGH regardless of rule severity', () => {
  const risk = evaluateRisk([{ severity: 'LOW' }], { orgTrust: 0.9, anomaly: 1 });
  assert.strictEqual(risk, 'HIGH');
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passing');
if (failed > 0) process.exit(1);
