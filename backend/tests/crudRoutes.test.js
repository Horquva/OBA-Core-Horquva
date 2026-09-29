/*
 * OBA Core — Structural CRUD route tests (Phase 4.2).
 *
 * Covers /api/crud — the REST skin over domain/mutations.js: RBAC
 * (admin/executive write; member 403), Idempotency-Key replay, uuid
 * validation, change-log rows with the impact envelope, and audit. Same
 * require.cache stub pattern as agentsRoutes.test.js (org resolution + root
 * tables + change log), fully offline.
 *
 * Run from backend/:  node tests/crudRoutes.test.js
 */

const path = require('path')

process.env.JWT_SECRET = 'test-secret-for-crud-routes'

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const ORG_ID = '00000000-0000-4000-8000-000000000001'
const W1 = 'b0000000-0000-4000-8000-000000000001'
const EMP_1 = 'e0000000-0000-4000-8000-000000000001'

const tables = {
	employees: [{ id: EMP_1, name: 'Alice', role: null, department: null, org_id: ORG_ID }],
	agents: [], owners: [], workflows: [{ id: W1, name: 'Old Name', status: 'active', risk: 'low', org_id: ORG_ID }],
	workflow_failures: [], workflow_runbooks: [], workflow_steps: [], dependencies: [],
	knowledge_assets: [], tool_users: [], employee_agent: [], ai_platforms: [], tool_policies: [],
	policy_violations: [], tool_ownership: [], accountability_entities: [], accountability_links: [],
	truth_claims: [], decision_history: [], agent_platform: [], workflow_dependencies: [], tool_backups: [],
}
const changeLogRows = []
const auditRows = []

// created-entity id counter so ENTITY_DELETED can find what ENTITY_CREATED made
let nextFakeId = 1

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath, filename: supabasePath, loaded: true,
	exports: {
		from(table) {
			if (table === 'orgs') {
				return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: ORG_ID, slug: 'horquva' }, error: null }) }) }) }
			}
			if (table === 'audit_log') {
				return { insert: async (rows) => { auditRows.push(...rows); return { data: null, error: null } } }
			}
			if (table === 'dependency_change_log') {
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
			if (table in tables) {
				return {
					select() {
						const rowBuilder = (filters) => ({
							eq: (col, val) => rowBuilder([...filters, [col, val]]),
							order: () => rowBuilder(filters),
							limit: () => rowBuilder(filters),
							maybeSingle: async () => {
								const idFilter = filters.find(([c]) => c === 'id')
								const row = idFilter ? tables[table].find((r) => r.id === idFilter[1]) : null
								return { data: row ? { ...row } : null, error: null }
							},
							then(resolve, reject) {
								return Promise.resolve({ data: tables[table].map((r) => ({ ...r })), error: null }).then(resolve, reject)
							},
						})
						return rowBuilder([])
					},
					insert(input) {
						const arr = Array.isArray(input) ? input : [input]
						const withIds = arr.map((r) => ({ ...r, id: `new-${nextFakeId++}` }))
						tables[table].push(...withIds)
						return {
							select: () => ({
								maybeSingle: async () => ({ data: withIds[0] || null, error: null }),
							}),
						}
					},
					update(patch) {
						return {
							eq(col, val) {
								return {
									async then(resolve) {
										const row = tables[table].find((r) => r.id === val)
										if (!row) return resolve({ data: null, error: null })
										Object.assign(row, patch)
										resolve({ data: { ...row }, error: null })
									},
								}
							},
						}
					},
					delete() {
						const build = (filters) => ({
							eq: (col, val) => build([...filters, [col, val]]),
							or: (expr) => build(filters),
							then(resolve) {
								const idFilter = filters.find(([c]) => c === 'id')
								if (idFilter) {
									tables[table] = tables[table].filter((r) => r.id !== idFilter[1])
								} else {
									const sid = filters.find(([c]) => c === 'source_id')
									const tid = filters.find(([c]) => c === 'target_id')
									if (sid && tid) {
										tables[table] = tables[table].filter((r) => r.source_id !== sid[1] && r.target_id !== tid[1])
									}
								}
								resolve({ data: null, error: null })
							},
						})
						return build([])
					},
				}
			}
			throw new Error(`crudRoutes.test.js: unexpected table '${table}'`)
		},
	},
}

const loaderPath = require.resolve(path.join(__dirname, '..', 'brain', 'knowledge', 'graphLoader.js'))
require.cache[loaderPath] = {
	id: loaderPath, filename: loaderPath, loaded: true,
	exports: { loadFromSupabase: async (graph) => { graph.addEntity({ id: 'x1', type: 'ai_agent', name: 'X' }) } },
}

const express = require('express')
const crudRoute = require('../routes/crud/crud')
const { requireAuth } = require('../middleware/auth')
const { runWithTenant } = require('../lib/tenant')
const { sign } = require('../lib/jwt')

const SECRET = process.env.JWT_SECRET
const adminToken = sign({ sub: 'admin', email: 'admin@horquva.com', role: 'admin', org: 'horquva' }, SECRET, 300)
const memberToken = sign({ sub: 'u-7', email: 'member@example.com', role: 'member', org: 'horquva' }, SECRET, 300)

const app = express()
app.use(express.json())
app.use('/api', requireAuth)
app.use('/api', runWithTenant)
app.use('/api/crud', crudRoute)

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function call(method, p, body, token = adminToken, headers = {}) {
		const h = { 'Content-Type': 'application/json', ...headers }
		if (token) h.Authorization = 'Bearer ' + token
		const res = await fetch(base + p, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined })
		return { status: res.status, json: await res.json().catch(() => ({})) }
	}

	console.log('\n=== OBA Core — CRUD route tests ===\n')

	console.log('RBAC:')
	{
		const r = await call('POST', '/api/crud/workflows', { name: 'X' }, memberToken)
		check('member — 403', r.status === 403, r.status)
		const r2 = await call('POST', '/api/crud/workflows', { name: 'X' }, null)
		check('no token — 401', r2.status === 401, r2.status)
	}

	console.log('\nworkflow create / update / delete:')
	{
		const r = await call('POST', '/api/crud/workflows', { name: 'Invoice Sync', risk: 'high' })
		check('create — 201', r.status === 201, r.status)
		check('change log recorded ENTITY_CREATED', changeLogRows.some((c) => c.mutation_type === 'ENTITY_CREATED' && c.after?.name === 'Invoice Sync'), changeLogRows.map((c) => c.mutation_type))
		check('impact envelope present', 'blastRadiusScore' in r.json.impact && 'healthDelta' in r.json.impact, r.json.impact)
	}
	{
		const r = await call('PUT', '/api/crud/workflows/' + W1, { name: 'Invoice Sync v2' })
		check('update — 201 (applyMutation contract)', r.status === 201, r.status)
		check('update recorded with before/after', changeLogRows.some((c) => c.mutation_type === 'ENTITY_UPDATED' && c.before?.name === 'Old Name' && c.after?.name === 'Invoice Sync v2'), changeLogRows.filter((c) => c.mutation_type === 'ENTITY_UPDATED').map((c) => [c.before?.name, c.after?.name]))
	}
	{
		const r = await call('PUT', '/api/crud/workflows/' + W1, {})
		check('empty patch — 400', r.status === 400, r.status)
		const r2 = await call('PUT', '/api/crud/workflows/not-a-uuid', { name: 'X' })
		check('non-uuid id — 400', r2.status === 400, r2.status)
	}

	console.log('\ndependencies:')
	{
		const r = await call('POST', '/api/crud/dependencies', { sourceType: 'workflow', sourceId: W1, targetType: 'agent', targetId: 'a0000000-0000-4000-8000-000000000002', dependencyType: 'critical' })
		check('edge create — 201', r.status === 201, r.status)
		const r2 = await call('POST', '/api/crud/dependencies', { sourceType: 'workflow', sourceId: 'nope', targetType: 'agent', targetId: 'a0000000-0000-4000-8000-000000000002' })
		check('non-uuid endpoint — 400', r2.status === 400, r2.status)
		const r3 = await call('POST', '/api/crud/dependencies', { sourceType: 'workflow', sourceId: W1 })
		check('missing target — 400', r3.status === 400, r3.status)
	}

	console.log('\nemployees:')
	{
		const r = await call('POST', '/api/crud/employees', { name: 'New Hire', department: 'Eng' })
		check('employee create — 201', r.status === 201, r.status)
		const r2 = await call('PUT', '/api/crud/employees/' + EMP_1, { role: 'Staff Engineer' })
		check('employee update — 201', r2.status === 201, r2.status)
	}

	console.log('\nidempotency:')
	{
		changeLogRows.length = 0
		const headers = { 'Idempotency-Key': 'wf-create-1' }
		const first = await call('POST', '/api/crud/workflows', { name: 'Idempotent Flow' }, adminToken, headers)
		const after = changeLogRows.length
		const second = await call('POST', '/api/crud/workflows', { name: 'Idempotent Flow' }, adminToken, headers)
		check('first 201, retry 200 replayed', first.status === 201 && second.status === 200 && second.json.replayed === true, { first: first.status, second: second.status, replayed: second.json.replayed })
		check('exactly one change-log row for the key', after === 1 && changeLogRows.length === 1, changeLogRows.length)
	}

	console.log('\naudit:')
	check('successful writes audited', auditRows.some((a) => a.action === 'crud.entity_created' && a.outcome === 'success'), auditRows.map((a) => a.action))
	check('denied writes audited', auditRows.some((a) => a.action === 'authz.denied'), auditRows.map((a) => a.action))

	server.close()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'CRUD ROUTE TESTS PASSED ✅' : 'CRUD ROUTE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
