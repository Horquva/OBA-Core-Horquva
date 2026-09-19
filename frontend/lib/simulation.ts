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

export interface RawScenario {
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
    // F-11: a missing risk/severity field means the response didn't say,
    // not that it's genuinely low -- 'unknown' says so instead of guessing
    // the safest-looking value.
    impactedAgents: (raw.impactedAgents ?? []).map((a) => ({ id: String(a.id), name: a.name ?? '', risk: a.risk ?? 'unknown' })),
    impactedWorkflowNames: (raw.impactedWorkflows ?? []).map((w) => w.name ?? ''),
    severity: (raw.severity ?? 'unknown') as RiskLevel,
  };
}

/** One entry of GET /api/simulations/employee-leaves's bulk response --
 *  domain/simulations.js's employeeLeaves() run for every employees row,
 *  from one shared root read (see that route's own header comment). Field
 *  names differ from RawScenario (employeeId/employeeName/riskLevel vs.
 *  targetId/targetName/severity) because the bulk route also serves
 *  EndpointHealthGrid's ping and the admin-facing shape predates this
 *  mapper; mapEmployeeLeavesScenario() below adapts one to the other rather
 *  than the route inventing a second display type. */
export interface RawEmployeeLeavesScenario {
  employeeId?: string | number;
  employeeName?: string;
  baselineHealthScore?: number;
  simulatedHealthScore?: number;
  healthDelta?: number;
  impactedAgents?: { id?: string | number; name?: string; risk?: RiskLevel }[];
  impactedWorkflows?: { name?: string }[];
  riskLevel?: RiskLevel;
}

/** Adapts one bulk employee-leaves entry into the same ScenarioResult shape
 *  mapScenario() produces for the single-entity route, so both draw from one
 *  display type and one mapping function. */
export function mapEmployeeLeavesScenario(raw: RawEmployeeLeavesScenario): ScenarioResult {
  return mapScenario({
    targetType: 'employee',
    targetId: raw.employeeId,
    targetName: raw.employeeName,
    baselineHealthScore: raw.baselineHealthScore,
    simulatedHealthScore: raw.simulatedHealthScore,
    healthDelta: raw.healthDelta,
    impactedAgents: raw.impactedAgents,
    impactedWorkflows: raw.impactedWorkflows,
    severity: raw.riskLevel,
  });
}
