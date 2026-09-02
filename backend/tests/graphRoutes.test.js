/*
 * OBA Core — Graph Lifecycle Route Test (D-14, D-28..D-32).
 *
 * Covers GET /api/intelligence/graph/status and POST /api/intelligence/graph/reload.
 * Boots the real prediction.js router on an ephemeral port, same no-framework
 * HTTP-level style as authRoutes.test.js. Stubs backend/brain (not supabase —
 * this file never calls domain.loadDataset()/domain.intelligence.*, only the
 * graph.* surface) so it runs offline. backend/supabase.js is also stubbed
 * because domain/dataset.js requires it unconditionally at module load time,
 * even though this test never calls the function that uses it.
 *
 * Run from backend/:  node tests/graphRoutes.test.js
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
	exports: { from: () => { throw new Error('graphRoutes.test.js should never touch supabase directly') } },
}

// ── Fake brain — mirrors backend/brain/index.js's isReady()/graphSource()
// invariants exactly: isReady() is sticky (graph !== null) across a failed
// reload, and a failed reload's source spreads over the previous one so
// stats/loadedAt from the last success survive alongside the new error. ──
let graph = null
let source = { live: false, stats: null, loadedAt: null, error: null }
let shouldFail = false

const fakeBrain = {
	MODULES: [],
	loadGraph: async () => {
		if (shouldFail) {
			source = { ...source, live: false, error: 'simulated Supabase failure', failedAt: new Date().toISOString() }
			throw new Error('simulated Supabase failure')
		}
		graph = { builtAt: Date.now() }
		source = { live: true, stats: { entities: 2, relationships: 1 }, loadedAt: new Date().toISOString(), error: null }
		return source.stats
	},
	setGraph: () => {},
	getGraph: () => graph,
	isReady: () => graph !== null,
	graphSource: () => ({ ...source }),
	run: async () => null,
	runMany: async () => ({}),
	resolveOrder: () => [],
	toCode: () => null,
}
const brainPath = require.resolve(path.join(__dirname, '..', 'brain'))
require.cache[brainPath] = { id: brainPath, filename: brainPath, loaded: true, exports: fakeBrain }

// ── Boot the real router ──────────────────────────────────────────────────
const predictionRouter = require('../routes/intelligence/prediction')

const app = express()
app.use(express.json())
app.use('/api/intelligence', predictionRouter)

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function call(method, p) {
		const res = await fetch(base + p, { method })
		const json = await res.json().catch(() => ({}))
		return { status: res.status, json }
	}

	console.log('\n=== OBA Core — Graph Lifecycle Route Test ===\n')

	console.log('Before any load:')
	{
		const r = await call('GET', '/api/intelligence/graph/status')
		check('status 200', r.status === 200, r.status)
		check('isReady is false', r.json.isReady === false, r.json.isReady)
		check('source.live is false', r.json.source.live === false, r.json.source)
		check('source.loadedAt is null', r.json.source.loadedAt === null, r.json.source.loadedAt)
	}

	console.log('\nA successful reload:')
	let firstLoadedAt
	{
		const r = await call('POST', '/api/intelligence/graph/reload')
		check('reload 200', r.status === 200, r.status)
		check('reloaded is true', r.json.reloaded === true, r.json)
		check('stats present', !!r.json.stats, r.json.stats)
		check('loadedAt present', typeof r.json.loadedAt === 'string', r.json.loadedAt)
		firstLoadedAt = r.json.loadedAt
	}
	{
		const r = await call('GET', '/api/intelligence/graph/status')
		check('status now isReady', r.json.isReady === true, r.json.isReady)
		check('status reflects the same loadedAt the reload returned', r.json.source.loadedAt === firstLoadedAt, r.json.source.loadedAt)
	}

	console.log('\nA failed reload leaves last-known-good state intact:')
	shouldFail = true
	{
		// Force a distinguishable timestamp so "unchanged" is a real assertion.
		await new Promise((r) => setTimeout(r, 5))
		const r = await call('POST', '/api/intelligence/graph/reload')
		check('reload 502', r.status === 502, r.status)
		check('reloaded is false', r.json.reloaded === false, r.json)
		check('error message present', r.json.error === 'simulated Supabase failure', r.json.error)
		check('failed source still carries the previous loadedAt', r.json.source.loadedAt === firstLoadedAt, r.json.source.loadedAt)
	}
	{
		const r = await call('GET', '/api/intelligence/graph/status')
		check('status still isReady (previous graph never cleared)', r.json.isReady === true, r.json.isReady)
		check('status still reports the previous successful loadedAt', r.json.source.loadedAt === firstLoadedAt, r.json.source.loadedAt)
		check('status surfaces the failure', r.json.source.error === 'simulated Supabase failure', r.json.source.error)
	}
	shouldFail = false

	console.log('\nNo role gate:')
	{
		const fs = require('fs')
		const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'intelligence', 'prediction.js'), 'utf8')
		// Skip comment lines — a docstring is allowed to mention D-05 by name (and
		// does); only a real reference (import or call) would re-add the gate D-05
		// deleted.
		const codeLines = src.split('\n').filter((l) => {
			const t = l.trim()
			return !t.startsWith('//') && !t.startsWith('*')
		})
		const hit = codeLines.some((l) => l.includes('requireRole'))
		check('prediction.js does not reference requireRole in code', !hit, 'D-05: role gating was deleted, not re-added')
	}

	server.close()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'GRAPH ROUTE TESTS PASSED ✅' : 'GRAPH ROUTE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
