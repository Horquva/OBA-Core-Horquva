/*
 * Phase 0 baseline capture (IMPLEMENTATION_PLAN_EXPANDED.md Part VII Phase 0).
 *
 * Runs the LEGACY predictiveRisk/humanDependencyRisk/scenario pipeline on a
 * representative fixture org and writes the outputs to
 * risk_engine/fixtures/baseline/legacy_scores.json, so the v2 (two-engine)
 * score distribution can be diffed against it for release notes. Run this
 * BEFORE the derived.js integration commit:
 *
 *   node backend/risk_engine/capture_baseline.js
 *
 * One-off tool — kept for provenance of the golden file, not wired into tests.
 */

const fs = require('fs')
const path = require('path')
const derived = require('../domain/derived')
const simulations = require('../domain/simulations')

const ROOT_TABLES = derived.ROOT_TABLES
function roots(overrides = {}) {
  const base = {}
  for (const t of ROOT_TABLES) base[t] = []
  const merged = { ...base, ...overrides }
  merged._counts = Object.fromEntries(ROOT_TABLES.map((t) => [t, merged[t].length]))
  return merged
}

// Representative fixture org: 4 agents (fragile / clean / hub / unowned),
// a critical workflow, agent-agent dependencies, mixed documentation.
const r = roots({
  employees: [
    { id: 1, name: 'Solo', department: 'Eng' },
    { id: 2, name: 'Covered', department: 'Eng' },
  ],
  owners: [
    { id: 10, name: 'Solo', employee_id: 1, backup_owner: null },
    { id: 11, name: 'Covered', employee_id: 2, backup_owner: 'Deputy' },
  ],
  agents: [
    { id: 1, name: 'FragileAgent', risk: 'low', status: 'active', owner_id: 1 },
    { id: 2, name: 'SafeAgent', risk: 'low', status: 'active', owner_id: 2 },
    { id: 3, name: 'HubAgent', risk: 'medium', status: 'active', owner_id: 2 },
    { id: 4, name: 'OrphanAgent', risk: 'high', status: 'inactive', owner_id: null },
  ],
  workflows: [
    { id: 1, name: 'CriticalFlow', risk: 'critical' },
    { id: 2, name: 'PlainFlow', risk: 'low' },
  ],
  workflow_runbooks: [{ workflow_id: 1, owner_id: 1, is_documented: true }],
  dependencies: [
    { source_id: 1, source_type: 'workflow', target_id: 1, target_type: 'agent', dependency_type: 'critical', strength: 90 },
    { source_id: 3, source_type: 'agent', target_id: 1, target_type: 'agent', dependency_type: 'high', strength: 75 },
    { source_id: 2, source_type: 'agent', target_id: 3, target_type: 'agent', dependency_type: 'normal', strength: 50 },
    { source_id: 4, source_type: 'agent', target_id: 3, target_type: 'agent', dependency_type: 'low', strength: 30 },
    { source_id: 3, source_type: 'agent', target_id: 4, target_type: 'agent', dependency_type: 'normal', strength: 45 },
  ],
  knowledge_assets: [
    { asset_type: 'agent', asset_id: 1, is_documented: false, owner_id: 1 },
    { asset_type: 'agent', asset_id: 2, is_documented: true, owner_id: 2 },
  ],
  workflow_failures: [
    { workflow_id: 2, failure_type: 'timeout', severity: 'medium' },
  ],
})

const risk = derived.predictiveRisk(r)
const out = {
  capturedAt: new Date().toISOString(),
  engine: 'legacy RISK_FACTORS point table (pre-v2)',
  predictiveRisk: risk.scores.map((s) => ({
    agentName: s.agentName,
    predictedScore: s.predictedScore,
    threatLevel: s.threatLevel,
    contributingFactors: s.contributingFactors,
    cascadeReach: s.cascadeReach,
  })),
  humanDependencyRisk: derived.humanDependencyRisk(r).map((p) => ({
    name: p.name, totalRiskScore: p.totalRiskScore, tier: p.tier,
  })),
  orgHealth: (() => {
    const h = derived.orgHealth(r, { accountability: derived.accountability(r), predictiveRisk: risk })
    return { healthIndex: h.healthIndex, criticalSafetyScore: h.criticalSafetyScore }
  })(),
  simulations: {
    agentFails_1: (() => {
      const s = simulations.agentFails(1, r)
      return { severity: s.severity, healthDelta: s.healthDelta }
    })(),
    employeeLeaves_1: (() => {
      const s = simulations.employeeLeaves(1, r)
      return { severity: s.severity, healthDelta: s.healthDelta }
    })(),
    workflowDisruption_2: (() => {
      const s = simulations.workflowDisruption(2, r)
      return { severity: s.severity, healthDelta: s.healthDelta }
    })(),
  },
}

const dir = path.join(__dirname, 'fixtures', 'baseline')
fs.mkdirSync(dir, { recursive: true })
const file = path.join(dir, 'legacy_scores.json')
fs.writeFileSync(file, JSON.stringify(out, null, 2))
console.log('Baseline written to', file)
for (const s of out.predictiveRisk) {
  console.log(`  ${s.agentName.padEnd(14)} score=${String(s.predictedScore).padStart(3)} ${s.threatLevel.padEnd(8)} factors=${JSON.stringify(s.contributingFactors)}`)
}
