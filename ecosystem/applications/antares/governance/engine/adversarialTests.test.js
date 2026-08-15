// governance/engine/adversarialTests.test.js
'use strict';
//
// Din 8-9 deliverable. Run with: node governance/engine/adversarialTests.test.js
//
// Each test plays the role of an attacker trying to get an outcome the engine should
// never give them. The point of this file is to break things — if a test fails here,
// that's a real weakness, not a bug in the test.

const assert = require('assert');
const { requestGovernanceDecision, previewGovernanceOutcome } = require('./governanceApi');
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

// ---- AT-1: Unauthorized action — verified actor, but for an authority it was never granted ----
test('AT-1 unauthorized action: verified actor claims an authority it does not hold -> REJECT', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'ATK-1', action: 'delete_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request' },
    context: {}, trustSignals: []
  });
  // agent-1 is only granted 'read_request' in the registry
  assert.strictEqual(response.outcome, 'REJECT');
});

// ---- AT-2: Privilege escalation — attacker relabels its own actorRole, hoping the
// rules layer (which reads actorRole) grants access the identity layer wouldn't.
// The authority check is keyed on actorId (verified identity), not the self-declared
// actorRole, so this must still fail even though it dodges rule R-13. ----
test('AT-2 privilege escalation via actorRole spoofing -> still REJECT (authority check is identity-based, not label-based)', () => {
  const response = requestGovernanceDecision({
    // agent-x is unverified in the registry; attacker just relabels actorRole to
    // dodge rule R-13, which only checks the actorRole string.
    actionRequest: { id: 'ATK-2', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: []
  });
  assert.strictEqual(response.outcome, 'REJECT');
  assert.ok(response.reason.includes('not verified'));
});

// ---- AT-3: Fake authority — an actorId that was never registered at all ----
test('AT-3 fake authority: fabricated actorId not in registry -> REJECT, never defaults to allow', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'ATK-3', action: 'read_customer_record', actorId: 'agent-totally-made-up-99', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: []
  });
  assert.strictEqual(response.outcome, 'REJECT');
});

// ---- AT-4: Registry lookup must be exact-match, not case-insensitive ----
test('AT-4 case-spoofed actorId ("Agent-1" vs "agent-1") -> REJECT, not silently matched to the real actor', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'ATK-4', action: 'read_customer_record', actorId: 'Agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: []
  });
  assert.strictEqual(response.outcome, 'REJECT');
});

// ---- AT-5: Trust signal spoofing — attacker self-reports a perfect trust score from
// an untrusted source, trying to force a CONDITIONAL rule to auto-ALLOW. ----
test('AT-5 forged trust signal from an untrusted source must not be able to buy an ALLOW', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'ATK-5', action: 'update_customer_record', actorId: 'agent-2', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {},
    trustSignals: [
      { actorId: 'agent-2', signalType: 'ORG_TRUST_SCORE', value: 1.0, source: 'attacker-controlled-client' }
    ]
  });
  assert.notStrictEqual(response.outcome, 'ALLOW', 'a self-reported trust signal from an unrecognized source must not be able to force ALLOW');
});

// ---- AT-6: Replay — resubmitting an identical rejected request must not eventually
// succeed just by retrying. Determinism check. ----
test('AT-6 replaying an identical rejected request gives the identical rejected result every time', () => {
  const attack = {
    actionRequest: { id: 'ATK-6', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'unverified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: []
  };
  const r1 = requestGovernanceDecision(attack);
  const r2 = requestGovernanceDecision(attack);
  const r3 = requestGovernanceDecision(attack);
  assert.strictEqual(r1.outcome, 'REJECT');
  assert.strictEqual(r2.outcome, 'REJECT');
  assert.strictEqual(r3.outcome, 'REJECT');
  assert.strictEqual(getAuditTrail().length, 3, 'every attempt must still be individually audited, even identical ones');
});

// ---- AT-7: Explainability — every rejection above must give a SPECIFIC, checkable
// reason, not a generic "denied" message a human/auditor can't act on. ----
test('AT-7 explainability: authority failures name the exact actor and exact problem', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'ATK-7', action: 'delete_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request' },
    context: {}, trustSignals: []
  });
  assert.ok(response.reason.includes('agent-1'), 'reason should name the specific actor');
  assert.ok(response.reason.includes('customer_deletion_request'), 'reason should name the specific authority that was wrongly claimed');
  assert.ok(response.reason.length > 20, 'reason must not be a generic one-word message');
});

test('AT-7b explainability: a rule-driven decision names the exact rule id', () => {
  const response = requestGovernanceDecision({
    actionRequest: { id: 'ATK-8', action: 'delete_customer_record', actorId: 'agent-zeeshan-047', actorRole: 'verified_agent', resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request' },
    context: {}, trustSignals: [{ actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE', value: 0.87, source: 'trust-engine' }]
  });
  assert.strictEqual(response.outcome, 'HUMAN_REVIEW');
  assert.ok(response.reason.includes('R-09'), 'reason should cite the specific rule that fired');
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passing');
if (failed > 0) process.exit(1);
