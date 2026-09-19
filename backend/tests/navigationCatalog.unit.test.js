/*
 * OBA Core — Navigation catalog + propose_navigation unit test (T12.2).
 *
 * agent/navigationCatalog.js maps a page slug to a real frontend route.
 * tools/propose-navigation.js exposes that lookup as a tool call. Same
 * check() pattern as the rest of the suite.
 *
 * Run from backend/:  node tests/navigationCatalog.unit.test.js
 */

'use strict'

const { NAVIGATION_CATALOG, SUPPORTED_SLUGS, getRoute } = require('../agent/navigationCatalog')
const proposeNavigation = require('../tools/propose-navigation')
const { SUPPORTED_SLUGS: PAGE_CONTEXT_SLUGS } = require('../agent/pageContext')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Navigation Catalog Unit Test (12.2) ===\n')

console.log('getRoute():')
{
	check('a known slug resolves to a route', getRoute('risks')?.route === '/risk', getRoute('risks'))
	check('a known slug resolves to a label', getRoute('risks')?.label === 'Risk Dashboard', getRoute('risks'))
	check('lookup is case-insensitive', getRoute('RISKS')?.route === '/risk', getRoute('RISKS'))
	check('lookup trims whitespace', getRoute('  risks  ')?.route === '/risk', getRoute('  risks  '))
	check('an unknown slug returns null, not a throw', getRoute('nonexistent-page') === null)
	check('a null slug returns null, not a throw', getRoute(null) === null)
	check('an undefined slug returns null, not a throw', getRoute(undefined) === null)
}

console.log('\nCatalog completeness:')
{
	check('every entry has a route', Object.values(NAVIGATION_CATALOG).every((p) => typeof p.route === 'string' && p.route.length > 0))
	check('every entry has a label', Object.values(NAVIGATION_CATALOG).every((p) => typeof p.label === 'string' && p.label.length > 0))
	check('every route starts with /', Object.values(NAVIGATION_CATALOG).every((p) => p.route.startsWith('/')))
	check(
		'every slug here also exists in pageContext.js\'s PAGE_CATALOG',
		SUPPORTED_SLUGS.every((s) => PAGE_CONTEXT_SLUGS.includes(s)),
		{ navSlugs: SUPPORTED_SLUGS, pageSlugs: PAGE_CONTEXT_SLUGS },
	)
	check(
		'every pageContext.js slug is covered here too -- nothing left unroutable',
		PAGE_CONTEXT_SLUGS.every((s) => SUPPORTED_SLUGS.includes(s)),
		{ navSlugs: SUPPORTED_SLUGS, pageSlugs: PAGE_CONTEXT_SLUGS },
	)
}

console.log('\npropose_navigation — contract shape:')
{
	check('has the expected tool name', proposeNavigation.name === 'propose_navigation')
	check('description is prescriptive (mentions when to call it)', proposeNavigation.description.toLowerCase().includes('call this when'))
	check('parameters declare slug as required', proposeNavigation.parameters.required.includes('slug'))
	check('slug is constrained to an enum of real slugs', JSON.stringify(proposeNavigation.parameters.properties.slug.enum) === JSON.stringify(SUPPORTED_SLUGS))
	check('reason is optional, not required', !proposeNavigation.parameters.required.includes('reason'))
}

console.log('\npropose_navigation — run():')
{
	const ctx = { roots: {}, intel: {}, snapshotAt: '2026-09-16T00:00:00.000Z' }

	const ok = proposeNavigation.run(ctx, { slug: 'continuity', reason: 'You just asked about succession risk.' })
	check('a known slug returns data, not an error', ok.data !== null && !ok.toolError, ok)
	check('data.route matches the catalog', ok.data.route === '/continuity', ok.data)
	check('data.label matches the catalog', ok.data.label === 'Continuity & Succession', ok.data)
	check('data.reason is passed through', ok.data.reason === 'You just asked about succession risk.', ok.data)
	check('slug is normalised in the response', ok.data.slug === 'continuity', ok.data)

	const noReason = proposeNavigation.run(ctx, { slug: 'workflows' })
	check('reason is optional -- omitting it does not error', !noReason.toolError, noReason)
	check('missing reason comes back as null, not undefined or a throw', noReason.data.reason === null, noReason.data)

	const caseInsensitive = proposeNavigation.run(ctx, { slug: 'RISKS' })
	check('run() is case-insensitive same as getRoute()', caseInsensitive.data?.route === '/risk', caseInsensitive)

	const bad = proposeNavigation.run(ctx, { slug: 'not-a-real-page' })
	check('an unknown slug returns null data, not a throw', bad.data === null, bad)
	check('an unknown slug sets a toolError', bad.toolError?.code === 'UNKNOWN_SLUG', bad.toolError)
	check('the toolError lists the real supported slugs', JSON.stringify(bad.toolError?.details?.supportedSlugs) === JSON.stringify(SUPPORTED_SLUGS), bad.toolError)

	const missingArgs = proposeNavigation.run(ctx, {})
	check('a call with no args at all does not throw', missingArgs.toolError?.code === 'UNKNOWN_SLUG', missingArgs)
}

console.log('\n' + '-'.repeat(40))
console.log('passed:', passed, '  failed:', failed)
console.log('-'.repeat(40))
if (failed > 0) {
	console.log('\nNAVIGATION CATALOG UNIT TESTS FAILED ❌')
	process.exit(1)
}
console.log('\nNAVIGATION CATALOG UNIT TESTS PASSED ✅')
console.log('-'.repeat(40))