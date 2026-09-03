/*
 * OBA Core — Simulation routes HTTP-level test.
 * Stubs Supabase so this runs offline, same require.cache pattern as
 * graphRoutes.test.js.
 * Run from backend/:  node tests/simulationRoutes.test.js
 */

const path = require('path')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// ── Fake supabase — domain.simulations.loadRoots() reads every root table
// from this fixture instead of a real database ──────────────────────────────
const FIXTURE_ROOTS = {
	employees: [{ id: 1, name: 'Sarah', department: 'Eng' }],
	agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
	owners: [],
	workflows: [],
	workflow_failures: [],
	workflow_runbooks: [],
	dependencies: [],
	knowledge_assets: [],
	tool_users: [],
	employee_agent: [],
	ai_platforms: [{ id: 50, name: 'ClaudeAPI', type: 'llm', status: 'active' }],
	tool_policies: [],
	policy_violations: [],
	tool_ownership: [],
	accountability_entities: [],
	accountability_links: [],
	truth_claims: [],
	decision_history: [],
	agent_platform: [],
	workflow_dependencies: [],
}

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath,
	filename: supabasePath,
	loaded: true,
	exports: {
		from: (table) => ({
			select: () => Promise.resolve({ data: FIXTURE_ROOTS[table] || [], error: null }),
		}),
	},
}

const express = require('express')
const employeeLeavesRoute = require('../routes/simulations/employeeLeaves')
const agentFailsRoute = require('../routes/simulations/agentFails')
const rankRoute = require('../routes/simulations/rank')

const app = express()
app.use('/api/simulations/employee-leaves', employeeLeavesRoute)
app.use('/api/simulations/agent-fails', agentFailsRoute)
app.use('/api/simulations/rank', rankRoute)

const server = app.listen(0, async () => {
	const port = server.address().port
	const base = `http://localhost:${port}`

	const r1 = await fetch(`${base}/api/simulations/employee-leaves/Sarah`)
	const j1 = await r1.json()
	check('employee-leaves 200s for a known name', r1.status === 200, r1.status)
	check('response has the legacy field names', 'impactedAgents' in j1 && 'healthBefore' in j1 && 'riskLevel' in j1, Object.keys(j1))
	check('response additionally carries healthDelta', 'healthDelta' in j1, Object.keys(j1))

	const r2 = await fetch(`${base}/api/simulations/agent-fails/NoSuchAgent`)
	check('agent-fails 404s for an unknown name', r2.status === 404, r2.status)

	const r3 = await fetch(`${base}/api/simulations/rank`)
	const j3 = await r3.json()
	check('rank 200s', r3.status === 200, r3.status)
	check('rank returns a scenarios array', Array.isArray(j3.scenarios), j3)

	console.log('\n========================================')
	console.log(`${passed} passed, ${failed} failed`)
	console.log('========================================\n')
	server.close(() => process.exit(failed === 0 ? 0 : 1))
})
