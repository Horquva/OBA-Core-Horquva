// backend/agent/loop.js
//
// Task 11.5 — The agent turn.
//
// The loop knows three things: the §8.4 provider interface, the registry's
// { declarations, execute } contract (11.1), and the constitution builder
// (11.4). It knows nothing about Gemini, nothing about any individual tool,
// and it performs no arithmetic of its own (I-3).
//
// Contract:
//   runTurn({ turnContext, history, userMessage, emit, signal })
//     -> { text, toolTrace, usage, iterations, finishReason }
//
// `registry` and `provider` are injected rather than imported so the six
// scripted scenarios in agentLoop.unit.test.js run without a network. In
// production the route (11.6) builds the registry during turn-context
// construction, per the lifecycle in §8.2.
//
// Every abnormal ending is REPORTED, never silent (§14): the iteration cap,
// the wall-clock timeout and a terminal provider error each emit an event
// before returning. A failure must never be presentable as an answer.

const { getProvider } = require('./providers')
const { buildFullConstitution } = require('./constitution')

const DEFAULT_MAX_ITERATIONS = 8
const DEFAULT_TURN_TIMEOUT_MS = 120_000
const RETRY_BACKOFF_MS = 500

function maxIterations() {
  return Number(process.env.AGENT_MAX_ITERATIONS) || DEFAULT_MAX_ITERATIONS
}

function turnTimeoutMs() {
  return Number(process.env.AGENT_TURN_TIMEOUT_MS) || DEFAULT_TURN_TIMEOUT_MS
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Human-readable label for the tool_start event (Appendix B). The user sees
 * this while the tool runs, so it names the subject, not the function.
 */
function labelFor(name, args) {
  const pretty = name.replace(/_/g, ' ')
  const subject =
    args && (args.query || args.id || args.type || args.area || args.metric || args.scenario || args.analysis)
  return subject ? `${pretty}: ${subject}` : pretty
}

/**
 * One line for the tool_done event. Deliberately never dumps the payload —
 * the trace is for "how I got this answer", not for re-serving the data.
 * Insufficient evidence is surfaced here rather than hidden (I-6).
 */
function summarize(result) {
  if (!result) return 'no result'
  if (result.toolError) return `error: ${result.toolError.code}`
  if (result.evidence && result.evidence.status === 'insufficient_evidence') {
    return `insufficient evidence (coverage ${result.evidence.coverage})`
  }
  const data = result.data
  if (data === null || data === undefined) return 'no data'
  if (Array.isArray(data)) return `${data.length} item(s)`
  if (typeof data === 'object') {
    const keys = Object.keys(data)
    return keys.length ? keys.slice(0, 4).join(', ') : 'empty object'
  }
  return String(data).slice(0, 60)
}

/**
 * The volatile per-turn block (§11.4, §3.3 consequence 2). Gemini re-sends
 * systemInstruction every request, so there is no cached prefix to protect
 * and this can go straight in. It also keeps operator instructions out of
 * the user turn, which preserves the injection-safety property.
 *
 * NOTE: §11.4 assigns this to constitution.js, but buildFullConstitution()
 * takes only `roots`. Raised with 11.1/11.4's owner — move it there if he
 * prefers, it is a lift with no behaviour change.
 */
function volatileBlock(ctx) {
  const lines = ['', '## This turn', `- Data snapshot taken at: ${ctx.snapshotAt}`]
  if (ctx.graphSource && ctx.graphSource.loadedAt) {
    lines.push(`- Knowledge graph loaded at: ${ctx.graphSource.loadedAt} (a different snapshot from the data above)`)
  }
  if (ctx.graphStale) {
    lines.push('- WARNING: the knowledge graph snapshot is stale. Say so plainly when you use graph-derived analysis.')
  }
  if (ctx.pageContext) {
    lines.push(`- The user is currently looking at: ${ctx.pageContext}`)
  }
  return lines.join('\n')
}

/**
 * @param {object}   turnContext  frozen bundle (10.6) — one roots read per turn (I-1)
 * @param {Array}    history      prior messages, provider-shaped
 * @param {string}   userMessage
 * @param {Function} emit         (event, data) => void — the SSE emitter
 * @param {AbortSignal} signal    aborted when the client disconnects
 * @param {object}   registry     { declarations, execute } from buildRegistry()
 * @param {object}   provider     §8.4 adapter; defaults to AGENT_PROVIDER
 */
async function runTurn({ turnContext, history = [], userMessage, emit, signal, registry, provider }) {
  if (!turnContext) throw new Error('runTurn requires a turnContext')
  if (!registry) throw new Error('runTurn requires a registry')

  const prov = provider || getProvider()
  const send = emit || (() => {})

  // The turn's own deadline, combined with the client's disconnect signal.
  const deadline = new AbortController()
  const timer = setTimeout(() => deadline.abort(), turnTimeoutMs())
  const signals = signal ? [deadline.signal, signal] : [deadline.signal]
  const combined = typeof AbortSignal.any === 'function' ? AbortSignal.any(signals) : deadline.signal

  const built = buildFullConstitution(turnContext.roots)
  const systemInstruction = built.systemInstruction + volatileBlock(turnContext)
  if (!built.withinBudget) {
    // Not fatal, but the roster drifting out of budget is a real regression
    // and it should be visible rather than discovered later in a quota bill.
    send('warning', { code: 'ROSTER_TOKEN_BUDGET', message: built.warning })
  }

  const convo = history.slice()
  if (userMessage) convo.push({ role: 'user', parts: [{ text: userMessage }] })

  const toolTrace = []
  const usage = { inputTokens: 0, outputTokens: 0 }
  let iterations = 0
  let text = ''
  let finishReason = null
  let retried = false
  let completed = false

  try {
    while (iterations < maxIterations()) {
      iterations++

      const pending = []
      let roundText = ''
      let providerError = null

      for await (const ev of prov.stream({
        systemInstruction,
        history: convo,
        tools: registry.declarations,
        signal: combined,
      })) {
        if (ev.type === 'text') {
          roundText += ev.text
          send('token', { text: ev.text })
        } else if (ev.type === 'tool_call') {
          pending.push(ev)
        } else if (ev.type === 'done') {
          if (ev.usage) {
            usage.inputTokens += ev.usage.inputTokens || 0
            usage.outputTokens += ev.usage.outputTokens || 0
          }
          if (ev.finishReason) finishReason = ev.finishReason
        } else if (ev.type === 'error') {
          providerError = ev
          break
        }
      }

      // Aborted: either the client left, or we hit the wall clock.
      if (combined.aborted) {
        text += roundText
        if (signal && signal.aborted) {
          // Client disconnected. Nobody is listening; stop quietly (§14).
          return { text, toolTrace, usage, iterations, finishReason: 'ABORTED' }
        }
        send('warning', {
          code: 'TURN_TIMEOUT',
          message: 'The turn exceeded its time limit. This answer is partial.',
        })
        return { text, toolTrace, usage, iterations, finishReason: 'TIMEOUT' }
      }

      if (providerError) {
        // Retry only a clean failure. Retrying after tokens have already
        // reached the browser would duplicate text on the user's screen.
        const cleanFailure = roundText === '' && pending.length === 0
        if (providerError.retryable && !retried && cleanFailure) {
          retried = true
          send('warning', { code: 'PROVIDER_RETRY', message: 'The model was briefly unavailable. Retrying.' })
          await sleep(RETRY_BACKOFF_MS)
          iterations-- // a failed attempt is not a tool round
          continue
        }
        text += roundText
        send('error', {
          code: providerError.retryable ? 'PROVIDER_UNAVAILABLE' : 'PROVIDER_ERROR',
          message: providerError.error ? providerError.error.message : 'The model is unavailable',
          retryable: Boolean(providerError.retryable),
        })
        return { text, toolTrace, usage, iterations, finishReason: 'ERROR' }
      }

      text += roundText

      if (pending.length === 0) {
        completed = true
        if (!finishReason) finishReason = 'STOP'
        break
      }

      // Hand the events back untouched. The adapter reuses each event's own
      // vendor part, which is what preserves Gemini 3's thought signature —
      // rebuilding from { name, args } here is a 400 on the next request.
      prov.appendModelTurn(convo, pending)

      for (const call of pending) {
        send('tool_start', { id: call.id, name: call.name, label: labelFor(call.name, call.args) })

        const startedAt = Date.now()
        // execute() always resolves to an envelope, including for unknown
        // tools, bad arguments and thrown tools. A toolError is a result the
        // model can correct itself from, not a loop failure.
        const result = await registry.execute(call.name, call.args)
        const durationMs = Date.now() - startedAt
        const summary = summarize(result)

        send('tool_done', { id: call.id, name: call.name, summary, durationMs })
        toolTrace.push({
          id: call.id,
          name: call.name,
          args: call.args,
          summary,
          durationMs,
          // The full envelope, kept for 11.8: the numeric validator walks these
          // to confirm every number in the answer traces back to real tool data,
          // and the summary is far too lossy for that. Callers that serialise
          // the trace (11.6's payload, 11.9's agent_tool_calls rows) should
          // decide for themselves whether to persist or ship this field —
          // the registry caps each result at 20 KB, so a multi-tool turn can
          // carry a few hundred KB here.
          result,
          ...(result && result.toolError ? { toolError: result.toolError.code } : {}),
        })

        prov.appendToolResult(convo, { id: call.id, name: call.name, result })
      }
    }

    if (!completed) {
      // The cap is a reported outcome, not a silent stop.
      send('warning', {
        code: 'ITERATION_CAP_REACHED',
        message: `Reached the step limit of ${maxIterations()}. This answer is based on what was gathered so far.`,
      })
      finishReason = 'ITERATION_CAP'
    }

    return { text, toolTrace, usage, iterations, finishReason }
  } finally {
    clearTimeout(timer)
  }
}

module.exports = { runTurn, labelFor, summarize, volatileBlock }
