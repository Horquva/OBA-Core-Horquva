import { Agent, Dependency, AITool, RiskLevel } from '../types';
import { calculateHealthScore, deriveRisk, deriveRiskScore } from './risk';
import { getDownstream, getSPOFs } from './graph';

export interface SimulatedAgent extends Agent {
  _simulation_override?: number;
  _simulation_penalty?: number;
  _baseline_risk_level?: RiskLevel;
  _baseline_risk_score?: number;
}

export type ScenarioType = 'PERSON_LEAVES' | 'AGENT_FAILS' | 'TOOL_UNAVAILABLE';

export interface ScenarioResult {
  id: string;
  type: ScenarioType;
  targetId: string;
  targetName: string;
  /** Sub-type label for display */
  typeLabel: string;
  baselineHealthScore: number;
  simulatedHealthScore: number;
  healthScoreDelta: number;
  impactedAgents: {
    agentId: string;
    agentName: string;
    beforeRisk: RiskLevel;
    afterRisk: RiskLevel;
    reason: string;
  }[];
  /** Workflows impacted (for TOOL_UNAVAILABLE) */
  impactedWorkflowNames?: string[];
  simulatedAgents: SimulatedAgent[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario: Person Leaves
// ─────────────────────────────────────────────────────────────────────────────
export function simulatePersonLeaving(
  personName: string,
  agents: Agent[],
  dependencies: Dependency[]
): ScenarioResult {
  const baselineHealthScore = calculateHealthScore(agents);

  const simulatedAgents: SimulatedAgent[] = agents.map(a => ({
    ...a,
    _baseline_risk_level: deriveRisk(a),
    _baseline_risk_score: deriveRiskScore(a),
  }));

  const impactedAgents: ScenarioResult['impactedAgents'] = [];

  simulatedAgents.forEach(agent => {
    let affected = false;
    let reason = '';

    if (agent.owner === personName) {
      agent._simulation_penalty = (agent._simulation_penalty || 0) + 35;
      affected = true;
      reason = 'Orphaned (+35 Risk)';
    }
    if (agent.backup_owner === personName) {
      affected = true;
      reason = reason ? 'Orphaned & Backup Lost' : 'Backup Lost';
    }

    if (affected) {
      const newRisk = deriveRisk(agent);
      impactedAgents.push({
        agentId: agent.id,
        agentName: agent.name,
        beforeRisk: agent._baseline_risk_level!,
        afterRisk: newRisk,
        reason,
      });
    }
  });

  const simulatedHealthScore = calculateHealthScore(simulatedAgents);

  return {
    id: `person_leaves_${personName}`,
    type: 'PERSON_LEAVES',
    targetId: personName,
    targetName: personName,
    typeLabel: 'Employee Leaves',
    baselineHealthScore,
    simulatedHealthScore,
    healthScoreDelta: simulatedHealthScore - baselineHealthScore,
    impactedAgents,
    simulatedAgents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario: Agent Fails
// ─────────────────────────────────────────────────────────────────────────────
export function simulateAgentFailing(
  agentId: string,
  agents: Agent[],
  dependencies: Dependency[]
): ScenarioResult {
  const baselineHealthScore = calculateHealthScore(agents);
  const targetAgent = agents.find(a => a.id === agentId);

  const simulatedAgents: SimulatedAgent[] = agents.map(a => ({
    ...a,
    _baseline_risk_level: deriveRisk(a),
    _baseline_risk_score: deriveRiskScore(a),
  }));

  const impactedAgents: ScenarioResult['impactedAgents'] = [];
  const cascadeVictims = getDownstream(agentId, dependencies);

  simulatedAgents.forEach(agent => {
    if (agent.id === agentId) {
      agent._simulation_override = 170;
      const newRisk = deriveRisk(agent);
      impactedAgents.push({
        agentId: agent.id,
        agentName: agent.name,
        beforeRisk: agent._baseline_risk_level!,
        afterRisk: newRisk,
        reason: 'Primary Failure',
      });
    } else if (cascadeVictims.has(agent.id)) {
      agent._simulation_penalty = 30;
      const newRisk = deriveRisk(agent);
      if (newRisk !== agent._baseline_risk_level) {
        impactedAgents.push({
          agentId: agent.id,
          agentName: agent.name,
          beforeRisk: agent._baseline_risk_level!,
          afterRisk: newRisk,
          reason: 'Cascade Victim (+30 Risk)',
        });
      }
    }
  });

  const simulatedHealthScore = calculateHealthScore(simulatedAgents);

  return {
    id: `agent_fails_${agentId}`,
    type: 'AGENT_FAILS',
    targetId: agentId,
    targetName: targetAgent ? targetAgent.name : agentId,
    typeLabel: 'Agent Fails',
    baselineHealthScore,
    simulatedHealthScore,
    healthScoreDelta: simulatedHealthScore - baselineHealthScore,
    impactedAgents,
    simulatedAgents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario: AI Tool Becomes Unavailable
// ─────────────────────────────────────────────────────────────────────────────
export function simulateToolUnavailable(
  tool: AITool,
  agents: Agent[],
  dependencies: Dependency[]
): ScenarioResult {
  const baselineHealthScore = calculateHealthScore(agents);

  const simulatedAgents: SimulatedAgent[] = agents.map(a => ({
    ...a,
    _baseline_risk_level: deriveRisk(a),
    _baseline_risk_score: deriveRiskScore(a),
  }));

  const impactedAgents: ScenarioResult['impactedAgents'] = [];

  // Every agent that uses this tool gets +25 risk penalty
  const agentIdsUsingTool = new Set(tool.agents_using);
  simulatedAgents.forEach(agent => {
    if (agentIdsUsingTool.has(agent.id)) {
      agent._simulation_penalty = (agent._simulation_penalty || 0) + 25;
      const newRisk = deriveRisk(agent);
      impactedAgents.push({
        agentId: agent.id,
        agentName: agent.name,
        beforeRisk: agent._baseline_risk_level!,
        afterRisk: newRisk,
        reason: `Depends on ${tool.name} (+25 Risk)`,
      });
    }
  });

  const simulatedHealthScore = calculateHealthScore(simulatedAgents);

  return {
    id: `tool_unavailable_${tool.id}`,
    type: 'TOOL_UNAVAILABLE',
    targetId: tool.id,
    targetName: tool.name,
    typeLabel: 'Tool Unavailable',
    baselineHealthScore,
    simulatedHealthScore,
    healthScoreDelta: simulatedHealthScore - baselineHealthScore,
    impactedAgents,
    impactedWorkflowNames: tool.workflows,
    simulatedAgents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Full rank across all three scenario types
// ─────────────────────────────────────────────────────────────────────────────
export function rankScenarios(
  agents: Agent[],
  dependencies: Dependency[],
  tools: AITool[] = []
): ScenarioResult[] {
  const scenarios: ScenarioResult[] = [];

  // 1. Person Leaves
  const people = new Set<string>();
  agents.forEach(a => {
    if (a.owner) people.add(a.owner);
    if (a.backup_owner) people.add(a.backup_owner);
  });
  people.forEach(person => {
    scenarios.push(simulatePersonLeaving(person, agents, dependencies));
  });

  // 2. Agent Fails — CRITICAL, HIGH, or SPOF
  const spofs = getSPOFs(agents, dependencies).map(s => s.agentId);
  agents.forEach(agent => {
    const riskLevel = deriveRisk(agent);
    if (riskLevel === 'critical' || riskLevel === 'high' || spofs.includes(agent.id)) {
      scenarios.push(simulateAgentFailing(agent.id, agents, dependencies));
    }
  });

  // 3. Tool Unavailable — CRITICAL or HIGH tools
  tools.forEach(tool => {
    if (tool.criticality === 'critical' || tool.criticality === 'high') {
      scenarios.push(simulateToolUnavailable(tool, agents, dependencies));
    }
  });

  // Sort by worst impact (lowest simulated health score → worst first)
  scenarios.sort((a, b) => a.simulatedHealthScore - b.simulatedHealthScore);

  return scenarios;
}
