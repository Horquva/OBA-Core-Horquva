/*
 * OBA Core — Run all MVP tests in sequence.
 * Run from the backend/ folder:  node tests/run-all.js
 * To include the live API test:   BASE_URL=https://horquva-oba-core.vercel.app node tests/run-all.js
 */

const { spawnSync } = require('child_process')
const path = require('path')

const tests = [
	'brain.smoke.test.js',
	'graph.unit.test.js',
	'culture.unit.test.js',
	'recommendationEngine.unit.test.js', // pure; asserts M04's 7 rule classes (W-K D-62)
	'orgAnalyses.unit.test.js',
	'dataset.unit.test.js', // pure/offline; stubs Supabase + brain, exercises the incidents mapping (W-J)
	'graphLoader.live.test.js', // self-skips when SUPABASE_URL is unset
	'intelligence.verify.test.js',
	'auth.unit.test.js',
	'derived.unit.test.js', // pure; asserts the derived-intelligence definitions
	'simulations.unit.test.js', // pure; asserts cascade/severity/health-delta (W-I)
	'tools.unit.test.js', // pure; asserts tool-risk composite score/tier (W-K D-58)
	'definitions.unit.test.js', // pure; asserts the canonical criticality/SPOF definitions
	'routeEvidence.unit.test.js', // pure; asserts evidence gating in routes outside derived.js
	'authRoutes.test.js', // HTTP-level; stubs Supabase, so it runs offline
	'graphRoutes.test.js', // HTTP-level; stubs brain, so it runs offline
	'simulationRoutes.test.js', // HTTP-level; stubs Supabase, so it runs offline (W-I)
	'orgGuard.unit.test.js', // pure; asserts checkSingleTenant()'s logic offline
]
// api.smoke.test.js only runs when BASE_URL is set (otherwise localhost would fail).
if (process.env.BASE_URL) tests.push('api.smoke.test.js')

let failedSuites = 0

for (const t of tests) {
	console.log('\n\u25b6 Running ' + t + ' ...')
	const res = spawnSync('node', [path.join(__dirname, t)], { stdio: 'inherit', env: process.env })
	if (res.status !== 0) failedSuites++
}

console.log('\n========================================')
console.log(failedSuites === 0 ? 'ALL TEST SUITES PASSED \u2705' : (failedSuites + ' SUITE(S) FAILED \u274c'))
console.log('========================================\n')
process.exit(failedSuites === 0 ? 0 : 1)
