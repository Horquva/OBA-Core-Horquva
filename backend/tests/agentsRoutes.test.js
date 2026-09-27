/*
 * OBA Core — Agent Ownership Write Route Test (DATA-1's first write slice).
 *
 * Covers PATCH /api/agents/:id/owner — now flowing through
 * domain/mutations.js (Phase 3.1): the change log records before/after with
 * impact, an `Idempotency-Key` header makes retries replay instead of
 * double-applying, and cache invalidation still fires. Stubs Supabase with
 * an in-memory fixture serving the ROOT_TABLES the mutation layer reads,
 * plus the orgs table so the real runWithTenant middleware resolves the
 * token's org — the same mounting shape production uses.
 *
 * Run from backend/:  node tests/agentsRoutes.test.js
 */

const path = require('path')

// Must be set before lib/authSecret is required.
process.env.JWT_SECRET = 'test-secret-for-agents-routes'

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// ── Fixture — ids are uuids since sql/19_uuid_primary_keys.sql ──────────────
const AGENT_10 = 'a0000000-0000-4000-8000-00000000000a'
const AGENT_11 = 'a0000000-0000-4000-8000-00000000000b'
const AGENT_MISSING = 'a0000000-0000-4000-8000-0000000000ff'
const EMP_1 = 'e0000000-0000-4000-8000-000000000001'
const EMP_2 = 'e0000000-0000-4000-8000-000000000002'
const EMP_3 = 'e0000000-0000-4000-8000-000000000003'
const EMP_MISSING = 'e0000000-0000-4000-8000-0000000000fe'
const ORG_ID = '00000000-0000-4000-8000-000000000001'

const agentsTable = [
	{ id: AGENT_10, name: 'DeployBot', owner_id: EMP_1, risk: 'low', status: 'active' },
	{ id: AGENT_11, name: 'SecurityScanner', owner_id: null, risk: 'low', status: 'active' },
]
const validEmployeeIds = new Set([EMP_1, EMP_2, EMP_3])

const ROOT_FIXTURES = {
	employees: [{ id: EMP_1, name: 'Alice' }, { id: EMP_2, name: 'Bob' }, { id: EMP_3, name: 'Cara' }],
	agents: agentsTable,
	owners: [],
	workflows: [],
	workflow_failures: [],
	workflow_runbooks: [],
	workflow_steps: [],
	dependencies: [],
	knowledge_assets: [],
	tool_users: [],
	employee_agent: [],
	ai_platforms: [],
	tool_policies: [],
	policy_violations: [],
	tool_ownership: [],
	accountability_entities: [],
	accountability_links: [],
	truth_claims: [],
	decision_history: [],
	agent_platform: [],
	workflow_dependencies: [],
	tool_backups: [],
}

const changeLogRows = []
const auditRows = []
const clearedTables = []

// Universal supabase-ish builder for a table's rows: awaitable (array
// response for loadRoots-style reads), eq-chainable, and maybeSingle-capable
// (single row by the last id filter for fetchRow-style reads).
function rowBuilder(rows) {
	const build = (filters) => ({
		eq: (col, val) => build([...filters, [col, val]]),
		order: () => build(filters),
		limit: () => build(filters),
		maybeSingle: async () => {
			const idFilter = filters.find(([c]) => c === 'id')
			const row = idFilter ? rows.find((r) => r.id === idFilter[1]) : rows[0] || null
			return { data: row ? { ...row } : null, error: null }
		},
		then(resolve, reject) {
			return Promise.resolve({ data: rows.map((r) => ({ ...r })), error: null }).then(resolve, reject)
		},
	})
	return build([])
}

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath,
	filename: supabasePath,
	loaded: true,
	exports: {
		from(table) {
			if (table === 'orgs') {
				return {
					select: () => ({
						eq: (_c, slug) => ({
							maybeSingle: async () => ({ data: { id: ORG_ID, slug }, error: null }),
						}),
					}),
				}
			}
			if (table === 'audit_log') {
				return { insert: async (rows) => { auditRows.push(...rows); return { data: null, error: null } } }
			}
			if (table === 'dependency_change_log') {
				// eq chains recursively (applyOrgScope adds org_id eq, the caller
				// adds idempotency_key eq, then maybeSingle).
				const eqChain = (filters) => ({
					eq: (col, val) => eqChain([...filters, [col, val]]),
					maybeSingle: async () => {
						const key = filters.find(([c]) => c === 'idempotency_key')?.[1]
						return { data: (key ? changeLogRows.find((r) => r.idempotency_key === key) : null) || null, error: null }
					},
				})
				return {
					select: () => eqChain([]),
					insert: (input) => ({
						select: () => ({
							maybeSingle: async () => {
								const arr = Array.isArray(input) ? input : [input]
								for (const r of arr) changeLogRows.push({ ...r, id: `cl-${changeLogRows.length + 1}` })
								return { data: changeLogRows[changeLogRows.length - 1], error: null }
							},
						}),
					}),
				}
			}
			if (table === 'agents') {
				return {
					select(cols) {
						if (cols === '*') return rowBuilder(agentsTable) // loadRoots / org-scoped array reads
						return {
							eq(col, val) {
								return {
									async maybeSingle() {
										const agent = agentsTable.find((a) => a.id === val)
										return { data: agent ? { ...agent } : null, error: null }
									},
								}
							},
						}
					},
					update(patch) {
						return {
							eq(col, val) {
								const thenable = {
									async then(resolve) {
										const agent = agentsTable.find((a) => a.id === val)
										if (!agent) return resolve({ data: null, error: null })
										if (patch.owner_id !== null && !validEmployeeIds.has(patch.owner_id)) {
											return resolve({ data: null, error: { code: '23503', message: 'insert or update on table "agents" violates foreign key constraint' } })
										}
										agent.owner_id = patch.owner_id
										resolve({ data: { ...agent }, error: null })
									},
								}
								// supabase-js update chains are awaitable and also
								// chainable (.select().maybeSingle()); only the awaited
								// form is used through the mutation layer.
								return thenable
							},
						}
					},
				}
			}
			if (['brain_core_snapshots', 'orchestrator_snapshots', 'executive_briefings'].includes(table)) {
				return {
					delete() {
						const build = (filters) => ({
							gte: (column, val) => { clearedTables.push({ table, column, val }); return build(filters) },
							eq: (column, val) => { clearedTables.push({ table, column, val }); return build(filters) },
							then(resolve, reject) {
								return Promise.resolve({ data: null, error: null }).then(resolve, reject)
							},
						})
						return build([])
					},
				}
			}
			// Root tables (Phase 3.1: the mutation layer loads the bundle).
			if (table in ROOT_FIXTURES) {
				return { select: () => rowBuilder(ROOT_FIXTURES[table]) }
			}
			throw new Error(`agentsRoutes.test.js: unexpected table '${table}'`)
		},
	},
}

// Keep the brain's background reloads (scheduleReload after mutations) off
// the network: a no-op loader keeps the breaker untouched and the test fast.
const loaderPath = require.resolve(path.join(__dirname, '..', 'brain', 'knowledge', 'graphLoader.js'))
require.cache[loaderPath] = {
	id: loaderPath, filename: loaderPath, loaded: true,
	exports: {
		loadFromSupabase: async (graph) => {
			graph.addEntity({ id: 'x1', type: 'ai_agent', name: 'X' })
		},
	},
}

const express = require('express')
const agentsRoute = require('../routes/agents')
const { requireAuth } = require('../middleware/auth')
const { runWithTenant } = require('../lib/tenant')
const { sign } = require('../lib/jwt')

const SECRET = process.env.JWT_SECRET
const adminToken = sign({ sub: 'admin', email: 'admin@horquva.com', role: 'admin', org: 'horquva' }, SECRET, 300)
const memberToken = sign({ sub: 'u-7', email: 'member@example.com', role: 'member', org: 'horquva' }, SECRET, 300)
const noRoleToken = sign({ sub: 'u-8', email: 'norole@example.com', org: 'horquva' }, SECRET, 300)

const app = express()
app.use(express.json())
app.use('/api', requireAuth)
app.use('/api', runWithTenant)
app.use('/api/agents', agentsRoute)

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function patch(p, body, token = adminToken, headers = {}) {
		const h = { 'Content-Type': 'application/json', ...headers }
		if (token) h.Authorization = 'Bearer ' + token
		const res = await fetch(base + p, { method: 'PATCH', headers: h, body: JSON.stringify(body) })
		const json = await res.json().catch(() => ({}))
		return { status: res.status, json }
	}

	console.log('\n=== OBA Core — Agent Ownership Write Route Test ===\n')

	console.log('Role gate (SEC-3):')
	{
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_3 }, null)
		check('no token — 401', r.status === 401, r.status)
	}
	{
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_3 }, memberToken)
		check('authenticated non-admin (role member) — 403', r.status === 403, r.status)
		check('...error names the required role', /admin/.test(r.json.error || ''), r.json)
	}
	{
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_3 }, noRoleToken)
		check('authenticated token with no role — 403', r.status === 403, r.status)
	}
	check('rejected calls left agent unchanged', agentsTable.find((a) => a.id === AGENT_10).owner_id === EMP_1, agentsTable)
	{
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_1 }, adminToken)
		check('env-fallback admin account — 200', r.status === 200, r.status)
	}

	console.log('\nWrite behaviour (as admin, through the mutation layer):')
	{
		changeLogRows.length = 0 // drop the warm-up call's row (same-value assignment)
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_2 })
		check('assigning a valid employee — 200', r.status === 200, r.status)
		check('response echoes the updated agent', r.json.ok === true && r.json.agent?.owner_id === EMP_2, r.json)
		check('change log recorded the mutation', changeLogRows.some((c) => c.mutation_type === 'OWNER_ASSIGNED' && c.target_id === AGENT_10), changeLogRows.map((c) => c.mutation_type))
		check('change log carries before/after snapshots', changeLogRows[0]?.before?.owner_id === EMP_1 && changeLogRows[0]?.after?.owner_id === EMP_2, changeLogRows[0] && { b: changeLogRows[0].before, a: changeLogRows[0].after })
		check('change log carries the impact envelope', 'blast_radius_score' in changeLogRows[0] && 'health_delta' in changeLogRows[0] && 'impacted_entities' in changeLogRows[0], changeLogRows[0])
	}

	{
		const r = await patch('/api/agents/' + AGENT_11 + '/owner', { ownerId: EMP_3 })
		check('assigning a previously-orphaned agent — 200', r.status === 200, r.status)
		check('orphaned agent now has the new owner', r.json.agent?.owner_id === EMP_3, r.json)
	}

	{
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: null })
		check('clearing ownership (ownerId: null) — 200, not a validation error', r.status === 200, r.status)
		check('owner_id is cleared to null', r.json.agent?.owner_id === null, r.json)
		check('clearing records OWNER_REMOVED', changeLogRows.some((c) => c.mutation_type === 'OWNER_REMOVED'), changeLogRows.map((c) => c.mutation_type))
	}

	{
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_MISSING })
		check('assigning a nonexistent employee — 400, not a 500', r.status === 400, r.status)
		check('error names the bad id, not a raw Postgres FK message', r.json.error?.includes(EMP_MISSING), r.json.error)
	}

	{
		const r = await patch('/api/agents/' + AGENT_MISSING + '/owner', { ownerId: EMP_1 })
		check('patching a nonexistent agent — 404', r.status === 404, r.status)
	}

	{
		const r = await patch('/api/agents/not-a-uuid/owner', { ownerId: EMP_1 })
		check('non-uuid agent id — 400', r.status === 400, r.status)
	}

	{
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: 'not-a-uuid' })
		check('non-uuid ownerId — 400', r.status === 400, r.status)
	}

	console.log('\nIdempotency (Idempotency-Key header):')
	{
		changeLogRows.length = 0
		const headers = { 'Idempotency-Key': 'retry-abc-123' }
		const first = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_2 }, adminToken, headers)
		const rowsAfterFirst = changeLogRows.length
		const second = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_2 }, adminToken, headers)
		check('first application — 200, not replayed', first.status === 200 && first.json.replayed === false, first.json)
		check('retry with the same key — 200 and replayed', second.status === 200 && second.json.replayed === true, second.json)
		check('retry recorded no second change-log row', changeLogRows.length === rowsAfterFirst && rowsAfterFirst === 1, { rowsAfterFirst, total: changeLogRows.length })
	}

	console.log('\nCache invalidation on successful owner change (post-diagnostic fix):')
	{
		clearedTables.length = 0
		const today = new Date().toISOString().split('T')[0]
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_2 })
		check('owner change still succeeds — 200', r.status === 200, r.status)

		// the delete chain now records the org_id filter first — assert on the
		// table + the specific date column
		const cleared = (table, column) => clearedTables.find((c) => c.table === table && c.column === column)
		check('brain_core_snapshots cleared for today', cleared('brain_core_snapshots', 'computed_at')?.val === `${today}T00:00:00`, clearedTables)
		check('orchestrator_snapshots cleared for today', cleared('orchestrator_snapshots', 'computed_at')?.val === `${today}T00:00:00`, clearedTables)
		check('executive_briefings cleared for today', cleared('executive_briefings', 'briefing_date')?.val === today, clearedTables)
	}

	{
		clearedTables.length = 0
		const r = await patch('/api/agents/' + AGENT_MISSING + '/owner', { ownerId: EMP_1 })
		check('nonexistent agent — 404, no cache clear attempted', r.status === 404 && clearedTables.length === 0, { status: r.status, clearedTables })
	}

	server.close()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'AGENT OWNERSHIP WRITE TESTS PASSED ✅' : 'AGENT OWNERSHIP WRITE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
