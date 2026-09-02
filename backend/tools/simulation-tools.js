// backend/tools/simulation-tools.js
//
// Task 11.3 — Simulation tools (run_simulation, rank_scenarios, compare_scenarios).
// Thin wrappers around backend/domain/simulations.js — no simulation math
// lives here, only dispatch, packaging into the tool envelope shape, and
// (for compare_scenarios) the diff calculation Invariant I-3 requires the
// model never do itself.
//
// NOTE: assumes ctx.roots holds the frozen per-turn data bundle (11.6).
// Matches the naming convention used throughout derived.js/simulations.js
// ("roots"), confirmed in the T10.1/T10.2 handoff doc §4.1 and Quick Start
// Checklist. If 11.6 lands it under a different property name, update the
// three `ctx.roots` references below.

const {
  employeeLeaves, agentFails, platformDown, workflowDisruption,
  rankAllScenarios,
} = require('../domain/simulations')

const SCENARIO_DISPATCH = {
  employee_leaves: employeeLeaves,
  agent_fails: agentFails,
  platform_down: platformDown,
  workflow_disruption: workflowDisruption,
}

function diffEntitySets(listA = [], listB = []) {
  const idsB = new Set(listB.map((e) => e.id))
  const idsA = new Set(listA.map((e) => e.id))
  return {
    intersection: listA.filter((e) => idsB.has(e.id)),
    onlyInA: listA.filter((e) => !idsB.has(e.id)),
    onlyInB: listB.filter((e) => !idsA.has(e.id)),
  }
}

const runSimulationTool = {
  name: 'run_simulation',
  description: 'Call when the user asks a what-if question about ONE specific scenario — e.g. "what happens if X leaves/fails/goes down". Requires a resolved entity id (use resolve_entity first).',
  parameters: {
    type: 'object',
    properties: {
      scenario: { type: 'string', enum: Object.keys(SCENARIO_DISPATCH) },
      targetId: { type: 'string' },
    },
    required: ['scenario', 'targetId'],
  },
  run(ctx, args) {
    const fn = SCENARIO_DISPATCH[args.scenario]
    const result = fn(args.targetId, ctx.roots)
    if (!result) {
      return { data: null, notes: [`No entity found for id "${args.targetId}" under scenario "${args.scenario}".`] }
    }
    return { data: result, notes: [] }
  },
}

const rankScenariosTool = {
  name: 'rank_scenarios',
  description: 'Call when the user asks for the biggest risk, worst-case scenario, or "what should we worry about" org-wide, without naming a specific person/agent/tool.',
  parameters: {
    type: 'object',
    properties: { limit: { type: 'integer' } },
    required: [],
  },
  run(ctx, args) {
    const all = rankAllScenarios(ctx.roots)
    const limited = args.limit ? all.slice(0, args.limit) : all
    return { data: limited, notes: [] }
  },
}

const compareScenariosTool = {
  name: 'compare_scenarios',
  description: 'Call when the user wants two specific scenarios compared side by side — e.g. "what if X leaves vs if Y takes over instead". Never subtract the two results yourself; this tool does that.',
  parameters: {
    type: 'object',
    properties: {
      scenarioA: {
        type: 'object',
        properties: {
          scenario: { type: 'string', enum: Object.keys(SCENARIO_DISPATCH) },
          targetId: { type: 'string' },
        },
        required: ['scenario', 'targetId'],
      },
      scenarioB: {
        type: 'object',
        properties: {
          scenario: { type: 'string', enum: Object.keys(SCENARIO_DISPATCH) },
          targetId: { type: 'string' },
        },
        required: ['scenario', 'targetId'],
      },
    },
    required: ['scenarioA', 'scenarioB'],
  },
  run(ctx, args) {
    const fnA = SCENARIO_DISPATCH[args.scenarioA.scenario]
    const fnB = SCENARIO_DISPATCH[args.scenarioB.scenario]
    const resultA = fnA(args.scenarioA.targetId, ctx.roots)
    const resultB = fnB(args.scenarioB.targetId, ctx.roots)

    if (!resultA || !resultB) {
      return {
        data: null,
        notes: [
          !resultA ? `Scenario A: no entity found for "${args.scenarioA.targetId}".` : null,
          !resultB ? `Scenario B: no entity found for "${args.scenarioB.targetId}".` : null,
        ].filter(Boolean),
      }
    }

    const agentsDiff = diffEntitySets(resultA.impactedAgents, resultB.impactedAgents)
    const workflowsDiff = diffEntitySets(resultA.impactedWorkflows, resultB.impactedWorkflows)
    const bothHaveDelta = resultA.healthDelta != null && resultB.healthDelta != null
    const healthDeltaDifference = bothHaveDelta ? resultA.healthDelta - resultB.healthDelta : null

    return {
      data: { scenarioA: resultA, scenarioB: resultB, healthDeltaDifference, agentsOverlap: agentsDiff, workflowsOverlap: workflowsDiff },
      notes: bothHaveDelta ? [] : ['Health delta could not be compared for one or both scenarios — insufficient evidence.'],
    }
  },
}

module.exports = [runSimulationTool, rankScenariosTool, compareScenariosTool]