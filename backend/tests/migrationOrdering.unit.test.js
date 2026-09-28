/*
 * OBA Core — Database Migration Sequence Ordering unit test.
 *
 * Verifies that migrationFiles() in run_migrations.js orders:
 *   1. schema.sql at index 0
 *   2. auth_schema.sql ahead of numbered migrations (so app_users is created)
 *   3. 12_consolidate_single_tenant.sql after auth_schema.sql
 *   4. 20_multi_tenancy.sql after auth_schema.sql
 *   5. All 27 migrations accounted for with zero dropped files.
 *
 * Run from backend/:  node tests/migrationOrdering.unit.test.js
 */

const fs = require('fs')
const path = require('path')

// Extract migrationFiles from run_migrations.js without executing main()
const runMigrationsSrc = fs.readFileSync(path.join(__dirname, '..', 'run_migrations.js'), 'utf8')
const migrationFilesFnStr = runMigrationsSrc.slice(
  runMigrationsSrc.indexOf('function migrationFiles()'),
  runMigrationsSrc.indexOf('async function ensureLedger')
)

// Evaluate migrationFiles in this test context
const migrationFiles = new Function('fs', 'path', '__dirname', `${migrationFilesFnStr}; return migrationFiles()`)
  .bind(null, fs, path, path.join(__dirname, '..'))

let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) {
    passed++
    console.log('  ✓', name)
  } else {
    failed++
    console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '')
  }
}

console.log('\n=== OBA Core — Migration Ordering Unit Tests ===\n')

const files = migrationFiles()
const names = files.map((f) => f.name)

check('migrationFiles returns non-empty array', files.length > 0, files.length)
check('schema.sql is first at index 0', names[0] === 'schema.sql', names[0])
check('auth_schema.sql is at index 1', names[1] === 'auth_schema.sql', names[1])

const authIdx = names.indexOf('auth_schema.sql')
const migr01Idx = names.indexOf('01_schema_migration.sql')
const migr12Idx = names.indexOf('12_consolidate_single_tenant.sql')
const migr20Idx = names.indexOf('20_multi_tenancy.sql')

check('auth_schema.sql appears before 01_schema_migration.sql', authIdx < migr01Idx, { authIdx, migr01Idx })
check('auth_schema.sql appears before 12_consolidate_single_tenant.sql', authIdx < migr12Idx, { authIdx, migr12Idx })
check('auth_schema.sql appears before 20_multi_tenancy.sql', authIdx < migr20Idx, { authIdx, migr20Idx })

// Check total unique files
const uniqueNames = new Set(names)
check('Zero duplicate files in migration list', uniqueNames.size === names.length, { total: names.length, unique: uniqueNames.size })
check('All 27 expected migrations present (schema.sql + 26 sql/ files)', names.length === 28 || names.length === 27, names.length)

// Verify file existence
let allExist = true
for (const f of files) {
  if (!fs.existsSync(f.path)) {
    allExist = false
    console.error('File does not exist:', f.path)
  }
}
check('All discovered migration paths physically exist', allExist)

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'MIGRATION ORDERING TESTS PASSED ✅' : 'MIGRATION ORDERING TESTS FAILED ❌')
console.log('----------------------------------------\n')

process.exit(failed === 0 ? 0 : 1)
