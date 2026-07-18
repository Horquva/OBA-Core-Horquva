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

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Pseudo-random but deterministic generation based on asset id/name
export function computeContinuityRisk(dataset: Dataset): ContinuityReport {
  const assets: ContinuityAsset[] = [];

  const add = (id: string, name: string, type: any, dept: string, owner: string, crit: string) => {
    const seed = hashString(id + name);
    
    // Deterministic survival status
    let survivalStatus: ContinuityAsset['survivalStatus'] = 'SURVIVES';
    const sMod = seed % 100;
    if (sMod > 80) survivalStatus = 'LOST';
    else if (sMod > 60) survivalStatus = 'FAILS';
    else if (sMod > 40) survivalStatus = 'DEGRADED';

    // Deterministic governance score (0-100)
    const governanceScore = 40 + (seed % 61); // 40 to 100
    
    // Violations
    let complianceViolations = 0;
    if (governanceScore < 60) complianceViolations = (seed % 3) + 1;
    if (governanceScore < 50) complianceViolations += 2;

    assets.push({
      id, name, type, department: dept || 'General', owner: owner || 'None', criticality: crit || 'medium',
      survivalStatus, governanceScore, complianceViolations
    });
  };

  dataset.agents?.forEach(a => add(a.id, a.name, 'agent', a.department, a.owner || '', a.criticality));
  dataset.workflows?.forEach(w => add(w.id, w.name, 'workflow', w.department, w.owner || '', w.criticality));
  dataset.ai_tools?.forEach(t => add(t.id, t.name, 'tool', t.departments?.[0] || 'General', t.access_owner || '', t.criticality));

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
