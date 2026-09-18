/*
 * OBA Core — computeAllCached Stampede Test.
 *
 * Covers domain/derived.js's computeAllCached() memo. Before this fix, several
 * concurrent callers arriving while the memo was cold/expired each triggered
 * their own independent computeAll() -- an 18-table root read per caller
 * instead of one shared read (diagnosed 2026-09-17: "cold domain.intelligence
 * .all() has no in-flight dedupe (8 concurrent = 168 table reads)"). Uses a
 * fake supabase client so this runs fully offline.
 *
 * Run from backend/: node tests/computeAllCachedStampede.unit.test.js
 */

const d = require('../domain/derived')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

/** A fake supabase whose .from().select() resolves after a tick, so
 *  concurrent callers genuinely overlap in time, and counts how many
 *  root-table reads actually happened. */
function fakeSupabase() {
	let reads = 0
	return {
		reads: () => reads,
		from(_table) {
			return {
				select() {
					reads++
					return new Promise((resolve) => {
						setTimeout(() => resolve({ data: [], error: null }), 5)
					})
				},
			}
		},
	}
}

async function run() {
	console.log('\n=== OBA Core — computeAllCached Stampede Test ===\n')

	console.log('8 concurrent cold calls share one root read:')
	{
		d.invalidate()
		const supabase = fakeSupabase()
		const CONCURRENCY = 8

		const results = await Promise.all(
			Array.from({ length: CONCURRENCY }, () => d.computeAllCached(supabase))
		)

		check(
			'root tables read exactly once, not once per caller',
			supabase.reads() === d.ROOT_TABLES.length,
			{ expected: d.ROOT_TABLES.length, got: supabase.reads() }
		)
		check(
			'every caller got the same computedAt',
			new Set(results.map((r) => r.computedAt)).size === 1,
			results.map((r) => r.computedAt)
		)
	}

	console.log('\nA later call within the TTL reuses the memo (no extra reads):')
	{
		const supabase = fakeSupabase()
		const before = supabase.reads()
		const result = await d.computeAllCached(supabase)
		check('served from memo', result.fromMemo === true)
		check('no new reads', supabase.reads() === before, { before, after: supabase.reads() })
	}

	console.log('\nAfter invalidate(), a fresh call reads roots again:')
	{
		d.invalidate()
		const supabase = fakeSupabase()
		await d.computeAllCached(supabase)
		check('root tables read again after invalidate', supabase.reads() === d.ROOT_TABLES.length)
	}

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'COMPUTE-ALL-CACHED STAMPEDE TESTS PASSED ✅' : 'COMPUTE-ALL-CACHED STAMPEDE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

run()
