/*
 * OBA Core — D-70 Succession Route HTTP-level test (Phase 1.6).
 *
 * Covers POST /api/simulations/reassign — the REST surface of
 * domain/simulations.js's employeeLeavesWithSuccessor(). Stubs Supabase with
 * an in-memory fixture (same require.cache pattern as simulationRoutes.test.js)
 * so it runs offline, and signs real tokens to exercise the role gate
 * (admin/executive run successions; member is 403).
 *
 * Run from backend/:  node tests/reassignRoute.test.js
 */

const path = require('path')

process.env.JWT_SECRET = 'test-secret-for-reassign-route'

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const E_DEPARTING = 'e0000000-0000-4000-8000-00000000000a'
const E_SUCCESSOR = 'e0000000-0000-4000-8000-00000000000b'
const E_BYSTANDER = 'e0000000-0000-4000-8000-00000000000c'

// ── Fake supabase — the root tables employeeLeavesWithSuccessor reads ────────
const FIXTURE_ROOTS = {
	employees: [
		{ id: E_DEPARTING, name: 'Ahmed', department: 'Eng' },
		{ id: E_SUCCESSOR, name: 'Sara', department: 'Eng' },
		{ id: E_BYSTANDER, name: 'Marcus', department: 'Ops' },
	],
	agents: [
		{ id: 'a0000000-0000-4000-8000-000000000001', name: 'DeployBot', status: 'active', risk: 'critical', owner_id: E_DEPARTING },
		{ id: 'a0000000-0000-4000-8000-000000000002', name: 'OtherBot', status: 'active', risk: 'low', owner_id: E_BYSTANDER },
	],
	owners: [
		{ id: 'o1', name: 'Ahmed', employee_id: E_DEPARTING, backup_owner: null, risk: 'high' },
		{ id: 'o2', name: 'Sara', employee_id: E_SUCCESSOR, backup_owner: 'Deputy', risk: 'low' },
	],
	workflows: [
		{ id: 'w1', name: 'Deploy Flow', risk: 'high', status: 'active', department: 'Eng' },
	],
	workflow_runbooks: [
		{ workflow_id: 'w1', owner_id: E_DEPARTING, is_documented: false },
	],
	workflow_failures: [],
	dependencies: [
		{ source_type: 'workflow', source_id: 'w1', target_type: 'agent', target_id: 'a0000000-0000-4000-8000-000000000001', dependency_type: 'critical', strength: 90 },
	],
	knowledge_assets: [
		{ asset_type: 'agent', asset_id: 'a0000000-0000-4000-8000-000000000001', is_documented: false },
	],
	tool_users: [], employee_agent: [], ai_platforms: [], tool_policies: [],
	policy_violations: [], tool_ownership: [], accountability_entities: [],
	accountability_links: [], truth_claims: [], decision_history: [],
	agent_platform: [], workflow_dependencies: [], tool_backups: [],
}

const auditRows = []

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath, filename: supabasePath, loaded: true,
	exports: {
		from: (table) => {
			if (table === 'audit_log') {
				return { insert: async (rows) => { auditRows.push(...rows); return { data: null, error: null } } }
			}
			return { select: () => Promise.resolve({ data: FIXTURE_ROOTS[table] || [], error: null }) }
		},
	},
}

const express = require('express')
const reassignRoute = require('../routes/simulations/reassign')
const { requireAuth } = require('../middleware/auth')
const { sign } = require('../lib/jwt')

const SECRET = process.env.JWT_SECRET
const adminToken = sign({ sub: 'admin', email: 'admin@horquva.com', role: 'admin', org: 'horquva' }, SECRET, 300)
const memberToken = sign({ sub: 'u-7', email: 'member@example.com', role: 'member', org: 'horquva' }, SECRET, 300)

const app = express()
app.use(express.json())
app.use('/api', requireAuth)
app.use('/api/simulations/reassign', reassignRoute)

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function post(body, token = adminToken) {
		const headers = { 'Content-Type': 'application/json' }
		if (token) headers.Authorization = 'Bearer ' + token
		const res = await fetch(base + '/api/simulations/reassign', { method: 'POST', headers, body: JSON.stringify(body) })
		return { status: res.status, json: await res.json().catch(() => ({})) }
	}

	console.log('\n=== OBA Core — D-70 Succession Route Test ===\n')

	{
		const r = await post({ employeeId: E_DEPARTING, successorId: E_SUCCESSOR }, memberToken)
		check('member role — 403', r.status === 403, r.status)
	}
	{
		const r = await post({ employeeId: E_DEPARTING, successorId: E_SUCCESSOR }, null)
		check('no token — 401', r.status === 401, r.status)
	}
	{
		const r = await post({ employeeId: E_DEPARTING, successorId: E_SUCCESSOR })
		check('admin runs the succession — 200', r.status === 200, r.json)
		check('scenario names both parties', /Ahmed/.test(r.json.scenario || '') && /Sara/.test(r.json.scenario || ''), r.json.scenario)
		check('healthDelta is a number', typeof r.json.healthDelta === 'number', r.json.healthDelta)
		check('comparedToNoSuccessor carries the leave-only delta', r.json.comparedToNoSuccessor && 'healthDelta' in r.json.comparedToNoSuccessor, r.json.comparedToNoSuccessor)
		check('residualRisk flags transferred undocumented assets', r.json.residualRisk.assetsUndocumented >= 2, r.json.residualRisk)
		check('transfer moved the agent to the successor in the sandbox', (r.json.impactedAgents || []).some((a) => a.name === 'DeployBot'), r.json.impactedAgents)
	}
	{
		const r = await post({ employeeName: 'Ahmed', successorName: 'Sara' })
		check('name-based resolution works too — 200', r.status === 200, r.status)
	}
	{
		const r = await post({ employeeId: E_DEPARTING, successorId: E_BYSTANDER })
		check('succession runs for any valid pair — 200', r.status === 200, r.status)
	}
	{
		const r = await post({ employeeId: E_DEPARTING, successorId: E_DEPARTING })
		check('successor equals departee — 400', r.status === 400, r.status)
	}
	{
		const r = await post({ employeeId: E_DEPARTING, successorName: 'Nobody' })
		check('unknown successor — 404', r.status === 404, r.status)
	}
	{
		const r = await post({ employeeId: 'not-a-uuid', successorId: E_SUCCESSOR })
		check('non-uuid employee id — 404 (name fallback off for malformed ids)', r.status === 404, r.status)
	}
	{
		const entry = auditRows.find((row) => row.action === 'simulation.reassign' && row.outcome === 'success')
		check('successful successions are audited', Boolean(entry), auditRows.map((r) => r.action))
	}

	server.close()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'D-70 SUCCESSION ROUTE TESTS PASSED ✅' : 'D-70 SUCCESSION ROUTE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
