/*
 * OBA Core — Graph Loader live test (MVP)
 * No external test framework. REQUIRES Supabase credentials in backend/.env —
 * skipped automatically when SUPABASE_URL is absent, the same way
 * api.smoke.test.js skips without BASE_URL.
 * Run from the backend/ folder:  node tests/graphLoader.live.test.js
 *
 * Guards three defects found on 2026-08-24, each of which was visible on the
 * Org Science page as a confident number rather than as missing data:
 *   1. `organization` and the six `department` entities were created and then
 *      never connected, so M37/M29/M45 reported them as isolated anomalies.
 *   2. `collaborates_with` was never emitted, so M42 called all 40 people
 *      siloed — a wrong answer, not a missing one (BUILD_SPEC Part 0).
 *   3. `owns` edges carried no provenance, leaving D1 nothing to rank on.
 */

require('../supabase') // loads backend/.env

let passed = 0
let failed = 0

function check(name, condition) {
	if (condition) {
		passed++
		console.log('  ✓', name)
	} else {
		failed++
		console.error('  ✗', name)
	}
}

;(async () => {
	console.log('\n=== OBA Core — Graph Loader Live Test ===\n')

	if (!process.env.SUPABASE_URL) {
		console.log('  – skipped: SUPABASE_URL not set\n')
		process.exit(0)
	}

	try {
		const KnowledgeGraph = require('../brain/knowledge/knowledgeGraph')
		const { loadFromSupabase } = require('../brain/knowledge/graphLoader')

		const g = new KnowledgeGraph()
		await loadFromSupabase(g)

		check('graph validates', g.validate().valid === true)

		// ─── 1. structural entities are connected ───
		const degree = (id) => g.relationships.neighbors(id).length
		const structural = g.entities.list('organization').concat(g.entities.list('department'))
		const orphans = structural.filter((e) => degree(e.id) === 0)
		check('organization + departments all exist (7)', structural.length === 7)
		check('no orphaned structural entities', orphans.length === 0)
		if (orphans.length) console.error('    orphans:', orphans.map((e) => e.name).join(', '))

		const deptOwners = g.relationships.list('owns')
			.filter((r) => (g.entities.get(r.to) || {}).type === 'department')
		check('each department has an accountable executive (6)', deptOwners.length === 6)

		// ─── 2. collaboration is derived, not absent ───
		const collab = g.relationships.list('collaborates_with')
		const people = new Set(collab.flatMap((r) => [r.from, r.to]))
		check('collaborates_with edges derived (51)', collab.length === 51)
		check('collaboration covers 24 of 40 people', people.size === 24)
		check('every collaboration edge records its basis',
			collab.every((r) => r.metadata && r.metadata.source === 'derived' && !!r.metadata.basis))

		// ─── 3. ownership provenance (BUILD_SPEC D1) ───
		const owns = g.relationships.list('owns')
		const withSource = owns.filter((r) => r.metadata && r.metadata.source)
		check('every owns edge carries metadata.source', owns.length > 0 && withSource.length === owns.length)

		const expected = new Set(['agents.owner_id', 'tool_ownership', 'workflow_runbooks', 'knowledge_assets', 'employees.department'])
		const actual = new Set(owns.map((r) => r.metadata.source))
		check('owns provenance names only real source tables',
			[...actual].every((s) => expected.has(s)))
		if (![...actual].every((s) => expected.has(s))) console.error('    unexpected:', [...actual].filter((s) => !expected.has(s)))
	} catch (e) {
		failed++
		console.error('  ✗ loader threw:', e.message)
	}

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()
