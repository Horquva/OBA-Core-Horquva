const express = require('express')

const { buildTurnContext } = require('../../agent/turnContext')
const { buildRegistry } = require('../../agent/registry')
const { getProvider, isConfigured } = require('../../agent/providers')
const { runTurn } = require('../../agent/loop')

const router = express.Router()

const HEARTBEAT_MS = 15 * 1000

function writeEvent(res, event, data) {
  if (res.writableEnded) return

  if (event) res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function writeComment(res) {
  if (!res.writableEnded) res.write(':\n\n')
}

function normalizeMessage(body) {
  if (typeof body?.message === 'string') return body.message.trim()
  if (typeof body?.userMessage === 'string') return body.userMessage.trim()
  return ''
}

router.post('/chat', async (req, res) => {
  // The router is normally mounted only when the agent is enabled/configured.
  // Keep this guard here as defense in depth.
  if (process.env.AGENT_ENABLED !== 'true' || !isConfigured()) {
    return res.status(404).json({ error: 'Agent route not available' })
  }

  const userMessage = normalizeMessage(req.body)

  if (!userMessage) {
    return res.status(400).json({
      error: 'message is required',
    })
  }

  // Open the SSE stream immediately so proxies/clients know the connection
  // is alive before turn-context construction begins.
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  writeComment(res)

  const controller = new AbortController()
  let closed = false

  const heartbeat = setInterval(() => {
    if (!closed && !res.writableEnded) writeComment(res)
  }, HEARTBEAT_MS)

  const onClose = () => {
    if (req.complete) return
    closed = true
    controller.abort()
    clearInterval(heartbeat)
  }

  req.on('close', onClose)

  try {
    const turnContext = await buildTurnContext()

    if (closed || controller.signal.aborted) return

    const registry = buildRegistry([], turnContext)
    const provider = getProvider()

    writeEvent(res, 'ready', {
      conversationId: req.body?.conversationId || null,
      snapshotAt: turnContext.snapshotAt,
    })

    const history = Array.isArray(req.body?.history)
      ? req.body.history
      : []

    const result = await runTurn({
      turnContext,
      history,
      userMessage,
      emit: (event) => {
        if (!closed && !res.writableEnded && event?.type) {
          const { type, ...data } = event
          writeEvent(res, type, data)
        }
      },
      signal: controller.signal,
      registry,
      provider,
    })

    if (closed || res.writableEnded) return

    writeEvent(res, 'done', {
      text: result?.text || '',
      toolTrace: result?.toolTrace || [],
      navigationOffer: result?.navigationOffer || null,
      provenance: result?.provenance || {
        snapshotAt: turnContext.snapshotAt,
        graphSource: turnContext.graphSource,
        graphStale: turnContext.graphStale,
      },
      usage: result?.usage || null,
      validatorStatus: result?.validatorStatus || null,
      finishReason: result?.finishReason || null,
    })
  } catch (err) {
    if (closed || controller.signal.aborted || res.writableEnded) return

    const message =
      err?.message === 'Cannot read organizational data right now'
        ? err.message
        : 'Unable to complete the agent turn'

    writeEvent(res, 'error', {
      code: err?.code || 'AGENT_TURN_FAILED',
      message,
      retryable: Boolean(err?.retryable),
    })
  } finally {
    clearInterval(heartbeat)
    req.off('close', onClose)

    if (!res.writableEnded) res.end()
  }
})

module.exports = router
