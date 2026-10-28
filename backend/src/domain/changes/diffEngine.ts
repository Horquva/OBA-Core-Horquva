// =============================================================================
// Horquva Continuity Platform — Snapshot Diff & Change Engine
// =============================================================================
// Implements Snapshot Diffing and Downstream Blast Radius Detection (CHG-01, CHG-02).
// Detects these event kinds:
// - person_left, person_reenabled, person_moved (directory lifecycle)
// - owner_changed
// - workflow_edited
// - model_swapped
// - credential_risk
// - failures_spiked
// Traverses Graphology reachability to compute enriched impact summaries with severity.
// =============================================================================

import crypto from 'node:crypto';
import {
  ChangeEvent,
  ChangeEventKind,
  CanonicalFact,
  CanonicalEdge,
  CanonicalEntity,
} from '@horquva/types';
import { ContinuityGraph } from '../graph/index.js';

export interface EnrichedImpactSummary {
  orphanedCriticalAssetsCount: number;
  affectedRunVolumeWeekly: number;
  affectedWorkflowIds: string[];
  affectedAssetIds: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface SnapshotDiffInput {
  previousGraph: ContinuityGraph;
  currentGraph: ContinuityGraph;
  previousFacts: CanonicalFact[];
  currentFacts: CanonicalFact[];
  syncRunId?: string;
}

export class DiffEngine {
  /**
   * Compares two snapshots and produces typed ChangeEvents with calculated impact summaries.
   */
  public static detectChanges(input: SnapshotDiffInput): ChangeEvent[] {
    const changes: ChangeEvent[] = [];
    const prevNodes = input.previousGraph.getAllNodes();
    const currNodes = input.currentGraph.getAllNodes();

    const prevNodeMap = new Map<string, { entity: CanonicalEntity; facts: Map<any, CanonicalFact> }>();
    for (const n of prevNodes) {
      prevNodeMap.set(n.entity.id, n);
    }

    const currNodeMap = new Map<string, { entity: CanonicalEntity; facts: Map<any, CanonicalFact> }>();
    for (const n of currNodes) {
      currNodeMap.set(n.entity.id, n);
    }

    // 1. Directory lifecycle: person_left, person_reenabled, person_moved. Only for
    // someone already known before this sync: a person who first appears
    // already departed was never "here" as far as we can tell.
    const managerOf = (graph: ContinuityGraph, id: string) => graph.getManager(id)?.id ?? null;
    // Entra/CSV record a department; Google's equivalent is the org unit.
    const placeOf = (e: CanonicalEntity) => e.externalRefs?.department || e.externalRefs?.orgUnitPath || null;
    for (const [entityId, currNode] of currNodeMap.entries()) {
      if (currNode.entity.kind === 'person') {
        const prevNode = prevNodeMap.get(entityId);
        if (!prevNode) continue;
        const prevStatus = prevNode.facts.get('status')?.value || 'active';
        const currStatus = currNode.facts.get('status')?.value || 'active';

        if (prevStatus === 'departed' && currStatus === 'active') {
          changes.push({
            id: crypto.randomUUID(),
            kind: 'person_reenabled',
            entityId,
            beforeState: { status: prevStatus },
            afterState: { status: currStatus },
            impactSummary: this.calculateImpact(entityId, input.currentGraph),
            detectedAt: new Date(),
          });
        }

        // A move needs both sides known: a value appearing for the first time is not a move.
        const [prevPlace, currPlace] = [placeOf(prevNode.entity), placeOf(currNode.entity)];
        const [prevManager, currManager] = [managerOf(input.previousGraph, entityId), managerOf(input.currentGraph, entityId)];
        const placeChanged = !!prevPlace && !!currPlace && prevPlace !== currPlace;
        const managerChanged = !!prevManager && !!currManager && prevManager !== currManager;
        if (currStatus === 'active' && (placeChanged || managerChanged)) {
          changes.push({
            id: crypto.randomUUID(),
            kind: 'person_moved',
            entityId,
            beforeState: { ...(placeChanged ? { department: prevPlace } : {}), ...(managerChanged ? { managerId: prevManager } : {}) },
            afterState: { ...(placeChanged ? { department: currPlace } : {}), ...(managerChanged ? { managerId: currManager } : {}) },
            impactSummary: this.calculateImpact(entityId, input.currentGraph),
            detectedAt: new Date(),
          });
        }

        if (prevStatus === 'active' && currStatus === 'departed') {
          const impact = this.calculateImpact(entityId, input.currentGraph);
          changes.push({
            id: crypto.randomUUID(),
            kind: 'person_left',
            entityId,
            beforeState: { status: prevStatus },
            afterState: { status: currStatus },
            impactSummary: impact,
            detectedAt: new Date(),
          });
        }
      }
    }

    // 2. Detect owner_changed (Asset ownership reassignment)
    for (const [entityId, currNode] of currNodeMap.entries()) {
      if (currNode.entity.kind === 'automation' || currNode.entity.kind === 'app') {
        const prevOwners = input.previousGraph.getOwners(entityId);
        const currOwners = input.currentGraph.getOwners(entityId);

        const prevOwnerId = prevOwners[0]?.id;
        const currOwnerId = currOwners[0]?.id;

        if (prevOwnerId && currOwnerId && prevOwnerId !== currOwnerId) {
          const impact = this.calculateImpact(entityId, input.currentGraph);
          changes.push({
            id: crypto.randomUUID(),
            kind: 'owner_changed',
            entityId,
            beforeState: { ownerId: prevOwnerId },
            afterState: { ownerId: currOwnerId },
            impactSummary: impact,
            detectedAt: new Date(),
          });
        }
      }
    }

    // 3. Detect model_swapped (calls_model edge target updated)
    const prevEdges = input.previousGraph.getAllEdges();
    const currEdges = input.currentGraph.getAllEdges();

    const prevModelCalls = new Map<string, string>();
    for (const e of prevEdges) {
      if (e.type === 'calls_model' && !e.validTo) {
        prevModelCalls.set(e.fromId, e.toId);
      }
    }

    for (const e of currEdges) {
      if (e.type === 'calls_model' && !e.validTo) {
        const priorModel = prevModelCalls.get(e.fromId);
        if (priorModel && priorModel !== e.toId) {
          const impact = this.calculateImpact(e.fromId, input.currentGraph);
          changes.push({
            id: crypto.randomUUID(),
            kind: 'model_swapped',
            entityId: e.fromId,
            beforeState: { modelId: priorModel },
            afterState: { modelId: e.toId },
            impactSummary: impact,
            detectedAt: new Date(),
          });
        }
      }
    }

    // 4. Detect credential_risk (Workflow reassigned to personal credentials)
    const prevCreds = new Map<string, string>();
    for (const e of prevEdges) {
      if (e.type === 'runs_on_credentials_of' && !e.validTo) {
        prevCreds.set(e.fromId, e.toId);
      }
    }

    for (const e of currEdges) {
      if (e.type === 'runs_on_credentials_of' && !e.validTo) {
        const priorCred = prevCreds.get(e.fromId);
        if (priorCred && priorCred !== e.toId && e.toId.startsWith('person:')) {
          const impact = this.calculateImpact(e.fromId, input.currentGraph);
          changes.push({
            id: crypto.randomUUID(),
            kind: 'credential_risk',
            entityId: e.fromId,
            beforeState: { credentialOwnerId: priorCred },
            afterState: { credentialOwnerId: e.toId },
            impactSummary: impact,
            detectedAt: new Date(),
          });
        }
      }
    }

    // 5. Detect failures_spiked & workflow_edited from facts
    for (const [entityId, currNode] of currNodeMap.entries()) {
      if (currNode.entity.kind === 'automation') {
        const currStatusFact = currNode.facts.get('status');
        if (currStatusFact && typeof currStatusFact.value === 'object' && currStatusFact.value !== null) {
          const val = currStatusFact.value;
          if (
            typeof val.failureRate === 'number' &&
            typeof val.priorFailureRate === 'number' &&
            val.failureRate - val.priorFailureRate >= 0.20
          ) {
            const impact = this.calculateImpact(entityId, input.currentGraph);
            changes.push({
              id: crypto.randomUUID(),
              kind: 'failures_spiked',
              entityId,
              beforeState: { failureRate: val.priorFailureRate },
              afterState: { failureRate: val.failureRate },
              impactSummary: impact,
              detectedAt: new Date(),
            });
          }

          if (val.active === false && prevNodeMap.get(entityId)?.facts.get('status')?.value?.active !== false) {
            const impact = this.calculateImpact(entityId, input.currentGraph);
            changes.push({
              id: crypto.randomUUID(),
              kind: 'workflow_edited',
              entityId,
              beforeState: { active: true },
              afterState: { active: false },
              impactSummary: impact,
              detectedAt: new Date(),
            });
          }
        }
      }
    }

    return changes;
  }

  /**
   * Calculates downstream blast radius, affected workflows, total run volume, and severity.
   */
  public static calculateImpact(startEntityId: string, graph: ContinuityGraph): EnrichedImpactSummary {
    const affectedAssetIds = new Set<string>();
    const affectedWorkflowIds = new Set<string>();
    let orphanedCriticalAssetsCount = 0;
    let affectedRunVolumeWeekly = 0;
    let hasCriticalAsset = false;
    let hasHighAsset = false;
    let hasMediumAsset = false;

    const startNode = graph.getNode(startEntityId);
    const startEntity = startNode?.entity;

    // If starting node is a person, begin with all assets owned by this person
    const directlyAffectedAssets: CanonicalEntity[] =
      startEntity?.kind === 'person' ? graph.getOwnedAssets(startEntityId) : startEntity ? [startEntity] : [];

    for (const asset of directlyAffectedAssets) {
      affectedAssetIds.add(asset.id);
      if (asset.kind === 'automation') {
        affectedWorkflowIds.add(asset.id);
      }

      // Check downstream dependencies
      const downstream = graph.getDownstreamImpact(asset.id);
      for (const downId of downstream) {
        affectedAssetIds.add(downId);
        const downNode = graph.getNode(downId);
        if (downNode?.entity?.kind === 'automation') {
          affectedWorkflowIds.add(downId);
        }
      }
    }

    // Aggregate facts across all affected assets
    for (const assetId of affectedAssetIds) {
      const node = graph.getNode(assetId);
      if (!node) continue;

      const critFact = node.facts.get('criticality')?.value;
      if (critFact === 'critical') {
        hasCriticalAsset = true;
        orphanedCriticalAssetsCount++;
      } else if (critFact === 'high') {
        hasHighAsset = true;
      } else if (critFact === 'medium') {
        hasMediumAsset = true;
      }

      const volFact = node.facts.get('run_volume_weekly')?.value;
      if (typeof volFact === 'number') {
        affectedRunVolumeWeekly += volFact;
      }
    }

    // Deterministic severity classification
    let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (orphanedCriticalAssetsCount > 0 || hasCriticalAsset || affectedRunVolumeWeekly >= 1000) {
      severity = 'critical';
    } else if (hasHighAsset || affectedRunVolumeWeekly >= 500) {
      severity = 'high';
    } else if (hasMediumAsset || affectedRunVolumeWeekly > 100) {
      severity = 'medium';
    }

    return {
      orphanedCriticalAssetsCount,
      affectedRunVolumeWeekly,
      affectedWorkflowIds: Array.from(affectedWorkflowIds),
      affectedAssetIds: Array.from(affectedAssetIds),
      severity,
    };
  }
}
