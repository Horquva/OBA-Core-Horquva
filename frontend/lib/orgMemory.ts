// lib/orgMemory.ts
// Module 10 — Organizational Memory Intelligence
//
// D-60: PRESERVED/AT_RISK/VULNERABLE/LOST status, per-carrier profiles, and
// the Institutional Memory Health Score used to be computed here, client-side,
// over the raw /api/agents, /api/workflows, /api/tools lists. That formula is
// now domain/derived.js's orgMemory(), served from GET /api/memory/map -- see
// that function's header comment for the full decision (owner picked this
// file's own backup_owner + documentation formula as canonical over the
// separate, unused formula routes/memory/memory.js had). This file now only
// types and lightly guards the fetched JSON; it computes nothing.

import type { EvidenceInfo } from '../components/ui/EvidenceBadge';

// ─── Memory Status ────────────────────────────────────────────────────────────

export type MemoryStatus = 'PRESERVED' | 'AT_RISK' | 'VULNERABLE' | 'LOST';

export interface MemoryAsset {
  id: string | number;
  name: string;
  type: 'agent' | 'workflow' | 'tool';
  owner: string | null;
  backup_owner: string | null;
  criticality: string;
  department: string;
  documented: boolean;
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

/** Shapes GET /api/memory/map's JSON into OrgMemoryReport, defaulting any
 *  missing array field to empty rather than letting a malformed response
 *  crash every component that maps over it. */
export function mapOrgMemoryResponse(json: Partial<OrgMemoryReport> | null | undefined): OrgMemoryReport {
  const arr = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);

  return {
    assets: arr(json?.assets),
    preserved: arr(json?.preserved),
    atRisk: arr(json?.atRisk),
    vulnerable: arr(json?.vulnerable),
    lost: arr(json?.lost),
    carriers: arr(json?.carriers),
    criticalCarriers: arr(json?.criticalCarriers),
    highCarriers: arr(json?.highCarriers),
    imhs: json?.imhs ?? null,
    imhsVerdict: json?.imhsVerdict ?? null,
    evidence: json?.evidence ?? { status: 'insufficient_evidence', coverage: 0, covered: 0, total: 0, sufficient: false },
    totalAssets: json?.totalAssets ?? 0,
  };
}
