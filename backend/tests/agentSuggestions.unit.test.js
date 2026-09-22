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

const { buildSuggestions, slugForRoute } = require('../agent/suggestions')

console.log('\n=== OBA Core — agent starter suggestions unit tests ===\n')

const ctx = {
  intel: {
    humanDependencyRisk: [
      { name: 'Priya Rao', tier: 'CRITICAL', totalRiskScore: 100 },
      { name: 'Omar Haddad', tier: 'HIGH', totalRiskScore: 70 },
    ],
    predictiveRisk: {
      scores: [{ agentName: 'LedgerBot', threatLevel: 'CRITICAL', predictedScore: 95 }],
    },
  },
  roots: {
    workflows: [
      { id: 1, name: 'Payroll Run', risk: 'low' },
      { id: 2, name: 'Month-End Close', risk: 'critical' },
    ],
  },
}

// ── route -> slug ──
check('/risk maps to risks', slugForRoute('/risk') === 'risks')
check('/continuity maps to continuity (not governance)', slugForRoute('/continuity') === 'continuity')
check('/dashboard maps to dashboard (not briefing)', slugForRoute('/dashboard') === 'dashboard')
check('nested route maps by prefix', slugForRoute('/workflows/12') === 'workflows')
check('unknown route maps to null', slugForRoute('/settings') === null)
check('missing route maps to null', slugForRoute(undefined) === null)

// ── prompts come from live data, never a hardcoded name ──
const general = buildSuggestions(ctx, null)
check('always returns exactly 4 prompts', general.prompts.length === 4, general)
check('no prompt names a person absent from the data',
  general.prompts.every((p) => !/Sarah/.test(p)), general.prompts)
check('names the highest-risk person from humanDependencyRisk',
  general.prompts.some((p) => p.includes('Priya Rao')), general.prompts)
check('names the top predicted-threat agent',
  general.prompts.some((p) => p.includes('LedgerBot')), general.prompts)
check('prompts are unique', new Set(general.prompts).size === general.prompts.length, general.prompts)
check('general has null slug', general.slug === null)

const workflows = buildSuggestions(ctx, 'workflows')
check('workflows page names the critical workflow, not the first one',
  workflows.prompts.some((p) => p.includes('Month-End Close')), workflows.prompts)
check('workflows page never names the low-risk workflow',
  workflows.prompts.every((p) => !p.includes('Payroll Run')), workflows.prompts)
check('page label is returned for the UI', workflows.pageLabel === 'Workflows', workflows)

const risks = buildSuggestions(ctx, 'risks')
check('risks page leads with the top threat', risks.prompts[0].includes('LedgerBot'), risks.prompts)

// ── degrades cleanly when data is missing ──
const empty = buildSuggestions({ intel: {}, roots: {} }, 'continuity')
check('empty data still yields 4 prompts', empty.prompts.length === 4, empty)
check('empty data never renders "undefined"',
  empty.prompts.every((p) => !/undefined|null/.test(p)), empty.prompts)

const unknownSlug = buildSuggestions(ctx, 'not-a-page')
check('unknown slug falls back to general', unknownSlug.slug === null && unknownSlug.prompts.length === 4, unknownSlug)

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)
