/*
 * OBA Core — Tool registry, envelope, input validation unit test.
 *
 * agent/registry.js implements Task 11.1: one envelope shape for every
 * tool result, and one place where args are validated before any tool
 * body runs. This test asserts envelope shape, enum rejection,
 * required-field rejection, and truncation notes -- same pattern as
 * tools.unit.test.js.
 *
 * Run from backend/:  node tests/agentRegistry.unit.test.js
 */

const { buildRegistry, validateArgs, envelope } = require('../agent/registry')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

function ctx(overrides = {}) {
	return {
		snapshotAt: '2026-08-31T00:00:00.000Z',
		graphSource: { live: true, loadedAt: '2026-08-30T00:00:00.000Z' },
		...overrides,
	}
}

console.log('\n=== OBA Core — Agent Tool Registry Unit Test ===\n')

console.log('Envelope shape:')
{
	const c = ctx()
	const args = { foo: 'bar' }
	const env = envelope(c, args, { data: { hello: 'world' }, evidence: ['e1'], notes: ['n1'] })

	check('envelope has data', env.data && env.data.hello === 'world', env.data)
	check('envelope has provenance', typeof env.provenance === 'object' && env.provenance !== null, env.provenance)
	check('provenance.computedAt is a timestamp', typeof env.provenance.computedAt === 'string', env.provenance.computedAt)
	check('provenance.snapshotAt comes from ctx', env.provenance.snapshotAt === c.snapshotAt, env.provenance.snapshotAt)
	check('provenance.source reflects live graphSource', env.provenance.source === 'live', env.provenance.source)
	check('provenance.inputs echoes args', JSON.stringify(env.provenance.inputs) === JSON.stringify(args), env.provenance.inputs)
	check('envelope carries evidence through', JSON.stringify(env.evidence) === JSON.stringify(['e1']), env.evidence)
	check('envelope.authored is always false', env.authored === false, env.authored)
	check('envelope carries rawResult notes through', env.notes.includes('n1'), env.notes)
	check('no toolError key when rawResult has none', !('toolError' in env), env)

	const graphCtx = ctx({ graphSource: { live: false } })
	const graphEnv = envelope(graphCtx, {}, { data: null })
	check('provenance.source reflects non-live graphSource', graphEnv.provenance.source === 'graph', graphEnv.provenance.source)
}

console.log('\nEnum rejection:')
{
	const schema = { type: 'object', properties: { kind: { type: 'string', enum: ['agent', 'tool'] } }, required: ['kind'] }

	const bad = validateArgs(schema, { kind: 'foo' })
	check('unknown enum value is rejected', bad.ok === false, bad)
	check('rejection code is INVALID_ENUM_VALUE', bad.error.code === 'INVALID_ENUM_VALUE', bad.error)
	check('rejection lists the allowed values', JSON.stringify(bad.error.details.allowed) === JSON.stringify(['agent', 'tool']), bad.error.details)

	const good = validateArgs(schema, { kind: 'agent' })
	check('allowed enum value passes', good.ok === true, good)
}

console.log('\nRequired-field rejection:')
{
	const schema = {
		type: 'object',
		properties: { name: { type: 'string' }, limit: { type: 'integer' } },
		required: ['name', 'limit'],
	}

	const missingBoth = validateArgs(schema, {})
	check('missing required fields is rejected', missingBoth.ok === false, missingBoth)
	check('rejection code is MISSING_REQUIRED_FIELD', missingBoth.error.code === 'MISSING_REQUIRED_FIELD', missingBoth.error)
	check('rejection names all missing fields', JSON.stringify(missingBoth.error.details.missing) === JSON.stringify(['name', 'limit']), missingBoth.error.details)

	const nullField = validateArgs(schema, { name: 'x', limit: null })
	check('null counts as missing for a required field', nullField.ok === false, nullField)

	const complete = validateArgs(schema, { name: 'x', limit: 5 })
	check('all required fields present passes', complete.ok === true, complete)

	const wrongType = validateArgs(schema, { name: 'x', limit: 'five' })
	check('present-but-wrong-type is a separate INVALID_TYPE error, not MISSING_REQUIRED_FIELD',
		wrongType.ok === false && wrongType.error.code === 'INVALID_TYPE', wrongType.error)
}

console.log('\nTruncation notes:')
{
	const bigArray = Array.from({ length: 250 }, (_, i) => i)
	const env = envelope(ctx(), {}, { data: { items: bigArray } })

	check('oversized array is truncated to 200 items', env.data.items.length === 200, env.data.items.length)
	check('truncation note is present and mentions the cut', env.notes.some((n) => n.includes('truncated from 250 to 200')), env.notes)

	const small = envelope(ctx(), {}, { data: { items: [1, 2, 3] } })
	check('small array is left untouched with no truncation note', small.data.items.length === 3 && small.notes.length === 0, small)
}

console.log('\nRegistry execute() end-to-end:')
{
	const echoTool = {
		name: 'echo',
		description: 'Echoes back the given value.',
		parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
		run: async (c, args) => ({ data: { value: args.value } }),
	}
	const throwingTool = {
		name: 'boom',
		description: 'Always throws.',
		parameters: { type: 'object', properties: {}, required: [] },
		run: async () => { throw new Error('kaboom') },
	}

	const { declarations, execute } = buildRegistry([echoTool, throwingTool], ctx())

	check('declarations expose name/description/parameters only', declarations.length === 2 && !('run' in declarations[0]), declarations)

	;(async () => {
		const okResult = await execute('echo', { value: 'hi' })
		check('successful tool call returns enveloped data', okResult.data.value === 'hi', okResult)

		const badArgs = await execute('echo', {})
		check('invalid args short-circuit before run(), returns toolError', badArgs.toolError && badArgs.toolError.code === 'MISSING_REQUIRED_FIELD', badArgs.toolError)

		const unknown = await execute('nope', {})
		check('unknown tool name returns UNKNOWN_TOOL toolError', unknown.toolError && unknown.toolError.code === 'UNKNOWN_TOOL', unknown.toolError)

		const threw = await execute('boom', {})
		check('a thrown error inside run() never escapes -- becomes TOOL_THREW toolError', threw.toolError && threw.toolError.code === 'TOOL_THREW', threw.toolError)

		console.log('\n' + '-'.repeat(40))
		console.log('passed:', passed, '  failed:', failed)
		console.log('-'.repeat(40))
		if (failed > 0) {
			console.log('\nAGENT TOOL REGISTRY UNIT TESTS FAILED ❌')
			process.exit(1)
		}
		console.log('\nAGENT TOOL REGISTRY UNIT TESTS PASSED ✅')
		console.log('-'.repeat(40))
	})()
}