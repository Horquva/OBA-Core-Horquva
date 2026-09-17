/*
 * OBA Core — Briefing SPOF Backup Claim Test.
 *
 * Covers buildSummaryPoints()'s SPOF Alert line (backend/routes/briefing/
 * briefing.js) — it used to assert "has no backup owner" for whichever agent
 * was top-CRITICAL by predicted risk, whether or not that was actually true.
 * buildSummaryPoints() itself is a pure function, but requiring briefing.js
 * transitively requires ../../supabase, which constructs a real Supabase
 * client at module-load time — runs fully offline only because of the
 * placeholder env vars below, not because Supabase is never involved.
 *
 * Run from backend/: node tests/briefingBackupClaim.unit.test.js
 */

// briefing.js requires ../../supabase, which constructs a real Supabase
// client at module load time and throws if SUPABASE_URL/KEY are unset. This
// file only asserts buildSummaryPoints(), a pure function — it never calls
// Supabase for real.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'placeholder-key'

const { buildSummaryPoints } = require('../routes/briefing/briefing')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Briefing SPOF Backup Claim Test ===\n')

console.log('Agent genuinely has no backup:')
{
	const points = buildSummaryPoints({
		spof: { agents: { name: 'SecurityScanner' }, predicted_score: 92, hasNoBackupOwner: true },
		overloaded: null, incident: null, docTrend: null, pendingCount: 0,
	})
	const line = points.find(p => p.startsWith('SPOF ALERT') || p.startsWith('CRITICAL RISK ALERT'))
	check('line exists', !!line, points)
	check('labeled SPOF ALERT', line?.startsWith('SPOF ALERT'), line)
	check('claims no backup owner', line?.includes('has no backup owner'), line)
}

console.log('\nAgent has real backup coverage:')
{
	const points = buildSummaryPoints({
		spof: { agents: { name: 'DeployBot' }, predicted_score: 88, hasNoBackupOwner: false },
		overloaded: null, incident: null, docTrend: null, pendingCount: 0,
	})
	const line = points.find(p => p.startsWith('SPOF ALERT') || p.startsWith('CRITICAL RISK ALERT'))
	check('line exists', !!line, points)
	check('labeled CRITICAL RISK ALERT, not SPOF ALERT', line?.startsWith('CRITICAL RISK ALERT'), line)
	check('claims backup coverage', line?.includes('has backup coverage'), line)
	check('does not claim no backup owner', !line?.includes('has no backup owner'), line)
}

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'BRIEFING BACKUP CLAIM TESTS PASSED ✅' : 'BRIEFING BACKUP CLAIM TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
