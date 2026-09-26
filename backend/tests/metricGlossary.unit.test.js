/*
 * OBA Core — Metric Glossary unit test.
 *
 * domain/metricGlossary.js implements Task 10.4: one definition per
 * metric any tool can return, transcribed from source doc comments,
 * each marked measured (authored: false) or authored (authored: true,
 * with authoredNote explaining the judgment call).
 *
 * Run from backend/:  node tests/metricGlossary.unit.test.js
 */

const { metrics, getMetricDefinition } = require('../domain/metricGlossary')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Metric Glossary Unit Test ===\n')

console.log('Overall shape:')
{
	check('metrics is a non-empty array', Array.isArray(metrics) && metrics.length > 0, metrics.length)
	check('exports 20 entries (17 source functions, pillars() contributing 4)', metrics.length === 20, metrics.length)

	const names = metrics.map((m) => m.metric)
	const uniqueNames = new Set(names)
	check('every metric name is unique, no duplicates', uniqueNames.size === names.length, names.length - uniqueNames.size)
}

console.log('\nEvery entry carries all required fields:')
{
	const requiredFields = ['metric', 'label', 'definition', 'range', 'authored', 'computedIn', 'decisions']
	for (const entry of metrics) {
		for (const field of requiredFields) {
			check(`"${entry.metric}" has field "${field}"`, entry[field] !== undefined, entry)
		}
	}
}

console.log('\nauthoredNote is present wherever authored is true:')
{
	for (const entry of metrics) {
		if (entry.authored) {
			check(`"${entry.metric}" is authored and carries an authoredNote`, typeof entry.authoredNote === 'string' && entry.authoredNote.length > 0, entry)
		} else {
			check(`"${entry.metric}" is measured (authored: false), no authoredNote required`, entry.authoredNote === undefined || entry.authoredNote === '' , entry.authoredNote)
		}
	}
}

console.log('\ngetMetricDefinition():')
{
	for (const entry of metrics) {
		const found = getMetricDefinition(entry.metric)
		check(`resolves "${entry.metric}" to its real entry`, found !== null && found.metric === entry.metric, found)
	}

	const missing = getMetricDefinition('not_a_real_metric')
	check('an unknown metric name returns null, not a throw or a fabricated entry', missing === null, missing)
}

console.log('\nThe pillars() correction — GI/MI/DI/org_score, not flat fields:')
{
	const pillarKeys = ['GI', 'MI', 'DI', 'org_score']
	for (const key of pillarKeys) {
		const entry = getMetricDefinition(key)
		check(`pillar key "${key}" resolves and is computed in pillars()`, entry !== null && entry.computedIn.includes('pillars()'), entry)
	}

	// The old, wrong flat field names must NOT exist as separate entries.
	check('no stray flat "governanceIntelligence" entry from before the correction', getMetricDefinition('governanceIntelligence') === null)
	check('no stray flat "orgScore" (camelCase) entry -- the real key is "org_score"', getMetricDefinition('orgScore') === null)
}

console.log('\n' + '-'.repeat(40))
console.log('passed:', passed, '  failed:', failed)
console.log('-'.repeat(40))
if (failed > 0) {
	console.log('\nMETRIC GLOSSARY UNIT TESTS FAILED ❌')
	process.exit(1)
}
console.log('\nMETRIC GLOSSARY UNIT TESTS PASSED ✅')
console.log('-'.repeat(40))