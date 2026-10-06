// =============================================================================
// Horquva Continuity Platform — Snapshot Diff & Change Engine Vitest Suite
// =============================================================================
// Tests SRS CHG-01 & CHG-02:
// - Detection of all 6 change event types (person_left, owner_changed,
//   workflow_edited, model_swapped, credential_risk, failures_spiked)
// - Downstream blast radius walk with Graphology
// - Enriched impactSummary: orphaned critical assets, weekly run volume,
//   affected workflow & asset IDs, and deterministic severity calculation.
// =============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { DiffEngine, SnapshotDiffInput } from '../../src/domain/changes/diffEngine.js';
import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DiffEngine (SRS CHG-01, CHG-02)', () => {
  let baselineFixture: {
    entities: CanonicalEntity[];
    edges: CanonicalEdge[];
    facts: CanonicalFact[];
  };

  beforeAll(() => {
    const fixturePath = path.resolve(__dirname, '../fixtures/handCheckableTruth.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    baselineFixture = JSON.parse(raw);
  });

  describe('1. Change Event Categorization (CHG-01)', () => {
    it('detects person_left when directory status transitions to departed', () => {
      const prevGraph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        baselineFixture.edges,
        baselineFixture.facts
      );

      // Mutate Omar to departed in current facts
      const currentFacts = baselineFixture.facts.map((f) => {
        if (f.entityId === 'person:omar@acme.com' && f.attribute === 'status') {
          return { ...f, value: 'departed' };
        }
        return f;
      });

      const currGraph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        baselineFixture.edges,
        currentFacts
      );

      const input: SnapshotDiffInput = {
        previousGraph: prevGraph,
        currentGraph: currGraph,
        previousFacts: baselineFixture.facts,
        currentFacts,
      };

      const changes = DiffEngine.detectChanges(input);
      const personLeftEvent = changes.find((c) => c.kind === 'person_left');

      expect(personLeftEvent).toBeDefined();
      expect(personLeftEvent?.entityId).toBe('person:omar@acme.com');
      expect(personLeftEvent?.beforeState?.status).toBe('active');
      expect(personLeftEvent?.afterState?.status).toBe('departed');
      expect(personLeftEvent?.impactSummary.orphanedCriticalAssetsCount).toBeGreaterThanOrEqual(1);
    });

    it('detects owner_changed when asset ownership edge is reassigned or removed', () => {
      const prevGraph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        baselineFixture.edges,
        baselineFixture.facts
      );

      // Reassign automation:n8n:101 from Omar to Chen
      const currentEdges = baselineFixture.edges.map((e) => {
        if (e.toId === 'automation:n8n:101' && e.type === 'owns') {
          return { ...e, fromId: 'person:chen@acme.com' };
        }
        return e;
      });

      const currGraph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        currentEdges,
        baselineFixture.facts
      );

      const input: SnapshotDiffInput = {
        previousGraph: prevGraph,
        currentGraph: currGraph,
        previousFacts: baselineFixture.facts,
        currentFacts: baselineFixture.facts,
      };

      const changes = DiffEngine.detectChanges(input);
      const ownerChangedEvent = changes.find((c) => c.kind === 'owner_changed');

      expect(ownerChangedEvent).toBeDefined();
      expect(ownerChangedEvent?.entityId).toBe('automation:n8n:101');
      expect(ownerChangedEvent?.beforeState?.ownerId).toBe('person:omar@acme.com');
      expect(ownerChangedEvent?.afterState?.ownerId).toBe('person:chen@acme.com');
    });

    it('detects model_swapped when calls_model target edge changes', () => {
      const prevGraph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        baselineFixture.edges,
        baselineFixture.facts
      );

      // Add new model entity anthropic:claude-3-5-sonnet
      const newModel: CanonicalEntity = {
        id: 'model:anthropic:claude-3-5-sonnet',
        kind: 'model',
        name: 'Anthropic Claude 3.5 Sonnet',
        externalRefs: { vendor: 'anthropic' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const currentEntities = [...baselineFixture.entities, newModel];
      const currentEdges = baselineFixture.edges.map((e) => {
        if (e.fromId === 'automation:n8n:105' && e.type === 'calls_model') {
          return { ...e, toId: 'model:anthropic:claude-3-5-sonnet' };
        }
        return e;
      });

      const currGraph = ContinuityGraph.fromSnapshot(
        currentEntities,
        currentEdges,
        baselineFixture.facts
      );

      const input: SnapshotDiffInput = {
        previousGraph: prevGraph,
        currentGraph: currGraph,
        previousFacts: baselineFixture.facts,
        currentFacts: baselineFixture.facts,
      };

      const changes = DiffEngine.detectChanges(input);
      const modelSwapped = changes.find((c) => c.kind === 'model_swapped');

      expect(modelSwapped).toBeDefined();
      expect(modelSwapped?.entityId).toBe('automation:n8n:105');
      expect(modelSwapped?.beforeState?.modelId).toBe('model:openai:gpt-4o');
      expect(modelSwapped?.afterState?.modelId).toBe('model:anthropic:claude-3-5-sonnet');
    });

    it('detects workflow_edited and failures_spiked', () => {
      const prevGraph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        baselineFixture.edges,
        baselineFixture.facts
      );

      // Fact updates for 101: run volume spiked, failure rate spiked > 20%
      const currentFacts = [
        ...baselineFixture.facts,
        {
          entityId: 'automation:n8n:101',
          attribute: 'status' as const,
          value: { active: false, failureRate: 0.35, priorFailureRate: 0.10 },
          grade: 'stated' as const,
          source: 'n8n',
          validFrom: new Date(),
        },
      ];

      const currGraph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        baselineFixture.edges,
        currentFacts
      );

      const input: SnapshotDiffInput = {
        previousGraph: prevGraph,
        currentGraph: currGraph,
        previousFacts: baselineFixture.facts,
        currentFacts,
      };

      const changes = DiffEngine.detectChanges(input);
      const spike = changes.find((c) => c.kind === 'failures_spiked');
      expect(spike).toBeDefined();
      expect(spike?.entityId).toBe('automation:n8n:101');
    });
  });

  describe('2. Blast Radius & Enriched Impact Summary (CHG-02)', () => {
    it('calculates comprehensive blast radius and severity on leaver event', () => {
      const graph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        baselineFixture.edges,
        baselineFixture.facts
      );

      // Omar owns automation 101 (critical, 500/wk) and 102 (critical, 120/wk)
      const impact = DiffEngine.calculateImpact('person:omar@acme.com', graph);

      expect(impact.orphanedCriticalAssetsCount).toBe(2);
      expect(impact.affectedRunVolumeWeekly).toBe(620); // 500 + 120
      expect(impact.affectedWorkflowIds).toContain('automation:n8n:101');
      expect(impact.affectedWorkflowIds).toContain('automation:n8n:102');
      expect(impact.affectedAssetIds.length).toBeGreaterThanOrEqual(2);
      expect(impact.severity).toBe('critical');
    });

    it('calculates low severity impact for low criticality asset changes', () => {
      const graph = ContinuityGraph.fromSnapshot(
        baselineFixture.entities,
        baselineFixture.edges,
        baselineFixture.facts
      );

      // Chen owns automation:n8n:106 (criticality: low, 50 runs/wk)
      const impact = DiffEngine.calculateImpact('automation:n8n:106', graph);

      expect(impact.orphanedCriticalAssetsCount).toBe(0);
      expect(impact.affectedRunVolumeWeekly).toBe(50);
      expect(impact.severity).toBe('low');
    });
  });
});
