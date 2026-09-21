'use strict'

let passed = 0
let failed = 0

function check(name, condition, detail) {
  if (condition) {
    passed++
    console.log('  ✓', name)
  } else {
    failed++
    console.error('  ✗', name, detail !== undefined ? `\n      got: ${JSON.stringify(detail)}` : '')
  }
}

const getPageContextTool = require('../tools/get-page-context')

console.log('\n=== OBA Core — get_page_context tool unit tests (T12.7) ===\n')

check('tool name is get_page_context', getPageContextTool.name === 'get_page_context')
check('tool has description', typeof getPageContextTool.description === 'string' && getPageContextTool.description.length > 0)
check('parameters are an object schema', getPageContextTool.parameters?.type === 'object')
check('slug is required', getPageContextTool.parameters?.required?.includes('slug'))
check('slug parameter is a string', getPageContextTool.parameters?.properties?.slug?.type === 'string')
check('slug enum matches page catalog', JSON.stringify(getPageContextTool.parameters?.properties?.slug?.enum) === JSON.stringify(require('../agent/pageContext').SUPPORTED_SLUGS))
check('run is a function', typeof getPageContextTool.run === 'function')

const ctx = {
  roots: {
    people: [
      { name: 'Alice', risk_score: 92 },
      { name: 'Bob', risk_score: 55 },
    ],
    agents: [
      { name: 'Agent-X', owned_count: 12 },
      { name: 'Agent-Y', owned_count: 4 },
    ],
    workflows: [
      { id: 'wf-1', criticality: 'HIGH', documented: false },
      { id: 'wf-2', criticality: 'LOW', documented: true },
    ],
    criticalAgents: [{ name: 'Agent-X' }],
    agentsWithNoBackup: 3,
    singleOwnerWorkflows: 1,
  },
  intel: {
    orchestrator: {
      score: 74,
      rating: 'MODERATELY INTELLIGENT',
      trustScore: 68,
      recommendations: ['Reduce key-person risk'],
    },
    brainCore: { brainIndex: 70, posture: 'STRAINED' },
    predictiveRisk: { score: 48 },
    continuity: { score: 55 },
    orgHealth: { score: 63 },
    memory: { score: 72 },
    collaboration: { score: 58 },
    accountability: { score: 66 },
    decisionQuality: { score: 77 },
    aiAdoption: { score: 50 },
    executiveBriefing: { score: 60 },
    healthTrend: { score: 65 },
    domainInt: { score: 70 },
    governance: { score: 61, violations: 2 },
  },
  graphStale: false,
  snapshotAt: '2026-08-31T00:00:00.000Z',
}

const risks = getPageContextTool.run(ctx, { slug: 'RISKS' })

check('known slug returns data', risks?.data?.slug === 'risks', risks)
check('known slug returns page title', risks?.data?.title === 'Risk Dashboard', risks)
check('known slug returns page metrics', risks?.data?.metrics?.predictiveRiskScore === 48, risks)
check('known slug preserves stale state', risks?.data?.isStale === false, risks)
check('known slug preserves snapshot timestamp', risks?.data?.snapshotAt === ctx.snapshotAt, risks)

const unknown = getPageContextTool.run(ctx, { slug: 'not-a-page' })

check('unknown slug returns no data', unknown?.data === null, unknown)
check('unknown slug returns UNKNOWN_SLUG', unknown?.toolError?.code === 'UNKNOWN_SLUG', unknown)
check('unknown slug includes supported slugs', Array.isArray(unknown?.toolError?.details?.supportedSlugs), unknown)

const missing = getPageContextTool.run(ctx, {})

check('missing slug does not throw inside tool', missing?.toolError?.code === 'UNKNOWN_SLUG', missing)

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)
