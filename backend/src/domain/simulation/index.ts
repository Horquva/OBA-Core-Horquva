// =============================================================================
// Horquva Continuity Platform — What-If Simulation Engine
// =============================================================================
// Deterministic graph reachability walks for continuity scenarios:
// - S1: Single Person Departure (orphaned assets, credential breakage, weekly runs lost)
// - S2: Vendor/Model Outage (downstream workflow disruption)
// - S3: Succession / Handover Test (workload concentration and overload warnings)
// =============================================================================

import {
  WhatIfScenarioInput,
  WhatIfScenarioResult,
  SuccessionTestResult,
  CriticalityLevel,
} from '@horquva/types';
import { ContinuityGraph } from '../graph/index.js';
import { isVendorKey, vendorTimestamp } from '../keys.js';

type Ref = { id: string; kind: any; name: string };

export interface CombinedScenarioResult {
  orphanedCriticalAssets: Array<{ asset: Ref; priorOwner: Ref | null; criticality: CriticalityLevel }>;
  stoppedAutomations: Array<{ workflow: Ref; credentialOwner: Ref | null; weeklyRuns: number | null }>;
  runsPerWeekAffected: number;
  runsUnknownCount: number;
  downstream: Ref[];
  unknownFactsEncountered: number;
}

export class SimulationEngine {
  private graph: ContinuityGraph;

  constructor(graph: ContinuityGraph) {
    this.graph = graph;
  }

  /**
   * S1: Single or Multi-Person Departure Simulation.
   * Walks the graph to discover orphaned critical assets, broken credentials, and run volume affected.
   */
  public simulateDeparture(departingPersonIds: string[]): WhatIfScenarioResult {
    const departingSet = new Set(departingPersonIds);
    const orphanedAssets: WhatIfScenarioResult['orphanedCriticalAssets'] = [];
    const brokenCredentialAutomations: WhatIfScenarioResult['stoppedPersonalCredentialAutomations'] = [];
    const affectedDownstreamIds = new Set<string>();
    let totalWeeklyRuns = 0;
    let unknownFactsCount = 0;

    const countedWorkflowIds = new Set<string>();

    for (const personId of departingPersonIds) {
      // 1. Assets owned by departing person
      const owned = this.graph.getOwnedAssets(personId);

      for (const asset of owned) {
        const node = this.graph.getNode(asset.id);
        const critFact = node?.facts.get('criticality');
        const criticality = (critFact?.value as CriticalityLevel) || 'unknown';

        if (critFact?.grade === 'unknown' || criticality === 'unknown') {
          unknownFactsCount++;
        }

        // Check if there is another non-departing owner or backup
        const owners = this.graph.getOwners(asset.id);
        const backups = this.graph.getBackups(asset.id);

        const remainingOwners = owners.filter((o) => !departingSet.has(o.id));
        const remainingBackups = backups.filter((b) => !departingSet.has(b.id));

        if (remainingOwners.length === 0 && remainingBackups.length === 0) {
          orphanedAssets.push({
            entityId: asset.id,
            name: asset.name,
            priorOwnerId: personId,
            criticality,
          });

          // Add downstream workflows to impact
          const downstream = this.graph.getDownstreamImpact(asset.id);
          for (const dsId of downstream) {
            affectedDownstreamIds.add(dsId);
          }

          if (!countedWorkflowIds.has(asset.id)) {
            countedWorkflowIds.add(asset.id);
            const weeklyRunsFact = node?.facts.get('run_volume_weekly');
            if (weeklyRunsFact && typeof weeklyRunsFact.value === 'number') {
              totalWeeklyRuns += weeklyRunsFact.value;
            }
          }
        }
      }

      // 2. Personal Credentials owned by departing person used by automations
      const edges = this.graph.getEdgesForEntity(personId);
      for (const edge of edges) {
        if (edge.type === 'runs_on_credentials_of') {
          const automationNode = this.graph.getNode(edge.fromId);
          if (automationNode?.entity) {
            const runs = typeof automationNode.facts.get('run_volume_weekly')?.value === 'number'
              ? (automationNode.facts.get('run_volume_weekly')!.value as number)
              : 0;

            brokenCredentialAutomations.push({
              workflowId: automationNode.entity.id,
              workflowName: automationNode.entity.name,
              credentialOwnerId: personId,
              weeklyRuns: runs,
            });

            if (!countedWorkflowIds.has(automationNode.entity.id)) {
              countedWorkflowIds.add(automationNode.entity.id);
              totalWeeklyRuns += runs;
            }
          }
        }
      }
    }

    // 3. Vendor keys they own. Not part of the orphaned count: a key is rotated, not handed over.
    const keysAtRisk: NonNullable<WhatIfScenarioResult['keysAtRisk']> = [];
    for (const personId of departingPersonIds) {
      for (const key of this.graph.getOwnedAssets(personId, { includeVendorKeys: true })) {
        if (!isVendorKey(key.id) || keysAtRisk.some((k) => k.keyId === key.id)) continue;
        keysAtRisk.push({
          keyId: key.id,
          keyName: key.name,
          ownerId: personId,
          vendor: key.externalRefs?.vendor ?? key.id.split(':')[1] ?? null,
          lastUsedAt: vendorTimestamp(this.graph.getNode(key.id)?.facts.get('last_used_at')?.value),
        });
      }
    }

    return {
      orphanedCriticalAssets: orphanedAssets,
      stoppedPersonalCredentialAutomations: brokenCredentialAutomations,
      totalRunsPerWeekAffected: totalWeeklyRuns,
      affectedDownstreamAssetIds: Array.from(affectedDownstreamIds),
      unknownFactsEncountered: unknownFactsCount,
      ...(keysAtRisk.length ? { keysAtRisk } : {}),
    };
  }

  /**
   * S2: Third-Party Model or Vendor Outage Simulation.
   */
  public simulateModelOutage(modelEntityId: string): {
    affectedAutomations: Array<{ id: string; name: string; weeklyRuns: number }>;
    totalRunsPerWeekAffected: number;
  } {
    const affected: Array<{ id: string; name: string; weeklyRuns: number }> = [];
    let totalRuns = 0;

    // Find all workflows with calls_model edge to this model
    const edges = this.graph.getEdgesForEntity(modelEntityId);
    for (const edge of edges) {
      if (edge.type === 'calls_model' && edge.toId === modelEntityId) {
        const wfNode = this.graph.getNode(edge.fromId);
        if (wfNode?.entity) {
          const runs = typeof wfNode.facts.get('run_volume_weekly')?.value === 'number'
            ? (wfNode.facts.get('run_volume_weekly')!.value as number)
            : 0;

          affected.push({
            id: wfNode.entity.id,
            name: wfNode.entity.name,
            weeklyRuns: runs,
          });
          totalRuns += runs;
        }
      }
    }

    return {
      affectedAutomations: affected,
      totalRunsPerWeekAffected: totalRuns,
    };
  }

  /**
   * S3: Succession Handover Test.
   * Simulates transferring all assets from departingPerson to successorPerson.
   * Checks post-handover coverage and flags risk if successor becomes a single point of failure.
   */
  public testSuccession(departingPersonId: string, successorPersonId: string): SuccessionTestResult {
    const departingOwned = this.graph.getOwnedAssets(departingPersonId);
    const successorOwned = this.graph.getOwnedAssets(successorPersonId);

    // Count all company critical assets
    const allNodes = this.graph.getAllNodes();
    let totalCompanyCritical = 0;
    for (const n of allNodes) {
      const crit = n.facts.get('criticality')?.value;
      if (crit === 'critical' || crit === 'high') {
        totalCompanyCritical++;
      }
    }

    // Transferred critical count
    let transferredCritical = 0;
    let coveredAfterTransfer = 0;
    let stillExposedAfterTransfer = 0;

    for (const asset of departingOwned) {
      const node = this.graph.getNode(asset.id);
      const crit = node?.facts.get('criticality')?.value;
      const isCritical = crit === 'critical' || crit === 'high';

      if (isCritical) {
        transferredCritical++;
        // Check if asset has backup OTHER than the departing person
        const backups = this.graph.getBackups(asset.id).filter((b) => b.id !== departingPersonId);
        if (backups.length > 0) {
          coveredAfterTransfer++;
        } else {
          stillExposedAfterTransfer++;
        }
      }
    }

    const successorPriorCritical = successorOwned.filter((a) => {
      const n = this.graph.getNode(a.id);
      const c = n?.facts.get('criticality')?.value;
      return c === 'critical' || c === 'high';
    }).length;

    const successorTotalCritical = successorPriorCritical + transferredCritical;
    const sharePct = totalCompanyCritical > 0
      ? Math.round((successorTotalCritical / totalCompanyCritical) * 100)
      : 0;

    // Overload warning if successor owns > 40% of the entire company's critical automations
    const overloadWarning = sharePct >= 40 && successorTotalCritical >= 3;

    return {
      departingPersonId,
      successorPersonId,
      transferredAssetCount: departingOwned.length,
      postHandoverCoverage: {
        coveredCount: coveredAfterTransfer,
        stillExposedCount: stillExposedAfterTransfer,
      },
      successorNewConcentrationLoad: {
        totalCriticalAssetsOwned: successorTotalCritical,
        shareOfCompanyCriticalAutomationsPct: sharePct,
        overloadWarning,
      },
    };
  }

  /**
   * S4: Combined Multi-Failure Scenario (SIM-03).
   * Evaluates compound blast radius when leavers, outages, and failing assets happen simultaneously.
   *
   * DATA-03: a missing run volume is `null` (never 0) and counted in `runsUnknownCount`;
   * `runsPerWeekAffected` is the sum of the known volumes only. Orphaned assets are the
   * critical/high ones plus those whose criticality is unknown (shown as unknown, not dropped).
   */
  public simulateCombined(input: {
    departingPersonIds?: string[];
    unavailableIds?: string[];
    failingAssetIds?: string[];
  }): CombinedScenarioResult {
    const departingIds = input.departingPersonIds || [];
    const unavailableIds = input.unavailableIds || [];
    const failingAssetIds = input.failingAssetIds || [];

    const departingSet = new Set(departingIds);
    const orphanedMap = new Map<string, CombinedScenarioResult['orphanedCriticalAssets'][number]>();
    const stoppedMap = new Map<string, CombinedScenarioResult['stoppedAutomations'][number]>();
    const runsById = new Map<string, number | null>();
    const cascadeSources = new Set<string>();
    let unknownCriticality = 0;

    const toRef = (entity: { id: string; kind: any; name: string }) => ({ id: entity.id, kind: entity.kind, name: entity.name });
    const weeklyRuns = (id: string): number | null => {
      const v = this.graph.getNode(id)?.facts.get('run_volume_weekly')?.value;
      return typeof v === 'number' ? v : null;
    };
    const stop = (id: string, credentialOwner: ReturnType<typeof toRef> | null) => {
      const entity = this.graph.getNode(id)?.entity;
      if (!entity) return;
      if (!stoppedMap.has(id)) stoppedMap.set(id, { workflow: toRef(entity), credentialOwner, weeklyRuns: weeklyRuns(id) });
      runsById.set(id, weeklyRuns(id));
      cascadeSources.add(id);
    };

    // 1. Departing people: assets left with no remaining owner or backup, and
    //    automations running on their personal credentials.
    for (const personId of departingIds) {
      const personNode = this.graph.getNode(personId);
      const personRef = personNode?.entity ? toRef(personNode.entity) : null;

      for (const asset of this.graph.getOwnedAssets(personId)) {
        const critFact = this.graph.getNode(asset.id)?.facts.get('criticality');
        const criticality = (critFact?.grade === 'unknown' ? 'unknown' : (critFact?.value as CriticalityLevel)) || 'unknown';
        if (criticality !== 'critical' && criticality !== 'high' && criticality !== 'unknown') continue;

        const remainingOwners = this.graph.getOwners(asset.id).filter((o) => !departingSet.has(o.id));
        const remainingBackups = this.graph.getBackups(asset.id).filter((b) => !departingSet.has(b.id));
        if (remainingOwners.length > 0 || remainingBackups.length > 0) continue;

        if (!orphanedMap.has(asset.id)) {
          if (criticality === 'unknown') unknownCriticality++;
          orphanedMap.set(asset.id, { asset: toRef(asset), priorOwner: personRef, criticality });
          runsById.set(asset.id, weeklyRuns(asset.id));
          cascadeSources.add(asset.id);
        }
      }

      for (const edge of this.graph.getEdgesForEntity(personId)) {
        if (edge.type === 'runs_on_credentials_of' && edge.toId === personId) stop(edge.fromId, personRef);
      }
    }

    // 2. Unavailable models / vendors / apps: whatever calls or depends on them directly stops.
    for (const unavailId of unavailableIds) {
      for (const edge of this.graph.getEdgesForEntity(unavailId)) {
        if ((edge.type === 'calls_model' || edge.type === 'depends_on') && edge.toId === unavailId) stop(edge.fromId, null);
      }
    }

    // 3. Failing assets stop themselves.
    for (const failId of failingAssetIds) stop(failId, null);

    // Cascade: everything that depends on something already broken, minus what is already listed.
    const listed = new Set<string>([...orphanedMap.keys(), ...stoppedMap.keys(), ...unavailableIds, ...departingIds]);
    const downstreamMap = new Map<string, ReturnType<typeof toRef>>();
    for (const src of cascadeSources) {
      for (const dsId of this.graph.getDownstreamImpact(src)) {
        const ds = this.graph.getNode(dsId)?.entity;
        if (ds && !listed.has(dsId)) downstreamMap.set(dsId, toRef(ds));
      }
    }

    let runsPerWeekAffected = 0;
    let runsUnknownCount = 0;
    for (const runs of runsById.values()) {
      if (runs === null) runsUnknownCount++;
      else runsPerWeekAffected += runs;
    }

    return {
      orphanedCriticalAssets: Array.from(orphanedMap.values()),
      stoppedAutomations: Array.from(stoppedMap.values()),
      runsPerWeekAffected,
      runsUnknownCount,
      downstream: Array.from(downstreamMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      unknownFactsEncountered: unknownCriticality + runsUnknownCount,
    };
  }

  /**
   * S6: Worst Single Loss Ranking (SIM-06).
   * Ranks vendors and models by total downstream impact (weekly runs and automations halted).
   * In strict adherence to Product Invariant SEC-07, PEOPLE ARE NEVER RANKED.
   * Reports only an aggregate count of individuals holding >= threshold unbacked critical assets.
   */
  public rankWorstLosses(threshold: number = 2): {
    vendorsAndModels: Array<{ entity: Ref; automationsHalted: number; runsPerWeekAffected: number; runsUnknownCount: number }>;
    peopleHoldingManyUnbacked: number;
    threshold: number;
  } {
    const allNodes = this.graph.getAllNodes();
    const vendorsAndModels: Array<{ entity: Ref; automationsHalted: number; runsPerWeekAffected: number; runsUnknownCount: number }> = [];

    const toRef = (entity: any) => ({
      id: entity.id,
      kind: entity.kind,
      name: entity.name,
    });

    for (const node of allNodes) {
      if (node.entity.kind === 'model' || node.entity.kind === 'vendor') {
        const entityId = node.entity.id;
        const affectedWorkflows = new Map<string, number | null>();

        const edges = this.graph.getEdgesForEntity(entityId);
        for (const edge of edges) {
          if (
            (edge.type === 'calls_model' || edge.type === 'depends_on') &&
            edge.toId === entityId
          ) {
            const wfNode = this.graph.getNode(edge.fromId);
            if (wfNode?.entity) {
              const runs = wfNode.facts.get('run_volume_weekly')?.value;
              affectedWorkflows.set(wfNode.entity.id, typeof runs === 'number' ? runs : null); // unknown ≠ 0
            }
          }
        }

        let totalRuns = 0;
        let runsUnknownCount = 0;
        for (const r of affectedWorkflows.values()) {
          if (r === null) runsUnknownCount++;
          else totalRuns += r;
        }

        vendorsAndModels.push({
          entity: toRef(node.entity),
          automationsHalted: affectedWorkflows.size,
          runsPerWeekAffected: totalRuns,
          runsUnknownCount,
        });
      }
    }

    vendorsAndModels.sort((a, b) => {
      if (b.runsPerWeekAffected !== a.runsPerWeekAffected) {
        return b.runsPerWeekAffected - a.runsPerWeekAffected;
      }
      return b.automationsHalted - a.automationsHalted;
    });

    let peopleHoldingManyUnbacked = 0;

    for (const node of allNodes) {
      if (node.entity.kind === 'person') {
        const statusFact = node.facts.get('status');
        if (statusFact?.value === 'departed') {
          continue;
        }

        const ownedAssets = this.graph.getOwnedAssets(node.entity.id);
        let unbackedCriticalCount = 0;

        for (const asset of ownedAssets) {
          const assetNode = this.graph.getNode(asset.id);
          const crit = assetNode?.facts.get('criticality')?.value;
          const isCritical = crit === 'critical' || crit === 'high';

          if (isCritical) {
            const backups = this.graph.getBackups(asset.id);
            if (backups.length === 0) {
              unbackedCriticalCount++;
            }
          }
        }

        if (unbackedCriticalCount >= threshold) {
          peopleHoldingManyUnbacked++;
        }
      }
    }

    return {
      vendorsAndModels,
      peopleHoldingManyUnbacked,
      threshold,
    };
  }
}

