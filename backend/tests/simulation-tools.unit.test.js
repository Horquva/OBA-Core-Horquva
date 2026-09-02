const [runSimulationTool, rankScenariosTool, compareScenariosTool] = require('../tools/simulation-tools')

// Minimal fixture roots — enough for employeeLeaves/agentFails to run
// without throwing. Extend if your real domain/simulations.js needs
// more root tables populated (check loadRoots()'s ROOT_TABLES list).
function makeFixtureRoots() {
  return {
    employees: [
      { id: 'e1', name: 'Sarah Mitchell', department: 'Engineering' },
      { id: 'e2', name: 'Tom Reyes', department: 'Engineering' },
    ],
    agents: [
      { id: 'a1', name: 'Deploy Bot', owner_id: 'e1', risk: 'high' },
      { id: 'a2', name: 'Report Agent', owner_id: 'e2', risk: 'medium' },
    ],
    owners: [],
    workflows: [],
    workflow_failures: [],
    workflow_runbooks: [],
    dependencies: [],
    knowledge_assets: [],
    tool_users: [],
    employee_agent: [],
    ai_platforms: [],
    tool_policies: [],
    policy_violations: [],
    tool_ownership: [],
    accountability_entities: [],
    accountability_links: [],
    truth_claims: [],
    decision_history: [],
    workflow_dependencies: [],
    tool_backups: [],
    _counts: {},
  }
}

describe('run_simulation', () => {
  test('returns a result for a valid employee_leaves scenario', () => {
    const ctx = { roots: makeFixtureRoots() }
    const result = runSimulationTool.run(ctx, { scenario: 'employee_leaves', targetId: 'e1' })
    expect(result.data).not.toBeNull()
    expect(result.data.targetType).toBe('employee')
    expect(result.notes).toEqual([])
  })

  test('returns null data with a note for an unknown targetId', () => {
    const ctx = { roots: makeFixtureRoots() }
    const result = runSimulationTool.run(ctx, { scenario: 'employee_leaves', targetId: 'does-not-exist' })
    expect(result.data).toBeNull()
    expect(result.notes.length).toBeGreaterThan(0)
  })
})

describe('rank_scenarios', () => {
  test('returns a ranked list', () => {
    const ctx = { roots: makeFixtureRoots() }
    const result = rankScenariosTool.run(ctx, {})
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('respects the limit argument', () => {
    const ctx = { roots: makeFixtureRoots() }
    const result = rankScenariosTool.run(ctx, { limit: 1 })
    expect(result.data.length).toBeLessThanOrEqual(1)
  })
})

describe('compare_scenarios', () => {
  test('computes healthDeltaDifference and overlap for two scenarios', () => {
    const ctx = { roots: makeFixtureRoots() }
    const result = compareScenariosTool.run(ctx, {
      scenarioA: { scenario: 'employee_leaves', targetId: 'e1' },
      scenarioB: { scenario: 'employee_leaves', targetId: 'e2' },
    })
    expect(result.data.scenarioA).toBeDefined()
    expect(result.data.scenarioB).toBeDefined()
    expect(result.data.agentsOverlap).toHaveProperty('intersection')
    expect(result.data.agentsOverlap).toHaveProperty('onlyInA')
    expect(result.data.agentsOverlap).toHaveProperty('onlyInB')
  })

  test.todo('reports insufficient evidence rather than faking a difference when healthDelta is null')

  test('returns a note when one target does not exist', () => {
    const ctx = { roots: makeFixtureRoots() }
    const result = compareScenariosTool.run(ctx, {
      scenarioA: { scenario: 'employee_leaves', targetId: 'e1' },
      scenarioB: { scenario: 'employee_leaves', targetId: 'nope' },
    })
    expect(result.data).toBeNull()
    expect(result.notes.length).toBeGreaterThan(0)
  })
})