/*
 * OBA Core — Evidence gating for routes outside domain/derived.js.
 *
 * truth.js and decisionIntelligence.js each compute a verdict directly from
 * root tables, independently of derived.js — tracing every score-producing
 * route (per the remediation decision log's standing instruction) found both
 * exhibited the same absence-fabrication bug band() does, under their own
 * inline ternaries. This file asserts the extracted, testable pieces of each
 * fix in isolation, the same way definitions.unit.test.js and
 * derived.unit.test.js assert pure logic without a database.
 *
 * Run from backend/:  node tests/routeEvidence.unit.test.js
 */

const truthRouter = require('../routes/truth/truth')
const decisionIntelligenceRouter = require('../routes/decisionIntelligence')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Route-Level Evidence Gate Unit Test ===\n')

console.log('truth.js /summary — trustStatus evidence gate (D-07, D-10):')
{
	const empty = truthRouter.trustStatusFor([])
	check('zero claims is insufficient evidence, not UNTRUSTED', empty.evidence.sufficient === false && empty.trustStatus === null, empty)

	const claims = [
		{ verdict: 'VERIFIED' }, { verdict: 'VERIFIED' }, { verdict: 'UNVERIFIED' },
	]
	const real = truthRouter.trustStatusFor(claims)
	check('a real, evidenced low trust score is still allowed through as UNTRUSTED-or-better',
		real.evidence.sufficient === true && typeof real.trustStatus === 'string', real)
}

console.log('\ndecisionIntelligence.js — dqiVerdict evidence gate (D-07, D-10, D-24):')
{
	const empty = decisionIntelligenceRouter.dqiVerdictFor([])
	check('zero decisions is insufficient evidence, not a fabricated dqi=100/STRONG',
		empty.evidence.sufficient === false && empty.dqi === null && empty.dqiVerdict === null, empty)

	const decisions = [{ score: 90 }, { score: 70 }]
	const real = decisionIntelligenceRouter.dqiVerdictFor(decisions)
	check('real decisions still compute a real dqi', real.evidence.sufficient === true && real.dqi === 80, real)
}

console.log('\norchestrator.js — orgScore evidence short-circuit (D-07, D-10, D-22):')
{
	const orchestrator = require('../routes/intelligence/orchestrator')
	check('orchestrator.js exports orchestrateFrom for testing without a live Supabase call',
		typeof orchestrator.orchestrateFrom === 'function', typeof orchestrator.orchestrateFrom)

	// A minimal intel bundle whose pillars.orgScore is insufficient (mirrors what
	// derived.js's pillars() now returns for a near-empty database).
	const insufficientIntel = {
		pillars: {
			orgScore: { score: null, rating: null, evidence: { sufficient: false, status: 'insufficient_evidence', coverage: 0, covered: 0, total: 0, threshold: 0.5 } },
			pillars: [],
		},
		accountability: { accountabilityScore: null, evidence: { sufficient: false } },
		collaboration: { summary: { evidence: { sufficient: false } } },
		predictiveRisk: { scores: [], emergingThreats: [] },
		orgHealth: { evidence: { sufficient: false } },
		decisionQuality: { evidence: { sufficient: false } },
		executiveMemory: { items: [] },
	}
	orchestrator.orchestrateFrom(insufficientIntel).then((result) => {
		check('score/rating are null when orgScore is insufficient', result.score === null && result.rating === null, result)
		check('evidence is passed through', result.evidence.sufficient === false, result.evidence)
		check('a fixed verdict explains why, instead of generateVerdict running on a null score',
			typeof result.verdict === 'string' && result.verdict.length > 0, result.verdict)

		console.log('\n========================================')
		console.log(failed === 0 ? 'ALL CHECKS PASSED ✅' : (failed + ' CHECK(S) FAILED ❌'))
		console.log(`${passed} passed, ${failed} failed`)
		console.log('========================================\n')
		process.exit(failed === 0 ? 0 : 1)
	})
}
