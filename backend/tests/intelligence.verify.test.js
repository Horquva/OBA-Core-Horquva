/*
 * OBA Core — Intelligence Services Verification (MVP)
 * End-to-end verifies that the intelligence analyses actually run and produce
 * output. No DB needed (uses tests/fixtures/graph.js).
 * Run from backend/ folder:  node tests/intelligence.verify.test.js
 *
 * These scenarios previously ran through the Brain runtime's Execution Engine.
 * The runtime is gone (docs/superpowers/specs/2026-08-24-brain-as-library-design.md);
 * the same scenarios now run through brain.runMany(), which resolves the same
 * dependency order. The assertions are unchanged in substance: every scenario
 * checks that its declared dependencies actually ran, and ran first, which is
 * what proves composition survived the refactor.
 *
 * Scenarios rebuilt 2026-09-02: M11/M05/M54/M50/M55 were all retired that day
 * (see data/constitutional-modules.js's header) -- each had a richer, already-
 * live SQL/derived.js answer to the same question. Replaced with scenarios
 * over the 24 modules that remain, chosen to still exercise real multi-level
 * dependency chains rather than single, dependency-free modules.
 */

const brain = require('../brain')
const { buildTestGraph } = require('./fixtures/graph')

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

// Intelligence-side scenarios (analysis ids from the module catalog)
const SCENARIOS = [
	// M01 -> M02 -> M03: a real two-level ownership/dependency/risk chain.
	{ name: 'Risk Intelligence (M03)', modules: ['M03'], question: 'Where is the organization vulnerable?' },
	// M01 -> M20 -> M19: governance needs accountability needs ownership.
	{ name: 'Governance (M19)', modules: ['M19'], question: 'How well governed are we?' },
	// M02/M34 -> M28: hidden dependencies feed the universal dependency graph.
	{ name: 'Universal Dependency Graph (M28)', modules: ['M28'], question: 'How is everything connected?' },
	// M28/M29/M31 -> M49, and M28/M29 each resolve further down to M01/M02/M34:
	// the deepest chain in the current catalog, six modules from one request.
	{ name: 'Digital Twin (M49)', modules: ['M49'], question: 'Sync the digital twin' },
	// M28/M29 -> M35: a second, independent path through the same mid-level
	// modules M49 also depends on, so this checks they're each computed once
	// and shared rather than re-run per consumer.
	{ name: 'Network Intelligence (M35)', modules: ['M35'], question: 'Who are the central actors?' },
]

;(async () => {
	console.log('\n=== OBA Core — Intelligence Verification ===\n')

	try {
		brain.setGraph(buildTestGraph())
		check('Graph loaded before verification', brain.isReady() === true)

		for (const s of SCENARIOS) {
			try {
				const r = await brain.runMany(s.modules, { role: 'CEO', question: s.question })
				const ok = r && Array.isArray(r.order) && r.order.length > 0 &&
					r.results.length === r.order.length &&
					typeof r.fusedConfidence === 'number'
				check(s.name, ok, ok ? ('order: ' + r.order.join(' → ') + ' | conf: ' + r.fusedConfidence) : 'no output')

				// Composition check: every declared dependency ran, and ran first.
				const missing = []
				for (const code of s.modules) {
					const m = brain.MODULES.find((x) => x.code === code)
					for (const dep of m.dependsOn) {
						if (r.order.indexOf(dep) === -1 || r.order.indexOf(dep) > r.order.indexOf(code)) missing.push(`${code}<-${dep}`)
					}
				}
				check(`  ${s.name} — dependencies ran first`, missing.length === 0,
					missing.length ? missing.join(', ') : 'ok')
			} catch (err) {
				check(s.name, false, err.message)
			}
		}
	} catch (e) {
		failed++
		console.error('  ✗ Verification failed to start:', e.message)
	}

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()
