// lib/recommendations.ts
//
// D-62: the 7-rule prioritization engine used to live here, client-side, over
// the raw /api/agents, /api/dependencies, /api/tools, /api/workflows lists.
// That logic is now brain module M04 (backend/brain/modules/implementations.js),
// expanded from 3 rule classes to all 7 plus a pre-existing dependency-cycle
// rule the frontend version never had -- served from
// GET /api/intelligence/recommendations. This file now only types and shapes
// the fetched JSON; it generates nothing.

export type RecPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type RecCategory =
  | 'OWNERSHIP'
  | 'DOCUMENTATION'
  | 'DEPENDENCY'
  | 'CONCENTRATION'
  | 'TOOL_GOVERNANCE';

export interface Recommendation {
  id: string;
  priority: RecPriority;
  category: RecCategory;
  title: string;
  description: string;
  /** What happens if this is ignored */
  impact: string;
  /** Specific, named action */
  action: string;
  /** Which agent/workflow/tool this targets */
  targetId: string | null;
  targetName: string | null;
  targetType: 'agent' | 'workflow' | 'person' | 'tool' | null;
  /** Estimated effort: Quick / Medium / Strategic */
  effort: 'Quick' | 'Medium' | 'Strategic';
}

export interface RecommendationEngineOutput {
  recommendations: Recommendation[];
  top5: Recommendation[];
  healthScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  /** Ordered list: CRITICAL → HIGH → MEDIUM */
  prioritized: Recommendation[];
  ownerConcentrationWarning: { owner: string; agentCount: number } | null;
  orphanedAgentCount: number;
  undocumentedCriticalCount: number;
}

interface RawRecommendationsPayload {
  recommendations?: unknown;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  ownerConcentrationWarning?: { owner: string; agentCount: number } | null;
  orphanedAgentCount?: number;
  undocumentedCriticalAgentCount?: number;
}

/** Shapes GET /api/intelligence/recommendations's ModuleResult<...> payload
 *  into RecommendationEngineOutput. `orgHealthIndex` comes from a separate
 *  fetch (/api/health/summary) -- M04 doesn't compute org health, it consumes
 *  M01/M03 the same way the rest of the brain does. */
export function mapRecommendationsResponse(json: { payload?: RawRecommendationsPayload } | null | undefined, orgHealthIndex: number): RecommendationEngineOutput {
  const payload = json?.payload ?? {};
  const recommendations: Recommendation[] = Array.isArray(payload.recommendations) ? payload.recommendations : [];

  return {
    recommendations,
    top5: recommendations.slice(0, 5),
    healthScore: orgHealthIndex,
    criticalCount: payload.criticalCount ?? 0,
    highCount: payload.highCount ?? 0,
    mediumCount: payload.mediumCount ?? 0,
    prioritized: recommendations,
    ownerConcentrationWarning: payload.ownerConcentrationWarning ?? null,
    orphanedAgentCount: payload.orphanedAgentCount ?? 0,
    undocumentedCriticalCount: payload.undocumentedCriticalAgentCount ?? 0,
  };
}
