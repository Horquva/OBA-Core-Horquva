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

/** GET /api/knowledge/intelligence's `concentration` array, keyed by owner
 *  name -- domain/derived.js's knowledgeConcentration(), the real
 *  criticality-weighted share of org-wide assets this person holds.
 *  Replaces this file's own previously client-computed concentrationScore. */
export interface ConcentrationEntry {
  concentrationScore: number;
  tier: PersonProfile['riskTier'];
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
  }[],
  concentrationByName: Map<string, ConcentrationEntry> = new Map()
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

    // Real backend score (domain/derived.js's knowledgeConcentration()) --
    // replaces this file's own previously client-computed weighted share.
    const concentration = concentrationByName.get(name);
    const concentrationScore = concentration?.concentrationScore ?? 0;

    return {
      name,
      ownedAgents,
      ownedWorkflows,
      ownedTools,
      totalOwned: owned.length,
      undocumentedOwned: undocumented.length,
      noBackupOwned: noBackup.length,
      concentrationScore,
      riskTier: concentration?.tier ?? 'LOW',
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
