// Din 6 — Invalid / unauthorized / malformed / adversarial condition testing.
// "Antares kabhi galat proceed ya false success report na kare."
//
// Din 8-9 already unit-tested adversarial cases (adversarialTests.test.js, 8/8) by
// calling handleActionRequest() directly. This Din 6 pass is deliberately different:
// it hits the LIVE HTTP contract — the same surface a real external platform actually
// uses — because Din 2 already proved once that something safe at the JS-function level
// (AT-5) can still be broken at the HTTP layer if the wrapper around it is wrong. Every
// case here is something a unit test calling internal functions directly cannot catch.
//
// PRECONDITION: node governance/engine/server.js running on port 4003.
// Run: node din6_adversarial_http_tests.js
// Exits non-zero if ANY case doesn't fail safely — treat this as a CI gate, not a demo.

const http = require('http');

function rawPost(path, rawBody) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: '127.0.0.1', port: 4003, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(rawBody) } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', (e) => resolve({ status: null, error: e.message }));
    req.write(rawBody);
    req.end();
  });
}

function getRaw(path) {
  return new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port: 4003, path }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', (e) => resolve({ status: null, error: e.message }));
  });
}

let passed = 0, failed = 0;
function check(label, condition, detail) {
  if (condition) { console.log('  PASS -', label); passed++; }
  else { console.log('  FAIL -', label, detail ? '(' + detail + ')' : ''); failed++; }
}

async function main() {
  console.log('='.repeat(78));
  console.log('Din 6 — adversarial/invalid/malformed/unauthorized tests against LIVE HTTP');
  console.log('='.repeat(78));

  // 1. Malformed JSON body — server must not crash, must not silently succeed.
  console.log('\n[1] Malformed JSON body');
  const r1 = await rawPost('/api/evaluate', '{this is not valid json');
  check('returns 400, not a crash or a fake 200', r1.status === 400, 'got ' + r1.status);
  const health1 = await getRaw('/health');
  check('server still alive after malformed body', health1.status === 200);

  // 2. Missing actionRequest entirely.
  console.log('\n[2] Missing actionRequest field');
  const r2 = await rawPost('/api/evaluate', JSON.stringify({ context: {}, trustSignals: [] }));
  check('rejected, not defaulted to some silent ALLOW', r2.status === 400, 'got ' + r2.status);

  // 3. Missing actorId on an otherwise well-formed request — fail-safe must be REJECT-equivalent,
  //    never ALLOW, per authorityCheck.js's own stated fail-safe principle.
  console.log('\n[3] Missing actorId (fail-safe must never default to allow)');
  const r3 = await rawPost('/api/evaluate', JSON.stringify({
    actionRequest: { id: 'DIN6-1', action: 'read_customer_record', resourceType: 'customer_record' },
    context: {}, trustSignals: []
  }));
  const b3 = JSON.parse(r3.body);
  check('outcome is REJECT (never ALLOW)', b3.outcome === 'REJECT', 'got ' + b3.outcome);
  check('reason correctly names missing actorId', /actorId/i.test(b3.reason || ''), b3.reason);

  // 4. Unverified actor spoofing a verified role via HTTP (same family as AT-1, but over HTTP).
  console.log('\n[4] Unverified actor (agent-x) claims actorRole=verified_agent over HTTP');
  const r4 = await rawPost('/api/evaluate', JSON.stringify({
    actionRequest: { id: 'DIN6-2', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: []
  }));
  const b4 = JSON.parse(r4.body);
  check('rejected based on registry truth, not the self-claimed role', b4.outcome === 'REJECT', 'got ' + b4.outcome);

  // 5. Forged high trust score from an untrusted source, over HTTP (re-verifying Din 2's fix
  //    still holds after Din 3/5 changes — regression check).
  console.log('\n[5] Forged ORG_TRUST_SCORE from an untrusted source (Din 2 regression check)');
  const r5 = await rawPost('/api/evaluate', JSON.stringify({
    actionRequest: { id: 'DIN6-3', action: 'update_customer_record', actorId: 'agent-2', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {},
    trustSignals: [{ actorId: 'agent-2', signalType: 'ORG_TRUST_SCORE', value: 0.99, source: 'attacker-controlled-client' }]
  }));
  const b5 = JSON.parse(r5.body);
  check('forged signal did not buy an ALLOW (R-05 needs trust >= 0.7 from a REAL source)',
        b5.outcome !== 'ALLOW', 'got ' + b5.outcome);

  // 6. claimedAuthority the actor does not actually hold.
  console.log('\n[6] Actor claims an authority they were never granted');
  const r6 = await rawPost('/api/evaluate', JSON.stringify({
    actionRequest: { id: 'DIN6-4', action: 'delete_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request' },
    context: {}, trustSignals: []
  }));
  const b6 = JSON.parse(r6.body);
  check('rejected — agent-1 only holds read_request, not customer_deletion_request', b6.outcome === 'REJECT', 'got ' + b6.outcome);

  // 7. Every real decision must produce an auditEntryId — "false success" would be
  //    outcome present but nothing recorded.
  console.log('\n[7] No decision is ever reported without a matching audit record');
  const r7 = await rawPost('/api/evaluate', JSON.stringify({
    actionRequest: { id: 'DIN6-5', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' },
    context: {}, trustSignals: []
  }));
  const b7 = JSON.parse(r7.body);
  check('auditEntryId present', !!b7.auditEntryId, 'got ' + b7.auditEntryId);
  const stateCheck = await getRaw('/api/decisions');
  const state = JSON.parse(stateCheck.body);
  const foundInAudit = state.decisions.find(d => d.decisionId === b7.decisionId);
  check('independently retrievable in real audit state (Din 5 path)', !!foundInAudit);

  // 8. Unauthenticated access — documents a REAL gap rather than hiding it.
  console.log('\n[8] Unauthenticated access check (documenting a real gap, not a pass/fail bug)');
  const r8 = await getRaw('/api/rules');
  console.log('  GET /api/rules with NO credentials at all -> status', r8.status,
              '(no auth mechanism exists on this engine at all — see report)');

  console.log('\n' + '='.repeat(78));
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(78));
  if (failed > 0) process.exit(1);
}

main();
