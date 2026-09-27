/*
 * AUDIT SMOKE HARNESS — boots the real Express app surface (same middleware
 * order as index.js: requireAuth → runWithTenant → routers) over an
 * in-memory Supabase stub, then drives every major route end-to-end and
 * records a transcript. Audit instrumentation — not part of the test suite
 * (the suites cover these paths individually; this proves the assembled
 * whole answers coherently).
 *
 * Run from backend/:  node risk_engine/audit_smoke_harness.js
 */

const path = require('path')

process.env.JWT_SECRET = 'audit-smoke-secret'

const ORG_ID = '00000000-0000-4000-8000-000000000001'
const A = (n) => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const W = (n) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const E = (n) => `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// ── fixture (evidence-sufficient so gated sections compute) ─────────────────
const tables = {
	employees: [
		{ id: E(1), name: 'Dana', role: 'Eng', department: 'Eng', email: 'dana@horquva.com' },
		{ id: E(2), name: 'Lee', role: 'Eng', department: 'Eng' },
	],
	agents: [
		{ id: A(1), name: 'DeployBot', risk: 'critical', status: 'active', owner_id: E(1) },
		{ id: A(2), name: 'Spoke', risk: 'low', status: 'active', owner_id: E(2) },
	],
	owners: [
		{ id: 'own-1', employee_id: E(1), backup_owner: null },
		{ id: 'own-2', employee_id: E(2), backup_owner: 'Deputy' },
	],
	workflows: [
		{ id: W(1), name: 'Deploy Flow', risk: 'critical', status: 'active', department: 'Eng' },
	],
	workflow_runbooks: [{ workflow_id: W(1), owner_id: E(1), is_documented: true }],
	workflow_failures: [], workflow_steps: [{ workflow_id: W(1), step_number: 1, actor_type: 'system', actor_name: 'CI' }],
	dependencies: [
		{ source_type: 'workflow', source_id: W(1), target_type: 'agent', target_id: A(1), dependency_type: 'critical', strength: 95 },
	],
	knowledge_assets: [{ id: 'ka-1', asset_type: 'agent', asset_id: A(1), is_documented: true }],
	ai_platforms: [{ id: 'p1', name: 'GPT-4o', type: 'llm', status: 'active' }],
	tool_policies: [{ platform_id: 'p1', policy_name: 'usage', status: 'active' }],
	tool_users: [], employee_agent: [], tool_ownership: [], tool_backups: [],
	accountability_entities: [{ id: 'ae-1', entity_name: 'Deploy Flow', entity_type: 'workflow', department: 'Eng' }],
	accountability_links: [
		{ entity_id: 'ae-1', person_name: 'Dana', raci_role: 'Responsible' },
		{ entity_id: 'ae-1', person_name: 'Lee', raci_role: 'Accountable' },
	],
	truth_claims: [{ id: 'tc-1', claim_text: 'DeployBot documented', entity_name: 'DeployBot', is_verified: true }],
	decision_history: [], agent_platform: [], workflow_dependencies: [], policy_violations: [],
}
const changeLogRows = []
const stagedRows = []
const auditRows = []

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath, filename: supabasePath, loaded: true,
	exports: {
		from(table) {
			if (table === 'orgs') {
				return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: ORG_ID, slug: 'horquva' }, error: null }) }) }) }
			}
			if (table === 'audit_log') return { insert: async (rows) => { auditRows.push(...rows); return { data: null, error: null } } }
			if (table === 'dependency_change_log') {
				return {
					select: () => {
						const build = (f) => ({
							eq: (c, v) => build([...f, [c, v]]),
							order: () => build(f),
							limit: () => build(f),
							maybeSingle: async () => {
								const key = f.find(([c]) => c === 'idempotency_key')?.[1]
								return { data: (key ? changeLogRows.find((r) => r.idempotency_key === key) : null) || null, error: null }
							},
							then(res, rej) { return Promise.resolve({ data: [...changeLogRows], error: null }).then(res, rej) },
						})
						return build([])
					},
					insert(input) {
						return {
							select: () => ({
								maybeSingle: async () => {
									const arr = Array.isArray(input) ? input : [input]
									for (const r of arr) changeLogRows.push({ ...r, id: `cl-${changeLogRows.length + 1}` })
									return { data: changeLogRows[changeLogRows.length - 1], error: null }
								},
							}),
						}
					},
				}
			}
			if (table === 'score_history') {
				return {
					select: () => {
						const build = (f) => ({
							eq: () => build(f),
							order: () => build(f),
							limit: () => build(f),
							then(res, rej) { return Promise.resolve({ data: [], error: null }).then(res, rej) },
						})
						return build([])
					},
					insert(input) {
						return { select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }
					},
				}
			}
			if (['brain_core_snapshots', 'orchestrator_snapshots', 'executive_briefings'].includes(table)) {
				return {
					delete() {
						const build = (f) => ({
							eq: () => build(f), gte: () => build(f),
							then(res) { return Promise.resolve({ data: null, error: null }).then(res) },
						})
						return build([])
					},
					select: () => ({ async then(res) { res({ data: [], error: null }) } }),
					insert: async () => ({ data: null, error: null }),
				}
			}
			if (table === 'raw_vendor_payloads') {
				return {
					insert(input) {
						const arr = Array.isArray(input) ? input : [input]
						const withIds = arr.map((r) => ({ ...r, id: `st-${stagedRows.length + 1}`, status: r.status || 'pending' }))
						stagedRows.push(...withIds)
						return { select: () => ({ maybeSingle: async () => ({ data: withIds[0], error: null }) }) }
					},
					select: () => {
						const build = (f) => ({ eq: () => build(f), maybeSingle: async () => ({ data: stagedRows[0] || null, error: null }) })
						return build([])
					},
					update() { return { eq: () => ({ async then(resolve) { resolve({ data: null, error: null }) } }) } },
				}
			}
			if (table === 'identity_bridge') {
				return {
					select: () => {
						const build = (f) => ({
							eq: (c, v) => build([...f, [c, v]]),
							maybeSingle: async () => ({ data: null, error: null }),
						})
						return build([])
					},
					upsert: async (row) => { return { data: row, error: null } },
				}
			}
			if (table in tables) {
				return {
					select() {
						const build = (filters) => ({
							eq: (c, v) => build([...filters, [c, v]]),
							not: (c, op, v) => build([...filters, [c, v]]),
							ilike: (c, v) => build([...filters, [c, v]]),
							in: (c, v) => build([...filters, [c, v]]),
							order: () => build(filters),
							limit: () => build(filters),
							maybeSingle: async () => {
								const f = Object.fromEntries(filters)
								let rows = tables[table] || []
								if (f.id) rows = rows.filter((r) => r.id === f.id)
								if (f.email) rows = rows.filter((r) => String(r.email || '').toLowerCase() === String(f.email).toLowerCase())
								if (f.slug) rows = rows.filter((r) => r.slug === f.slug)
								return { data: rows[0] ? { ...rows[0] } : null, error: null }
							},
							then(resolve, reject) { return Promise.resolve({ data: (tables[table] || []).map((r) => ({ ...r })), error: null }).then(resolve, reject) },
						})
						return build([])
					},
					insert(input) {
						const arr = Array.isArray(input) ? input : [input]
						const withIds = arr.map((r) => ({ ...r, id: r.id || `new-${table}-${(tables[table].length || 0) + 1}` }))
						tables[table] = [...(tables[table] || []), ...withIds]
						return { select: () => ({ maybeSingle: async () => ({ data: withIds[0], error: null }) }) }
					},
					update(patch) {
						return {
							eq(c, v) {
								return {
									async then(resolve) {
										const row = (tables[table] || []).find((r) => r.id === v)
										if (row) Object.assign(row, patch)
										resolve({ data: row ? { ...row } : null, error: null })
									},
								}
							},
						}
					},
					delete() {
						const build = (f) => ({
							eq: (c, v) => build([...f, [c, v]]),
							or: () => build(f),
							gte: () => build(f),
							then(resolve) { resolve({ data: null, error: null }) },
						})
						return build([])
					},
				}
			}
			throw new Error(`smoke harness: unexpected table '${table}'`)
		},
	},
}

// keep the brain's background loads deterministic
const loaderPath = require.resolve(path.join(__dirname, '..', 'brain', 'knowledge', 'graphLoader.js'))
require.cache[loaderPath] = {
	id: loaderPath, filename: loaderPath, loaded: true,
	exports: { loadFromSupabase: async (graph) => { graph.addEntity({ id: 'x1', type: 'ai_agent', name: 'X' }) } },
}

const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { runWithTenant } = require('../lib/tenant')
const { sign } = require('../lib/jwt')
const crypto = require('crypto')

process.env.INGEST_SECRET_GENERIC = 'smoke-ingest-secret'

const app = express()
app.use('/api/ingest', require('../routes/ingest/webhook')) // BEFORE the JSON parser, mirroring the fixed index.js (F-2)
app.use(express.json())
app.use('/api/auth', require('../routes/auth/auth'))
app.use('/api', requireAuth)
app.use('/api', runWithTenant)
const mounts = [
	['/api/agents', '../routes/agents'], ['/api/employees', '../routes/employees'],
	['/api/dependencies', '../routes/dependencies'], ['/api/ownership', '../routes/ownership'],
	['/api/predictive-risk', '../routes/predictive/predictiveRisk'],
	['/api/intelligence/replaceability', '../routes/intelligence/replaceability'],
	['/api/intelligence/concentration', '../routes/intelligence/concentration'],
	['/api/intelligence/score-history', '../routes/intelligence/scoreHistory'],
	['/api/intelligence/dependency-scan', '../routes/intelligence/dependencyScan'],
	['/api/briefing', '../routes/briefing/briefing'],
	['/api/simulations/employee-leaves', '../routes/simulations/employeeLeaves'],
	['/api/simulations/rank', '../routes/simulations/rank'],
	['/api/simulations/reassign', '../routes/simulations/reassign'],
	['/api/crud', '../routes/crud/crud'],
	['/api/dashboard', '../routes/dashboard'],
]
for (const [mount, rel] of mounts) app.use(mount, require(rel))

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	// real login through the auth route (env-fallback admin)
	const loginRes = await fetch(base + '/api/auth/login', {
		method: 'POST', headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: 'admin@horquva.com', password: process.env.ADMIN_PASSWORD || 'x' }),
	})
	const authHeader = loginRes.status === 200
		? { Authorization: 'Bearer ' + (await loginRes.json()).token }
		: null
	// fallback: sign the env-fallback admin token directly if login env isn't set
	const adminToken = authHeader ? authHeader : { Authorization: 'Bearer ' + sign({ sub: 'admin', email: 'admin@horquva.com', role: 'admin', org: 'horquva' }, process.env.JWT_SECRET, 300) }
	const memberToken = { Authorization: 'Bearer ' + sign({ sub: 'u-7', email: 'm@example.com', role: 'member', org: 'horquva' }, process.env.JWT_SECRET, 300) }

	const transcript = []
	async function drive(label, method, p, { auth = adminToken, body, headers = {}, expect } = {}) {
		const h = { ...headers }
		if (body !== undefined && !(typeof body === 'string')) { h['Content-Type'] = 'application/json'; body = JSON.stringify(body) }
		if (auth) h.Authorization = auth.Authorization
		const res = await fetch(base + p, { method, headers: h, body })
		const json = await res.json().catch(() => ({}))
		const ok = expect ? (typeof expect === 'function' ? expect(res.status, json) : res.status === expect) : res.status < 500
		transcript.push({ label, method, path: p, status: res.status, ok, note: json.error ? String(json.error).slice(0, 60) : (typeof json === 'object' ? Object.keys(json).slice(0, 5).join(',') : '') })
		return { status: res.status, json }
	}

	console.log('=== AUDIT SMOKE HARNESS — real app surface over in-memory Supabase ===\n')

	// read surface
	await drive('predictive risk (Engine A+B)', 'GET', '/api/predictive-risk/agents', { expect: 200 })
	await drive('replaceability (Feature 1)', 'GET', '/api/intelligence/replaceability', { expect: 200 })
	await drive('concentration (Feature 2)', 'GET', '/api/intelligence/concentration', { expect: 200 })
	await drive('dependency scan (Phase 3.4)', 'GET', '/api/intelligence/dependency-scan', { expect: 200 })
	await drive('volatility (Phase 3.3, empty log)', 'GET', '/api/briefing/volatility', { expect: 200 })
	await drive('agent spofs (Engine A + verdict)', 'GET', '/api/dependencies/agent-spofs', { expect: 200 })
	await drive('simulation rank', 'GET', '/api/simulations/rank', { expect: 200 })
	await drive('employee-leaves simulation', 'GET', '/api/simulations/employee-leaves/Dana', { expect: 200 })
	await drive('score history (empty ledger)', 'GET', '/api/intelligence/score-history', { expect: 200 })
	await drive('dashboard bundle', 'GET', '/api/dashboard', { expect: 200 })

	// rbac
	await drive('crud write as member — 403', 'POST', '/api/crud/workflows', { auth: memberToken, body: { name: 'X' }, expect: 403 })
	await drive('reassign as member — 403', 'POST', '/api/simulations/reassign', { auth: memberToken, body: { employeeId: E(1), successorId: E(2) }, expect: 403 })

	// write flows
	await drive('owner PATCH through mutations', 'PATCH', `/api/agents/${A(2)}/owner`, { body: { ownerId: E(1) }, expect: 200 })
	await drive('owner PATCH idempotent replay', 'PATCH', `/api/agents/${A(2)}/owner`, { body: { ownerId: E(1) }, headers: { 'Idempotency-Key': 'audit-1' }, expect: 200 })
	await drive('owner PATCH replay again — replayed', 'PATCH', `/api/agents/${A(2)}/owner`, { body: { ownerId: E(1) }, headers: { 'Idempotency-Key': 'audit-1' }, expect: 200 })
	await drive('crud workflow create', 'POST', '/api/crud/workflows', { body: { name: 'Smoke Flow' }, expect: 201 })
	await drive('crud dependency add', 'POST', '/api/crud/dependencies', { body: { sourceType: 'agent', sourceId: A(2), targetType: 'agent', targetId: A(1), dependencyType: 'high' }, expect: 201 })
	await drive('D-70 succession', 'POST', '/api/simulations/reassign', { body: { employeeId: E(1), successorId: E(2) }, expect: 200 })

	// ingest
	const ts = String(Math.floor(Date.now() / 1000))
	const whBody = JSON.stringify({ event: 'smoke' })
	await drive('ingest webhook (signed, standard-webhooks)', 'POST', '/api/ingest/webhook/generic', {
		auth: null, body: whBody,
		headers: {
			'Content-Type': 'application/json', 'webhook-id': 'wh-smoke', 'webhook-timestamp': ts,
			'webhook-signature': 'v1=' + crypto.createHmac('sha256', 'smoke-ingest-secret').update(`wh-smoke.${ts}.${whBody}`).digest('hex'),
		},
		expect: 202,
	})
	await drive('ingest webhook (bad signature) — 401', 'POST', '/api/ingest/webhook/generic', { auth: null, body: whBody, headers: { 'Content-Type': 'application/json', 'webhook-id': 'wh-x', 'webhook-timestamp': ts, 'webhook-signature': 'v1=bad' }, expect: 401 })
	await drive('csv roster importer', 'POST', '/api/ingest/roster/csv', { auth: null, body: 'name,email,role,department\nZoe,zoe@horquva.com,Eng,Eng\n', headers: { 'Content-Type': 'text/csv' }, expect: 202 })

	// short wait for async ingest processing
	await new Promise((r) => setTimeout(r, 300))
	await drive('volatility after mutations (non-empty log)', 'GET', '/api/briefing/volatility', { expect: 200 })
	await drive('score history after scans', 'GET', '/api/intelligence/score-history', { expect: 200 })

	// unauthenticated read — 401
	await drive('unauthenticated read — 401', 'GET', '/api/predictive-risk', { auth: null, expect: 401 })

	server.close()

	const failures = transcript.filter((t) => !t.ok)
	console.log('TRANSCRIPT')
	for (const t of transcript) {
		console.log(`  ${t.ok ? '✓' : '✗'} [${t.status}] ${t.method} ${t.path} — ${t.label}${t.note ? ` (${t.note})` : ''}`)
	}
	console.log(`\n${transcript.length} routes driven, ${failures.length} failures`)
	console.log(`change-log rows: ${changeLogRows.length} | staged payloads: ${stagedRows.length} | audit rows: ${auditRows.length}`)
	process.exit(failures.length === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Smoke harness error:', err)
	process.exit(1)
})
