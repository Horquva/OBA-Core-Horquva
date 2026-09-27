/*
 * OBA Core — Longitudinal Volatility tests (Phase 3.3).
 *
 * Pins the SPC instruments (EWMA known-answer, CUSUM fires on sustained
 * drift and not on single spikes), the weighted daily series, the window
 * briefings, and the Ironclad behavior on empty windows. Pure — no I/O.
 *
 * Run from backend/:  node tests/volatility.unit.test.js
 */

const { volatility, windowBriefing, ewma, cusum } = require('../domain/volatility')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const dayAt = (daysAgo, hour = 12) => {
	const d = new Date()
	d.setUTCDate(d.getUTCDate() - daysAgo)
	d.setUTCHours(hour, 0, 0, 0)
	return d.toISOString()
}

console.log('\n=== OBA Core — Volatility tests ===\n')

console.log('SPC instruments:')
check('EWMA known answer: constant series → the constant', ewma([5, 5, 5, 5]) === 5)
check('EWMA known answer: step to 10 with λ=0.3 lands between', (() => {
	const v = ewma([0, 0, 0, 10, 10])
	return v > 0 && v < 10
})())
	// Split-window baseline (first half = in-control reference, second half
	// monitored), k=0.5/h=5 standardized. Sustained second-half shift fires;
	// a single moderate (~3σ) spike decays before reaching h. The detection
	// horizon is the 30-day window — the weekly signal is velocityBand.
	check('CUSUM fires on a sustained second-half shift',
		cusum([1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]).alert === true)
	check('CUSUM ignores a single moderate spike',
		cusum([1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 3, 2, 1, 2, 1, 2, 1]).alert === false,
		cusum([1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 3, 2, 1, 2, 1, 2, 1]))
	check('CUSUM on a flat series never fires', cusum([3, 3, 3, 3, 3, 3]).alert === false)
check('CUSUM on a too-short series never fires', cusum([9, 9]).alert === false)

console.log('\nwindow briefings:')
{
	const rows = []
	// 3 mutations in the last 7 days, one of them the org's worst (-14 OHI)
	rows.push({ created_at: dayAt(1), mutation_type: 'OWNER_REMOVED', target_type: 'agent', target_id: 'a1', health_delta: -14.0, mitigation: { recommendations: [{ action: 'ASSIGN_OWNER' }] } })
	rows.push({ created_at: dayAt(2), mutation_type: 'BACKUP_ASSIGNED', target_type: 'employee', target_id: 'e2', health_delta: -2.0, mitigation: {} })
	rows.push({ created_at: dayAt(3), mutation_type: 'OUT_OF_BAND', target_type: 'agents', target_id: 'a3', health_delta: null, mitigation: null })
	// 20 days ago — outside the 7-day window, inside the 30-day
	rows.push({ created_at: dayAt(20), mutation_type: 'STATUS_CHANGED', target_type: 'agent', target_id: 'a4', health_delta: 3.0, mitigation: {} })

	const v = volatility(rows)
	check('7-day window sees 3 material changes', v.week.materialChanges === 3, v.week.materialChanges)
	check('30-day window sees 4', v.month.materialChanges === 4, v.month.materialChanges)
	check('out-of-band rows are counted separately', v.week.outOfBand === 1, v.week.outOfBand)
	check('net exposure change sums the ΔOHI signs (7-day: -14-2+0 = -16 → negative = improved)',
		v.week.risk.netExposureChange === -16.0, v.week.risk.netExposureChange)
	check('the worst event is the -14 owner removal with its mitigation',
		v.week.risk.worstEvent?.healthDelta === -14.0 && v.week.risk.worstEvent?.mutationType === 'OWNER_REMOVED' && v.week.risk.worstEvent?.mitigation?.recommendations?.length === 1, v.week.risk.worstEvent)
	check('30-day net includes the +3 damage event (-13 net)', v.month.risk.netExposureChange === -13.0, v.month.risk.netExposureChange)
	check('velocity is a positive number in both windows', v.week.velocity > 0 && v.month.velocity > 0, { week: v.week.velocity, month: v.month.velocity })
	check('bands are one of LOW/MODERATE/HIGH', ['LOW', 'MODERATE', 'HIGH'].includes(v.week.velocityBand), v.week.velocityBand)
	check('drift shape present in both windows', typeof v.week.drift.alert === 'boolean' && typeof v.month.drift.alert === 'boolean')
}

console.log('\nIronclad behavior on empty windows:')
{
	const v = volatility([])
	check('zero rows → insufficient_evidence in both windows', v.week.status === 'insufficient_evidence' && v.month.status === 'insufficient_evidence', v)
	check('no fabricated velocity or risk', v.week.materialChanges === 0 && v.week.risk === undefined, v.week)
}
{
	// rows only outside the 7-day window → 7-day insufficient, 30-day computed
	const rows = [{ created_at: dayAt(20), mutation_type: 'STATUS_CHANGED', target_type: 'agent', target_id: 'a1', health_delta: 1.0, mitigation: {} }]
	const v = volatility(rows)
	check('7-day insufficient while 30-day computes', v.week.status === 'insufficient_evidence' && v.month.status === 'computed', { week: v.week.status, month: v.month.status })
}

console.log('\nwindowBriefing direct (weights):')
{
	const calm = [{ created_at: dayAt(1), mutation_type: 'ENTITY_CREATED', target_type: 'agent', target_id: 'x', health_delta: 0, mitigation: {} }]
	const heavy = [{ created_at: dayAt(1), mutation_type: 'OWNER_REMOVED', target_type: 'agent', target_id: 'x', health_delta: -20, mitigation: {} }]
	const calmV = windowBriefing(calm, 7).velocity
	const heavyV = windowBriefing(heavy, 7).velocity
	check('a health-heavy mutation weighs more than a neutral one', heavyV > calmV, { calmV, heavyV })
}

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'VOLATILITY TESTS PASSED ✅' : 'VOLATILITY TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
