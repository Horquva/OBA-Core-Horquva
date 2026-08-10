'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { runLint, } = require('./lint');
const { runBuildCheck } = require('./buildcheck');

/**
 * scripts/ci.js
 * -------------
 * Din 5 ka poora pipeline, exactly jaisa roadmap mein likha tha:
 *
 *   Code Change -> Preflight -> Build -> Static Checks
 *   -> Unit Tests -> Integration Tests -> Quality Gate -> Release Candidate
 *
 * Ye woh cheez hai jo GitHub par har push/PR par khud-ba-khud chalni
 * chahiye (.github/workflows/ci.yml ke through) — taake koi bhi
 * broken cheez `antares` branch mein na phisal sake.
 *
 * Rule: agar koi bhi stage FAIL ho, agla stage chalta hi nahi —
 * turant ruk jata hai (fail-fast), taake time zaya na ho aur
 * problem foran samajh aaye.
 */

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function runTests() {
  const testDir = path.join(__dirname, '..', 'test');
  const testFiles = fs
    .readdirSync(testDir)
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => path.join('test', f));

  try {
    const output = execFileSync(process.execPath, ['--test', ...testFiles], { stdio: 'pipe', cwd: path.join(__dirname, '..') });
    console.log(output.toString());
    return { passed: true };
  } catch (err) {
    console.log((err.stdout || '').toString());
    console.log((err.stderr || '').toString());
    return { passed: false };
  }
}

function main() {
  section('STAGE 1/3 — LINT (static checks)');
  const lint = runLint();
  console.log(`Files checked: ${lint.filesChecked}, passed: ${lint.passed}`);
  if (!lint.passed) {
    for (const entry of lint.report) {
      console.log(`  ${entry.file}: ${entry.problems.join('; ')}`);
    }
    console.log('\nCI STOPPED — lint failed. Fix the issues above before continuing.');
    process.exitCode = 1;
    return;
  }
  console.log('Lint passed \u2705');

  section('STAGE 2/3 — BUILD (syntax check on every file)');
  const build = runBuildCheck();
  console.log(`Files checked: ${build.filesChecked}, passed: ${build.passed}`);
  if (!build.passed) {
    for (const f of build.failures) console.log(`  ${f.file}: ${f.error.trim()}`);
    console.log('\nCI STOPPED — build failed. Fix the syntax errors above before continuing.');
    process.exitCode = 1;
    return;
  }
  console.log('Build passed \u2705');

  section('STAGE 3/3 — TESTS (unit + integration)');
  const tests = runTests();
  if (!tests.passed) {
    console.log('\nCI STOPPED — tests failed. Fix the failing tests above before continuing.');
    process.exitCode = 1;
    return;
  }

  section('QUALITY GATE RESULT');
  console.log('ALL STAGES PASSED \u2705\u2705\u2705');
  console.log('This change is a RELEASE CANDIDATE — safe to open a Pull Request.');
  process.exitCode = 0;
}

if (require.main === module) {
  main();
}

module.exports = { main };
