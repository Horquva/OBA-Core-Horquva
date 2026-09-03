/*
 * OBA Core — Canonical definitions unit test.
 *
 * definitions.js is the single source for three concepts that were previously
 * redefined in every file that needed them: how critical a thing is, how
 * critical a link is, and what counts as a single point of failure.
 *
 * These tests assert the DEFINITIONS themselves. A wrong definition here
 * propagates silently into every score in the product, so the assertions are
 * deliberately about boundaries and about absent data rather than happy paths.
 *
 * No database and no network — every function here is pure.
 *
 * Run from backend/:  node tests/definitions.unit.test.js
 */

const D = require('../domain/definitions')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Canonical Definitions Unit Test ===\n')

// ── The scale ────────────────────────────────────────────────────────────────
console.log('Criticality scale — four distinct levels (D-03):')
{
	check('four levels, lowest to highest', JSON.stringify(D.LEVELS) === JSON.stringify(['low', 'normal', 'high', 'critical']), D.LEVELS)
	check('critical outranks high', D.RANK.critical > D.RANK.high)
	check('high outranks normal', D.RANK.high > D.RANK.normal)
	check('normal outranks low', D.RANK.normal > D.RANK.low)

	check('normalizes casing and whitespace', D.normalizeLevel('  CRITICAL ') === 'critical', D.normalizeLevel('  CRITICAL '))
	check('unrecognized string is unknown', D.normalizeLevel('severe') === D.UNKNOWN, D.normalizeLevel('severe'))
	check('null is unknown', D.normalizeLevel(null) === D.UNKNOWN, D.normalizeLevel(null))
	check('undefined is unknown', D.normalizeLevel(undefined) === D.UNKNOWN, D.normalizeLevel(undefined))
	check('empty string is unknown', D.normalizeLevel('') === D.UNKNOWN, D.normalizeLevel(''))
}

console.log("\nRegression D-65 — 'medium' must rank alongside 'normal', not fall to unknown:")
{
	// agents.risk / workflows.risk / knowledge_assets.criticality all use
	// 'medium'; dependencies.dependency_type uses 'normal' for the identical
	// tier. Before D-65, LEVELS only recognized 'normal', so every medium-risk
	// entity silently normalized to UNKNOWN everywhere atOrAbove/entityCriticality
	// was used — found while building D-61, confirmed against real seed data
	// (46 of 59 'medium'/'normal' rows across those columns use 'medium').
	check("'medium' is a recognized level, not unknown", D.normalizeLevel('medium') === 'medium', D.normalizeLevel('medium'))
	check("'medium' keeps its own spelling, not silently renamed to 'normal'", D.normalizeLevel('medium') !== 'normal', D.normalizeLevel('medium'))
	check("'medium' and 'normal' rank equally", D.RANK.medium === D.RANK.normal, [D.RANK.medium, D.RANK.normal])
	check("medium is at or above medium (a value must meet its own bar)", D.atOrAbove('medium', 'medium') === true)
	check("medium is at or above normal (same tier, different spelling)", D.atOrAbove('medium', 'normal') === true)
	check("normal is at or above medium (same tier, different spelling)", D.atOrAbove('normal', 'medium') === true)
	check("medium is at or above low", D.atOrAbove('medium', 'low') === true)
	check("medium is NOT at or above high", D.atOrAbove('medium', 'high') === false)
	check("entityCriticality reads a medium-risk agent as 'medium', not unknown", D.entityCriticality('agent', { risk: 'medium' }) === 'medium', D.entityCriticality('agent', { risk: 'medium' }))
	check("the old bug would have produced unknown here", D.entityCriticality('agent', { risk: 'medium' }) !== D.UNKNOWN)
}

console.log('\nThreshold comparison — unknown never qualifies (D-07):')
{
	check('critical is at or above high', D.atOrAbove('critical', 'high') === true)
	check('high is at or above high', D.atOrAbove('high', 'high') === true)
	check('normal is not at or above high', D.atOrAbove('normal', 'high') === false)
	check('low is not at or above high', D.atOrAbove('low', 'high') === false)
	check('unknown is never at or above anything', D.atOrAbove(D.UNKNOWN, 'low') === false)
	check('unknown compared to unknown is false', D.atOrAbove(D.UNKNOWN, D.UNKNOWN) === false)
	check('a bogus threshold is false, not a throw', D.atOrAbove('critical', 'nonsense') === false)
}

console.log('\nmaxLevel — highest known, ignoring unknowns:')
{
	check('picks the highest', D.maxLevel(['low', 'critical', 'normal']) === 'critical', D.maxLevel(['low', 'critical', 'normal']))
	check('ignores unknown alongside known', D.maxLevel([D.UNKNOWN, 'normal']) === 'normal', D.maxLevel([D.UNKNOWN, 'normal']))
	check('all unknown stays unknown', D.maxLevel([D.UNKNOWN, D.UNKNOWN]) === D.UNKNOWN, D.maxLevel([D.UNKNOWN, D.UNKNOWN]))
	check('empty list is unknown', D.maxLevel([]) === D.UNKNOWN, D.maxLevel([]))
}


console.log("\nEntity criticality — four different column names (D-03):")
{
	check('agent reads .risk', D.entityCriticality('agent', { risk: 'critical' }) === 'critical', D.entityCriticality('agent', { risk: 'critical' }))
	check('workflow reads .risk', D.entityCriticality('workflow', { risk: 'high' }) === 'high', D.entityCriticality('workflow', { risk: 'high' }))
	check('knowledge_asset reads .criticality', D.entityCriticality('knowledge_asset', { criticality: 'low' }) === 'low', D.entityCriticality('knowledge_asset', { criticality: 'low' }))

	check('agent ignores a stray .criticality property', D.entityCriticality('agent', { criticality: 'critical' }) === D.UNKNOWN, D.entityCriticality('agent', { criticality: 'critical' }))
	check('workflow ignores a stray .criticality property', D.entityCriticality('workflow', { criticality: 'critical' }) === D.UNKNOWN, D.entityCriticality('workflow', { criticality: 'critical' }))

	check('unrecognized entity type is unknown', D.entityCriticality('teapot', { risk: 'critical' }) === D.UNKNOWN, D.entityCriticality('teapot', { risk: 'critical' }))
	check('missing row is unknown, not a throw', D.entityCriticality('agent', null) === D.UNKNOWN, D.entityCriticality('agent', null))
}

console.log("\nPlatform criticality — derived from knowledge assets (authored):")
{
	const knowledgeAssets = [
		{ asset_type: 'platform', asset_id: 1, criticality: 'normal' },
		{ asset_type: 'platform', asset_id: 1, criticality: 'critical' },
		{ asset_type: 'platform', asset_id: 2, criticality: 'low' },
		{ asset_type: 'workflow', asset_id: 1, criticality: 'critical' },
	]
	const ctx = { knowledgeAssets }

	check('platform takes the max of its assets', D.entityCriticality('platform', { id: 1 }, ctx) === 'critical', D.entityCriticality('platform', { id: 1 }, ctx))
	check('platform with one low asset is low', D.entityCriticality('platform', { id: 2 }, ctx) === 'low', D.entityCriticality('platform', { id: 2 }, ctx))
	check('platform with no assets is unknown, not normal', D.entityCriticality('platform', { id: 99 }, ctx) === D.UNKNOWN, D.entityCriticality('platform', { id: 99 }, ctx))
	check('platform without ctx is unknown, not a throw', D.entityCriticality('platform', { id: 1 }) === D.UNKNOWN, D.entityCriticality('platform', { id: 1 }))
	check('other asset types do not leak in', D.entityCriticality('platform', { id: 1 }, { knowledgeAssets: [{ asset_type: 'workflow', asset_id: 1, criticality: 'critical' }] }) === D.UNKNOWN)
}

console.log("\nEdge criticality — dependency_type, a separate concept:")
{
	check('reads dependency_type', D.edgeCriticality({ dependency_type: 'critical' }) === 'critical', D.edgeCriticality({ dependency_type: 'critical' }))
	check('normalizes casing', D.edgeCriticality({ dependency_type: 'HIGH' }) === 'high', D.edgeCriticality({ dependency_type: 'HIGH' }))
	check('absent dependency_type is unknown', D.edgeCriticality({}) === D.UNKNOWN, D.edgeCriticality({}))
	check('null row is unknown, not a throw', D.edgeCriticality(null) === D.UNKNOWN, D.edgeCriticality(null))
	check('does not read a stray .criticality', D.edgeCriticality({ criticality: 'critical' }) === D.UNKNOWN, D.edgeCriticality({ criticality: 'critical' }))
	check('edge threshold comparison works', D.atOrAbove(D.edgeCriticality({ dependency_type: 'critical' }), 'high') === true)
}

console.log("\nSPOF verdict — sole owner + no backup + criticality >= high (D-06):")
{
	const v = (criticality, ownerCount, hasBackup) => D.spofVerdict({ criticality, ownerCount, hasBackup }).status

	check('threshold is high', D.SPOF_THRESHOLD === 'high', D.SPOF_THRESHOLD)

	check('sole owner + no backup + critical IS a spof', v('critical', 1, false) === 'spof', v('critical', 1, false))
	check('sole owner + no backup + high IS a spof', v('high', 1, false) === 'spof', v('high', 1, false))
	check('a backup defeats it', v('critical', 1, true) === 'not_spof', v('critical', 1, true))
	check('multiple owners defeat it', v('critical', 3, false) === 'not_spof', v('critical', 3, false))
	check('normal criticality defeats it', v('normal', 1, false) === 'not_spof', v('normal', 1, false))
	check('low criticality defeats it', v('low', 1, false) === 'not_spof', v('low', 1, false))

	check('zero owners is orphaned, not spof', v('critical', 0, false) === 'orphaned', v('critical', 0, false))
	check('orphaned even when criticality is low', v('low', 0, false) === 'orphaned', v('low', 0, false))

	check('unknown criticality is not evaluable', v(D.UNKNOWN, 1, false) === 'not_evaluable', v(D.UNKNOWN, 1, false))
	check('not_evaluable is distinct from not_spof', v(D.UNKNOWN, 1, false) !== v('normal', 1, false))
	check('missing criticality is not evaluable', D.spofVerdict({ ownerCount: 1, hasBackup: false }).status === 'not_evaluable')

	check('zero dependents does not prevent a spof', v('critical', 1, false) === 'spof')

	check('reasons are reported', D.spofVerdict({ criticality: 'critical', ownerCount: 1, hasBackup: false }).reasons.length > 0)
	check('reasons name the sole owner', D.spofVerdict({ criticality: 'critical', ownerCount: 1, hasBackup: false }).reasons.includes('sole_owner'))
	check('reasons name the missing backup', D.spofVerdict({ criticality: 'critical', ownerCount: 1, hasBackup: false }).reasons.includes('no_backup_owner'))
}

console.log("\nCoverage gate — 50% inclusive (D-10):")
{
	const has = (r) => r.documented === true
	const rows = (n, coveredCount) => Array.from({ length: n }, (_, i) => ({ documented: i < coveredCount }))

	check('full coverage is sufficient', D.evidenceGate(rows(10, 10), has).sufficient === true)
	check('exactly 50% is sufficient (inclusive boundary)', D.evidenceGate(rows(10, 5), has).sufficient === true, D.evidenceGate(rows(10, 5), has))
	check('49% is insufficient', D.evidenceGate(rows(100, 49), has).sufficient === false, D.evidenceGate(rows(100, 49), has))
	check('51% is sufficient', D.evidenceGate(rows(100, 51), has).sufficient === true)
	check('zero coverage is insufficient', D.evidenceGate(rows(10, 0), has).sufficient === false)

	check('threshold default is 0.5', D.COVERAGE_THRESHOLD === 0.5, D.COVERAGE_THRESHOLD)
	check('threshold is overridable', D.evidenceGate(rows(10, 3), has, { threshold: 0.25 }).sufficient === true)

	check('empty population is insufficient', D.evidenceGate([], has).sufficient === false, D.evidenceGate([], has))
	check('empty population reports zero total', D.evidenceGate([], has).total === 0)

	const bad = D.evidenceGate(rows(10, 1), has)
	check('insufficient carries the status string', bad.status === 'insufficient_evidence', bad.status)
	check('insufficient reports actual coverage', bad.coverage === 0.1, bad.coverage)
	check('insufficient reports the threshold it failed', bad.threshold === 0.5, bad.threshold)
	check('sufficient carries a computed status', D.evidenceGate(rows(10, 10), has).status === 'computed')

	const c = D.coverage(rows(8, 2), has)
	check('coverage reports covered and total', c.covered === 2 && c.total === 8, c)
	check('coverage reports the ratio', c.ratio === 0.25, c.ratio)
	check('coverage of empty is ratio 0', D.coverage([], has).ratio === 0)
}

console.log("\nRegression F-B — a critical dependency must not be filtered out:")
{
	const edges = [
		{ id: 1, criticality: 'critical' },
		{ id: 2, criticality: 'high' },
		{ id: 3, criticality: 'normal' },
		{ id: 4, criticality: 'low' },
	]
	const kept = edges.filter((r) => D.atOrAbove(r.criticality, 'high')).map((r) => r.id)
	check('keeps both critical and high', JSON.stringify(kept) === JSON.stringify([1, 2]), kept)
	check('the old comparison would have dropped critical', edges.filter((r) => r.criticality === 'high').length === 1)
}

console.log("\nRegression F-G' — absent criticality must not become 'low':")
{
	check('absent agent risk is unknown, not low', D.entityCriticality('agent', { id: 1 }) === D.UNKNOWN, D.entityCriticality('agent', { id: 1 }))
	check('absent workflow risk is unknown, not low', D.entityCriticality('workflow', { id: 1 }) === D.UNKNOWN, D.entityCriticality('workflow', { id: 1 }))
	check('null risk is unknown, not low', D.entityCriticality('agent', { risk: null }) === D.UNKNOWN, D.entityCriticality('agent', { risk: null }))
	check('unknown is distinguishable from a real low', D.UNKNOWN !== 'low')
	check('a real low is still low', D.entityCriticality('agent', { risk: 'low' }) === 'low')
}

console.log("\nRegression F-K — platform criticality must not depend on row order:")
{
	const forward = [
		{ asset_type: 'platform', asset_id: 5, criticality: 'critical' },
		{ asset_type: 'platform', asset_id: 5, criticality: 'low' },
	]
	const reversed = [...forward].reverse()

	check('takes the max, not the last row', D.entityCriticality('platform', { id: 5 }, { knowledgeAssets: forward }) === 'critical', D.entityCriticality('platform', { id: 5 }, { knowledgeAssets: forward }))
	check('order does not change the answer',
		D.entityCriticality('platform', { id: 5 }, { knowledgeAssets: forward }) === D.entityCriticality('platform', { id: 5 }, { knowledgeAssets: reversed }))
	check('the old last-row-wins rule would have disagreed', forward[forward.length - 1].criticality !== reversed[reversed.length - 1].criticality)
}

console.log('\ncombineEvidence — composite gates stay readable as a flat gate (D-22, D-23):')
{
	const a = D.evidenceGate([{ x: 1 }], () => true)          // sufficient, coverage 1
	const b = D.evidenceGate([{ x: 1 }, { x: 1 }, { x: null }], (r) => r.x != null) // sufficient, coverage 0.67
	const c = D.evidenceGate([], () => true)                   // insufficient, coverage 0

	const allGood = D.combineEvidence({ a, b })
	check('sufficient only if every named gate is', allGood.sufficient === true, allGood)
	check("surfaces the worst gate's own coverage at the top level", allGood.coverage === b.coverage, allGood)
	check('named gates are still reachable for detail', allGood.a === a && allGood.b === b, allGood)

	const oneBad = D.combineEvidence({ a, c })
	check('one insufficient gate sinks the whole composite', oneBad.sufficient === false, oneBad)
	check('the worst (zero-coverage) gate is what surfaces at the top', oneBad.coverage === 0 && oneBad.total === 0, oneBad)
}
console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'CANONICAL DEFINITIONS TESTS PASSED ✅' : 'CANONICAL DEFINITIONS TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
