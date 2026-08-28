import { RiskLevel } from '../types';

export type ScenarioType = 'PERSON_LEAVES' | 'AGENT_FAILS' | 'TOOL_UNAVAILABLE';

export interface ImpactedAgent {
  id: string;
  name: string;
  risk: RiskLevel;
}

export interface ScenarioResult {
  id: string;
  type: ScenarioType;
  targetId: string;
  targetName: string;
  baselineHealthScore: number;
  simulatedHealthScore: number;
  healthDelta: number;
  impactedAgents: ImpactedAgent[];
  impactedWorkflowNames: string[];
  /** domain/simulations.js's severityFor() -- based on the real criticality
   *  of impacted entities, not a health-score-drop-magnitude guess. */
  severity: RiskLevel;
}

const TARGET_TYPE_TO_SCENARIO_TYPE: Record<string, ScenarioType> = {
  employee: 'PERSON_LEAVES',
  agent: 'AGENT_FAILS',
  platform: 'TOOL_UNAVAILABLE',
};

interface RawScenario {
  targetType?: string;
  targetId?: string | number;
  targetName?: string;
  baselineHealthScore?: number;
  simulatedHealthScore?: number;
  healthDelta?: number;
  impactedAgents?: { id?: string | number; name?: string; risk?: RiskLevel }[];
  impactedWorkflows?: { name?: string }[];
  severity?: RiskLevel;
}

/** Reshapes one raw backend simulation response into the frontend's display type. Pure field mapping — no risk/health recomputation. */
export function mapScenario(raw: RawScenario): ScenarioResult {
  return {
    id: `${raw.targetType}-${raw.targetId}`,
    type: TARGET_TYPE_TO_SCENARIO_TYPE[raw.targetType ?? ''] ?? 'AGENT_FAILS',
    targetId: String(raw.targetId),
    targetName: raw.targetName ?? '',
    baselineHealthScore: raw.baselineHealthScore ?? 0,
    simulatedHealthScore: raw.simulatedHealthScore ?? raw.baselineHealthScore ?? 0,
    healthDelta: raw.healthDelta ?? 0,
    impactedAgents: (raw.impactedAgents ?? []).map((a) => ({ id: String(a.id), name: a.name ?? '', risk: a.risk ?? 'low' })),
    impactedWorkflowNames: (raw.impactedWorkflows ?? []).map((w) => w.name ?? ''),
    severity: (raw.severity ?? 'low') as RiskLevel,
  };
}
