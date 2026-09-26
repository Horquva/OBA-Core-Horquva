/*
 * OBA Core — Change → Impact persistence unit test (AI-6).
 *
 * lib/changeImpactStore.js is the scan, the baseline and the reads. The two
 * guarantees the design rests on are asserted here against an in-memory fake
 * of the Supabase client that can be told to fail its next write:
 *
 *   fail-closed — a failed event write never advances the baseline, so no
 *                 change is lost;
 *   idempotent  — a retry after a failed baseline write never duplicates an
 *                 event.
 *
 * Tests §9 of docs/superpowers/specs/2026-09-21-ai-6-change-impact-persistence-design.md.
 * No database and no network.
 *
 * Run from backend/:  node tests/changeImpactStore.unit.test.js
 */

const d = require('../domain/derived')
const s = require('../domain/simulations')
const ci = require('../domain/changeImpact')
const store = require('../lib/changeImpactStore')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// ── An in-memory fake of the Supabase calls the store makes ────────────────

function fakeSupabase() {
	const tables = { change_events: [], change_baseline: [] }
	const failures = new Set()
	let nextId = 1
	const copy = (x) => JSON.parse(JSON.stringify(x))

	function run(state) {
		let rows = tables[state.table].filter((r) => state.filters.every((f) => f(r)))
		if (state.order) {
			const { col, ascending } = state.order
			rows = rows.slice().sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (ascending ? 1 : -1))
		}
		if (state.limit != null) rows = rows.slice(0, state.limit)
		if (state.single) return { data: rows[0] ? copy(rows[0]) : null, error: null }
		return { data: rows.map(copy), error: null }
	}

	function upsert(table, input, opts = {}) {
		const key = `${table}:upsert`
		if (failures.has(key)) {
			failures.delete(key)
			return { error: { message: 'simulated outage' } }
		}
		for (const row of Array.isArray(input) ? input : [input]) {
			const existing = opts.onConflict ? tables[table].find((r) => r[opts.onConflict] === row[opts.onConflict]) : null
			if (existing) {
				if (!opts.ignoreDuplicates) Object.assign(existing, copy(row))
				continue
			}
			const stored = copy(row)
			if (table === 'change_events') {
				stored.id = nextId++
				stored.detected_at = new Date(Date.UTC(2026, 8, 21, 0, stored.id)).toISOString()
			}
			tables[table].push(stored)
		}
		return { error: null }
	}

	function from(table) {
		const state = { table, filters: [], order: null, limit: null, single: false }
		const b = {
			select() { return b },
			eq(col, v) { state.filters.push((r) => r[col] === v); return b },
			gte(col, v) { state.filters.push((r) => r[col] >= v); return b },
			lte(col, v) { state.filters.push((r) => r[col] <= v); return b },
			lt(col, v) { state.filters.push((r) => r[col] < v); return b },
			order(col, { ascending = true } = {}) { state.order = { col, ascending }; return b },
			limit(n) { state.limit = n; return b },
			maybeSingle() { state.single = true; return b },
			upsert(rows, opts) { return Promise.resolve(upsert(table, rows, opts)) },
			then(resolve, reject) { return Promise.resolve(run(state)).then(resolve, reject) },
		}
		return b
	}

	return { from, tables, failNext: (table, op) => failures.add(`${table}:${op}`) }
}

// ── Fixture — the same small org as changeImpact.unit.test.js ──────────────

function roots(overrides = {}) {
	const base = {}
	for (const t of d.ROOT_TABLES) base[t] = []
	const merged = { ...base, ...overrides }
	merged._counts = Object.fromEntries(d.ROOT_TABLES.map((t) => [t, merged[t].length]))
	return merged
}

function fixture() {
	return roots({
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
	})
}

/** A fixture with one edit applied, counts recomputed. */
function edited(fn) {
	const r = fixture()
	fn(r)
	return s.recount(r)
}

/** A scanning harness: a fake database plus "the current state of the org". */
function harness() {
	const db = fakeSupabase()
	let current = fixture()
	let t = Date.UTC(2026, 8, 21)
	const scan = (opts = {}) => store.scanForChanges(db, {
		loadRoots: async () => current,
		now: () => new Date((t += 60000)),
		...opts,
	})
	return { db, scan, setOrg: (r) => { current = r } }
}

async function rejects(promise) {
	try { await promise; return null } catch (err) { return err }
}

console.log('\n=== OBA Core — Change → Impact Persistence Unit Test ===\n')

async function main() {
	// ── First scan (§9.1) ────────────────────────────────────────────────────
	console.log('The first scan starts history — it cannot reconstruct anything earlier:')
	{
		const h = harness()
		const out = await h.scan()
		check('reports itself as the first scan', out.firstScan === true, out)
		check('writes a baseline', h.db.tables.change_baseline.length === 1)
		check('writes no events', h.db.tables.change_events.length === 0)
		check('the baseline holds only the watched fields',
			JSON.stringify(Object.keys(h.db.tables.change_baseline[0].snapshot).sort())
			=== JSON.stringify(['agent_platform', 'agents', 'ai_platforms', 'owners', 'tool_backups']),
			Object.keys(h.db.tables.change_baseline[0].snapshot))
	}

	console.log('\nNothing changed, nothing recorded:')
	{
		const h = harness()
		await h.scan()
		const out = await h.scan()
		check('no changes detected', out.detected === 0, out)
		check('no events written', h.db.tables.change_events.length === 0)
	}

	// ── An owner change (§9.2) ───────────────────────────────────────────────
	console.log('\nAn owner change is stored with exactly the impact the engine computed:')
	{
		const h = harness()
		await h.scan()
		h.setOrg(edited((r) => { r.agents.find((a) => a.id === 10).owner_id = null }))
		const out = await h.scan()
		const row = h.db.tables.change_events[0]
		const expected = ci.diffChange(fixture(), { type: 'owner_changed', agentId: 10, fromOwnerId: 1, toOwnerId: null })

		check('one change detected and written', out.detected === 1 && out.written === 1, out)
		check('stored as owner_changed on agent 10', row.change_type === 'owner_changed' && row.target_type === 'agent' && row.target_id === '10', row)
		check('the description names the agent and both owners', row.description === 'Owner of SupportBot changed from Sarah Connor to no one', row.description)
		check('it is priced', row.priced === true)
		check('stored agent impact matches diffChange() for the same change',
			JSON.stringify(row.impact.agents) === JSON.stringify(expected.agents), [row.impact.agents, expected.agents])
		check('stored downstream matches diffChange()',
			JSON.stringify(row.impact.downstream) === JSON.stringify(expected.downstream), row.impact.downstream)
		check('health columns match the engine', row.health_before === expected.health.before && row.health_after === expected.health.after, [row.health_before, row.health_after])
	}

	console.log('\nThe baseline advances, so a change is recorded once, not every scan:')
	{
		const h = harness()
		await h.scan()
		h.setOrg(edited((r) => { r.agents.find((a) => a.id === 10).owner_id = null }))
		await h.scan()
		const again = await h.scan()
		check('the next scan finds nothing new', again.detected === 0, again)
		check('still exactly one event', h.db.tables.change_events.length === 1)
	}

	// ── An unpriced change (§9.3) ───────────────────────────────────────────
	console.log('\nA vendor change is stored as not priced, with downstream still named:')
	{
		const h = harness()
		await h.scan()
		h.setOrg(edited((r) => { r.ai_platforms.find((p) => p.id === 500).vendor = 'Microsoft' }))
		await h.scan()
		const row = h.db.tables.change_events[0]
		check('stored as vendor_changed', row && row.change_type === 'vendor_changed', row)
		check('priced is false', row && row.priced === false)
		check('health did not move', row && (row.health_delta === 0 || row.health_delta === null), row && row.health_delta)
		check('the explanation is stored with it', row && typeof row.impact.note === 'string')
		check('downstream workflows are still stored', row && row.impact.downstream.workflows.some((w) => w.name === 'Incident Response'), row && row.impact.downstream)
	}

	// ── One scan, several changes (§9.4) ────────────────────────────────────
	console.log('\nSeveral changes in one scan are separate rows sharing a scan_id:')
	{
		const h = harness()
		await h.scan()
		h.setOrg(edited((r) => {
			r.agents.find((a) => a.id === 10).owner_id = null
			r.ai_platforms.find((p) => p.id === 500).vendor = 'Microsoft'
		}))
		await h.scan()
		const rows = h.db.tables.change_events
		check('two rows', rows.length === 2, rows.map((r) => r.change_type))
		check('they share one scan_id', rows.length === 2 && rows[0].scan_id === rows[1].scan_id && Boolean(rows[0].scan_id))
		check('each is attributed on its own — only the owner change is priced',
			rows.find((r) => r.change_type === 'owner_changed').priced === true
			&& rows.find((r) => r.change_type === 'vendor_changed').priced === false)
	}

	// ── Fail-closed (§9.5) ──────────────────────────────────────────────────
	console.log('\nFail-closed: a failed event write never advances the baseline:')
	{
		const h = harness()
		await h.scan()
		const baselineBefore = h.db.tables.change_baseline[0].taken_at
		h.setOrg(edited((r) => { r.agents.find((a) => a.id === 10).owner_id = null }))

		h.db.failNext('change_events', 'upsert')
		const err = await rejects(h.scan())
		check('the scan fails loudly', err !== null)
		check('the error says the baseline was not advanced', err && /not advanced/.test(err.message), err && err.message)
		check('nothing was written', h.db.tables.change_events.length === 0)
		check('the baseline did not move', h.db.tables.change_baseline[0].taken_at === baselineBefore, h.db.tables.change_baseline[0].taken_at)

		const retry = await h.scan()
		check('the next scan recovers the missed change', retry.written === 1 && h.db.tables.change_events.length === 1, retry)
	}

	// ── Idempotent (§9.6) ───────────────────────────────────────────────────
	console.log('\nIdempotent: a retry after a failed baseline write never duplicates:')
	{
		const h = harness()
		await h.scan()
		h.setOrg(edited((r) => { r.agents.find((a) => a.id === 10).owner_id = null }))

		h.db.failNext('change_baseline', 'upsert')
		const err = await rejects(h.scan())
		check('the scan reports the baseline failure', err !== null && /baseline/.test(err.message), err && err.message)
		check('the event itself was written', h.db.tables.change_events.length === 1)

		await h.scan()
		check('the retry adds no duplicate', h.db.tables.change_events.length === 1, h.db.tables.change_events.length)

		const after = await h.scan()
		check('and the baseline has now caught up', after.detected === 0, after)
	}

	// ── Dry run ─────────────────────────────────────────────────────────────
	console.log('\nA dry run detects but writes nothing:')
	{
		const h = harness()
		await h.scan()
		const baselineBefore = h.db.tables.change_baseline[0].taken_at
		h.setOrg(edited((r) => { r.agents.find((a) => a.id === 10).owner_id = null }))
		const out = await h.scan({ dryRun: true })
		check('the change is detected', out.detected === 1, out)
		check('nothing is written', out.written === 0 && h.db.tables.change_events.length === 0)
		check('the baseline is untouched', h.db.tables.change_baseline[0].taken_at === baselineBefore)
	}

	// ── No "who" (§9.8) ─────────────────────────────────────────────────────
	console.log('\nNo stored row records who made a change — that is audit_log\'s job:')
	{
		const h = harness()
		await h.scan()
		h.setOrg(edited((r) => {
			r.agents.find((a) => a.id === 10).owner_id = null
			r.owners.find((o) => o.employee_id === 2).backup_owner = null
		}))
		await h.scan()
		const forbidden = ['actor', 'actor_id', 'actor_email', 'actor_role', 'email', 'ip', 'user_agent', 'http_method', 'path']
		const leaks = h.db.tables.change_events.flatMap((row) => Object.keys(row).filter((k) => forbidden.includes(k)))
		check('no actor, email, IP, user-agent or endpoint column', leaks.length === 0, leaks)
	}

	// ── Reading (§9.7) ──────────────────────────────────────────────────────
	console.log('\nReading the history:')
	{
		const h = harness()
		await h.scan()
		h.setOrg(edited((r) => { r.agents.find((a) => a.id === 10).owner_id = null }))
		await h.scan()
		h.setOrg(edited((r) => {
			r.agents.find((a) => a.id === 10).owner_id = null
			r.ai_platforms.find((p) => p.id === 500).vendor = 'Microsoft'
		}))
		await h.scan()

		const all = await store.listEvents(h.db, {})
		check('newest first', all.events.length === 2 && all.events[0].id > all.events[1].id, all.events.map((e) => e.id))
		check('the baseline time is reported', typeof all.baseline_taken_at === 'string')

		const vendors = await store.listEvents(h.db, { change_type: 'vendor_changed' })
		check('filters by change_type', vendors.events.length === 1 && vendors.events[0].change_type === 'vendor_changed')

		const priced = await store.listEvents(h.db, { priced: 'true' })
		check('filters by priced', priced.events.every((e) => e.priced === true) && priced.events.length === 1)

		const page = await store.listEvents(h.db, { limit: '1' })
		check('a full page returns a cursor', page.events.length === 1 && page.next_before_id === page.events[0].id, page.next_before_id)
		const next = await store.listEvents(h.db, { limit: '1', before_id: String(page.next_before_id) })
		check('the cursor returns the older row', next.events.length === 1 && next.events[0].id < page.events[0].id)
	}

	console.log('\nInvalid filters are a 400, not an empty list:')
	{
		check('limit is capped at 200', store.parseFilters({ limit: '500' }).limit === store.MAX_LIMIT)
		check('limit defaults to 50', store.parseFilters({}).limit === 50)

		const statusOf = (query) => { try { store.parseFilters(query); return null } catch (e) { return e.status } }
		check('an unknown change_type is 400', statusOf({ change_type: 'meteor_strike' }) === 400)
		check('an unknown target_type is 400', statusOf({ target_type: 'planet' }) === 400)
		check('target_id without target_type is 400', statusOf({ target_id: '10' }) === 400)
		check('priced must be true or false', statusOf({ priced: 'maybe' }) === 400)
		check('a bad timestamp is 400', statusOf({ from: 'last tuesday' }) === 400)
		check('a non-integer limit is 400', statusOf({ limit: 'lots' }) === 400)
		check('a bad cursor is 400', statusOf({ before_id: '-4' }) === 400)
	}

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'CHANGE IMPACT PERSISTENCE TESTS PASSED ✅' : 'CHANGE IMPACT PERSISTENCE TESTS FAILED ✗')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main()
