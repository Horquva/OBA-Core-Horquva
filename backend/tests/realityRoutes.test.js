/*
 * OBA Core — Reality-Layer Graph Route Test (2026-09-02 M28/M29/M31/M34/M35 wire-up).
 *
 * Covers GET /api/intelligence/{dependency-graph,relationships,ecosystem,
 * hidden-dependencies,network-centrality} — the five modules found to have
 * genuinely missing live capability in the retirement audit (see
 * brain/modules/implementations.js's header and brain/README.md's "Known
 * gaps"). Unlike graphRoutes.test.js, this boots the REAL brain library
 * against the shared test fixture (tests/fixtures/graph.js), not a fake —
 * the point of this test is that the real M28/M29/M31/M34/M35
 * implementations are actually reachable end-to-end over HTTP, not just
 * that a router forwards a stubbed response. brain.smoke.test.js and
 * intelligence.verify.test.js already prove those implementations are
 * individually correct; this proves the wiring on top of them.
 *
 * backend/supabase.js is stubbed because domain/dataset.js requires it
 * unconditionally at module load time, even though this test never calls
 * the function that uses it (same reason graphRoutes.test.js stubs it).
 *
 * Run from backend/:  node tests/realityRoutes.test.js
 */

const path = require('path')
const express = require('express')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// ── Fake supabase (never called, only needs to exist so require() succeeds) ──
const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath,
	filename: supabasePath,
	loaded: true,
	exports: { from: () => { throw new Error('realityRoutes.test.js should never touch supabase directly') } },
}

// ── The real brain, over the shared fixture graph — not a fake. ──────────
const brain = require('../brain')
const { buildTestGraph } = require('./fixtures/graph')

// ── Boot the real router ──────────────────────────────────────────────────
const realityRouter = require('../routes/intelligence/reality')

const app = express()
app.use(express.json())
app.use('/api/intelligence', realityRouter)

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function get(p) {
		const res = await fetch(base + p)
		const json = await res.json().catch(() => ({}))
		return { status: res.status, json }
	}

	console.log('\n=== OBA Core — Reality-Layer Graph Route Test ===\n')

	console.log('Before any graph is loaded:')
	{
		const r = await get('/api/intelligence/dependency-graph')
		check('503 when the graph is not loaded', r.status === 503, r.status)
		check('error names the reason', r.json.error === 'Brain graph not loaded', r.json.error)
	}

	brain.setGraph(buildTestGraph())

	const cases = [
		{ path: '/api/intelligence/dependency-graph', code: 'M28', payloadKeys: ['nodes', 'dependencyEdges', 'cyclesDetected', 'hasCycles', 'longestDependencyChain', 'adjacency'] },
		{ path: '/api/intelligence/relationships', code: 'M29', payloadKeys: ['totalRelationships', 'typeDistribution', 'collaborationLinks', 'isolatedEntities'] },
		{ path: '/api/intelligence/ecosystem', code: 'M31', payloadKeys: ['internalEntities', 'externalEntities', 'externalActors', 'composition'] },
		{ path: '/api/intelligence/hidden-dependencies', code: 'M34', payloadKeys: ['hiddenDependencyCount', 'hiddenDependencies'] },
		{ path: '/api/intelligence/network-centrality', code: 'M35', payloadKeys: ['centralActors', 'mostConnected', 'averageDegree'] },
	]

	console.log('\nOnce the graph is loaded, each endpoint runs its real analysis:')
	for (const c of cases) {
		const r = await get(c.path)
		check(`${c.path} — 200`, r.status === 200, r.status)
		check(`${c.path} — resolves to ${c.code}`, r.json.module === c.code, r.json.module)
		check(`${c.path} — analysis echoes the slug`, typeof r.json.analysis === 'string' && r.json.analysis.length > 0, r.json.analysis)
		const missingKeys = c.payloadKeys.filter((k) => !(k in (r.json.payload || {})))
		check(`${c.path} — payload has the fields this module actually computes`, missingKeys.length === 0, missingKeys)
		check(`${c.path} — confidence is a number`, typeof r.json.confidence === 'number', r.json.confidence)
		check(`${c.path} — dataSource carries provenance (not silently 'live')`, r.json.dataSource && r.json.dataSource.live === false, r.json.dataSource)
	}

	console.log('\nCross-checks specific to what the fixture graph actually contains:')
	{
		// tests/fixtures/graph.js: workflow depends_on agent depends_on platform.
		// wf's only DIRECT dependency is agent; platform is only reachable
		// transitively, so it must show up as a hidden dependency of wf.
		const r = await get('/api/intelligence/hidden-dependencies')
		const hit = r.json.payload.hiddenDependencies.some((h) => h.entity === 'Test Workflow' && h.hiddenDependency === 'Test Platform')
		check('M34 finds the fixture graph\'s one real hidden dependency (Workflow -> Platform, via Agent)', hit, r.json.payload.hiddenDependencies)
	}
	{
		// Same two-hop chain makes wf -> agent -> platform the graph's only
		// dependency chain, so M28 must report zero cycles on an acyclic fixture.
		const r = await get('/api/intelligence/dependency-graph')
		check('M28 finds no cycles in the acyclic fixture graph', r.json.payload.hasCycles === false, r.json.payload.cyclesDetected)
		check('M28 counts both depends_on edges (wf->agent, agent->platform)', r.json.payload.dependencyEdges === 2, r.json.payload.dependencyEdges)
	}

	server.close()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'REALITY ROUTE TESTS PASSED ✅' : 'REALITY ROUTE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
