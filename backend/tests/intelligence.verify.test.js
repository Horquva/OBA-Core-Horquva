/*
 * OBA Core — Intelligence Services Verification (MVP) 
 * End-to-end verifies that the intelligence modules actually run through the
 * runtime engine and produce output. No DB needed (brain boots standalone).
 * Run from backend/ folder:  node tests/intelligence.verify.test.js
 */

let passed = 0
let failed = 0

function check(name, condition, detail) {
	if (condition) {
		passed++
		console.log('  \u2713', name, detail ? '— ' + detail : '')
	} else {
		failed++
		console.error('  \u2717', name, detail ? '— ' + detail : '')
	}
}

// Intelligence-side scenarios (module ids from the LOCKED registry)
const SCENARIOS = [
	{ name: 'Predictive Risk (M11)', modules: ['M03', 'M11'], question: 'Predict upcoming risks' },
	{ name: 'Forecasting (M12)', modules: ['M12'], question: 'Forecast next quarter' },
	{ name: 'Org Learning (M17/M47)', modules: ['M17', 'M47'], question: 'What has the org learned?' },
	{ name: 'What-If Simulation (M05/M54)', modules: ['M05', 'M54'], question: 'Simulate a key person leaving' },
	{ name: 'Digital Twin (M49)', modules: ['M49'], question: 'Sync the digital twin' },
	{ name: 'Brain Core + Orchestrator (M50/M55)', modules: ['M50', 'M55'], question: 'Full brain reasoning' },
]

;(async () => {
	console.log('\n=== OBA Core \u2014 Intelligence Verification ===\n')

	try {
		const { bootBrain } = require('../brain')
		const { runtime, report } = bootBrain({ seed: true })
		check('Brain accepted before verification', report.accepted === true)

		for (const s of SCENARIOS) {
			try {
				const r = await runtime.engine.execute({
					modules: s.modules,
					context: { role: 'CEO', question: s.question },
				})
				const ok = r && Array.isArray(r.executionOrder) && r.executionOrder.length > 0
				check(s.name, ok, ok ? ('order: ' + r.executionOrder.join(' → ') + ' | conf: ' + r.fusedConfidence) : 'no output')
			} catch (err) {
				check(s.name, false, err.message)
			}
		}
	} catch (e) {
		failed++
		console.error('  \u2717 Brain failed to boot:', e.message)
	}

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()
