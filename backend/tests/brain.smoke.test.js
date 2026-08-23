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
 * all 51 analyses exist and run, ownership is as the catalog declares, the
 * graph is valid, and the two constitutional ordering rules still hold.
 * (51, not 55: M10/M12/M17/M47 were retired — see the catalog's header.)
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
		check('51 analyses in the catalog', MODULES.length === 51, `${MODULES.length}`)
		const missing = MODULES.filter((m) => typeof IMPL[m.code] !== 'function')
		check('every analysis has an implementation', missing.length === 0,
			missing.length ? missing.map((m) => m.code).join(', ') : '51/51')

		const byOwner = {}
		for (const m of MODULES) byOwner[m.owner] = (byOwner[m.owner] || 0) + 1
		check('Owner Huzaifa = 13', byOwner.Huzaifa === 13, String(byOwner.Huzaifa))
		check('Owner Kamran = 20', byOwner.Kamran === 20, String(byOwner.Kamran))
		check('Owner Tahir = 11', byOwner.Tahir === 11, String(byOwner.Tahir))
		check('Owner Anusha = 7', byOwner.Anusha === 7, String(byOwner.Anusha))

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

		// ─── constitutional ordering survives the runtime's removal ───
		const order = brain.resolveOrder(MODULES.map((m) => m.code))
		check('ordering covers all 51', order.length === 51, `${order.length}`)
		check('Constitutional: Truth (M46) before Advisor (M48)',
			order.indexOf('M46') < order.indexOf('M48'),
			`M46@${order.indexOf('M46')} M48@${order.indexOf('M48')}`)
		check('Constitutional: Meta-Brain (M55) runs last', order[order.length - 1] === 'M55', order[order.length - 1])
		const misordered = MODULES.filter((m) => m.dependsOn.some((d) => order.indexOf(d) > order.indexOf(m.code)))
		check('every dependency precedes its dependent', misordered.length === 0,
			misordered.length ? misordered.map((m) => m.code).join(', ') : 'all 51')

		// ─── every analysis actually runs over a graph ───
		const g = buildTestGraph()
		check('Knowledge graph valid', g.validate().valid === true)

		const errors = []
		for (const m of MODULES) {
			try { await IMPL[m.code]({ graph: g }, {}) } catch (e) { errors.push(`${m.code}: ${e.message}`) }
		}
		check('all 51 analyses run without error', errors.length === 0,
			errors.length ? errors.slice(0, 3).join(' | ') : '51/51')

		// ─── composition still feeds priorIntel (M48 is gated by M46) ───
		brain.setGraph(g)
		const fused = await brain.runMany(['M46', 'M48', 'M55'], { role: 'CEO' })
		check('runMany returns an order', Array.isArray(fused.order) && fused.order.length > 0,
			fused.order.join(' → '))
		check('Fused confidence is a number', typeof fused.fusedConfidence === 'number', String(fused.fusedConfidence))
		check('Constitutional: orchestrator runs last', fused.order[fused.order.length - 1] === 'M55')
	} catch (e) {
		failed++
		console.error('  ✗ Brain smoke test threw:', e.message)
	}

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()
