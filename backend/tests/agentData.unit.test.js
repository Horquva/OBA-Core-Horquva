/**
 * agentData.unit.test.js - Task 10.6
 * Unit tests for the immutable per-turn agent context.
 */

'use strict'

let passed = 0
let failed = 0

function check(name, condition) {
  if (condition) {
    passed++
    console.log('  ✓', name)
  } else {
    failed++
    console.error('  ✗', name)
  }
}

const domainPath = require.resolve('../domain')

const FAKE_ROOTS = {
  people: [
    { name: 'Alice', risk_score: 92 },
    { name: 'Bob', risk_score: 55 },
  ],
}

const FAKE_INTELLIGENCE = {
  brainCore: { brainIndex: 70, posture: 'STRAINED' },
  governance: { score: 61 },
}

let loadRootsCalls = 0
let fakeGraphLoadedAt = new Date().toISOString()

require.cache[domainPath] = {
  id: domainPath,
  filename: domainPath,
  loaded: true,
  exports: {
    intelligence: {
      compute: {
        loadRoots: async () => {
          loadRootsCalls++
          return JSON.parse(JSON.stringify(FAKE_ROOTS))
        },
        allFromRoots: () => JSON.parse(JSON.stringify(FAKE_INTELLIGENCE)),
      },
    },
    graph: {
      source: () => ({
        type: 'graph',
        version: 'v3',
        loadedAt: fakeGraphLoadedAt,
      }),
    },
  },
}

const turnContext = require('../agent/turnContext')

console.log('\n=== OBA Core - agentData unit tests (T10.6) ===\n')

async function runTests() {
  console.log('Suite 1: buildTurnContext\n')

  loadRootsCalls = 0
  fakeGraphLoadedAt = new Date().toISOString()

  const ctx = await turnContext.buildTurnContext()

  check('buildTurnContext returns an object', typeof ctx === 'object' && ctx !== null)
  check('snapshotAt is an ISO string', typeof ctx.snapshotAt === 'string' && ctx.snapshotAt.includes('T'))
  check('roots is present', !!ctx.roots)
  check('intel is present', !!ctx.intel)
  check('graphSource is present', !!ctx.graphSource)
  check('graphSource matches stub', ctx.graphSource.type === 'graph' && ctx.graphSource.version === 'v3')
  check('graphStale is boolean', typeof ctx.graphStale === 'boolean')
  check('fresh graph is not stale', ctx.graphStale === false)
  check('roots.people is populated', Array.isArray(ctx.roots.people) && ctx.roots.people.length === 2)
  check('intel.brainCore is present', !!ctx.intel.brainCore)
  check('context object is frozen', Object.isFrozen(ctx))

  check('reassigning ctx.roots is blocked', (() => {
    try {
      ctx.roots = {}
    } catch (_) {}
    return ctx.roots.people.length === 2
  })())

  check('loadRoots called exactly once for this turn', loadRootsCalls === 1)

  console.log('\nSuite 2: graphStale\n')

  const now = new Date('2026-01-01T12:00:00.000Z')

  check(
    '1h lag is not stale',
    turnContext.graphStale(
      { loadedAt: '2026-01-01T11:00:00.000Z' },
      now.toISOString()
    ) === false
  )

  check(
    '7h lag is stale',
    turnContext.graphStale(
      { loadedAt: '2026-01-01T05:00:00.000Z' },
      now.toISOString()
    ) === true
  )

  check(
    'exactly 6h lag is not stale',
    turnContext.graphStale(
      { loadedAt: '2026-01-01T06:00:00.000Z' },
      now.toISOString()
    ) === false
  )

  check(
    'missing loadedAt returns false',
    turnContext.graphStale({}, now.toISOString()) === false
  )

  check(
    'null source returns false',
    turnContext.graphStale(null, now.toISOString()) === false
  )

  const originalThreshold = process.env.AGENT_GRAPH_STALE_HOURS
  process.env.AGENT_GRAPH_STALE_HOURS = '1'

  check(
    'env override makes 2h lag stale at 1h threshold',
    turnContext.graphStale(
      { loadedAt: '2026-01-01T10:00:00.000Z' },
      now.toISOString()
    ) === true
  )

  if (originalThreshold === undefined) {
    delete process.env.AGENT_GRAPH_STALE_HOURS
  } else {
    process.env.AGENT_GRAPH_STALE_HOURS = originalThreshold
  }

  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)

  process.exit(failed === 0 ? 0 : 1)
}

runTests().catch((error) => {
  console.error('\nFATAL:', error)
  process.exit(1)
})
