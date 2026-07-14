// lib/knowledgeRisk.ts
// Module 09 — Knowledge Risk Intelligence

export interface PersonProfile {
  name: string;
  ownedAgents: AssetItem[];
  ownedWorkflows: AssetItem[];
  ownedTools: AssetItem[];
  totalOwned: number;
  undocumentedOwned: number;
  noBackupOwned: number;
  concentrationScore: number; // 0–100
  riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  isSoleHolder: boolean; // owns any asset with no backup
  unrecoverableIfLeaves: AssetItem[]; // no doc + no backup
}

export interface AssetItem {
  id: string;
  name: string;
  type: 'agent' | 'workflow' | 'tool';
  owner: string | null;
  backup_owner: string | null;
  criticality: string;
  department: string;
  documented: boolean;
}

export interface KnowledgeGap {
  asset: AssetItem;
  reason: string; // why it's a gap
}

export interface KnowledgeRiskReport {
  profiles: PersonProfile[];
  undocumentedAssets: AssetItem[];
  knowledgeGaps: KnowledgeGap[]; // no doc AND no backup
  totalAssets: number;
  totalUndocumented: number;
  totalSoleHolders: number;
  criticalPersons: PersonProfile[];
  highPersons: PersonProfile[];
  mediumPersons: PersonProfile[];
  lowPersons: PersonProfile[];
}

function tier(score: number): PersonProfile['riskTier'] {
  if (score >= 90) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export function computeKnowledgeRisk(
  agents: {
    id: string; name: string; owner: string | null; backup_owner: string | null;
    criticality: string; department: string; documented: boolean;
  }[],
  workflows: {
    id: string; name: string; owner: string | null; backup_owner: string | null;
    department: string; criticality: string; documented: boolean;
  }[],
  tools: {
    id: string; name: string; access_owner: string | null; backup_tool: string | null;
    criticality: string; documented: boolean;
    users: string[]; departments: string[];
  }[]
): KnowledgeRiskReport {
  // --- Build flat asset list ---
  const allAgents: AssetItem[] = agents.map(a => ({
    id: a.id, name: a.name, type: 'agent',
    owner: a.owner, backup_owner: a.backup_owner,
    criticality: a.criticality, department: a.department, documented: a.documented,
  }));
  const allWorkflows: AssetItem[] = workflows.map(w => ({
    id: w.id, name: w.name, type: 'workflow',
    owner: w.owner, backup_owner: w.backup_owner,
    criticality: w.criticality, department: w.department, documented: w.documented,
  }));
  const allTools: AssetItem[] = tools.map(t => ({
    id: t.id, name: t.name, type: 'tool',
    owner: t.access_owner,
    backup_owner: t.backup_tool,
    criticality: t.criticality,
    department: t.departments?.[0] ?? 'General',
    documented: t.documented,
  }));
  const allAssets: AssetItem[] = [...allAgents, ...allWorkflows, ...allTools];

  // --- Collect unique owners ---
  const ownerSet = new Set<string>();
  allAssets.forEach(a => { if (a.owner) ownerSet.add(a.owner); });
  const owners = Array.from(ownerSet).sort();

  // --- Criticality weight for concentration score ---
  const critWeight: Record<string, number> = { critical: 4, high: 2, medium: 1, low: 0.5 };

  const totalWeightedAssets = allAssets.reduce((s, a) => s + (critWeight[a.criticality] ?? 1), 0);

  // --- Build person profiles ---
  const profiles: PersonProfile[] = owners.map(name => {
    const owned = allAssets.filter(a => a.owner === name);
    const ownedAgents = owned.filter(a => a.type === 'agent');
    const ownedWorkflows = owned.filter(a => a.type === 'workflow');
    const ownedTools = owned.filter(a => a.type === 'tool');

    const undocumented = owned.filter(a => !a.documented);
    const noBackup = owned.filter(a => !a.backup_owner);
    const isSoleHolder = noBackup.length > 0;
    const unrecoverable = owned.filter(a => !a.documented && !a.backup_owner);

    // Concentration score = weighted share of all assets this person owns
    const personWeight = owned.reduce((s, a) => s + (critWeight[a.criticality] ?? 1), 0);
    const concentrationScore = totalWeightedAssets > 0
      ? Math.round((personWeight / totalWeightedAssets) * 100)
      : 0;

    return {
      name,
      ownedAgents,
      ownedWorkflows,
      ownedTools,
      totalOwned: owned.length,
      undocumentedOwned: undocumented.length,
      noBackupOwned: noBackup.length,
      concentrationScore,
      riskTier: tier(concentrationScore),
      isSoleHolder,
      unrecoverableIfLeaves: unrecoverable,
    };
  });

  // Sort by concentration score desc
  profiles.sort((a, b) => b.concentrationScore - a.concentrationScore);

  // --- Undocumented assets across all types ---
  const undocumentedAssets = allAssets.filter(a => !a.documented);

  // --- Knowledge gaps: no doc AND no backup (and has an owner) ---
  const knowledgeGaps: KnowledgeGap[] = allAssets
    .filter(a => !a.documented && !a.backup_owner)
    .map(a => ({
      asset: a,
      reason: a.owner
        ? `Owned by ${a.owner} — no backup, no documentation`
        : 'No owner, no backup, no documentation',
    }));

  return {
    profiles,
    undocumentedAssets,
    knowledgeGaps,
    totalAssets: allAssets.length,
    totalUndocumented: undocumentedAssets.length,
    totalSoleHolders: profiles.filter(p => p.isSoleHolder).length,
    criticalPersons: profiles.filter(p => p.riskTier === 'CRITICAL'),
    highPersons: profiles.filter(p => p.riskTier === 'HIGH'),
    mediumPersons: profiles.filter(p => p.riskTier === 'MEDIUM'),
    lowPersons: profiles.filter(p => p.riskTier === 'LOW'),
  };
}
