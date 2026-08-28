/*
 * OBA Core — M42 Culture Intelligence unit test (MVP)
 * No external test framework. No Supabase/DB needed (builds graphs by hand).
 * Run from the backend/ folder:  node tests/culture.unit.test.js
 *
 * M42 must not turn an ABSENCE of collaboration records into a VERDICT that
 * people work alone. BUILD_SPEC Part 0 on the derived `collaborations` section:
 * the pairs cover 24 of 40 people, "the other 16 appear in no shared-work
 * record... That may be a real finding or a coverage gap, and the data cannot
 * tell you which." A person with no edge is UNKNOWN, never "siloed".
 */

const KnowledgeGraph = require('../brain/knowledge/knowledgeGraph')
const IMPL = require('../brain/modules/implementations')

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

/** Build a graph of `n` employees with `pairs` collaborating (by index). */
function buildGraph(n, pairs) {
	const g = new KnowledgeGraph()
	const people = []
	for (let i = 0; i < n; i++) people.push(g.addEntity({ type: 'employee', name: `Person ${i}` }))
	for (const [a, b] of pairs) {
		g.addRelationship({
			from: people[a].id, to: people[b].id, type: 'collaborates_with',
			metadata: { source: 'derived', basis: 'raci' },
		})
	}
	return g
}

const run = (g) => IMPL.M42({ graph: g })

console.log('\n=== OBA Core — M42 Culture Intelligence Unit Test ===\n')

// ─── 1. No collaboration data at all: NO_SIGNAL, not "everyone is siloed" ───
{
	const out = run(buildGraph(40, []))
	const p = out.payload
	check('no edges → cultureSignal is no_signal', p.cultureSignal === 'no_signal', `got "${p.cultureSignal}"`)
	check('no edges → nobody is asserted siloed', !('siloedPeople' in p) || p.siloedPeople.length === 0)
	check('no edges → all 40 reported as having no record', (p.peopleWithoutRecord || []).length === 40)
	check('no edges → coverage is 0', p.collaborationCoverage === 0)
	check('no edges → confidence is the no-evidence floor', out.confidence <= 0.4, `got ${out.confidence}`)
	check('no edges → recommendation names the coverage gap, not the people',
		(out.recommendations || []).length === 1 && /no shared-work record/i.test((out.recommendations || [])[0] || ''))
}

// ─── 2. Partial coverage — the real shape of this dataset ───
{
	// 6 people, 2 pairs → 4 covered, 2 with no record
	const out = run(buildGraph(6, [[0, 1], [2, 3]]))
	const p = out.payload
	check('partial → signal is never "siloed"', p.cultureSignal !== 'siloed', `got "${p.cultureSignal}"`)
	check('partial → covered count is right', p.peopleWithCollaborationRecord === 4)
	check('partial → uncovered are named, not counted as siloed', (p.peopleWithoutRecord || []).length === 2)
	check('partial → coverage reported', p.collaborationCoverage === 0.67, `got ${p.collaborationCoverage}`)
	check('partial → confidence tracks coverage, not volume', out.confidence < 0.9, `got ${out.confidence}`)
}

// ─── 3. Full coverage: a verdict is legitimate here ───
{
	const out = run(buildGraph(4, [[0, 1], [1, 2], [2, 3], [3, 0]]))
	const p = out.payload
	check('full coverage → nobody without a record', (p.peopleWithoutRecord || []).length === 0)
	check('full coverage → coverage is 1', p.collaborationCoverage === 1)
	check('full coverage → a real verdict is emitted', ['collaborative', 'transitional'].includes(p.cultureSignal), `got "${p.cultureSignal}"`)
}

// ─── 4. Density stays links-per-person and is labelled as such ───
{
	// Two different offsets, so all 51 pairs are distinct — the registry
	// deduplicates on (from, type, to), and a single offset wraps at 40.
	const pairs = [
		...Array.from({ length: 40 }, (_, i) => [i, (i + 7) % 40]),
		...Array.from({ length: 11 }, (_, i) => [i, (i + 13) % 40]),
	]
	const out = run(buildGraph(40, pairs))
	check('density is links per person, not a fraction', out.payload.collaborationDensity > 1)
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)
