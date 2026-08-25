// lib/orgMemory.ts
// Module 10 — Organizational Memory Intelligence

import { AssetItem } from './knowledgeRisk';
import { evidenceGate } from './evidenceGate';
import type { EvidenceInfo } from '../components/ui/EvidenceBadge';

// ─── Memory Status ────────────────────────────────────────────────────────────

export type MemoryStatus = 'PRESERVED' | 'AT_RISK' | 'VULNERABLE' | 'LOST';

export interface MemoryAsset extends AssetItem {
  memoryStatus: MemoryStatus;
}

// ─── Per-Person Memory Carrier Profile ───────────────────────────────────────

export type CarrierTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface MemoryCarrierProfile {
  name: string;
  totalOwned: number;
  preservedCount: number;
  vulnerableCount: number;
  atRiskCount: number;
  lostCount: number;
  undocumentedCount: number;
  noBackupCount: number;
  assets: MemoryAsset[];
  tier: CarrierTier;
  isCriticalCarrier: boolean; // sole holder of undocumented assets
}

// ─── Module Report ────────────────────────────────────────────────────────────

export interface OrgMemoryReport {
  assets: MemoryAsset[];
  preserved: MemoryAsset[];
  atRisk: MemoryAsset[];
  vulnerable: MemoryAsset[];
  lost: MemoryAsset[];
  carriers: MemoryCarrierProfile[];
  criticalCarriers: MemoryCarrierProfile[];
  highCarriers: MemoryCarrierProfile[];
  /** Institutional Memory Health Score 0–100, or null when evidence is insufficient */
  imhs: number | null;
  imhsVerdict: 'HEALTHY' | 'AT_RISK' | 'CRITICAL' | null;
  evidence: EvidenceInfo & { sufficient: boolean };
  totalAssets: number;
}

// ─── Status Assignment ────────────────────────────────────────────────────────

function assignStatus(asset: AssetItem): MemoryStatus {
  const hasOwner = asset.owner !== null;
  const hasBackup = asset.backup_owner !== null;
  const isDocumented = asset.documented;

  // LOST: no owner and no documentation — truly abandoned
  if (!hasOwner && !isDocumented) return 'LOST';

  // PRESERVED: documented AND has backup owner
  if (isDocumented && hasBackup) return 'PRESERVED';

  // AT RISK: not documented BUT has a backup owner
  if (!isDocumented && hasBackup) return 'AT_RISK';

  // VULNERABLE: documented BUT no backup owner
  return 'VULNERABLE';
}

// ─── Carrier Tier ─────────────────────────────────────────────────────────────

function carrierTier(profile: Omit<MemoryCarrierProfile, 'tier' | 'isCriticalCarrier'>): CarrierTier {
  const { totalOwned, undocumentedCount, noBackupCount } = profile;
  // Weight: how much undocumented + sole-holder risk does this person carry?
  const riskWeight = undocumentedCount * 2 + noBackupCount;
  if (riskWeight >= 10 || (undocumentedCount >= 5 && noBackupCount >= 5)) return 'CRITICAL';
  if (riskWeight >= 5  || (undocumentedCount >= 3 && noBackupCount >= 3)) return 'HIGH';
  if (riskWeight >= 2  || undocumentedCount >= 2) return 'MEDIUM';
  return 'LOW';
}

// ─── IMHS Calculation ─────────────────────────────────────────────────────────
// PRESERVED×1.0 + VULNERABLE×0.5 + AT_RISK×0.25 + LOST×0.0 / total × 100

// The empty-population case (total === 0) is no longer special-cased here —
// evidenceGate() in the caller owns that decision now, so this can assume a
// non-empty population and divide normally (D-24: this used to return a
// fabricated 100 for zero assets, "no assets to lose" read as "perfectly
// preserved").
function calcIMHS(
  preserved: number,
  vulnerable: number,
  atRisk: number,
  total: number
): number {
  return Math.round(((preserved * 1.0 + vulnerable * 0.5 + atRisk * 0.25) / total) * 100);
}

// ─── Main Computation ─────────────────────────────────────────────────────────

export function computeOrgMemory(
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
): OrgMemoryReport {
  // ── Flatten to AssetItem list ──
  const allAgents: AssetItem[] = agents.map(a => ({
    id: a.id, name: a.name, type: 'agent' as const,
    owner: a.owner, backup_owner: a.backup_owner,
    criticality: a.criticality, department: a.department, documented: a.documented,
  }));
  const allWorkflows: AssetItem[] = workflows.map(w => ({
    id: w.id, name: w.name, type: 'workflow' as const,
    owner: w.owner, backup_owner: w.backup_owner,
    criticality: w.criticality, department: w.department, documented: w.documented,
  }));
  const allTools: AssetItem[] = tools.map(t => ({
    id: t.id, name: t.name, type: 'tool' as const,
    owner: t.access_owner,
    backup_owner: t.backup_tool,
    criticality: t.criticality,
    department: t.departments?.[0] ?? 'General',
    documented: t.documented,
  }));

  const allAssets: AssetItem[] = [...allAgents, ...allWorkflows, ...allTools];

  // ── Assign memory status ──
  const memoryAssets: MemoryAsset[] = allAssets.map(a => ({
    ...a,
    memoryStatus: assignStatus(a),
  }));

  const preserved  = memoryAssets.filter(a => a.memoryStatus === 'PRESERVED');
  const atRisk     = memoryAssets.filter(a => a.memoryStatus === 'AT_RISK');
  const vulnerable = memoryAssets.filter(a => a.memoryStatus === 'VULNERABLE');
  const lost       = memoryAssets.filter(a => a.memoryStatus === 'LOST');

  // ── IMHS ──
  const evidence = evidenceGate(memoryAssets, () => true);
  const imhs = evidence.sufficient
    ? calcIMHS(preserved.length, vulnerable.length, atRisk.length, memoryAssets.length)
    : null;
  const imhsVerdict: OrgMemoryReport['imhsVerdict'] =
    !evidence.sufficient ? null : (imhs! >= 75 ? 'HEALTHY' : imhs! >= 45 ? 'AT_RISK' : 'CRITICAL');

  // ── Build carrier profiles (only assets that have an owner) ──
  const ownerSet = new Set<string>();
  memoryAssets.forEach(a => { if (a.owner) ownerSet.add(a.owner); });

  const carriers: MemoryCarrierProfile[] = Array.from(ownerSet).sort().map(name => {
    const owned = memoryAssets.filter(a => a.owner === name);
    const undocumented = owned.filter(a => !a.documented);
    const noBackup     = owned.filter(a => !a.backup_owner);

    const base = {
      name,
      totalOwned:       owned.length,
      preservedCount:   owned.filter(a => a.memoryStatus === 'PRESERVED').length,
      vulnerableCount:  owned.filter(a => a.memoryStatus === 'VULNERABLE').length,
      atRiskCount:      owned.filter(a => a.memoryStatus === 'AT_RISK').length,
      lostCount:        owned.filter(a => a.memoryStatus === 'LOST').length,
      undocumentedCount: undocumented.length,
      noBackupCount:    noBackup.length,
      assets:           owned,
    };

    const tier = carrierTier(base);
    const isCriticalCarrier = undocumented.some(a => !a.backup_owner);

    return { ...base, tier, isCriticalCarrier };
  });

  // Sort: CRITICAL → HIGH → MEDIUM → LOW, then by undocumented count desc
  const tierOrder: Record<CarrierTier, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  carriers.sort((a, b) =>
    tierOrder[a.tier] !== tierOrder[b.tier]
      ? tierOrder[a.tier] - tierOrder[b.tier]
      : b.undocumentedCount - a.undocumentedCount
  );

  return {
    assets:           memoryAssets,
    preserved,
    atRisk,
    vulnerable,
    lost,
    carriers,
    criticalCarriers: carriers.filter(c => c.tier === 'CRITICAL'),
    highCarriers:     carriers.filter(c => c.tier === 'HIGH'),
    imhs,
    imhsVerdict,
    evidence,
    totalAssets: memoryAssets.length,
  };
}
