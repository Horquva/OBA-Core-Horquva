'use strict';

const fs = require('fs');
const path = require('path');

/**
 * scripts/lint.js
 * ----------------
 * Din 5 ka "static check" hissa. Ye external package (eslint waghera)
 * use nahi karta — taake har team member bina extra install ke isay
 * chala sake. Ye khud apne rules se har .js file check karta hai:
 *
 *   1) file ke shuru mein 'use strict' hona chahiye
 *   2) `var` use nahi honi chahiye (hamesha let/const)
 *   3) koi TODO / FIXME comment reh na gaya ho
 *   4) core logic files (models/engine/persistence/qualityGates/seed)
 *      mein "debug" console.log nahi honi chahiye — sirf entrypoint
 *      files (demo, board, cli) ko print karne ki ijazat hai
 *
 * Koi bhi rule fail ho to poora lint FAIL hota hai — exit code 1,
 * taake CI isay pakad sake aur aage na badhne de.
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
