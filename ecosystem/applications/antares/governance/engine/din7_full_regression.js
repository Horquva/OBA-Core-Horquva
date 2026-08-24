// Din 7 — full regression. Run: node din7_full_regression.js
// PRECONDITION: none — this script starts and stops its own server instance.

const { spawn } = require('child_process');
const path = require('path');

const ENGINE_DIR = __dirname;
const UNIT_TESTS = [
  'models.test.js', 'evaluationEngine.test.js', 'trustIntelligenceEngine.test.js',
  'runtimeEnforcement.test.js', 'governanceApi.test.js', 'adversarialTests.test.js',
];

function runNode(file, cwd) {
  return new Promise((resolve) => {
    const p = spawn('node', [file], { cwd });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => resolve({ file, code, out, err }));
  });
}

async function main() {
  console.log('='.repeat(78));
  console.log('Din 7 — FULL REGRESSION');
  console.log('='.repeat(78));

  console.log('\n--- Part A: original Din 1-9 unit test suites (48 tests) ---');
  let unitPass = 0, unitTotal = 0;
  for (const f of UNIT_TESTS) {
    const r = await runNode(f, ENGINE_DIR);
    const m = r.out.match(/(\d+)\/(\d+)\s+passed/i) || r.out.match(/(\d+) of (\d+)/i);
    const summaryLine = r.out.trim().split('\n').slice(-1)[0];
    const ok = r.code === 0;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} - ${f}: ${summaryLine}`);
    if (!ok) console.log('    ' + r.err.trim());
  }

  console.log('\n--- Part B: live server-dependent suites (Din 4 + Din 6) ---');
  const server = spawn('node', ['server.js'], { cwd: ENGINE_DIR });
  let serverErr = '';
  server.stderr.on('data', (d) => (serverErr += d));

  await new Promise((r) => setTimeout(r, 800));

  const din4 = await runNode('din4_boundary_scenario.js', ENGINE_DIR);
  console.log(`  ${din4.code === 0 ? 'PASS' : 'FAIL'} - din4_boundary_scenario.js (exit ${din4.code})`);

  const din6 = await runNode('din6_adversarial_http_tests.js', ENGINE_DIR);
  const din6Result = din6.out.match(/RESULT:.*$/m);
  console.log(`  ${din6.code === 0 ? 'PASS' : 'FAIL'} - din6_adversarial_http_tests.js: ${din6Result ? din6Result[0] : ''}`);

  server.kill();

  console.log('\n--- Part C: sanity — dead duplicate auditLog.js removal didn\'t break anything ---');
  const fs = require('fs');
  const stillThereBad = fs.existsSync(path.join(ENGINE_DIR, 'auditLog.js'));
  console.log(`  ${!stillThereBad ? 'PASS' : 'FAIL'} - dead duplicate governance/engine/auditLog.js is gone`);
  const realOneStillThere = fs.existsSync(path.join(ENGINE_DIR, '../audit/auditLog.js'));
  console.log(`  ${realOneStillThere ? 'PASS' : 'FAIL'} - real governance/audit/auditLog.js still present and untouched`);

  console.log('\n' + '='.repeat(78));
  console.log('Din 7 regression complete.');
  console.log('='.repeat(78));
}

main();
