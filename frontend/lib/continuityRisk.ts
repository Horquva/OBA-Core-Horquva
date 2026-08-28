// lib/continuityRisk.ts
//
// D-61: per-asset survivalStatus/governanceScore used to be computed here,
// client-side, over the raw /api/agents, /api/workflows, /api/tools lists.
// That formula is now domain/derived.js's assetContinuity(), served from
// GET /api/continuity -- see that function's header comment for why it is
// NOT the same thing as M18/M19 (/api/intelligence/continuity, /governance).
// This file now only types and lightly guards the fetched JSON.

export interface ContinuityAsset {
  id: string;
  name: string;
  type: 'agent' | 'workflow' | 'tool';
  department: string;
  owner: string;
  criticality: string;
  survivalStatus: 'SURVIVES' | 'DEGRADED' | 'FAILS' | 'LOST';
  governanceScore: number;
  complianceViolations: number;
}

export interface ContinuityReport {
  assets: ContinuityAsset[];
  /** null when evidence is insufficient (e.g. zero assets) -- never a fabricated 0. */
  orgSurvivalScore: number | null;
  orgGovernanceScore: number | null;
  mustProtect: ContinuityAsset[];
  worstOffenders: ContinuityAsset[];
  deptContinuity: Record<string, { total: number; survives: number; fails: number; score: number }>;
  deptGovernance: Record<string, { total: number; healthy: number; atRisk: number; score: number }>;
}

/** Shapes GET /api/continuity's JSON into ContinuityReport, defaulting any
 *  missing field rather than letting a malformed response crash every
 *  component that reads it. */
export function mapContinuityResponse(json: Partial<ContinuityReport> | null | undefined): ContinuityReport {
  return {
    assets: Array.isArray(json?.assets) ? json.assets : [],
    orgSurvivalScore: json?.orgSurvivalScore ?? null,
    orgGovernanceScore: json?.orgGovernanceScore ?? null,
    mustProtect: Array.isArray(json?.mustProtect) ? json.mustProtect : [],
    worstOffenders: Array.isArray(json?.worstOffenders) ? json.worstOffenders : [],
    deptContinuity: json?.deptContinuity ?? {},
    deptGovernance: json?.deptGovernance ?? {},
  };
}
