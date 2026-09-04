/*
 * OBA Core — Tool risk scoring unit test.
 *
 * routes/tools.js's computeToolRiskScore()/toolRiskTier() replaced
 * frontend/lib/aiToolIntelligence.ts's buildToolScore()/scoreToTier() --
 * ported verbatim (same weights, same thresholds), so this test asserts the
 * definitions on hand-built tool objects, same pattern as derived.unit.test.js.
 *
 * Run from backend/:  node tests/tools.unit.test.js
 */

const { computeToolRiskScore, toolRiskTier, TOOL_RISK_WEIGHTS } = require('../routes/tools')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

function tool(overrides = {}) {
	return {
		documented: true,
		backup_tool: 'Fallback',
		criticality: 'low',
		departments: [],
		agents_using: [],
		...overrides,
	}
}

console.log('\n=== OBA Core — Tool Risk Scoring Unit Test ===\n')

console.log('Individual factors:')
{
	const clean = computeToolRiskScore(tool())
	check('a fully-covered low-criticality tool scores only its criticality weight',
		clean.score === TOOL_RISK_WEIGHTS.CRITICALITY.low, clean)

	const noPolicy = computeToolRiskScore(tool({ documented: false }))
	check('undocumented contributes NO_POLICY', noPolicy.factors.some((f) => f.points === TOOL_RISK_WEIGHTS.NO_POLICY), noPolicy.factors)

	const noBackup = computeToolRiskScore(tool({ backup_tool: null }))
	check('no backup_tool contributes NO_BACKUP', noBackup.factors.some((f) => f.points === TOOL_RISK_WEIGHTS.NO_BACKUP), noBackup.factors)

	const unassessed = computeToolRiskScore(tool({ criticality: null }))
	check('unassessed criticality (null) contributes nothing -- never fabricated as "low"',
		unassessed.score === 0, unassessed)
}

console.log('\nThreshold boundaries (departments / agents_using):')
{
	const orgWide = computeToolRiskScore(tool({ departments: ['A', 'B', 'C', 'D', 'E', 'F'] }))
	check('>=6 departments is ORG_WIDE_DEPTS, not CROSS_DEPT',
		orgWide.factors.some((f) => f.points === TOOL_RISK_WEIGHTS.ORG_WIDE_DEPTS), orgWide.factors)

	const crossDept = computeToolRiskScore(tool({ departments: ['A', 'B', 'C', 'D'] }))
	check('4-5 departments is CROSS_DEPT, not ORG_WIDE_DEPTS',
		crossDept.factors.some((f) => f.points === TOOL_RISK_WEIGHTS.CROSS_DEPT), crossDept.factors)

	const manyAgents = computeToolRiskScore(tool({ agents_using: ['a', 'b', 'c'] }))
	check('>=3 agents is MANY_AGENTS', manyAgents.factors.some((f) => f.points === TOOL_RISK_WEIGHTS.MANY_AGENTS), manyAgents.factors)
}

console.log('\nComposite + tier:')
{
	// Undocumented + no backup + high criticality + 2 agents (matches the
	// live-verified Tableau AI case: 25 + 30 + 12 + 8 = 75).
	const t = tool({ documented: false, backup_tool: null, criticality: 'high', agents_using: ['a', 'b'] })
	const { score, factors } = computeToolRiskScore(t)
	check('score is the sum of its own factors', score === factors.reduce((a, f) => a + f.points, 0), { score, factors })
	check('score matches the live-verified Tableau AI case', score === 75, score)
	check('tier follows the real thresholds', toolRiskTier(score) === 'CRITICAL', toolRiskTier(score))

	const capped = computeToolRiskScore(tool({
		documented: false, backup_tool: null, criticality: 'critical', departments: ['A', 'B', 'C', 'D', 'E', 'F'], agents_using: ['a', 'b', 'c'],
	}))
	check('score caps at 100 even when factors sum higher', capped.score === 100, capped.score)
}

console.log('\n' + '-'.repeat(40))
console.log('passed:', passed, '  failed:', failed)
console.log('-'.repeat(40))
if (failed > 0) {
	console.log('\nTOOL RISK SCORING UNIT TESTS FAILED ❌')
	process.exit(1)
}
console.log('\nTOOL RISK SCORING UNIT TESTS PASSED ✅')
console.log('-'.repeat(40))
