/*
 * OBA Core — Agent Ownership Write Route Test (DATA-1's first write slice).
 *
 * Covers PATCH /api/agents/:id/owner — the one write path the app gained
 * for assigning, changing, or clearing an agent's owner. Everything else
 * in the product that touches ownership (orphaned lists, human-SPOF
 * checks, dependency risk) has always been read-only; this is the first
 * place a finding can actually be acted on rather than just reported.
 *
 * Stubs Supabase's chainable .from().update().eq().select().maybeSingle()
 * with an in-memory fixture, same require.cache pattern as
 * simulationRoutes.test.js, so this runs offline.
 *
 * SEC-3: the route is admin-only. The router is mounted behind the real
 * requireAuth (as index.js does) and every call carries a signed token, so
 * the role gate is exercised exactly as in production.
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

// ── Fake supabase — an in-memory `agents` table + a set of valid employee
// ids, enough to exercise the update/FK-violation/not-found paths without a
// real database. Ids are uuids since sql/19_uuid_primary_keys.sql. ─────────
const AGENT_10 = 'a0000000-0000-4000-8000-00000000000a'
const AGENT_11 = 'a0000000-0000-4000-8000-00000000000b'
const AGENT_MISSING = 'a0000000-0000-4000-8000-0000000000ff'
const EMP_1 = 'e0000000-0000-4000-8000-000000000001'
const EMP_2 = 'e0000000-0000-4000-8000-000000000002'
const EMP_3 = 'e0000000-0000-4000-8000-000000000003'
const EMP_MISSING = 'e0000000-0000-4000-8000-0000000000fe'

const agentsTable = [
	{ id: AGENT_10, name: 'DeployBot', owner_id: EMP_1 },
	{ id: AGENT_11, name: 'SecurityScanner', owner_id: null },
]
const validEmployeeIds = new Set([EMP_1, EMP_2, EMP_3])

const clearedTables = []

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath,
	filename: supabasePath,
	loaded: true,
	exports: {
		from(table) {
			if (table === 'audit_log') {
				return { insert: async () => ({ data: null, error: null }) }
			}
			if (table !== 'agents' && !['brain_core_snapshots', 'orchestrator_snapshots', 'executive_briefings'].includes(table)) {
				throw new Error(`agentsRoutes.test.js: unexpected table '${table}'`)
			}
			if (table !== 'agents') {
				return {
					delete() {
						return {
							gte(column, val) {
								clearedTables.push({ table, column, val })
								return Promise.resolve({ data: null, error: null })
							},
							eq(column, val) {
								clearedTables.push({ table, column, val })
								return Promise.resolve({ data: null, error: null })
							},
						}
					},
				}
			}
			return {
				select() {
					return {
						eq(col, val) {
							return {
								async maybeSingle() {
									const agent = agentsTable.find((a) => a.id === val)
									return { data: agent ? { id: agent.id, owner_id: agent.owner_id } : null, error: null }
								},
							}
						},
					}
				},
				update(patch) {
					return {
						eq(col, val) {
							return {
								select() {
									return {
										async maybeSingle() {
											const agent = agentsTable.find((a) => a.id === val)
											if (!agent) return { data: null, error: null }
											if (patch.owner_id !== null && !validEmployeeIds.has(patch.owner_id)) {
												return { data: null, error: { code: '23503', message: 'insert or update on table "agents" violates foreign key constraint' } }
											}
											agent.owner_id = patch.owner_id
											return { data: { id: agent.id, name: agent.name, owner_id: agent.owner_id }, error: null }
										},
									}
								},
							}
						},
					}
				},
			}
		},
	},
}

const express = require('express')
const agentsRoute = require('../routes/agents')
const { requireAuth } = require('../middleware/auth')
const { sign } = require('../lib/jwt')

const SECRET = process.env.JWT_SECRET
// Same payload shape routes/auth/auth.js signs for the ADMIN_EMAIL env-fallback
// login — the only account that holds the admin role today.
const adminToken = sign({ sub: 'admin', email: 'admin@horquva.com', role: 'admin', org: 'horquva' }, SECRET, 300)
const memberToken = sign({ sub: 'u-7', email: 'member@example.com', role: 'member', org: 'horquva' }, SECRET, 300)
const noRoleToken = sign({ sub: 'u-8', email: 'norole@example.com', org: 'horquva' }, SECRET, 300)

const app = express()
app.use(express.json())
app.use('/api', requireAuth)
app.use('/api/agents', agentsRoute)

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function patch(p, body, token = adminToken) {
		const headers = { 'Content-Type': 'application/json' }
		if (token) headers.Authorization = 'Bearer ' + token
		const res = await fetch(base + p, {
			method: 'PATCH',
			headers,
			body: JSON.stringify(body),
		})
		const json = await res.json().catch(() => ({}))
		return { status: res.status, json }
	}

	console.log('\n=== OBA Core — Agent Ownership Write Route Test ===\n')

	// ── SEC-3: admin-only role gate ─────────────────────────────────────────
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

	console.log('\nWrite behaviour (as admin):')

	{
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_2 })
		check('assigning a valid employee — 200', r.status === 200, r.status)
		check('response echoes the updated agent', r.json.ok === true && r.json.agent?.owner_id === EMP_2, r.json)
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

	console.log('\nCache invalidation on successful owner change (post-diagnostic fix):')
	{
		clearedTables.length = 0
		const today = new Date().toISOString().split('T')[0]
		const r = await patch('/api/agents/' + AGENT_10 + '/owner', { ownerId: EMP_2 })
		check('owner change still succeeds — 200', r.status === 200, r.status)

		const cleared = (table) => clearedTables.find((c) => c.table === table)
		check('brain_core_snapshots cleared for today', cleared('brain_core_snapshots')?.val === `${today}T00:00:00`, clearedTables)
		check('orchestrator_snapshots cleared for today', cleared('orchestrator_snapshots')?.val === `${today}T00:00:00`, clearedTables)
		check('executive_briefings cleared for today', cleared('executive_briefings')?.val === today, clearedTables)
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
