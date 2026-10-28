// =============================================================================
// Horquva Continuity Platform — Deterministic Operational Checks Engine
// =============================================================================
// Evaluates C1-C8 deterministic checks across canonical entities, facts, and edges.
// Strictly adheres to truth-preserving evidence grades:
// - Missing data returns 'UNKNOWN' (never false)
// - Computes corporate headline metrics (fully covered vs exposed critical assets)
// =============================================================================

import {
  CanonicalEntity,
  CanonicalFact,
  CanonicalEdge,
  CheckResult,
  CheckStatus,
  HeadlineMetrics,
  CriticalityLevel,
} from '@horquva/types';
import { ContinuityGraph } from '../graph/index.js';

export interface CheckRule {
  id: string;
  name: string;
  description: string;
  evaluate(
    entity: CanonicalEntity,
    facts: Map<string, CanonicalFact>,
    graph: ContinuityGraph
  ): CheckResult | null;
}

/**
 * C1: Unbacked Critical Asset
 * An asset marked critical or high has 0 confirmed human backups.
 */
export const UnbackedCriticalAssetCheck: CheckRule = {
  id: 'C1_UNBACKED_CRITICAL',
  name: 'Unbacked Critical Asset',
  description: 'Asset is critical or high priority but has no confirmed human backup.',
  evaluate(entity, facts, graph) {
    if (entity.kind !== 'automation' && entity.kind !== 'process' && entity.kind !== 'app') {
      return null;
    }

    const critFact = facts.get('criticality');
    const criticality = (critFact?.value as CriticalityLevel) || 'unknown';

    if (criticality === 'unknown' || critFact?.grade === 'unknown') {
      return {
        checkId: 'C1_UNBACKED_CRITICAL',
        entityId: entity.id,
        status: 'UNKNOWN',
        evidenceFactIds: critFact?.id ? [critFact.id] : [],
        reason: 'Asset criticality has not been confirmed by owner.',
      };
    }

    if (criticality !== 'critical' && criticality !== 'high') {
      return {
        checkId: 'C1_UNBACKED_CRITICAL',
        entityId: entity.id,
        status: 'PASS',
        evidenceFactIds: critFact?.id ? [critFact.id] : [],
        reason: `Asset criticality is ${criticality}.`,
      };
    }

    const backups = graph.getBackups(entity.id);
    if (backups.length === 0) {
      return {
        checkId: 'C1_UNBACKED_CRITICAL',
        entityId: entity.id,
        status: 'FAIL',
        evidenceFactIds: critFact?.id ? [critFact.id] : [],
        reason: `Critical asset has 0 backups assigned.`,
      };
    }

    return {
      checkId: 'C1_UNBACKED_CRITICAL',
      entityId: entity.id,
      status: 'PASS',
      evidenceFactIds: critFact?.id ? [critFact.id] : [],
      reason: `Asset has ${backups.length} confirmed backup(s): ${backups.map((b) => b.name).join(', ')}.`,
    };
  },
};

/**
 * C2: Departed Owner on Active Asset
 * Asset is active, but its owner is marked 'departed' in directory.
 */
export const DepartedOwnerCheck: CheckRule = {
  id: 'C2_DEPARTED_OWNER',
  name: 'Departed Owner on Active Asset',
  description: 'Automation is running but owner has left the company.',
  evaluate(entity, facts, graph) {
    if (entity.kind !== 'automation' && entity.kind !== 'app') {
      return null;
    }

    const statusFact = facts.get('status');
    const isInactive = statusFact?.value === 'inactive';
    if (isInactive) {
      return {
        checkId: 'C2_DEPARTED_OWNER',
        entityId: entity.id,
        status: 'PASS',
        evidenceFactIds: statusFact?.id ? [statusFact.id] : [],
        reason: 'Asset is inactive.',
      };
    }

    const owners = graph.getOwners(entity.id);
    if (owners.length === 0) {
      return {
        checkId: 'C2_DEPARTED_OWNER',
        entityId: entity.id,
        status: 'FAIL',
        evidenceFactIds: [],
        reason: 'Active asset has no owner assigned (orphaned).',
      };
    }

    const departedOwners: CanonicalEntity[] = [];
    for (const owner of owners) {
      const ownerNode = graph.getNode(owner.id);
      const ownerStatus = ownerNode?.facts.get('status')?.value;
      if (ownerStatus === 'departed') {
        departedOwners.push(owner);
      }
    }

    if (departedOwners.length > 0) {
      return {
        checkId: 'C2_DEPARTED_OWNER',
        entityId: entity.id,
        status: 'FAIL',
        evidenceFactIds: [],
        reason: `Active asset is owned by departed person(s): ${departedOwners.map((o) => o.name).join(', ')}.`,
      };
    }

    return {
      checkId: 'C2_DEPARTED_OWNER',
      entityId: entity.id,
      status: 'PASS',
      evidenceFactIds: [],
      reason: 'All owners are active in directory.',
    };
  },
};

/**
 * C3: Undocumented Critical Asset
 */
export const UndocumentedCriticalAssetCheck: CheckRule = {
  id: 'C3_UNDOCUMENTED_CRITICAL',
  name: 'Undocumented Critical Asset',
  description: 'Critical asset lacks standard operating documentation or runbook.',
  evaluate(entity, facts) {
    if (entity.kind !== 'automation' && entity.kind !== 'process') {
      return null;
    }

    const critFact = facts.get('criticality');
    const criticality = (critFact?.value as CriticalityLevel) || 'unknown';
    if (criticality !== 'critical' && criticality !== 'high') {
      return null; // Only evaluate for critical assets
    }

    const docFact = facts.get('documented');
    if (!docFact || docFact.grade === 'unknown') {
      return {
        checkId: 'C3_UNDOCUMENTED_CRITICAL',
        entityId: entity.id,
        status: 'UNKNOWN',
        evidenceFactIds: [],
        reason: 'Documentation status has not been verified.',
      };
    }

    if (docFact.value === false) {
      return {
        checkId: 'C3_UNDOCUMENTED_CRITICAL',
        entityId: entity.id,
        status: 'FAIL',
        evidenceFactIds: docFact.id ? [docFact.id] : [],
        reason: 'Critical asset is explicitly marked as undocumented.',
      };
    }

    return {
      checkId: 'C3_UNDOCUMENTED_CRITICAL',
      entityId: entity.id,
      status: 'PASS',
      evidenceFactIds: docFact.id ? [docFact.id] : [],
      reason: `Documentation verified (${docFact.sourceRef || 'provided'}).`,
    };
  },
};

/**
 * C4: Missing Fallback on Critical Asset
 */
export const MissingFallbackCheck: CheckRule = {
  id: 'C4_MISSING_FALLBACK',
  name: 'Missing Fallback on Critical Asset',
  description: 'Critical asset has no manual fallback procedure if service fails.',
  evaluate(entity, facts) {
    if (entity.kind !== 'automation' && entity.kind !== 'process') {
      return null;
    }

    const critFact = facts.get('criticality');
    const criticality = (critFact?.value as CriticalityLevel) || 'unknown';
    if (criticality !== 'critical' && criticality !== 'high') {
      return null;
    }

    const fallbackFact = facts.get('fallback_exists');
    if (!fallbackFact || fallbackFact.grade === 'unknown') {
      return {
        checkId: 'C4_MISSING_FALLBACK',
        entityId: entity.id,
        status: 'UNKNOWN',
        evidenceFactIds: [],
        reason: 'Fallback procedure has not been verified.',
      };
    }

    if (fallbackFact.value === false) {
      return {
        checkId: 'C4_MISSING_FALLBACK',
        entityId: entity.id,
        status: 'FAIL',
        evidenceFactIds: fallbackFact.id ? [fallbackFact.id] : [],
        reason: 'No fallback procedure exists if this automation fails.',
      };
    }

    return {
      checkId: 'C4_MISSING_FALLBACK',
      entityId: entity.id,
      status: 'PASS',
      evidenceFactIds: fallbackFact.id ? [fallbackFact.id] : [],
      reason: 'Manual fallback procedure is verified.',
    };
  },
};

/** A workload key from an AI vendor (OpenAI / Anthropic), as the key connectors write it. */
export function isVendorKey(entityId: string): boolean {
  return entityId.startsWith('credential:openai:') || entityId.startsWith('credential:anthropic:');
}

/**
 * C5: Key Outlives Owner
 * A vendor key whose owner has left (status departed) or, for OpenAI, lost
 * access to the key's project. A service-account key has no person behind it
 * by design. Not registered in ALL_CHECKS yet: that lands with its labels (B6).
 */
export const KeyOutlivesOwnerCheck: CheckRule = {
  id: 'C5_KEY_OUTLIVES_OWNER',
  name: 'Key Outlives Owner',
  description: 'An AI vendor key is still live after the person who owns it has gone.',
  evaluate(entity, facts, graph) {
    if (entity.kind !== 'credential' || !isVendorKey(entity.id)) {
      return null;
    }
    const result = (status: CheckStatus, reason: string, evidence: Array<CanonicalFact | undefined> = []): CheckResult => ({
      checkId: 'C5_KEY_OUTLIVES_OWNER',
      entityId: entity.id,
      status,
      evidenceFactIds: evidence.flatMap((f) => (f?.id ? [f.id] : [])),
      reason,
    });

    const ownerType = facts.get('owner_type');
    if (ownerType?.value === 'service_account') {
      return result('PASS', 'Key belongs to a service account.', [ownerType]);
    }
    const ownerAccess = facts.get('owner_access');
    if (ownerAccess?.value === 'inactive') {
      return result('FAIL', "Key's owner no longer has access to its project.", [ownerAccess]);
    }

    const owners = graph.getOwners(entity.id);
    if (owners.length === 0) {
      return result('UNKNOWN', 'Nobody on record owns this key.');
    }
    const statusOf = (id: string) => graph.getNode(id)?.facts.get('status');
    const gone = owners.filter((o) => statusOf(o.id)?.value === 'departed');
    if (gone.length > 0) {
      return result('FAIL', `Key is owned by departed person(s): ${gone.map((o) => o.name).join(', ')}.`, gone.map((o) => statusOf(o.id)));
    }
    if (owners.every((o) => statusOf(o.id)?.value === 'active')) {
      return result('PASS', `Key's owner is active: ${owners.map((o) => o.name).join(', ')}.`, owners.map((o) => statusOf(o.id)));
    }
    return result('UNKNOWN', "Whether the key's owner is still here isn't on record.");
  },
};

export const ALL_CHECKS: CheckRule[] = [
  UnbackedCriticalAssetCheck,
  DepartedOwnerCheck,
  UndocumentedCriticalAssetCheck,
  MissingFallbackCheck,
];

/**
 * Runs all applicable checks across all entities in the graph.
 */
export function evaluateAllChecks(graph: ContinuityGraph): CheckResult[] {
  const results: CheckResult[] = [];
  const nodes = graph.getAllNodes();

  for (const node of nodes) {
    for (const rule of ALL_CHECKS) {
      const res = rule.evaluate(node.entity, node.facts, graph);
      if (res) {
        results.push(res);
      }
    }
  }

  return results;
}

/**
 * Calculates Corporate Headline Metrics:
 * - totalCriticalAssets
 * - fullyCoveredCriticalAssets (backup confirmed AND documented confirmed AND fallback confirmed)
 * - exposedCriticalAssets (lacks backup OR documentation OR fallback)
 * - unknownCriticalFacts (facts with grade 'unknown')
 */
export function calculateHeadlineMetrics(graph: ContinuityGraph): HeadlineMetrics {
  const nodes = graph.getAllNodes();
  let totalCritical = 0;
  let fullyCovered = 0;
  let exposed = 0;
  let unknownAssets = 0;
  let unknownFacts = 0;

  for (const node of nodes) {
    const critFact = node.facts.get('criticality');
    const isCritical = critFact?.value === 'critical' || critFact?.value === 'high';

    if (isCritical) {
      totalCritical++;

      const backups = graph.getBackups(node.entity.id);
      const hasBackup = backups.length > 0;

      const docFact = node.facts.get('documented');
      const isDocumented = docFact?.value === true && docFact.grade === 'confirmed';

      const fallbackFact = node.facts.get('fallback_exists');
      const hasFallback = fallbackFact?.value === true && fallbackFact.grade === 'confirmed';

      if (
        !critFact ||
        critFact.grade === 'unknown' ||
        !docFact ||
        docFact.grade === 'unknown' ||
        !fallbackFact ||
        fallbackFact.grade === 'unknown'
      ) {
        unknownFacts++;
      }

      // DATA-03: only a *known* gap makes an asset exposed. No backup on record
      // is known (C1); documentation/fallback only when recorded as false.
      const knownFalse = (f: typeof docFact) => !!f && f.grade !== 'unknown' && f.value === false;
      const hasKnownGap = !hasBackup || knownFalse(docFact) || knownFalse(fallbackFact);

      if (hasBackup && isDocumented && hasFallback) {
        fullyCovered++;
      } else if (hasKnownGap) {
        exposed++;
      } else {
        unknownAssets++; // nothing known to be missing, but something is unconfirmed or unrecorded
      }
    }
  }

  return {
    totalCriticalAssets: totalCritical,
    fullyCoveredCriticalAssets: fullyCovered,
    exposedCriticalAssets: exposed,
    unknownCriticalAssets: unknownAssets,
    unknownCriticalFacts: unknownFacts,
    definition:
      'Critical & high assets. Covered: a backup on record, and documentation and fallback both confirmed. ' +
      'Exposed: a known gap — no backup, or recorded as undocumented or without fallback. ' +
      'Unknown: no known gap, but something is unconfirmed or not yet recorded.',
  };
}
