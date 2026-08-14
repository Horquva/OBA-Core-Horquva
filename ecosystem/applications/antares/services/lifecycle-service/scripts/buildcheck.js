'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * scripts/buildcheck.js
 * ----------------------
 * Day 5's "Build" piece. Plain Node.js has no compiler, but a "build
 * check" means: is every file syntactically correct, can it be loaded
 * without crashing. Node's built-in `--check` flag verifies this
 * without actually running the file — exactly like a compiler would.
 */

const SRC_DIR = path.join(__dirname, '..', 'src');

function listJsFiles(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
}

function runBuildCheck() {
  const files = listJsFiles(SRC_DIR);
  const failures = [];

  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    try {
      execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
    } catch (err) {
      failures.push({ file, error: err.stderr ? err.stderr.toString() : err.message });
    }
  }

  return { passed: failures.length === 0, filesChecked: files.length, failures };
}

function printReport(result) {
  console.log(`Build check: ${result.filesChecked} file(s) checked`);
  if (result.passed) {
    console.log('BUILD PASSED \u2705');
    return;
  }
  console.log('BUILD FAILED \u274c');
  for (const f of result.failures) {
    console.log(`  ${f.file}:`);
    console.log(`    ${f.error.trim()}`);
  }
}

if (require.main === module) {
  const result = runBuildCheck();
  printReport(result);
  process.exitCode = result.passed ? 0 : 1;
}

module.exports = { runBuildCheck };
