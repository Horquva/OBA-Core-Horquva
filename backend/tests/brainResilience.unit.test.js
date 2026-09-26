/*
 * OBA Core — Brain graph-load resilience tests (Phase 1.7).
 *
 * The load used to run exactly once at boot: any transient Supabase error
 * left every /api/intelligence endpoint answering 503 until a human
 * restarted the container. brain/index.js now retries with backoff through
 * an opossum circuit breaker, and scheduleReload() lets mutation paths
 * refresh the graph in the background. This suite pins all three.
 *
 * Stubs brain/knowledge/graphLoader's loadFromSupabase via require.cache —
 * no database involved.
 *
 * Run from backend/:  node tests/brainResilience.unit.test.js
 */

const path = require('path')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const loaderPath = require.resolve(path.join(__dirname, '..', 'brain', 'knowledge', 'graphLoader.js'))

/** Installs a stub loadFromSupabase with a programmable failure sequence. */
let loadBehavior = null // () => Promise
let loadCalls = 0
function stubLoader() {
	require.cache[loaderPath] = {
		id: loaderPath, filename: loaderPath, loaded: true,
		exports: {
			loadFromSupabase: async (graph) => {
				loadCalls++
				return loadBehavior(graph)
			},
		},
	}
}

function seedGraph(graph) {
	graph.addEntity({ id: 'x1', type: 'ai_agent', name: 'X' })
}

stubLoader()
const brain = require('../brain')

async function main() {
	console.log('\n=== OBA Core — Brain resilience tests ===\n')

	console.log('loadGraph retry:')
	{
		brain.setGraph((() => { const g = new (require('../brain/knowledge/knowledgeGraph'))(); seedGraph(g); return g })())
		loadCalls = 0
		let failures = 2
		loadBehavior = async (graph) => {
			if (failures-- > 0) throw new Error('ECONNRESET: transient')
			seedGraph(graph)
		}
		const stats = await brain.loadGraph({ attempts: 4 })
		check('transient failures are retried to success', loadCalls === 3 && stats != null, { loadCalls })
		check('source is live after recovery', brain.graphSource().live === true, brain.graphSource())
	}

	console.log('\nloadGraph exhaustion:')
	{
		brain._loadBreaker.close() // isolation: this block tests retry exhaustion, not the breaker
		loadCalls = 0
		loadBehavior = async () => { throw new Error('connection refused') }
		let rejected = null
		await brain.loadGraph({ attempts: 2 }).catch((e) => { rejected = e })
		check('exhausted retries reject with the last error', rejected != null && /connection refused/.test(rejected.message), rejected && rejected.message)
		check('failure is recorded on source (callers see the truth)', brain.graphSource().live === false && /connection refused/.test(brain.graphSource().error || ''), brain.graphSource())
		check('a previously-loaded graph is kept, not nulled', brain.isReady() === true, brain.isReady())
	}

	console.log('\ncircuit breaker:')
	{
		// volumeThreshold is 3 — three failed attempts open it; the next call
		// must fail fast (open breaker) instead of retrying into the void.
		brain._loadBreaker.close()
		loadCalls = 0
		loadBehavior = async () => { throw new Error('down') }
		// volumeThreshold is 10 — three exhausted single-attempt calls is not
		// enough; repeated exhausted calls trip it (fail-fast after 10).
		await brain.loadGraph({ attempts: 4 }).catch(() => {})
		await brain.loadGraph({ attempts: 4 }).catch(() => {})
		check('breaker opens after repeated exhausted calls', brain._loadBreaker.opened === true, { loadCalls, opened: brain._loadBreaker.opened })
		await brain.loadGraph({ attempts: 4 }).catch(() => {})
		const before = loadCalls
		await brain.loadGraph({ attempts: 3 }).catch(() => {})
		check('open breaker fails fast (no load attempts)', loadCalls === before, { before, after: loadCalls })
	}

	console.log('\nscheduleReload debounce:')
	{
		brain._loadBreaker.close() // the breaker block left it open
		loadCalls = 0
		loadBehavior = async (graph) => { seedGraph(graph) }
		brain.scheduleReload(40)
		brain.scheduleReload(40)
		brain.scheduleReload(40)
		await new Promise((r) => setTimeout(r, 250))
		check('three coalesced reloads fire exactly one load', loadCalls === 1, { loadCalls })
		check('graph live again after reload', brain.graphSource().live === true, brain.graphSource())
	}

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'BRAIN RESILIENCE TESTS PASSED ✅' : 'BRAIN RESILIENCE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
