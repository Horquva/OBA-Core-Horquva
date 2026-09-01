/*
 * OBA Core — Gemini provider adapter unit test (W-L 10.7).
 *
 * The adapter is the seam between one vendor and the rest of the system, so
 * these assertions are about normalisation and about failure classification
 * rather than about happy-path prose. A misclassified error here becomes a
 * retry that spends quota, or a stall that looks like a hang.
 *
 * The thought-signature cases below are a regression guard, not a hypothetical:
 * Gemini 3 rejects the next request with a 400 when a functionCall part is
 * echoed back without its signature, and this adapter reproduced that failure
 * against the live API before the `raw` passthrough was added.
 *
 * No network and no key — the transport is injected. Never spends quota.
 *
 * Run from backend/:  node tests/provider.unit.test.js
 */

const provider = require('../agent/providers/gemini')
const { getProvider, isConfigured } = require('../agent/providers')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

let lastRequest = null

function fakeStream(chunks) {
	return {
		models: {
			generateContentStream: async (req) => {
				lastRequest = req
				return (async function* () { for (const c of chunks) yield c })()
			},
		},
	}
}

function fakeThrows(err) {
	return { models: { generateContentStream: async () => { throw err } } }
}

async function collect(gen) {
	const out = []
	for await (const e of gen) out.push(e)
	return out
}

const TOOLS = [{
	name: 'get_org_snapshot',
	description: 'Call this when the user asks about the organisation as a whole.',
	parameters: { type: 'object', properties: {}, required: [] },
}]

function turn(extra) {
	return Object.assign({ systemInstruction: 'constitution', history: [], tools: TOOLS }, extra || {})
}

console.log('\n=== OBA Core — Gemini Provider Adapter Unit Test ===\n')

async function main() {
	process.env.AGENT_MODEL = 'test-model-id'

	// —— Event normalisation ————————————————————————————
	console.log('Text parts become text events:')
	{
		provider.__setClient(fakeStream([
			{ candidates: [{ content: { parts: [{ text: 'Hello ' }] } }] },
			{ candidates: [{ content: { parts: [{ text: 'world' }] }, finishReason: 'STOP' }] },
		]))
		const ev = await collect(provider.stream(turn()))
		const text = ev.filter(e => e.type === 'text').map(e => e.text).join('')
		check('deltas arrive in order and are not buffered', text === 'Hello world', text)
		check('a done event closes the stream', ev.some(e => e.type === 'done'), ev.map(e => e.type))
	}

	console.log('\nFunction calls become tool_call events:')
	{
		provider.__setClient(fakeStream([
			{ candidates: [{ content: { parts: [
				{ functionCall: { name: 'get_org_snapshot', args: { scope: 'all' } } },
			] } }] },
		]))
		const call = (await collect(provider.stream(turn()))).find(e => e.type === 'tool_call')
		check('name survives the mapping', call && call.name === 'get_org_snapshot', call)
		check('args survive the mapping', call && call.args.scope === 'all', call)
		check('an id is always present for the loop to match on', Boolean(call && call.id), call)
	}

	console.log('\nUsage and model identity:')
	{
		provider.__setClient(fakeStream([
			{ candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'STOP' }],
			  usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 40 } },
		]))
		const done = (await collect(provider.stream(turn()))).find(e => e.type === 'done')
		check('token usage is reported for accounting', done && done.usage.inputTokens === 120 && done.usage.outputTokens === 40, done)
		check('finishReason is carried through', done && done.finishReason === 'STOP', done)
		check('model id comes from AGENT_MODEL, never hardcoded (§3.3)', lastRequest.model === 'test-model-id', lastRequest.model)
		check('tools are declared in Gemini wire shape', lastRequest.config.tools[0].functionDeclarations[0].name === 'get_org_snapshot')
	}

	// —— Thought signatures (Gemini 3) ——————————————————————
	console.log('\nThought signatures — dropping one is a 400 on the next request:')
	{
		provider.__setClient(fakeStream([
			{ candidates: [{ content: { parts: [
				{ functionCall: { name: 'get_org_snapshot', args: {} }, thoughtSignature: 'SIG-ABC123' },
			] } }] },
		]))
		const call = (await collect(provider.stream(turn()))).find(e => e.type === 'tool_call')
		check('the untouched vendor part rides along as raw', Boolean(call && call.raw), call)
		check('raw still carries the signature', call && call.raw.thoughtSignature === 'SIG-ABC123', call && call.raw)

		const history = []
		provider.appendModelTurn(history, [call])
		check('appendModelTurn echoes the signature back verbatim', history[0].parts[0].thoughtSignature === 'SIG-ABC123', history[0].parts[0])
		check('and still carries the function call itself', history[0].parts[0].functionCall.name === 'get_org_snapshot', history[0].parts[0])

		const noRaw = []
		provider.appendModelTurn(noRaw, [{ type: 'tool_call', id: 'a', name: 'get_org_snapshot', args: {} }])
		check('a signature-less event still produces a valid part', noRaw[0].parts[0].functionCall.name === 'get_org_snapshot', noRaw[0].parts[0])
	}

	// —— Failure classification (§14) ——————————————————————
	console.log('\nError classification — the loop decides, so the label must be right:')
	{
		provider.__setClient(fakeThrows(Object.assign(new Error('quota'), { status: 429 })))
		const quota = await collect(provider.stream(turn()))
		check('quota exhaustion surfaces as an error event', quota[0] && quota[0].type === 'error', quota[0] && quota[0].type)
		check('429 is terminal — a retry would spend another request', quota[0] && quota[0].retryable === false, quota[0])

		provider.__setClient(fakeThrows(Object.assign(new Error('upstream'), { status: 503 })))
		const upstream = await collect(provider.stream(turn()))
		check('5xx is retryable', upstream[0] && upstream[0].retryable === true, upstream[0])

		provider.__setClient(fakeThrows(new Error('socket hang up')))
		const transport = await collect(provider.stream(turn()))
		check('a statusless transport failure is retryable', transport[0] && transport[0].retryable === true, transport[0])

		provider.__setClient(fakeThrows(Object.assign(new Error('bad request'), { status: 400 })))
		const bad = await collect(provider.stream(turn()))
		check('4xx other than 429 is terminal', bad[0] && bad[0].retryable === false, bad[0])
	}

	console.log('\nAbort — a disconnected client must stop costing tokens:')
	{
		const ctrl = new AbortController()
		provider.__setClient({
			models: {
				generateContentStream: async () => (async function* () {
					yield { candidates: [{ content: { parts: [{ text: 'a' }] } }] }
					ctrl.abort()
					yield { candidates: [{ content: { parts: [{ text: 'b' }] } }] }
				})(),
			},
		})
		const ev = await collect(provider.stream(turn({ signal: ctrl.signal })))
		const text = ev.filter(e => e.type === 'text').map(e => e.text).join('')
		check('no events after the abort', text === 'a', text)
		check('an aborted turn does not emit done', !ev.some(e => e.type === 'done'), ev.map(e => e.type))
		check('an aborted turn is not an error', !ev.some(e => e.type === 'error'), ev.map(e => e.type))
	}

	// —— History shape ——————————————————————————————————
	console.log('\nHistory append — we keep conversation state, not the provider:')
	{
		const history = []
		provider.appendModelTurn(history, [{ functionCall: { name: 'get_org_snapshot', args: {} } }])
		provider.appendToolResult(history, {
			id: 'x-1',
			name: 'get_org_snapshot',
			result: { data: { orgHealth: 62 }, provenance: { source: 'live' } },
		})
		check('the model turn is recorded as role model', history[0] && history[0].role === 'model', history[0])
		check('a raw wire part passes through untouched', history[0].parts[0].functionCall.name === 'get_org_snapshot', history[0].parts[0])
		check('the tool result names its function', history[1].parts[0].functionResponse.name === 'get_org_snapshot', history[1])
		check('the registry envelope passes through unmodified (I-5)', history[1].parts[0].functionResponse.response.data.orgHealth === 62, history[1])
	}

	console.log('\nAdapter selection:')
	{
		check('gemini resolves and describes itself', getProvider('gemini').describe().provider === 'gemini')
		let threw = false
		try { getProvider('nope') } catch (e) { threw = /Unknown AGENT_PROVIDER/.test(e.message) }
		check('an unknown provider fails loudly at selection', threw)
		check('isConfigured returns a boolean for the mount guard', typeof isConfigured('gemini') === 'boolean')
	}

	provider.__resetClient()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'PROVIDER ADAPTER TESTS PASSED ☑' : 'PROVIDER ADAPTER TESTS FAILED ✗')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main()
