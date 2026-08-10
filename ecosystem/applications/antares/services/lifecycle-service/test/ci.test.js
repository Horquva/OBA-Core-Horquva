'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { runLint } = require('../scripts/lint');
const { runBuildCheck } = require('../scripts/buildcheck');

test('runLint passes on the real, clean src/ directory', () => {
  const result = runLint();
  assert.equal(result.passed, true);
  assert.equal(result.report.length, 0);
});

test('runBuildCheck passes on the real, clean src/ directory (no syntax errors)', () => {
  const result = runBuildCheck();
  assert.equal(result.passed, true);
  assert.equal(result.failures.length, 0);
});

test('lint script exits with code 1 when a file uses var / TODO (simulated via a temp copy)', () => {
  // Build an isolated temp "src" dir with one deliberately bad file,
  // and point a throwaway copy of lint.js at it — this proves the
  // RULES work without touching the real project files.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antares-lint-test-'));
  fs.writeFileSync(path.join(tmpDir, 'bad.js'), "'use strict';\nvar x = 1; // TODO fix\n");

  const lintScriptSrc = fs
    .readFileSync(path.join(__dirname, '..', 'scripts', 'lint.js'), 'utf-8')
    .replace("path.join(__dirname, '..', 'src')", JSON.stringify(tmpDir));
  const tmpScript = path.join(tmpDir, 'lint-runner.js');
  fs.writeFileSync(tmpScript, lintScriptSrc);

  let threw = false;
  try {
    execFileSync(process.execPath, [tmpScript], { stdio: 'pipe' });
  } catch (err) {
    threw = true;
    assert.equal(err.status, 1);
  }
  assert.equal(threw, true, 'lint should exit non-zero on a bad file');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
