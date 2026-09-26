/*
 * OBA Core — Change → Impact route test (AI-6).
 *
 * Covers the three routes in routes/changeImpact.js over real HTTP:
 *   GET  /events    any authenticated user (D3); invalid filters are 400
 *   POST /scan      admin only (D1) — 401 with no user, 403 for a member
 *   POST /preview   runs the engine on live data and writes NOTHING
 *
 * Stubs supabase.js through require.cache with an in-memory database, same
 * pattern as agentsRoutes.test.js, so this runs offline. req.user is set by a
 * small test middleware standing in for index.js's global requireAuth.
 *
 * Run from backend/:  node tests/changeImpactRoutes.test.js
 */

const path = require('path')
const d = require('../domain/derived')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// ── The org, as root tables ────────────────────────────────────────────────

const ORG = {
	employees: [
		{ id: 1, name: 'Sarah Connor', department: 'Eng' },
		{ id: 2, name: 'John Doe', department: 'Ops' },
	],
	agents: [
		{ id: 10, name: 'SupportBot', risk: 'critical', owner_id: 1 },
		{ id: 11, name: 'ReportBot', risk: 'low', owner_id: 2 },
		{ id: 12, name: 'Escalator', risk: 'medium', owner_id: 2 },
	],
	owners: [
		{ id: 1, name: 'Sarah Connor', employee_id: 1, backup_owner: 'John Doe' },
		{ id: 2, name: 'John Doe', employee_id: 2, backup_owner: null },
	],
	dependencies: [
		{ source_id: 12, target_id: 10, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
	],
	workflows: [
		{ id: 100, name: 'Incident Response', risk: 'high' },
		{ id: 101, name: 'Payroll', risk: 'low' },
	],
	workflow_dependencies: [
		{ workflow_id: 100, agent_id: 12 },
		{ workflow_id: 101, agent_id: 11 },
	],
	ai_platforms: [
		{ id: 500, name: 'ChatGPT Enterprise', vendor: 'OpenAI' },
		{ id: 501, name: 'Claude Pro', vendor: 'Anthropic' },
	],
	agent_platform: [{ agent_id: 10, platform_id: 500 }],
	tool_backups: [{ primary_platform: 500, backup_platform: 501 }],
	tool_ownership: [{ platform_id: 500, employee_id: 2 }],
}

// ── Fake supabase: every root table, plus change_events and change_baseline.
// Any table not seeded reads as empty rather than throwing, so the root
// loader and anything it consults see a well-formed (if sparse) org. ──────

const copy = (x) => JSON.parse(JSON.stringify(x))
const tables = { change_events: [], change_baseline: [] }
for (const t of d.ROOT_TABLES) tables[t] = copy(ORG[t] || [])
let nextId = 1

function fakeFrom(table) {
	if (!tables[table]) tables[table] = []
	const state = { filters: [], order: null, limit: null, single: false }
	const run = () => {
		let rows = tables[table].filter((r) => state.filters.every((f) => f(r)))
		if (state.order) {
			const { col, ascending } = state.order
			rows = rows.slice().sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (ascending ? 1 : -1))
		}
		if (state.limit != null) rows = rows.slice(0, state.limit)
		return state.single ? { data: rows[0] ? copy(rows[0]) : null, error: null } : { data: rows.map(copy), error: null }
	}
	const b = {
		select() { return b },
		eq(c, v) { state.filters.push((r) => r[c] === v); return b },
		gte(c, v) { state.filters.push((r) => r[c] >= v); return b },
		lte(c, v) { state.filters.push((r) => r[c] <= v); return b },
		lt(c, v) { state.filters.push((r) => r[c] < v); return b },
		order(c, { ascending = true } = {}) { state.order = { col: c, ascending }; return b },
		limit(n) { state.limit = n; return b },
		maybeSingle() { state.single = true; return b },
		upsert(input, opts = {}) {
			for (const row of Array.isArray(input) ? input : [input]) {
				const existing = opts.onConflict ? tables[table].find((r) => r[opts.onConflict] === row[opts.onConflict]) : null
				if (existing) { if (!opts.ignoreDuplicates) Object.assign(existing, copy(row)); continue }
				const stored = copy(row)
				if (table === 'change_events') {
					stored.id = nextId++
					stored.detected_at = new Date(Date.UTC(2026, 8, 21, 0, stored.id)).toISOString()
				}
				tables[table].push(stored)
			}
			return Promise.resolve({ error: null })
		},
		then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
	}
	return b
}

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath,
	filename: supabasePath,
	loaded: true,
	exports: { from: fakeFrom },
}

// ── A minimal app: the route, behind a stand-in for requireAuth ────────────

const express = require('express')
const router = require('../routes/changeImpact')

const app = express()
app.use(express.json())
app.use((req, _res, next) => {
	const role = req.headers['x-test-role']
	if (role) req.user = { sub: 'test', email: 'test@example.com', role }
	next()
})
app.use('/api/change-impact', router)

let base
async function call(method, url, { role, body } = {}) {
	const headers = { 'content-type': 'application/json' }
	if (role) headers['x-test-role'] = role
	const res = await fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined })
	let json = null
	try { json = await res.json() } catch (_) { /* no body */ }
	return { status: res.status, body: json }
}

console.log('\n=== OBA Core — Change → Impact Route Test ===\n')

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	base = `http://127.0.0.1:${server.address().port}`

	// ── Admin gate on /scan (D1) ────────────────────────────────────────────
	console.log('POST /scan is admin only:')
	{
		const anon = await call('POST', '/api/change-impact/scan')
		check('no user — 401', anon.status === 401, anon)

		const member = await call('POST', '/api/change-impact/scan', { role: 'member' })
		check('a member — 403', member.status === 403, member)
		check('the member was not allowed to write a baseline', tables.change_baseline.length === 0)

		const admin = await call('POST', '/api/change-impact/scan', { role: 'admin' })
		check('an admin — 200', admin.status === 200, admin)
		check('the first scan records a baseline', admin.body && admin.body.firstScan === true && tables.change_baseline.length === 1, admin.body)
	}

	console.log('\nA dry-run scan finds a change and writes nothing:')
	{
		tables.agents.find((a) => a.id === 10).owner_id = null
		const dry = await call('POST', '/api/change-impact/scan?dry_run=true', { role: 'admin' })
		check('200', dry.status === 200, dry)
		check('the change is detected', dry.body && dry.body.detected === 1, dry.body)
		check('nothing is written', tables.change_events.length === 0)
	}

	console.log('\nA real scan records it:')
	{
		const real = await call('POST', '/api/change-impact/scan', { role: 'admin' })
		check('200', real.status === 200, real)
		check('one event written', real.body && real.body.written === 1 && tables.change_events.length === 1, real.body)
	}

	// ── Reading (D3) ────────────────────────────────────────────────────────
	console.log('\nGET /events is open to any authenticated user:')
	{
		const member = await call('GET', '/api/change-impact/events', { role: 'member' })
		check('a member can read — 200', member.status === 200, member)
		check('the recorded change is returned', member.body && member.body.events.length === 1
			&& member.body.events[0].description === 'Owner of SupportBot changed from Sarah Connor to no one', member.body)
		check('the baseline time is reported', member.body && typeof member.body.baseline_taken_at === 'string')
	}

	console.log('\nInvalid filters are a 400, not an empty list:')
	{
		const badType = await call('GET', '/api/change-impact/events?change_type=meteor_strike', { role: 'member' })
		check('an unknown change_type — 400', badType.status === 400, badType)
		check('with a message saying why', badType.body && /change_type/.test(badType.body.error), badType.body)

		const badDate = await call('GET', '/api/change-impact/events?from=last-tuesday', { role: 'member' })
		check('a bad timestamp — 400', badDate.status === 400, badDate)
	}

	// ── Preview ─────────────────────────────────────────────────────────────
	console.log('\nPOST /preview answers "what would this do" without recording anything:')
	{
		// The scan tests above cleared SupportBot's owner; give it back to Sarah,
		// or her backup has nothing to protect and the preview is correctly empty.
		tables.agents.find((a) => a.id === 10).owner_id = 1
		const eventsBefore = tables.change_events.length
		const baselineBefore = JSON.stringify(tables.change_baseline)

		const ok = await call('POST', '/api/change-impact/preview', {
			role: 'member',
			body: { change: { type: 'backup_removed', employeeId: 1 } },
		})
		check('200', ok.status === 200, ok)
		check('it is priced', ok.body && ok.body.priced === true, ok.body)
		check('it names the SPOF it would create', ok.body && ok.body.spofChanges.some((x) => x.agentName === 'SupportBot'), ok.body && ok.body.spofChanges)
		check('no event was written', tables.change_events.length === eventsBefore)
		check('the baseline was not touched', JSON.stringify(tables.change_baseline) === baselineBefore)
	}

	console.log('\nA malformed preview is the caller\'s error:')
	{
		const noBody = await call('POST', '/api/change-impact/preview', { role: 'member', body: {} })
		check('no change in the body — 400', noBody.status === 400, noBody)

		const unknown = await call('POST', '/api/change-impact/preview', { role: 'member', body: { change: { type: 'meteor_strike' } } })
		check('an unknown change type — 400', unknown.status === 400, unknown)

		const missing = await call('POST', '/api/change-impact/preview', { role: 'member', body: { change: { type: 'owner_changed', agentId: 999, toOwnerId: 1 } } })
		check('a target that does not exist — 400', missing.status === 400, missing)
	}

	await new Promise((r) => server.close(r))

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'CHANGE IMPACT ROUTE TESTS PASSED ✅' : 'CHANGE IMPACT ROUTE TESTS FAILED ✗')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
