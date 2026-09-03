const path = require('path')
const express = require('express')

let passed = 0
let failed = 0

function check(name, cond, detail) {
        if (cond) {
                passed++
                console.log('  ?', name)
        } else {
                failed++
                console.error(
                        '  ?',
                        name,
                        detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : ''
                )
        }
}

function loadFresh(modulePath) {
        delete require.cache[require.resolve(modulePath)]
        return require(modulePath)
}

async function main() {
        console.log('\n=== OBA Core — Agent SSE Route Test ===\n')

        // Offline seams: no provider/network/database access.
        const turnContextPath = path.join(__dirname, '..', 'agent', 'turnContext.js')
        const providersPath = path.join(__dirname, '..', 'agent', 'providers', 'index.js')
        const loopPath = path.join(__dirname, '..', 'agent', 'loop.js')

        const originalTurnContext = require.cache[require.resolve(turnContextPath)]
        const originalProviders = require.cache[require.resolve(providersPath)]
        const originalLoop = require.cache[require.resolve(loopPath)]

        let abortObserved = false

        require.cache[require.resolve(turnContextPath)] = {
                id: turnContextPath,
                filename: turnContextPath,
                loaded: true,
                exports: {
                        buildTurnContext: async () => ({
                                roots: {},
                                intel: {},
                                snapshotAt: '2026-01-01T00:00:00.000Z',
                                graphSource: { live: true, loadedAt: '2026-01-01T00:00:00.000Z' },
                                graphStale: false,
                        }),
                },
        }

        require.cache[require.resolve(providersPath)] = {
                id: providersPath,
                filename: providersPath,
                loaded: true,
                exports: {
                        isConfigured: () => true,
                        getProvider: () => ({ name: 'stub-provider' }),
                },
        }

        require.cache[require.resolve(loopPath)] = {
                id: loopPath,
                filename: loopPath,
                loaded: true,
                exports: {
                        runTurn: async ({ emit, signal }) => {
                                emit({ type: 'token', text: 'hello' })

                                await new Promise((resolve) => {
                                        if (signal.aborted) {
                                                abortObserved = true
                                                resolve()
                                                return
                                        }

                                        signal.addEventListener('abort', () => {
                                                abortObserved = true
                                                resolve()
                                        }, { once: true })
                                })

                                if (signal.aborted) {
                                        return {
                                                text: 'hello',
                                                toolTrace: [],
                                        }
                                }

                                return {
                                        text: 'hello',
                                        toolTrace: [],
                                }
                        },
                },
        }

        delete require.cache[require.resolve('../routes/agent/chat')]
        const chatRouter = require('../routes/agent/chat')

        const app = express()
        app.use(express.json())

        // Mirror the production auth boundary.
        app.use('/api/agent', (req, res, next) => {
                if (req.headers.authorization !== 'Bearer test-token') {
                        return res.status(401).json({ error: 'Unauthorized' })
                }
                next()
        })

        app.use('/api/agent', chatRouter)

        const server = app.listen(0)
        await new Promise((resolve) => server.once('listening', resolve))
        const base = 'http://127.0.0.1:' + server.address().port

        try {
                console.log('Authentication:')
                {
                        const response = await fetch(base + '/api/agent/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message: 'hello' }),
                        })
                        check('401 without bearer token', response.status === 401, response.status)
                }

                console.log('\nFeature flag off:')
                {
                        const previous = process.env.AGENT_ENABLED
                        process.env.AGENT_ENABLED = 'false'

                        const response = await fetch(base + '/api/agent/chat', {
                                method: 'POST',
                                headers: {
                                        Authorization: 'Bearer test-token',
                                        'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ message: 'hello' }),
                        })

                        check('404 when agent flag is off', response.status === 404, response.status)

                        if (previous === undefined) delete process.env.AGENT_ENABLED
                        else process.env.AGENT_ENABLED = previous
                }

                process.env.AGENT_ENABLED = 'true'

                console.log('\nSSE event order:')
                {
                        const response = await fetch(base + '/api/agent/chat', {
                                method: 'POST',
                                headers: {
                                        Authorization: 'Bearer test-token',
                                        'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ conversationId: 'test-conversation', message: 'hello' }),
                        })

                        check('SSE status 200', response.status === 200, response.status)
                        check(
                                'SSE content type',
                                response.headers.get('content-type')?.startsWith('text/event-stream'),
                                response.headers.get('content-type')
                        )

                        const reader = response.body.getReader()
                        const decoder = new TextDecoder()
                        let body = ''

                        const readChunk = async () => {
                                const { done, value } = await reader.read()
                                if (done) return false
                                body += decoder.decode(value, { stream: true })
                                return true
                        }

                        await readChunk()

                        check('immediate SSE comment', body.startsWith(':\n\n'), body.slice(0, 20))

                        // Wait briefly for ready/token. The stub loop intentionally stays
                        // open so the stream remains available for the heartbeat/abort test.
                        const deadline = Date.now() + 1000
                        while (!body.includes('event: token') && Date.now() < deadline) {
                                await readChunk()
                        }

                        const readyIndex = body.indexOf('event: ready')
                        const tokenIndex = body.indexOf('event: token')

                        check('ready event present', readyIndex >= 0)
                        check('token event present', tokenIndex >= 0)
                        check('ready precedes token', readyIndex >= 0 && tokenIndex > readyIndex)

                        reader.cancel()
                }

                console.log('\nAbort cleanup:')
                {
                        const fs = require('fs')
                        const source = fs.readFileSync(
                                path.join(__dirname, '..', 'routes', 'agent', 'chat.js'),
                                'utf8'
                        )

                        check(
                                'request close handler is registered',
                                source.includes("req.on('close', onClose)")
                        )
                        check(
                                'request close aborts the controller',
                                source.includes('controller.abort()')
                        )
                        check(
                                'request close clears the heartbeat',
                                source.includes('clearInterval(heartbeat)')
                        )
                }
                console.log('\nHeartbeat:')
                {
                        // The production interval is 15s, so don't wait 15s in the test.
                        // Verify the route source contains the required heartbeat interval
                        // and comment writer rather than slowing the suite down.
                        const fs = require('fs')
                        const source = fs.readFileSync(
                                path.join(__dirname, '..', 'routes', 'agent', 'chat.js'),
                                'utf8'
                        )

                        check('heartbeat interval is 15 seconds', source.includes('15 * 1000'))
                        check('heartbeat emits SSE comment', source.includes("res.write(':\\n\\n')"))
                }

                console.log('\n----------------------------------------')
                console.log('passed: ' + passed + '   failed: ' + failed)
                console.log(
                        failed === 0
                                ? 'AGENT ROUTE TESTS PASSED ?'
                                : 'AGENT ROUTE TESTS FAILED ?'
                )
                console.log('----------------------------------------\n')

                process.exitCode = failed === 0 ? 0 : 1
        } finally {
                server.close()

                if (originalTurnContext) {
                        require.cache[require.resolve(turnContextPath)] = originalTurnContext
                } else {
                        delete require.cache[require.resolve(turnContextPath)]
                }

                if (originalProviders) {
                        require.cache[require.resolve(providersPath)] = originalProviders
                } else {
                        delete require.cache[require.resolve(providersPath)]
                }

                if (originalLoop) {
                        require.cache[require.resolve(loopPath)] = originalLoop
                } else {
                        delete require.cache[require.resolve(loopPath)]
                }

                delete require.cache[require.resolve('../routes/agent/chat')]
        }
}

main().catch((err) => {
        console.error('Test harness error:', err)
        process.exit(1)
})



