/*
 * OBA Core — orgGuard unit test (D-01, D-35).
 *
 * Pure, offline: stubs backend/supabase.js the same way authRoutes.test.js
 * and graphRoutes.test.js do, so checkSingleTenant()'s logic is exercised
 * without a live database. This is the half of the D-01 boot-gate change
 * that's actually testable — see the design doc §4 for why the
 * process.exit(1) wiring in index.js itself is verified by code review and
 * a live happy-path check instead.
 *
 * Run from backend/:  node tests/orgGuard.unit.test.js
 */

const path = require('path')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

let rows = []
const fakeSupabase = {
	from: () => ({
		select: async () => ({ data: rows, error: null }),
	}),
}
const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase }

const { checkSingleTenant } = require('../lib/orgGuard')

async function main() {
	console.log('\n=== OBA Core — orgGuard Unit Test ===\n')

	console.log('A single org:')
	rows = [{ org: 'horquva' }, { org: 'horquva' }, { org: 'horquva' }]
	{
		const r = await checkSingleTenant()
		check('ok is true', r.ok === true, r)
		check('orgs has exactly one value', r.orgs.length === 1 && r.orgs[0] === 'horquva', r.orgs)
	}

	console.log('\nMultiple orgs (the violation D-01 exists for):')
	rows = [{ org: 'horquva' }, { org: 'pp' }, { org: 'yy' }]
	{
		const r = await checkSingleTenant()
		check('ok is false', r.ok === false, r)
		check('orgs lists all distinct values, sorted', JSON.stringify(r.orgs) === JSON.stringify(['horquva', 'pp', 'yy']), r.orgs)
	}

	console.log('\nNo rows at all:')
	rows = []
	{
		const r = await checkSingleTenant()
		check('an empty table is not a violation', r.ok === true, r)
		check('orgs is empty', r.orgs.length === 0, r.orgs)
	}

	console.log('\nNull/duplicate org values do not distort the count:')
	rows = [{ org: 'horquva' }, { org: null }, { org: 'horquva' }]
	{
		const r = await checkSingleTenant()
		check('nulls are filtered, duplicates collapse — still single-org', r.ok === true, r)
		check('orgs is just the one real value', JSON.stringify(r.orgs) === JSON.stringify(['horquva']), r.orgs)
	}

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'ORGGUARD UNIT TESTS PASSED ✅' : 'ORGGUARD UNIT TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
