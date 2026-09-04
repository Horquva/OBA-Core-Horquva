/*
 * OBA Core — Intelligence Services Verification (MVP)
 * End-to-end verifies that the intelligence analyses actually run and produce
 * output. No DB needed (uses tests/fixtures/graph.js).
 * Run from backend/ folder:  node tests/intelligence.verify.test.js
 *
 * These scenarios previously ran through the Brain runtime's Execution Engine.
 * The runtime is gone (docs/superpowers/specs/2026-08-24-brain-as-library-design.md);
 * the same scenarios now run through brain.runMany(), which resolves the same
 * dependency order. The assertions are unchanged in substance, and one was
 * added: a scenario's declared dependencies must actually appear in its order,
 * which is what proves composition survived the refactor.
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
	{ name: 'Predictive Risk (M11)', modules: ['M03', 'M11'], question: 'Predict upcoming risks' },
	// M12/M17/M47 retired 2026-08-24 (they measured brain runs, not the
	// organization). Governance replaces them: a real M01 → M20 → M19 chain.
	{ name: 'Governance (M19)', modules: ['M19'], question: 'How well governed are we?' },
	{ name: 'What-If Simulation (M05/M54)', modules: ['M05', 'M54'], question: 'Simulate a key person leaving' },
	{ name: 'Digital Twin (M49)', modules: ['M49'], question: 'Sync the digital twin' },
	{ name: 'Brain Core + Orchestrator (M50/M55)', modules: ['M50', 'M55'], question: 'Full brain reasoning' },
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
