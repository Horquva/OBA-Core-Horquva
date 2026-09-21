/*
 * OBA Core — Concentration Findings Unit & Logic Tests (FE-5 Part 2)
 *
 * Asserting:
 *   - Specific named concentration findings (e.g. "Ahmed silently owns 8 workflows and 3 AI agents, with no backup for any of them")
 *   - Explicit naming of dependent workflows and agents
 *   - Unbacked owners flagged with high/critical severity
 */

const { buildFindingText, computeConcentrationFindings } = require('../routes/intelligence/concentration')

let passed = 0
let failed = 0

function check(name, cond, detail) {
  if (cond) {
    passed++
    console.log('  ✓', name)
  } else {
    failed++
    console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '')
  }
}

console.log('\n=== OBA Core — Concentration Findings Logic Test ===\n')

// ── 1. buildFindingText Format ──
console.log('Finding Text Format — Explicit naming & phrasing:')
{
  const text1 = buildFindingText(
    'Ahmed',
    [{ name: 'Workflow A' }, { name: 'Workflow B' }],
    [{ name: 'Agent X' }, { name: 'Agent Y' }, { name: 'Agent Z' }],
    false,
    null
  )
  check('names the owner', text1.includes('Ahmed'), text1)
  check('phrases "silently owns" when unbacked', text1.includes('silently owns'), text1)
  check('counts workflows accurately', text1.includes('2 workflows'), text1)
  check('counts AI agents accurately', text1.includes('3 AI agents'), text1)
  check('includes dependent workflow names', text1.includes('Workflow A, Workflow B'), text1)
  check('includes dependent agent names', text1.includes('Agent X, Agent Y, Agent Z'), text1)
  check('concludes with "with no backup for any of them"', text1.includes('with no backup for any of them'), text1)

  // With backup designated
  const text2 = buildFindingText('Sarah', [{ name: 'Security Audit' }], [{ name: 'SecurityScanner' }], true, 'David Kim')
  check('phrases backed finding without "silently"', !text2.includes('silently'), text2)
  check('mentions designated backup owner', text2.includes('with designated backup to David Kim'), text2)
}

// ── 2. Mock Graph Concentration Evaluation ──
console.log('\nGraph Concentration Computation:')
{
  const emp1 = {
    id: 'emp_1',
    name: 'Ahmed',
    type: 'employee',
    metadata: { sourceId: 1, role: 'Staff Engineer', department: 'Engineering', backup_owner: null },
  }
  const emp2 = {
    id: 'emp_2',
    name: 'Aisha',
    type: 'employee',
    metadata: { sourceId: 2, role: 'Lead Architect', department: 'Platform', backup_owner: 'Bob' },
  }

  const wf1 = { id: 'wf_1', name: 'Order Processing', type: 'workflow' }
  const wf2 = { id: 'wf_2', name: 'Invoice Billing', type: 'workflow' }
  const ag1 = { id: 'ag_1', name: 'OrderAgent', type: 'ai_agent', metadata: { kind: 'automation-agent' } }
  const ag2 = { id: 'ag_2', name: 'BillingBot', type: 'ai_agent', metadata: { kind: 'automation-agent' } }
  const ag3 = { id: 'ag_3', name: 'FraudDetector', type: 'ai_agent', metadata: { kind: 'automation-agent' } }

  const entities = [emp1, emp2, wf1, wf2, ag1, ag2, ag3]
  const rels = [
    // Ahmed owns wf1, wf2, ag1, ag2, ag3 (no backup)
    { from: 'emp_1', to: 'wf_1', type: 'owns' },
    { from: 'emp_1', to: 'wf_2', type: 'owns' },
    { from: 'emp_1', to: 'ag_1', type: 'owns' },
    { from: 'emp_1', to: 'ag_2', type: 'owns' },
    { from: 'emp_1', to: 'ag_3', type: 'owns' },
    // Aisha owns wf1 (with backup)
    { from: 'emp_2', to: 'wf_1', type: 'owns' },
  ]

  const mockGraph = {
    entities: {
      get: (id) => entities.find((e) => e.id === id),
      list: () => entities,
    },
    relationships: {
      from: (id) => rels.filter((r) => r.from === id),
      to: (id) => rels.filter((r) => r.to === id),
    },
  }

  const result = computeConcentrationFindings(mockGraph)

  check('returns findings array', Array.isArray(result.findings), result.findings)
  check('unbacked owners counted', result.unbackedOwnersCount === 1, result.unbackedOwnersCount)

  const ahmedFinding = result.findings.find((f) => f.ownerName === 'Ahmed')
  check('Ahmed finding exists', !!ahmedFinding)
  check('Ahmed workflowCount is 2', ahmedFinding.workflowCount === 2, ahmedFinding.workflowCount)
  check('Ahmed agentCount is 3', ahmedFinding.agentCount === 3, ahmedFinding.agentCount)
  check('Ahmed hasBackup is false', ahmedFinding.hasBackup === false)
  check('Ahmed severity is CRITICAL', ahmedFinding.severity === 'CRITICAL', ahmedFinding.severity)
  check('finding string contains named workflows', ahmedFinding.finding.includes('Order Processing, Invoice Billing'))
  check('finding string contains named agents', ahmedFinding.finding.includes('OrderAgent, BillingBot, FraudDetector'))

  // Sorting check: unbacked should come first
  check('unbacked owner is sorted first', result.findings[0].ownerName === 'Ahmed')
}

console.log('\n----------------------------------------')
console.log(`passed: ${passed}   failed: ${failed}`)
if (failed === 0) {
  console.log('CONCENTRATION FINDINGS TESTS PASSED ✅')
  console.log('----------------------------------------\n')
  process.exit(0)
} else {
  console.error('CONCENTRATION FINDINGS TESTS FAILED ❌')
  console.log('----------------------------------------\n')
  process.exit(1)
}
