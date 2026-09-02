/*
 * OBA Core — Brain Smoke Test (MVP)
 * No external test framework. No Supabase/DB and no express needed — runs
 * against tests/fixtures/graph.js.
 * Run from the backend/ folder:  node tests/brain.smoke.test.js
 *
 * The brain used to be a runtime, and this file asserted its boot report:
 * 55 modules "discovered", 55 capabilities "registered", a graph "valid" flag.
 * The runtime is gone (see docs/superpowers/specs/2026-08-24-brain-as-library-design.md).
 * Every assertion below is the same claim re-expressed against the library —
 * all 23 analyses exist and run, ownership is as the catalog declares, the
 * graph is valid, and dependency ordering still holds.
 * (23, not 55: M10/M12/M17/M47 were retired 2026-08-24, then a further 27 on
 * 2026-09-02, then M30 later the same day — see the catalog's header for all
 * three retirement audits. The two constitutional ordering rules this file
 * used to assert — Truth (M46) before Advisor (M48), Meta-Brain (M55) last —
 * were retired along with those three modules; there is nothing left to gate.)
 */

const fs = require('fs')
const path = require('path')
const brain = require('../brain')
const { buildTestGraph } = require('./fixtures/graph')
const IMPL = require('../brain/modules/implementations')

let passed = 0
let failed = 0

function check(name, condition, detail) {
	if (condition) {
		passed++
		console.log('  ✓', name, detail ? '— ' + detail : '')
	} else {
		failed++
		console.error('  ✗', name, detail ? '— ' + detail : '')
	}
}

;(async () => {
	console.log('\n=== OBA Core — Brain Smoke Test ===\n')

	try {
		const { MODULES } = brain

		// ─── the catalog is intact ───
		check('23 analyses in the catalog', MODULES.length === 23, `${MODULES.length}`)
		const missing = MODULES.filter((m) => typeof IMPL[m.code] !== 'function')
		check('every analysis has an implementation', missing.length === 0,
			missing.length ? missing.map((m) => m.code).join(', ') : '23/23')

		const byOwner = {}
		for (const m of MODULES) byOwner[m.owner] = (byOwner[m.owner] || 0) + 1
		// Anusha's whole executive layer (M15/M16/M21/M23/M51/M52/M53) was retired
		// 2026-09-02 -- each was redundant with a richer live SQL system -- so she
		// no longer owns any module in this catalog. That is a fact about which
		// analyses turned out to be duplicates, not a statement about her work.
		check('Owner Huzaifa = 11', byOwner.Huzaifa === 11, String(byOwner.Huzaifa))
		check('Owner Kamran = 4', byOwner.Kamran === 4, String(byOwner.Kamran))
		check('Owner Tahir = 8', byOwner.Tahir === 8, String(byOwner.Tahir))
		check('Owner Anusha owns none remaining', byOwner.Anusha === undefined, String(byOwner.Anusha))

		// ─── every analysis has a unique, resolvable name ───
		// Slugs are derived from catalog names, so a rename could silently collide
		// two analyses onto one alias. Guard it.
		const slugs = MODULES.map((m) => m.slug)
		check('every analysis has a slug', slugs.every(Boolean))
		check('slugs are unique', new Set(slugs).size === slugs.length,
			`${new Set(slugs).size} unique of ${slugs.length}`)
		check('slugs never collide with codes', !slugs.some((sl) => /^M\d\d$/.test(sl)))
		check('slug and code resolve to the same analysis',
			MODULES.every((m) => brain.toCode(m.slug) === m.code && brain.toCode(m.code) === m.code))
		check('an unknown name resolves to null', brain.toCode('not-an-analysis') === null)

		// ─── nobody outside the catalog claims a module code ───
		// Three route files used to answer with `module: 'M21'` / 'M51' / 'M52' /
		// 'M53' while computing something different from Supabase under the same
		// number — the brain's M52 returns governance coverage from the graph,
		// /api/automation/governance returns pending approvals. Two answers, one
		// code, no way to tell which a caller got. This guard is here because that
		// collision was reintroduced by accident once already.
		const routeFiles = []
		;(function walk(dir) {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name)
				if (entry.isDirectory()) walk(full)
				else if (entry.name.endsWith('.js')) routeFiles.push(full)
			}
		})(path.join(__dirname, '..', 'routes'))

		const squatters = []
		for (const file of routeFiles) {
			const src = fs.readFileSync(file, 'utf8')
			for (const line of src.split('\n')) {
				if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
				const hit = line.match(/\bmodules?: *\[?'M\d\d'/)
				if (hit) squatters.push(`${path.relative(path.join(__dirname, '..'), file)}: ${hit[0]}`)
			}
		}
		check('no route answers with a brain module code', squatters.length === 0,
			squatters.length ? squatters.join(' | ') : `${routeFiles.length} route files clean`)

		// ─── dependency ordering survives the runtime's removal ───
		const order = brain.resolveOrder(MODULES.map((m) => m.code))
		check('ordering covers all 23', order.length === 23, `${order.length}`)
		const misordered = MODULES.filter((m) => m.dependsOn.some((d) => order.indexOf(d) > order.indexOf(m.code)))
		check('every dependency precedes its dependent', misordered.length === 0,
			misordered.length ? misordered.map((m) => m.code).join(', ') : 'all 23')

		// ─── every analysis actually runs over a graph ───
		const g = buildTestGraph()
		check('Knowledge graph valid', g.validate().valid === true)

		const errors = []
		for (const m of MODULES) {
			try { await IMPL[m.code]({ graph: g }, {}) } catch (e) { errors.push(`${m.code}: ${e.message}`) }
		}
		check('all 23 analyses run without error', errors.length === 0,
			errors.length ? errors.slice(0, 3).join(' | ') : '23/23')

		// ─── composition (dependsOn resolution + priorIntel population) still
		// works for a real multi-level chain: M31 needs M28+M29, M28 needs
		// M02+M34, M29 needs M01+M28, M02 needs M01, M34 needs M02 -- the full
		// transitive closure is exactly {M01, M02, M34, M28, M29, M31}, six
		// modules pulled in and ordered from one request for M31 alone.
		brain.setGraph(g)
		const fused = await brain.runMany(['M31'], { role: 'CEO' })
		const expectedChain = ['M01', 'M02', 'M34', 'M28', 'M29', 'M31']
		check('runMany pulls in exactly the transitive dependency closure',
			fused.order.length === expectedChain.length && expectedChain.every((c) => fused.order.includes(c)),
			fused.order.join(' → '))
		check('M31 runs last (it is the requested target, and depends on the rest)',
			fused.order[fused.order.length - 1] === 'M31', fused.order[fused.order.length - 1])
		check('Fused confidence is a number', typeof fused.fusedConfidence === 'number', String(fused.fusedConfidence))
	} catch (e) {
		failed++
		console.error('  ✗ Brain smoke test threw:', e.message)
	}

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()
