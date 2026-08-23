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
	'graphLoader.live.test.js', // self-skips when SUPABASE_URL is unset
	'intelligence.verify.test.js',
	'auth.unit.test.js',
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
