// backend/tests/agentLoop.unit.test.js
//
// Task 11.5 — the agent loop, against a scripted stub provider.
//
// The six scenarios named in §11.5 are the shape of this file: a single-tool
// turn, a multi-tool turn, the iteration cap reached and reported, a
// retryable error retried, a terminal error surfaced, and an abort mid-stream
// that stops cleanly. Each of these is a way a turn can end, and §14's rule
// is that a failure must never be presentable as an answer — so the
// assertions are mostly about what the client is TOLD, not about the text.
//
// The registry here is the real buildRegistry() over one fake tool, so this
// suite also guards the loop's half of the 11.1 contract. No network.
//
// Run from backend/:  node tests/agentLoop.unit.test.js

const { runTurn } = require('../agent/loop')
const { buildRegistry } = require('../agent/registry')

let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ✓', name) }
  else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// —— Fixtures ————————————————————————————————————————

const CTX = {
  snapshotAt: '2026-09-01T09:00:00.000Z',
  graphSource: { live: true, loadedAt: '2026-09-01T08:00:00.000Z' },
  graphStale: false,
  roots: {
    employees: [{ id: 'emp1', name: 'Sarah Connor', role: 'Lead', department: 'Ops', criticality: 'critical', active: true }],
    agents: [],
    workflows: [],
    platforms: [],
  },
}

const SNAPSHOT_TOOL = {
  name: 'get_org_snapshot',
  description: 'Call this when the user asks about the organisation as a whole.',
  parameters: { type: 'object', properties: {}, required: [] },
  run: async () => ({ data: { orgHealth: 62, headcount: 41 } }),
}

const PROFILE_TOOL = {
  name: 'get_entity_profile',
  description: 'Call this when the user asks about one specific named person.',
  parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  run: async (ctx, args) => ({ data: { id: args.id, spof: true } }),
}

const EXPLODING_TOOL = {
  name: 'run_brain_analysis',
  description: 'Call this to run a graph analysis.',
  parameters: { type: 'object', properties: {}, required: [] },
  run: async () => { throw new Error('graph not loaded') },
}

function registry() {
  return buildRegistry([SNAPSHOT_TOOL, PROFILE_TOOL, EXPLODING_TOOL], CTX)
}

// A §8.4 provider whose stream is scripted round by round. It records what
// the loop hands back to appendModelTurn, which is how we assert the thought
// signature survives.
function stubProvider(rounds) {
  const appended = []
  let round = 0
  return {
    appended,
    roundsUsed: () => round,
    async *stream() {
      const events = rounds[Math.min(round, rounds.length - 1)]
      round++
      for (const ev of events) {
        if (typeof ev === 'function') { await ev(); continue }
        yield ev
      }
    },
    appendModelTurn(history, parts) {
      appended.push(parts)
      history.push({ role: 'model', parts })
      return history
    },
    appendToolResult(history, { name, result }) {
      history.push({ role: 'user', parts: [{ functionResponse: { name, response: result } }] })
      return history
    },
    describe: () => ({ provider: 'stub', model: 'stub-model' }),
  }
}

function recorder() {
  const events = []
  const emit = (event, data) => events.push({ event, data })
  return {
    events,
    emit,
    names: () => events.map((e) => e.event),
    of: (name) => events.filter((e) => e.event === name),
    first: (name) => events.find((e) => e.event === name),
  }
}

function textEvent(text) { return { type: 'text', text } }
function callEvent(id, name, args, signature) {
  return {
    type: 'tool_call', id, name, args: args || {},
    raw: { functionCall: { name, args: args || {} }, ...(signature ? { thoughtSignature: signature } : {}) },
  }
}
function doneEvent(input, output) {
  return { type: 'done', usage: { inputTokens: input, outputTokens: output }, finishReason: 'STOP' }
}

console.log('\n=== OBA Core — Agent Loop Unit Test ===\n')

async function main() {
  // —— 1. Single-tool turn ————————————————————————————
  console.log('A single-tool turn:')
  {
    const provider = stubProvider([
      [callEvent('c1', 'get_org_snapshot', {}, 'SIG-1'), doneEvent(95, 12)],
      [textEvent('Org health is 62.'), doneEvent(288, 19)],
    ])
    const rec = recorder()
    const out = await runTurn({
      turnContext: CTX, history: [], userMessage: 'How healthy is the org?',
      emit: rec.emit, registry: registry(), provider,
    })

    check('the answer text is returned', out.text === 'Org health is 62.', out.text)
    check('two rounds were used', out.iterations === 2, out.iterations)
    check('finishReason is STOP', out.finishReason === 'STOP', out.finishReason)
    check('usage is summed across rounds', out.usage.inputTokens === 383 && out.usage.outputTokens === 31, out.usage)
    check('tool_start precedes tool_done', rec.names().indexOf('tool_start') < rec.names().indexOf('tool_done'))
    check('tool_start carries a human-readable label', rec.first('tool_start').data.label === 'get org snapshot', rec.first('tool_start').data)
    check('tool_done carries a one-line summary', /orgHealth/.test(rec.first('tool_done').data.summary), rec.first('tool_done').data)
    check('tool_done reports a duration', typeof rec.first('tool_done').data.durationMs === 'number')
    check('the trace records the call', out.toolTrace.length === 1 && out.toolTrace[0].name === 'get_org_snapshot', out.toolTrace)
    check('the trace keeps the full envelope for 11.8', out.toolTrace[0].result !== undefined, Object.keys(out.toolTrace[0]))
    check('the numbers themselves are reachable', out.toolTrace[0].result.data.orgHealth === 62, out.toolTrace[0].result.data)
    check('provenance rides along for the name checks', typeof out.toolTrace[0].result.provenance.snapshotAt === 'string', out.toolTrace[0].result.provenance)
    check('tool_done still carries only the summary', rec.first('tool_done').data.result === undefined, rec.first('tool_done').data)
    check('text arrived as token events', rec.of('token').length > 0)
  }

  // —— Thought signatures ————————————————————————————
  console.log('\nThe model turn is handed back untouched (Gemini 3 requirement):')
  {
    const provider = stubProvider([
      [callEvent('c1', 'get_org_snapshot', {}, 'SIG-ABC'), doneEvent(10, 1)],
      [textEvent('done'), doneEvent(10, 1)],
    ])
    await runTurn({ turnContext: CTX, userMessage: 'x', emit: () => {}, registry: registry(), provider })
    const parts = provider.appended[0]
    check('appendModelTurn received the events, not rebuilt parts', parts[0].type === 'tool_call', parts[0])
    check('the signature is still reachable on the event', parts[0].raw.thoughtSignature === 'SIG-ABC', parts[0].raw)
  }

  // —— 2. Multi-tool turn ————————————————————————————
  console.log('\nA multi-tool turn:')
  {
    const provider = stubProvider([
      [callEvent('c1', 'get_org_snapshot'), callEvent('c2', 'get_entity_profile', { id: 'emp1' }), doneEvent(10, 2)],
      [textEvent('Both looked up.'), doneEvent(10, 2)],
    ])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })

    check('both tools ran', out.toolTrace.length === 2, out.toolTrace.map((t) => t.name))
    check('both were announced', rec.of('tool_start').length === 2)
    check('both were completed', rec.of('tool_done').length === 2)
    check('parallel calls are one model turn', provider.appended[0].length === 2, provider.appended[0].length)
    check('the label names the subject', rec.of('tool_start')[1].data.label === 'get entity profile: emp1', rec.of('tool_start')[1].data.label)
  }

  // —— A tool error is a result, not a loop failure ————————
  console.log('\nA tool failure is something the model can correct, not a crash:')
  {
    const provider = stubProvider([
      [callEvent('c1', 'run_brain_analysis'), doneEvent(10, 2)],
      [textEvent('The analysis is unavailable because the graph is not loaded.'), doneEvent(10, 2)],
    ])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })

    check('the turn still completes', out.finishReason === 'STOP', out.finishReason)
    check('no error event is emitted', rec.of('error').length === 0, rec.names())
    check('the trace records the tool error', out.toolTrace[0].toolError === 'TOOL_THREW', out.toolTrace[0])
    check('the summary says so plainly', /error/.test(rec.first('tool_done').data.summary), rec.first('tool_done').data.summary)
  }

  console.log('\nA bad argument comes back correctable, not thrown:')
  {
    const provider = stubProvider([
      [callEvent('c1', 'get_entity_profile', {}), doneEvent(10, 2)],   // missing required id
      [textEvent('Which person did you mean?'), doneEvent(10, 2)],
    ])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })
    check('the loop survives an invalid call', out.finishReason === 'STOP', out.finishReason)
    check('the trace names the argument error', out.toolTrace[0].toolError === 'MISSING_REQUIRED_FIELD', out.toolTrace[0])
  }

  // —— 3. Iteration cap ——————————————————————————————
  console.log('\nThe iteration cap is a reported outcome, never a silent stop:')
  {
    const previous = process.env.AGENT_MAX_ITERATIONS
    process.env.AGENT_MAX_ITERATIONS = '3'

    // Every round asks for another tool; the model never settles.
    const provider = stubProvider([[callEvent('c1', 'get_org_snapshot'), doneEvent(10, 2)]])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })

    check('it stops at the cap', out.iterations === 3, out.iterations)
    check('finishReason names the cap', out.finishReason === 'ITERATION_CAP', out.finishReason)
    check('the client is warned', Boolean(rec.of('warning').find((w) => w.data.code === 'ITERATION_CAP_REACHED')), rec.of('warning').map((w) => w.data.code))
    check('the partial trace is still returned', out.toolTrace.length === 3, out.toolTrace.length)

    process.env.AGENT_MAX_ITERATIONS = previous
  }

  // —— 4. Retryable error ————————————————————————————
  console.log('\nA retryable provider error is retried exactly once:')
  {
    const provider = stubProvider([
      [{ type: 'error', error: new Error('service unavailable'), retryable: true }],
      [textEvent('Recovered.'), doneEvent(10, 2)],
    ])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })

    check('the turn recovers', out.text === 'Recovered.', out.text)
    check('the retry is not counted as a step', out.iterations === 1, out.iterations)
    check('the retry is visible', Boolean(rec.of('warning').find((w) => w.data.code === 'PROVIDER_RETRY')), rec.of('warning').map((w) => w.data.code))
    check('no error event once recovered', rec.of('error').length === 0, rec.names())
  }

  console.log('\nA retryable error is not retried twice:')
  {
    const provider = stubProvider([[{ type: 'error', error: new Error('still down'), retryable: true }]])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })
    check('it gives up and reports', out.finishReason === 'ERROR', out.finishReason)
    check('exactly one retry warning', rec.of('warning').filter((w) => w.data.code === 'PROVIDER_RETRY').length === 1)
    check('the error reaches the client', rec.of('error').length === 1, rec.names())
  }

  console.log('\nA retryable error after tokens have shipped is not retried:')
  {
    // Retrying here would duplicate text already on the user's screen.
    const provider = stubProvider([[textEvent('Partial answer'), { type: 'error', error: new Error('dropped'), retryable: true }]])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })
    check('no retry was attempted', rec.of('warning').filter((w) => w.data.code === 'PROVIDER_RETRY').length === 0, rec.of('warning').map((w) => w.data.code))
    check('the partial text is preserved', out.text === 'Partial answer', out.text)
    check('the failure is surfaced', rec.of('error').length === 1)
  }

  // —— 5. Terminal error ————————————————————————————
  console.log('\nA terminal error ends the turn immediately:')
  {
    const quota = Object.assign(new Error('daily quota exhausted'), { status: 429 })
    const provider = stubProvider([[{ type: 'error', error: quota, retryable: false }]])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })

    check('finishReason is ERROR', out.finishReason === 'ERROR', out.finishReason)
    check('no retry on a terminal failure', rec.of('warning').filter((w) => w.data.code === 'PROVIDER_RETRY').length === 0)
    check('the error names itself terminal', rec.first('error').data.retryable === false, rec.first('error').data)
    check('the message reaches the client', /quota/.test(rec.first('error').data.message), rec.first('error').data.message)
  }

  // —— 6. Abort mid-stream ——————————————————————————
  console.log('\nAn abort mid-stream stops cleanly:')
  {
    const ctrl = new AbortController()
    const provider = stubProvider([[textEvent('start'), async () => ctrl.abort(), textEvent('never')]])
    const rec = recorder()
    const out = await runTurn({
      turnContext: CTX, userMessage: 'x', emit: rec.emit,
      signal: ctrl.signal, registry: registry(), provider,
    })

    check('finishReason is ABORTED', out.finishReason === 'ABORTED', out.finishReason)
    check('a disconnected client gets no error event', rec.of('error').length === 0, rec.names())
    check('and no warning either — nobody is listening', rec.of('warning').filter((w) => w.data.code === 'TURN_TIMEOUT').length === 0)
  }

  // —— Wall clock ————————————————————————————————————
  console.log('\nThe wall-clock timeout is reported, not silent:')
  {
    const previous = process.env.AGENT_TURN_TIMEOUT_MS
    process.env.AGENT_TURN_TIMEOUT_MS = '40'

    const provider = stubProvider([[textEvent('slow'), async () => new Promise((r) => setTimeout(r, 120)), textEvent('too late')]])
    const rec = recorder()
    const out = await runTurn({ turnContext: CTX, userMessage: 'x', emit: rec.emit, registry: registry(), provider })

    check('finishReason is TIMEOUT', out.finishReason === 'TIMEOUT', out.finishReason)
    check('the client is told the answer is partial', Boolean(rec.of('warning').find((w) => w.data.code === 'TURN_TIMEOUT')), rec.of('warning').map((w) => w.data.code))

    process.env.AGENT_TURN_TIMEOUT_MS = previous
  }

  // —— Contract guards ————————————————————————————————
  console.log('\nThe contract fails loudly when misused:')
  {
    let threwNoCtx = false
    try { await runTurn({ registry: registry(), provider: stubProvider([[]]) }) } catch (e) { threwNoCtx = /turnContext/.test(e.message) }
    check('a missing turnContext is refused', threwNoCtx)

    let threwNoRegistry = false
    try { await runTurn({ turnContext: CTX, provider: stubProvider([[]]) }) } catch (e) { threwNoRegistry = /registry/.test(e.message) }
    check('a missing registry is refused', threwNoRegistry)
  }

  console.log('\n----------------------------------------')
  console.log('passed: ' + passed + '   failed: ' + failed)
  console.log(failed === 0 ? 'AGENT LOOP TESTS PASSED ☑' : 'AGENT LOOP TESTS FAILED ✗')
  console.log('----------------------------------------\n')
  process.exit(failed === 0 ? 0 : 1)
}

main()
