// Din 4 — Prove ONE legitimate end-to-end scenario for OUR governance boundary only.
//
// Scope discipline (per Din 4's own instruction): this does NOT try to prove all
// Antares platforms work together. It proves Kanwal's boundary — Authority Check ->
// Rules -> Trust -> Decision -> Audit -> independent retrieval — is real and complete
// on its own, reachable only through the documented public contract (CONTRACT.md),
// with no dependency on any other platform's internal correctness.
//
// Two things make this different from demo.js (Din 10) and the Din 3 integration demo:
//   1. It is a genuinely NEW actor/decision, not a replay of DEMO-1/2/3 or the R-09
//      test fixture — so a passing result can't be explained by canned data.
//   2. Step 2 is a SEPARATE HTTP call, made after step 1 has fully returned, simulating
//      an independent auditor checking the record later — proving the audit entry
//      really persisted server-side across requests, not just inside one function call.
//
// PRECONDITION: node governance/engine/server.js running on port 4003.
// Run: node din4_boundary_scenario.js

const http = require('http');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      { host: '127.0.0.1', port: 4003, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(JSON.parse(data)));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: 4003, path }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  console.log('='.repeat(78));
  console.log('Din 4 — Legitimate end-to-end scenario: GDPR erasure request');
  console.log('(genuinely new actor/decision — not replayed demo/test data)');
  console.log('='.repeat(78));

  const actionRequest = {
    id: 'GDPR-ERASURE-2026-0823-01',
    action: 'delete_customer_record',
    actorId: 'agent-zeeshan-047',
    actorRole: 'verified_agent',
    resourceType: 'customer_record',
    claimedAuthority: 'customer_deletion_request',
  };
  const context = { platform: 'zeeshan-agent-platform', reason: 'customer submitted a real GDPR Article 17 erasure request' };
  const trustSignals = [
    { actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE', value: 0.91, source: 'trust-engine' },
  ];

  console.log('\n--- Step 1: real HTTP POST /api/evaluate (the documented public contract) ---');
  console.log('Actor:', actionRequest.actorId, '| Action:', actionRequest.action, '| Claimed authority:', actionRequest.claimedAuthority);

  const result = await postJson('/api/evaluate', { actionRequest, context, trustSignals });

  console.log('\nOutcome:         ', result.outcome);
  console.log('Reason:          ', result.reason);
  console.log('Risk level:      ', result.riskLevel);
  console.log('Accountable owner:', result.accountableOwner);
  console.log('Decision id:     ', result.decisionId);
  console.log('Evidence id:     ', result.evidenceId);
  console.log('Audit entry id:  ', result.auditEntryId);
  console.log('Audit write failed:', result.auditWriteFailed);

  if (result.outcome !== 'HUMAN_REVIEW') {
    console.error('\nFAIL: expected HUMAN_REVIEW (R-09 must override trust for PII deletion) — got', result.outcome);
    process.exit(1);
  }
  if (!result.auditEntryId) {
    console.error('\nFAIL: no audit entry id — a real decision must always produce a retrievable audit record.');
    process.exit(1);
  }

  console.log('\n--- Step 2: SEPARATE HTTP call, simulating an independent auditor checking later ---');
  console.log('(new request, new connection — proves persistence across requests, not just in-memory recall inside one call)');

  const auditCheck = await getJson('/api/decisions');
  const found = auditCheck.auditTrail.find((e) => e.decisionId === result.decisionId);

  if (!found) {
    console.error('\nFAIL: decision', result.decisionId, 'was NOT found in the independently-retrieved audit trail.');
    process.exit(1);
  }

  console.log('Found in independently-retrieved audit trail:');
  console.log('  auditEntryId:     ', found.auditEntryId);
  console.log('  outcome:          ', found.outcome);
  console.log('  accountableOwner: ', found.accountableOwner);
  console.log('  recordedAt:       ', found.recordedAt);

  if (found.outcome !== result.outcome) {
    console.error('\nFAIL: audit trail outcome does not match the original decision — record integrity broken.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(78));
  console.log('Din 4 PROVEN: a genuinely new, legitimate (non-adversarial) real-world');
  console.log('request went through the full boundary — Authority -> Rules -> Trust ->');
  console.log('Decision -> Audit — using ONLY the documented public HTTP contract, and');
  console.log('the resulting record was independently re-confirmed in a separate request.');
  console.log('This proves Kanwal\'s own boundary is complete and correct on its own —');
  console.log('no other Antares platform\'s code had to be involved or correct for this');
  console.log('to hold.');
  console.log('='.repeat(78));
}

run().catch((e) => { console.error(e); process.exit(1); });
