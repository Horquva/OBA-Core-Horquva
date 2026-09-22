/**
 * agentData.unit.test.js — Tasks 10.6 & 12.7
 * Unit tests for:
 *   • backend/agent/turnContext.js   (Task 10.6 — frozen turn snapshot)
 *   • backend/agent/pageContext.js   (Task 12.7 — get_page_context tool)
 *
 * Stubs the real '../domain' module (intelligence.compute.* + graph.source),
 * matching the actual merged T10.2/graph contract — not a guessed path.
 *
 * NOTE on Suite 2: FAKE_INTELLIGENCE/FAKE_ROOTS below are shaped to match the
 * REAL output of domain/derived.js's computeAllFromRoots()/loadRoots() (read
 * back from derived.js itself). They used to be hand-shaped to match
 * pageContext.js's own (buggy) extract() functions instead — which meant this
 * suite verified the tool's internal wiring against itself, not against
 * production, and never could have caught pageContext.js reading an intel
 * shape that doesn't exist outside this test (flagged in commit 04964f3, fixed
 * for real this pass). Live-checked against Supabase: every SUPPORTED_SLUGS
 * page now returns real, non-null metrics.
 *
 * Run from the backend/ folder:
 *   node tests/agentData.unit.test.js
 */

'use strict'

let passed = 0
let failed = 0

function check(name, cond) {
  if (cond) { passed++; console.log('  ✓', name) }
  else       { failed++; console.error('  ✗', name) }
}

// ─── domain stub (real T10.2 + graph contract) ─────────────────────────────

const domainPath = require.resolve('../domain')

const FAKE_ROOTS = {
  agents:            [{ id: 1, name: 'Agent-X', risk: 'critical' }, { id: 2, name: 'Agent-Y', risk: 'low' }],
  workflows:         [{ id: 'wf-1', name: 'Deploy', risk: 'high' }, { id: 'wf-2', name: 'Onboarding', risk: 'low' }],
  knowledge_assets:  [
    { asset_type: 'workflow', asset_id: 'wf-1', is_documented: false },
    { asset_type: 'workflow', asset_id: 'wf-2', is_documented: true },
  ],
  policy_violations: [{ severity: 'high' }, { severity: 'low' }],
}

const FAKE_INTELLIGENCE = {
  pillars: {
    pillars: [
      { resultKey: 'GI', score: 61, components: {} },
      { resultKey: 'MI', score: 72, components: { backupCoverage: 70, ownershipCoverage: 90 } },
      { resultKey: 'DI', score: 70, components: {} },
    ],
    orgScore: { score: 74, rating: 'PARTIAL' },
  },
  predictiveRisk: {
    scores: [{ agentId: 1, agentName: 'Agent-X', predictedScore: 92, threatLevel: 'CRITICAL' }],
    emergingThreats: [{ agentId: 1 }],
  },
  humanDependencyRisk: [
    { employeeId: 1, name: 'Alice', ownedAgentCount: 3, ownedWorkflowCount: 2, totalRiskScore: 88, tier: 'CRITICAL' },
  ],
  orgHealth:       { healthIndex: 63, healthStatus: 'WARNING', continuityScore: 55, documentationScore: 60 },
  accountability:  { accountabilityScore: 66 },
  decisionQuality: { score: 77 },
  collaboration:   { summary: { collaborationScore: 58, aiAdoptionScore: 50 } },
  executiveMemory: { items: [{ title: 'Deploy has failed 3 times' }] },
}

let loadRootsCalls = 0
let fakeGraphLoadedAt = new Date().toISOString()   // mutated per-test to control staleness

require.cache[domainPath] = {
  id: domainPath, filename: domainPath, loaded: true,
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
      source: () => ({ type: 'graph', version: 'v3', loadedAt: fakeGraphLoadedAt }),
    },
  },
}

// ─── Load modules under test ────────────────────────────────────────────────

const turnContext = require('../agent/turnContext')
const pageContext = require('../agent/pageContext')

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log('\n=== OBA Core — agentData unit tests (T10.6 + T12.7) ===\n')

async function runTests() {

  // ══ Suite 1: T10.6 — buildTurnContext ════════════════════════════════════
  console.log('Suite 1: T10.6 — buildTurnContext (frozen turn snapshot)\n')
  {
    loadRootsCalls = 0
    fakeGraphLoadedAt = new Date().toISOString()   // fresh — matches snapshotAt closely

    const ctx = await turnContext.buildTurnContext()

    check('buildTurnContext returns an object',   typeof ctx === 'object' && ctx !== null)
    check('snapshotAt is an ISO string',          typeof ctx.snapshotAt === 'string' && ctx.snapshotAt.includes('T'))
    check('roots is present',                     !!ctx.roots)
    check('intel is present',                     !!ctx.intel)
    check('graphSource is present',               !!ctx.graphSource)
    check('graphSource matches stub',             ctx.graphSource.type === 'graph' && ctx.graphSource.version === 'v3')
    check('graphStale is boolean',                typeof ctx.graphStale === 'boolean')
    check('fresh graph is not stale',             ctx.graphStale === false)

    check('roots.agents is populated',            Array.isArray(ctx.roots.agents) && ctx.roots.agents.length === 2)
    check('intel.pillars is present',             !!ctx.intel.pillars)

    // Top-level context is frozen (real implementation uses shallow freeze)
    check('context object is frozen',             Object.isFrozen(ctx))
    check('reassigning ctx.roots is blocked', (() => {
      try { ctx.roots = {}; } catch (_) { /* strict mode throws */ }
      return ctx.roots.agents.length === 2   // unchanged
    })())

    // One organizational read per turn — the T10.2 invariant
    check('loadRoots called exactly once for this turn', loadRootsCalls === 1)
  }

  // ── graphStale — pure function, direct tests ────────────────────────────
  console.log('\n  — graphStale (graph-vs-roots snapshot lag)\n')
  {
    const now = new Date('2026-01-01T12:00:00.000Z')

    // Graph loaded 1 hour before snapshot — well within 6h default
    check('not stale — 1h lag, default threshold',
      turnContext.graphStale({ loadedAt: '2026-01-01T11:00:00.000Z' }, now.toISOString()) === false
    )

    // Graph loaded 7 hours before snapshot — past 6h default
    check('stale — 7h lag, default threshold',
      turnContext.graphStale({ loadedAt: '2026-01-01T05:00:00.000Z' }, now.toISOString()) === true
    )

    // Exactly at threshold boundary (6h) — spec says "trails by MORE than", so not stale at exactly 6h
    check('not stale — exactly at 6h boundary',
      turnContext.graphStale({ loadedAt: '2026-01-01T06:00:00.000Z' }, now.toISOString()) === false
    )

    // Missing loadedAt — treated as not stale rather than throwing
    check('missing source.loadedAt does not throw, returns false',
      turnContext.graphStale({}, now.toISOString()) === false
    )
    check('null source does not throw, returns false',
      turnContext.graphStale(null, now.toISOString()) === false
    )

    // Env var override
    {
      const original = process.env.AGENT_GRAPH_STALE_HOURS
      process.env.AGENT_GRAPH_STALE_HOURS = '1'
      check('env override — 2h lag is stale when threshold set to 1h',
        turnContext.graphStale({ loadedAt: '2026-01-01T10:00:00.000Z' }, now.toISOString()) === true
      )
      if (original === undefined) delete process.env.AGENT_GRAPH_STALE_HOURS
      else process.env.AGENT_GRAPH_STALE_HOURS = original
    }
  }

  // ══ Suite 2: T12.7 — getPageContext ═══════════════════════════════════════
  console.log('\nSuite 2: T12.7 — getPageContext (page metric wiring)\n')
  {
    const mockCtx = {
      roots:       FAKE_ROOTS,
      intel:       FAKE_INTELLIGENCE,
      graphStale:  false,
      snapshotAt:  new Date().toISOString(),
    }

    const risksResult = pageContext.getPageContext('risks', mockCtx)
    check('risks slug returns a result',              !!risksResult)
    check('result has slug field',                    risksResult.slug === 'risks')
    check('result has title field',                   typeof risksResult.title === 'string' && risksResult.title.length > 0)
    check('result has metrics object',                typeof risksResult.metrics === 'object')
    check('result has summary string',                typeof risksResult.summary === 'string')
    check('topPredictedThreats is present',            risksResult.metrics.topPredictedThreats[0].predictedScore === 92)
    check('topPeopleAtRisk is an array',                Array.isArray(risksResult.metrics.topPeopleAtRisk))
    check('topPeopleAtRisk sourced from humanDependencyRisk', risksResult.metrics.topPeopleAtRisk[0].name === 'Alice')
    check('isStale propagated from ctx.graphStale',    risksResult.isStale === false)

    const contResult = pageContext.getPageContext('continuity', mockCtx)
    check('continuity page works',                   contResult.slug === 'continuity')
    check('continuityScore is present',              contResult.metrics.continuityScore === 55)
    check('backupCoverage is present',               contResult.metrics.backupCoverage === 70)

    const dashResult = pageContext.getPageContext('dashboard', mockCtx)
    check('dashboard page works',                    dashResult.slug === 'dashboard')
    check('organizationalScore present',             dashResult.metrics.organizationalScore === 74)
    check('memoryIntelligence present',              dashResult.metrics.memoryIntelligence === 72)

    const wfResult = pageContext.getPageContext('workflows', mockCtx)
    check('workflows page works',                    wfResult.slug === 'workflows')
    check('totalWorkflows counted correctly',        wfResult.metrics.totalWorkflows === 2)
    check('criticalWorkflows counted correctly',     wfResult.metrics.criticalWorkflows === 1)
    check('undocumented counted correctly',          wfResult.metrics.undocumented === 1)

    const upperResult = pageContext.getPageContext('RISKS', mockCtx)
    check('slug matching is case-insensitive',       upperResult.slug === 'risks')

    const unknownResult = pageContext.getPageContext('unknown-page', mockCtx)
    check('unknown slug returns error field',        !!unknownResult.error)
    check('unknown slug returns supportedSlugs',     Array.isArray(unknownResult.supportedSlugs))
    check('supportedSlugs includes "risks"',         unknownResult.supportedSlugs.includes('risks'))

    const nullResult = pageContext.getPageContext(null, mockCtx)
    check('null slug returns error field',           !!nullResult.error)

    check('SUPPORTED_SLUGS is exported as array',   Array.isArray(pageContext.SUPPORTED_SLUGS))
    check('PAGE_CATALOG is exported for T12.2',     typeof pageContext.PAGE_CATALOG === 'object')
  }

  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed === 0 ? 0 : 1)
}

runTests().catch(err => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
