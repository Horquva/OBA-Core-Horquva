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

    return {
      orphanedCriticalAssets: orphanedAssets,
      stoppedPersonalCredentialAutomations: brokenCredentialAutomations,
      totalRunsPerWeekAffected: totalWeeklyRuns,
      affectedDownstreamAssetIds: Array.from(affectedDownstreamIds),
      unknownFactsEncountered: unknownFactsCount,
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
}
