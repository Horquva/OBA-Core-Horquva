/*
 * OBA Core — domain/dataset.js incidents unit test (W-J)
 * No external test framework. Stubs Supabase so it runs offline.
 * Run from the backend/ folder:  node tests/dataset.unit.test.js
 */

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

console.log('\n=== OBA Core — domain/dataset.js Incidents Unit Test ===\n')

// Stub supabase and brain before requiring dataset.js, same pattern authRoutes.test.js /
// graphRoutes.test.js already use for offline HTTP-level tests.
const Module = require('module')
const originalLoad = Module._load

let incidentRows = []

Module._load = function (request, parent, isMain) {
	if (request === '../supabase' || request.endsWith('/supabase')) {
		return {
			from(table) {
				const rows = table === 'incidents' ? incidentRows
					: table === 'decision_history' ? []
					: table === 'documentation_trend' ? []
					: table === 'snapshots' ? []
					: []
				return { select: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }) }
			},
		}
	}
	if (request === '../brain' || request.endsWith('/brain')) {
		return {
			isReady: () => true,
			getGraph: () => ({
				entities: { list: () => [] },
				relationships: { to: () => [] },
			}),
		}
	}
	return originalLoad.apply(this, arguments)
}

const { loadOrgDataset } = require('../domain/dataset')
Module._load = originalLoad

;(async () => {
	// ─── 1. Empty incidents table: honest absence, not fabricated ───
	incidentRows = []
	const empty = await loadOrgDataset()
	check('empty incidents table yields []', Array.isArray(empty.incidents) && empty.incidents.length === 0)

	// ─── 2. Populated incidents table: real fields survive the mapping ───
	incidentRows = [
		{ id: 1, occurred_at: '2026-01-30', entity_name: 'Billing System', entity_type: 'system', impact: 'Duplicate invoices.', owner_id: 2, resolved_by_id: 36, resolution_days: 3, lesson: 'Read the code.' },
	]
	const populated = await loadOrgDataset()
	check('populated incidents table yields one row', populated.incidents.length === 1)
	check('lesson field survives the mapping', populated.incidents[0].lesson === 'Read the code.')
	check('resolved_by field survives the mapping', populated.incidents[0].resolved_by === 36)
})().then(() => {
	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})
