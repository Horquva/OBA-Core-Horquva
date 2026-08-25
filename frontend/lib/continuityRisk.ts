import { Dataset } from '../types';

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
  orgSurvivalScore: number; // 0-100
  orgGovernanceScore: number; // 0-100
  mustProtect: ContinuityAsset[];
  worstOffenders: ContinuityAsset[];
  deptContinuity: Record<string, { total: number; survives: number; fails: number; score: number }>;
  deptGovernance: Record<string, { total: number; healthy: number; atRisk: number; score: number }>;
}

// Derives survival/governance signal from the same real attributes the rest
// of the backend already treats as ground truth (owner, backup owner,
// documentation, criticality — see backend/routes/decisionIntelligence.js's
// scoreAgentDecision/scoreWorkflowDecision). Previously this generated
//'survivalStatus'/'governanceScore'/'complianceViolations' from a hash of
// the asset's id+name, which produced numbers with no relationship to the
// organization at all and rendered as if they were real intelligence.
function classifySurvival(hasOwner: boolean, hasBackup: boolean, documented: boolean, highStakes: boolean): ContinuityAsset['survivalStatus'] {
  if (!hasOwner) return highStakes ? 'LOST' : 'DEGRADED';
  if (!hasBackup) return highStakes ? 'FAILS' : 'DEGRADED';
  if (!documented) return 'DEGRADED';
  return 'SURVIVES';
}

function computeGovernanceScore(hasOwner: boolean, hasBackup: boolean, documented: boolean): number {
  let score = 100;
  if (!hasOwner) score -= 40;
  if (!hasBackup) score -= 25;
  if (!documented) score -= 20;
  return Math.max(0, score);
}

export function computeContinuityRisk(dataset: Dataset): ContinuityReport {
  const assets: ContinuityAsset[] = [];

  const add = (id: string, name: string, type: any, dept: string, owner: string, backup: string, documented: boolean, crit: string) => {
    const hasOwner = !!owner;
    const hasBackup = !!backup;
    const highStakes = crit === 'critical' || crit === 'high';

    const survivalStatus = classifySurvival(hasOwner, hasBackup, documented, highStakes);
    const governanceScore = computeGovernanceScore(hasOwner, hasBackup, documented);
    const complianceViolations = [!hasOwner, !hasBackup, !documented].filter(Boolean).length;

    assets.push({
      id, name, type, department: dept || 'General', owner: owner || 'None', criticality: crit || 'medium',
      survivalStatus, governanceScore, complianceViolations
    });
  };

  dataset.agents?.forEach(a => add(a.id, a.name, 'agent', a.department, a.owner || '', a.backup_owner || '', a.documented, a.criticality));
  dataset.workflows?.forEach(w => add(w.id, w.name, 'workflow', w.department, w.owner || '', w.backup_owner || '', w.documented, w.criticality));
  dataset.ai_tools?.forEach(t => add(t.id, t.name, 'tool', t.departments?.[0] || 'General', t.access_owner || '', t.backup_tool || '', t.documented, t.criticality));

  // Compute rollups
  let totalSurvScore = 0;
  let totalGovScore = 0;

  const deptContinuity: Record<string, any> = {};
  const deptGovernance: Record<string, any> = {};

  assets.forEach(a => {
    // Survival numeric approx: LOST=0, FAILS=30, DEGRADED=70, SURVIVES=100
    const val = a.survivalStatus === 'LOST' ? 0 : a.survivalStatus === 'FAILS' ? 30 : a.survivalStatus === 'DEGRADED' ? 70 : 100;
    totalSurvScore += val;
    totalGovScore += a.governanceScore;

    // Dept continuity
    if (!deptContinuity[a.department]) deptContinuity[a.department] = { total: 0, survives: 0, fails: 0, scoreTotal: 0 };
    deptContinuity[a.department].total++;
    if (a.survivalStatus === 'SURVIVES') deptContinuity[a.department].survives++;
    if (a.survivalStatus === 'FAILS' || a.survivalStatus === 'LOST') deptContinuity[a.department].fails++;
    deptContinuity[a.department].scoreTotal += val;

    // Dept governance
    if (!deptGovernance[a.department]) deptGovernance[a.department] = { total: 0, healthy: 0, atRisk: 0, scoreTotal: 0 };
    deptGovernance[a.department].total++;
    deptGovernance[a.department].scoreTotal += a.governanceScore;
    if (a.governanceScore >= 80) deptGovernance[a.department].healthy++;
    if (a.governanceScore < 60) deptGovernance[a.department].atRisk++;
  });

  Object.values(deptContinuity).forEach(d => { d.score = Math.round(d.scoreTotal / d.total); });
  Object.values(deptGovernance).forEach(d => { d.score = Math.round(d.scoreTotal / d.total); });

  const orgSurvivalScore = assets.length ? Math.round(totalSurvScore / assets.length) : 0;
  const orgGovernanceScore = assets.length ? Math.round(totalGovScore / assets.length) : 0;

  const mustProtect = assets
    .filter(a => (a.criticality === 'high' || a.criticality === 'critical') && (a.survivalStatus === 'FAILS' || a.survivalStatus === 'LOST'))
    .sort((a, b) => b.complianceViolations - a.complianceViolations)
    .slice(0, 10);

  const worstOffenders = assets
    .filter(a => a.governanceScore < 70)
    .sort((a, b) => a.governanceScore - b.governanceScore)
    .slice(0, 10);

  return {
    assets,
    orgSurvivalScore,
    orgGovernanceScore,
    mustProtect,
    worstOffenders,
    deptContinuity,
    deptGovernance
  };
}
