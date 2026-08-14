'use strict';

const fs = require('fs');
const path = require('path');

/**
 * scripts/lint.js
 * ----------------
 * Day 5's "static check" piece. It doesn't use an external package
 * (eslint etc.) — so every team member can run it with no extra
 * install. It checks every .js file against its own rules:
 *
 *   1) the file must start with 'use strict'
 *   2) `var` must not be used (always let/const)
 *   3) no leftover TODO / FIXME comment
 *   4) core logic files (models/engine/persistence/qualityGates/seed)
 *      must not contain "debug" console.log — only the entrypoint
 *      files (demo, board, cli) are allowed to print
 *
 * If any rule fails, the whole lint FAILS — exit code 1, so CI can
 * catch it and stop the pipeline from continuing.
 */

const SRC_DIR = path.join(__dirname, '..', 'src');
const PRINT_ALLOWED_FILES = new Set(['demo.js', 'board.js', 'cli.js', 'dashboard.js']);

function listJsFiles(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
}

function checkFile(filename) {
  const filePath = path.join(SRC_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  const problems = [];

  if (!content.trimStart().startsWith("'use strict'")) {
    problems.push("missing 'use strict' at top of file");
  }
  if (/(^|\W)var\s/.test(content)) {
    problems.push('uses `var` — use `let` or `const` instead');
  }
  if (/\bTODO\b|\bFIXME\b/.test(content)) {
    problems.push('contains a leftover TODO/FIXME marker');
  }
  if (!PRINT_ALLOWED_FILES.has(filename) && /console\.log\(/.test(content)) {
    problems.push('contains console.log in core logic (only demo.js/board.js/cli.js may print)');
  }

  return problems;
}

function runLint() {
  const files = listJsFiles(SRC_DIR);
  let totalProblems = 0;
  const report = [];

  for (const file of files) {
    const problems = checkFile(file);
    if (problems.length > 0) {
      totalProblems += problems.length;
      report.push({ file, problems });
    }
  }

  return { passed: totalProblems === 0, filesChecked: files.length, report };
}

function printReport(result) {
  console.log(`Lint: ${result.filesChecked} file(s) checked`);
  if (result.passed) {
    console.log('LINT PASSED \u2705');
    return;
  }
  console.log('LINT FAILED \u274c');
  for (const entry of result.report) {
    console.log(`  ${entry.file}:`);
    for (const p of entry.problems) console.log(`    - ${p}`);
  }
}

if (require.main === module) {
  const result = runLint();
  printReport(result);
  process.exitCode = result.passed ? 0 : 1;
}

module.exports = { runLint };
