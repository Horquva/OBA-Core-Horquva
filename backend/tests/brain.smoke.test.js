/*
 * OBA Core — Brain Smoke Test (MVP) 
 * No external test framework. No Supabase/DB and no express needed (uses bootBrain).
 * Run from the backend/ folder:  node tests/brain.smoke.test.js
 */

let passed = 0
let failed = 0

function check(name, condition) {
	if (condition) {
		passed++
		console.log('  \u2713', name)
	} else {
		failed++
		console.error('  \u2717', name)
	}
}

;(async () => {
	console.log('\n=== OBA Core \u2014 Brain Smoke Test ===\n')

	try {
		const { bootBrain } = require('../brain')
		const { report, runtime } = bootBrain({ seed: true })

		check('Brain boots & accepted', report.accepted === true)
		check('55 modules discovered', report.modules.discovered === 55)
		check('55 modules expected', report.modules.expected === 55)
		check('No module errors', Array.isArray(report.modules.errors) && report.modules.errors.length === 0)
		check('All 55 capabilities registered', report.capabilities.registered === 55)
		check('Knowledge graph valid', report.graphValidation && report.graphValidation.valid === true)
		check('Owner Huzaifa = 13', report.modules.byOwner && report.modules.byOwner.Huzaifa === 13)
		check('Owner Kamran = 21', report.modules.byOwner && report.modules.byOwner.Kamran === 21)
		check('Owner Tahir = 14', report.modules.byOwner && report.modules.byOwner.Tahir === 14)
		check('Owner Anusha = 7', report.modules.byOwner && report.modules.byOwner.Anusha === 7)

		// End-to-end runtime execution (async)
		const result = await runtime.engine.execute({
			modules: ['M01', 'M03', 'M50', 'M55'],
			context: { role: 'CEO', question: 'smoke test' },
		})
		check('Runtime execute returns executionOrder', Array.isArray(result.executionOrder) && result.executionOrder.length > 0)
		check('Fused confidence is a number', typeof result.fusedConfidence === 'number')
		check('Constitutional: orchestrator runs last', result.constitutionalRules && result.constitutionalRules.orchestratorLast === true)
	} catch (e) {
		failed++
		console.error('  \u2717 Brain failed to boot:', e.message)
	}

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()
