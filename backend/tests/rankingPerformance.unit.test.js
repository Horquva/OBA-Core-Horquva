/*
 * OBA Core — Scenario ranking performance & equivalence test.
 *
 * rankAllScenarios used to deep-clone every root table, rebuild both walk
 * engines and re-run every agent's blast radius once PER SCENARIO, and ran
 * synchronously inside GET /api/simulations/rank — measured 192s for a
 * 400-employee org with the whole server frozen. This suite pins the
 * optimizations to exact equivalence with the unoptimized definitions and
 * asserts the request path no longer blocks:
 *
 *   - riskEngine withRoots() == buildEngine(mutated) for every U state;
 *   - predictiveRisk { lean } == full predictiveRisk minus the two walks;
 *   - the active-set impact walk == a naive full-sweep PPR, bit for bit;
 *   - scenarios never mutate the caller's roots (copy-on-write forks);
 *   - rankAllScenariosAsync == rankAllScenarios, and it yields the loop;
 *   - rankedScenarios(): shared computation, invalidation, stale-while-
 *     revalidate, failed refresh keeps the last good ranking.
 *
 * Pure/offline. Run from backend/: node tests/rankingPerformance.unit.test.js
 */

const derived = require('../domain/derived')
const sims = require('../domain/simulations')
const riskEngine = require('../domain/riskEngine')
const impactPagerank = require('../domain/riskEngine/impactPagerank')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) }

/** A seeded synthetic org: ownership gaps, failures, dependency chains. */
function org(N, seed) {
	const rnd = lcg(seed)
	const R = {}
	for (const t of derived.ROOT_TABLES) R[t] = []
	const risks = ['low', 'medium', 'high', 'critical']
	for (let i = 0; i < N; i++) {
		R.employees.push({ id: 'e' + i, name: 'E' + i, department: 'D' + (i % 4) })
		R.owners.push({ id: 'o' + i, employee_id: 'e' + i, backup_owner: rnd() < 0.6 ? 'E' + ((i + 1) % N) : null })
	}
	const A = N * 3
	for (let i = 0; i < A; i++) {
		const st = rnd()
		R.agents.push({ id: 'a' + i, name: 'A' + i, owner_id: rnd() < 0.9 ? 'e' + Math.floor(rnd() * N) : null, status: st < 0.05 ? 'failed' : st < 0.1 ? 'inactive' : 'active', risk: risks[Math.floor(rnd() * 4)] })
		if (rnd() < 0.8) R.knowledge_assets.push({ id: 'k' + i, asset_type: 'agent', asset_id: 'a' + i, is_documented: rnd() < 0.5, owner_id: 'e' + (i % N) })
	}
	for (let i = 1; i < A; i++) {
		for (let k = 0; k < 2; k++) {
			if (rnd() < 0.7) R.dependencies.push({ source_type: 'agent', source_id: 'a' + i, target_type: 'agent', target_id: 'a' + Math.floor(rnd() * i), dependency_type: risks[Math.floor(rnd() * 4)] })
		}
	}
	for (let i = 0; i < Math.max(2, N / 2); i++) {
		R.workflows.push({ id: 'w' + i, name: 'W' + i, department: 'D' + (i % 4), risk: risks[Math.floor(rnd() * 4)], status: 'active' })
		R.workflow_dependencies.push({ workflow_id: 'w' + i, agent_id: 'a' + Math.floor(rnd() * A) })
		R.workflow_runbooks.push({ workflow_id: 'w' + i, owner_id: 'e' + Math.floor(rnd() * N), is_documented: rnd() < 0.5 })
		for (let j = 0; j < Math.floor(rnd() * 3); j++) R.workflow_failures.push({ workflow_id: 'w' + i })
	}
	for (let i = 0; i < Math.max(3, N / 10); i++) {
		R.ai_platforms.push({ id: 'p' + i, name: 'P' + i, status: 'active' })
		R.knowledge_assets.push({ id: 'kp' + i, asset_type: 'platform', asset_id: 'p' + i, criticality: risks[Math.floor(rnd() * 4)] })
		if (rnd() < 0.5) R.tool_backups.push({ primary_platform: 'p' + i })
		for (let j = 0; j < 4; j++) R.agent_platform.push({ agent_id: 'a' + Math.floor(rnd() * A), platform_id: 'p' + i })
	}
	R._counts = Object.fromEntries(derived.ROOT_TABLES.map((t) => [t, R[t].length]))
	return R
}

/** Reference PPR: the full n-node sweep the active-set walk replaced. */
function naivePpr(edges, seedKey) {
	const idx = new Map()
	const nodes = []
	const nodeOf = (t, id) => { const k = `${t}:${id}`; if (!idx.has(k)) { idx.set(k, nodes.length); nodes.push(k) } return idx.get(k) }
	const rows = []
	const lam = (e) => (e.strength != null ? e.strength / 100 : (impactPagerank.TYPE_LAMBDA[e.dependency_type] ?? 1))
	for (const e of edges) {
		const dep = nodeOf(e.target_type, e.target_id)
		const ent = nodeOf(e.source_type, e.source_id)
		rows[dep] = rows[dep] || []
		const hit = rows[dep].find((x) => x.j === ent)
		if (hit) hit.w += lam(e); else rows[dep].push({ j: ent, w: lam(e) })
	}
	const n = nodes.length
	for (let i = 0; i < n; i++) {
		rows[i] = rows[i] || []
		const sum = rows[i].reduce((a, x) => a + x.w, 0)
		if (sum > 0) for (const x of rows[i]) x.w /= sum
	}
	const v = new Float64Array(n)
	v[idx.get(seedKey)] = 1
	let r = Float64Array.from(v)
	for (let it = 0; it < impactPagerank.MAX_ITER; it++) {
		const next = new Float64Array(n)
		for (let i = 0; i < n; i++) {
			const out = (1 - impactPagerank.ALPHA) * r[i]
			for (const x of rows[i]) next[x.j] += out * x.w
		}
		let diff = 0
		for (let i = 0; i < n; i++) { next[i] += impactPagerank.ALPHA * v[i]; diff += Math.abs(next[i] - r[i]) }
		r = next
		if (diff < impactPagerank.EPS) break
	}
	return { nodes, r }
}

const strip = (s) => JSON.stringify({ scenario: s.scenario, severity: s.severity, healthDelta: s.healthDelta, a: s.impactedAgents.map((x) => x.id), w: s.impactedWorkflows.map((x) => x.id) })

async function run() {
	console.log('\n=== OBA Core — Scenario Ranking Performance & Equivalence Test ===\n')

	console.log('riskEngine withRoots() matches a fresh buildEngine():')
	{
		const R = org(40, 11)
		const ctx = riskEngine.buildEngine(R)
		check('unchanged seeds reuse the whole context', ctx.withRoots(sims.forkRoots(R)) === ctx)

		const target = R.agents.find((a) => a.status === 'active')
		const mutated = sims.forkRoots(R)
		mutated.agents = mutated.agents.map((a) => (a.id === target.id ? { ...a, status: 'failed' } : a))
		const reused = ctx.withRoots(mutated)
		const fresh = riskEngine.buildEngine(mutated)
		const mismatches = mutated.agents.filter((a) => reused.uState('agent', a.id) !== fresh.uState('agent', a.id)).map((a) => a.id)
		check('a newly-failed agent re-solves the org scan: every U state equals a fresh build', mismatches.length === 0, mismatches)
		check('...and the re-solve actually moved something (the test is not vacuous)', mutated.agents.some((a) => reused.uState('agent', a.id) !== ctx.uState('agent', a.id)))

		const cloned = sims.cloneRoots(R)
		check('a separately-cloned topology is never assumed equal (full rebuild)', ctx.withRoots(cloned) !== ctx && ctx.withRoots(cloned).engine !== ctx.engine)
	}

	console.log('\npredictiveRisk { lean } is the full result minus the two walks:')
	{
		const R = org(30, 12)
		const ctx = riskEngine.buildEngine(R)
		const full = derived.predictiveRisk(R, ctx)
		const lean = derived.predictiveRisk(R, ctx, { lean: true })
		const project = (s) => JSON.stringify({ id: s.agentId, p: s.predictedScore, t: s.threatLevel, e: s.evidence, c: s.contributingFactors, r: s.reasons })
		check('same scores, threat levels, evidence, attribution and reasons', JSON.stringify(full.scores.map(project)) === JSON.stringify(lean.scores.map(project)))
		check('lean rows carry no cascadeReach / blastRadius', lean.scores.every((s) => !('cascadeReach' in s) && !('blastRadius' in s)))
		check('full rows still carry both', full.scores.every((s) => typeof s.cascadeReach === 'number' && typeof s.blastRadius === 'number'))
	}

	console.log('\nThe active-set impact walk equals a naive full-sweep PPR, bit for bit:')
	{
		let worst = 0
		let solves = 0
		for (const seed of [21, 22, 23]) {
			const R = org(25, seed)
			const engine = impactPagerank.build(R.dependencies)
			for (const key of engine.nodes.slice(0, 40)) {
				const fast = engine.solve([[key, 1]])
				const ref = naivePpr(R.dependencies, key)
				for (let i = 0; i < ref.nodes.length; i++) {
					const d = Math.abs(fast[engine.indexByKey.get(ref.nodes[i])] - ref.r[i])
					if (d > worst) worst = d
				}
				solves++
			}
		}
		check(`${solves} solves: max |difference| is exactly 0`, worst === 0, worst)
	}

	console.log('\nScenarios never mutate the caller\'s roots:')
	{
		const R = org(30, 13)
		const before = JSON.stringify(R)
		const ctx = riskEngine.buildEngine(R)
		sims.rankAllScenarios(R, ctx)
		sims.employeeLeavesWithSuccessor('e0', 'e1', R, ctx)
		sims.workflowDisruption('w0', R, ctx)
		check('roots are byte-identical after ranking, succession and disruption', JSON.stringify(R) === before)
	}

	console.log('\nrankAllScenariosAsync: same result, and it yields the event loop:')
	{
		const R = org(60, 14)
		const ctx = riskEngine.buildEngine(R)
		const sync = sims.rankAllScenarios(R, ctx).map(strip)
		let ticks = 0
		const probe = setInterval(() => { ticks++ }, 1)
		const asyncRanked = (await sims.rankAllScenariosAsync(R, ctx, { sliceMs: 2 })).map(strip)
		clearInterval(probe)
		check('identical ranking, in identical order', JSON.stringify(sync) === JSON.stringify(asyncRanked), { sync: sync.length, async: asyncRanked.length })
		check('timers ran while it was ranking (the loop was not held)', ticks > 0, ticks)
	}

	console.log('\nrankedScenarios(): the cached request-path ranking:')
	{
		const R = org(20, 15)
		let loads = 0
		const loadRoots = async () => { loads++; await new Promise((r) => setTimeout(r, 5)); return R }
		sims.invalidateRanking()

		const [a, b, c] = await Promise.all([sims.rankedScenarios(loadRoots), sims.rankedScenarios(loadRoots), sims.rankedScenarios(loadRoots)])
		check('three concurrent cold callers share ONE computation', loads === 1, loads)
		check('cold callers are told the answer is fresh', a.fromMemo === false && a.refreshing === false)
		check('everyone got the same ranking', a.computedAt === b.computedAt && b.computedAt === c.computedAt)
		check('the ranking matches the synchronous definition', JSON.stringify(a.scenarios.map(strip)) === JSON.stringify(sims.rankAllScenarios(R).map(strip)))
		check('baseline matches baselineHealthScore', a.baseline === sims.baselineHealthScore(R))

		const d = await sims.rankedScenarios(loadRoots)
		check('within the TTL it is served from memory, no reload', d.fromMemo === true && d.refreshing === false && loads === 1)

		derived.invalidate() // a write landed
		const e = await sims.rankedScenarios(loadRoots)
		check('after derived.invalidate() the old ranking is dropped and recomputed', e.fromMemo === false && loads === 2, { fromMemo: e.fromMemo, loads })

		// Stale-while-revalidate: jump past the TTL.
		const realNow = Date.now
		Date.now = () => realNow() + sims.RANK_TTL_MS + 1000
		try {
			const f = await sims.rankedScenarios(loadRoots)
			check('a stale ranking is served immediately, flagged refreshing', f.fromMemo === true && f.refreshing === true && f.computedAt === e.computedAt)
			await new Promise((r) => setTimeout(r, 50))
			check('...while exactly one background refresh ran', loads === 3, loads)
		} finally {
			Date.now = realNow
		}

		// A failing background refresh keeps the last good ranking.
		let unhandled = 0
		const onUnhandled = () => { unhandled++ }
		process.on('unhandledRejection', onUnhandled)
		Date.now = () => realNow() + 2 * sims.RANK_TTL_MS + 5000
		try {
			const good = await sims.rankedScenarios(async () => { throw new Error('supabase down') })
			check('a failing refresh still serves the last good ranking', Array.isArray(good.scenarios) && good.refreshing === true)
			await new Promise((r) => setTimeout(r, 30))
			check('...and the background failure is not an unhandled rejection', unhandled === 0, unhandled)
		} finally {
			Date.now = realNow
			process.off('unhandledRejection', onUnhandled)
		}

		// A computation that started before a write never stores its result.
		sims.invalidateRanking()
		const pending = sims.rankedScenarios(loadRoots)
		sims.invalidateRanking()
		await pending
		const loadsBefore = loads
		const g = await sims.rankedScenarios(loadRoots)
		check('a ranking invalidated mid-flight is not cached', g.fromMemo === false && loads === loadsBefore + 1, { fromMemo: g.fromMemo, loads, loadsBefore })

		// A cold call whose load fails surfaces the error to the caller.
		sims.invalidateRanking()
		let err = null
		await sims.rankedScenarios(async () => { throw new Error('boom') }).catch((e) => { err = e })
		check('a cold failure rejects the waiting caller', err && err.message === 'boom', err && err.message)
	}

	console.log('\nScale smoke (400 employees, 1,200 agents):')
	{
		const R = org(400, 16)
		const t = Date.now()
		const ranked = sims.rankAllScenarios(R, riskEngine.buildEngine(R))
		const ms = Date.now() - t
		console.log(`    ${ranked.length} scenarios in ${ms}ms (the unoptimized path took minutes at this size)`)
		check('ranks well under 30s (generous bound for slow CI)', ms < 30_000, ms)
	}

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'RANKING PERFORMANCE TESTS PASSED ✅' : 'RANKING PERFORMANCE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

run().catch((err) => { console.error(err); process.exit(1) })
