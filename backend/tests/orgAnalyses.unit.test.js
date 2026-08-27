/*
 * OBA Core — organizational analyses unit test (MVP)
 * No external test framework. No Supabase/DB needed (feeds synthetic datasets).
 * Run from the backend/ folder:  node tests/orgAnalyses.unit.test.js
 *
 * alignmentChecklist (formerly strategicAlignment, M40) averaged four dimensions, two of which could never carry
 * data on the live dataset:
 *   - "Decision reversibility" read `x.reversible`, a field orgDataset has never
 *     emitted — permanently 0%.
 *   - "Incident lessons captured" read `incidents`, which orgDataset hardcodes
 *     to [] because no such table exists. Its `length ? … : 100` fallback scored
 *     the absence as a perfect 100%.
 * Half the alignment score was therefore a constant unrelated to the company.
 *
 * This is the same defect class as the M42 fix: an absence of data rendered as a
 * confident verdict. A dimension with no data must be reported as unknown and
 * excluded from the average — never scored.
 */

const { alignmentChecklist } = require('../domain/analyses')

let passed = 0
let failed = 0

function check(name, condition, detail) {
	if (condition) {
		passed++
		console.log('  ✓', name, detail ? '— ' + detail : '')
	} else {
		failed++
		console.error('  ✗', name, detail ? '— ' + detail : '')
	}
}

const scored = (r) => r.checks.filter((c) => c.score !== null)
const unknown = (r) => r.checks.filter((c) => c.score === null)

console.log('\n=== OBA Core — Organizational Analyses Unit Test ===\n')

// ─── 1. The live shape: workflows and decisions present, incidents absent ───
{
	const r = alignmentChecklist({
		workflows: [
			{ name: 'A', criticality: 'critical', documented: true },
			{ name: 'B', criticality: 'critical', documented: false },
		],
		decisions_log: [{ outcome: 'shipped' }, { outcome: null }],
		incidents: [],
	})
	check('absent incidents are not scored 100', !r.checks.some((c) => /incident/i.test(c.dimension) && c.score === 100),
		JSON.stringify(r.checks.find((c) => /incident/i.test(c.dimension))))
	check('absent incidents report as unknown', unknown(r).some((c) => /incident/i.test(c.dimension)))
	check('the reversibility dimension is gone', !r.checks.some((c) => /revers/i.test(c.dimension)),
		r.checks.map((c) => c.dimension).join(' | '))
	// 50% documented + 50% tracked outcomes, incidents excluded → 50
	check('average covers only dimensions with data', r.alignment === 50, `got ${r.alignment}`)
	check('coverage is reported', r.dimensionsScored === 2 && r.dimensionsUnknown === 1,
		`${r.dimensionsScored} scored / ${r.dimensionsUnknown} unknown`)
}

// ─── 2. No data at all: NO_SIGNAL, never a perfect score ───
{
	const r = alignmentChecklist({ workflows: [], decisions_log: [], incidents: [] })
	check('empty dataset does not score 100', r.alignment !== 100, `got ${r.alignment}`)
	check('empty dataset reports null alignment', r.alignment === null, `got ${r.alignment}`)
	check('empty dataset state is NO_SIGNAL', r.state === 'NO_SIGNAL', r.state)
	check('empty dataset scores nothing', scored(r).length === 0)
}

// ─── 3. Full data still produces a real verdict ───
{
	const r = alignmentChecklist({
		workflows: [{ name: 'A', criticality: 'critical', documented: true }],
		decisions_log: [{ outcome: 'shipped' }],
		incidents: [{ lesson: 'do not do that again' }],
	})
	check('full data scores every dimension', unknown(r).length === 0 && scored(r).length === 3,
		`${scored(r).length} scored`)
	check('full data yields ALIGNED', r.alignment === 100 && r.state === 'ALIGNED', `${r.alignment} / ${r.state}`)
}

// ─── 4. A genuinely poor score is still reported as poor ───
{
	const r = alignmentChecklist({
		workflows: [{ name: 'A', criticality: 'critical', documented: false }],
		decisions_log: [{ outcome: null }],
		incidents: [{ lesson: null }],
	})
	check('all-zero data yields MISALIGNED', r.alignment === 0 && r.state === 'MISALIGNED', `${r.alignment} / ${r.state}`)
	check('zero is distinguishable from unknown', unknown(r).length === 0)
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)
