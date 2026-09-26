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

// Shaped to match the REAL output of domain/derived.js's computeAllFromRoots()
// (`intel`) and loadRoots() (`roots`), read back from derived.js itself rather
// than guessed -- the previous fixture here mocked the same wrong field names
// (`intel.orchestrator`, `roots.people`, `wf.criticality`...) the buggy tool
// code expected, so this test agreed with the bug instead of catching it.
const ctx = {
  roots: {
    agents: [
      { id: 1, name: 'Agent-X', risk: 'critical' },
      { id: 2, name: 'Agent-Y', risk: 'low' },
    ],
    workflows: [
      { id: 'wf-1', name: 'Deploy', risk: 'high' },
      { id: 'wf-2', name: 'Onboarding', risk: 'low' },
    ],
    knowledge_assets: [
      { asset_type: 'workflow', asset_id: 'wf-1', is_documented: false },
      { asset_type: 'workflow', asset_id: 'wf-2', is_documented: true },
    ],
    policy_violations: [{ severity: 'high' }, { severity: 'low' }],
  },
  intel: {
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
    orgHealth: { healthIndex: 63, healthStatus: 'WARNING', continuityScore: 55, documentationScore: 60 },
    accountability: { accountabilityScore: 66 },
    decisionQuality: { score: 77 },
    collaboration: { summary: { collaborationScore: 58, aiAdoptionScore: 50 } },
    executiveMemory: { items: [{ title: 'Deploy has failed 3 times' }] },
  },
  graphStale: false,
  snapshotAt: '2026-08-31T00:00:00.000Z',
}

const risks = getPageContextTool.run(ctx, { slug: 'RISKS' })

check('known slug returns data', risks?.data?.slug === 'risks', risks)
check('known slug returns page title', risks?.data?.title === 'Risk Dashboard', risks)
check('known slug returns page metrics', risks?.data?.metrics?.topPredictedThreats?.[0]?.predictedScore === 92, risks)
check('known slug counts critical agents from real criticality, not a raw column', risks?.data?.metrics?.criticalAgentsCount === 1, risks)
check('known slug surfaces top people at risk from humanDependencyRisk', risks?.data?.metrics?.topPeopleAtRisk?.[0]?.name === 'Alice', risks)
check('known slug preserves stale state', risks?.data?.isStale === false, risks)
check('known slug preserves snapshot timestamp', risks?.data?.snapshotAt === ctx.snapshotAt, risks)

const dashboard = getPageContextTool.run(ctx, { slug: 'dashboard' })
check('dashboard reads the real pillars.orgScore, not a nonexistent orchestrator field', dashboard?.data?.metrics?.organizationalScore === 74, dashboard)

const workflows = getPageContextTool.run(ctx, { slug: 'workflows' })
check('workflows derives criticality via entityCriticality(), not a raw wf.criticality column', workflows?.data?.metrics?.criticalWorkflows === 1, workflows)
check('workflows counts undocumented via knowledge_assets, not a nonexistent wf.documented column', workflows?.data?.metrics?.undocumented === 1, workflows)

const unknown = getPageContextTool.run(ctx, { slug: 'not-a-page' })

check('unknown slug returns no data', unknown?.data === null, unknown)
check('unknown slug returns UNKNOWN_SLUG', unknown?.toolError?.code === 'UNKNOWN_SLUG', unknown)
check('unknown slug includes supported slugs', Array.isArray(unknown?.toolError?.details?.supportedSlugs), unknown)

const missing = getPageContextTool.run(ctx, {})

check('missing slug does not throw inside tool', missing?.toolError?.code === 'UNKNOWN_SLUG', missing)

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)
