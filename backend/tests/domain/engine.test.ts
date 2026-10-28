// =============================================================================
// Horquva Continuity Platform — Domain & Inference Engine Vitest Suite
// =============================================================================
// Tests graph construction, deterministic checks (C1-C4), headline metrics,
// What-If simulations (S1-S3), and deterministic A/B testing allocator
// against the 10-person hand-checkable truth fixture.
// =============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import {
  evaluateAllChecks,
  calculateHeadlineMetrics,
  UnbackedCriticalAssetCheck,
  DepartedOwnerCheck,
  UndocumentedCriticalAssetCheck,
  KeyOutlivesOwnerCheck,
} from '../../src/domain/checks/index.js';
import { SimulationEngine } from '../../src/domain/simulation/index.js';
import { ABTestingEngine } from '../../src/domain/ab/index.js';
import { CanonicalEntity, CanonicalEdge, CanonicalFact, EntityKind, FactAttribute } from '@horquva/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Continuity Domain Engine', () => {
  let graph: ContinuityGraph;
  let fixture: {
    entities: CanonicalEntity[];
    edges: CanonicalEdge[];
    facts: CanonicalFact[];
  };

  beforeAll(() => {
    const fixturePath = path.resolve(__dirname, '../fixtures/handCheckableTruth.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    fixture = JSON.parse(raw);
    graph = ContinuityGraph.fromSnapshot(fixture.entities, fixture.edges, fixture.facts);
  });

  describe('Graph Construction & Traversal', () => {
    it('populates all nodes, edges, and active facts', () => {
      expect(graph.getAllNodes().length).toBe(fixture.entities.length);
      expect(graph.getAllEdges().length).toBe(fixture.edges.length);
    });

    it('identifies asset owners and human backups accurately', () => {
      const owners101 = graph.getOwners('automation:n8n:101');
      expect(owners101.map((o) => o.id)).toEqual(['person:omar@acme.com']);

      const backups103 = graph.getBackups('automation:n8n:103');
      expect(backups103.map((b) => b.id)).toEqual(['person:chen@acme.com']);

      const backups101 = graph.getBackups('automation:n8n:101');
      expect(backups101.length).toBe(0);
    });
  });

  describe('Deterministic Checks (C1 - C4)', () => {
    it('C1: flags unbacked critical assets and passes backed ones', () => {
      const node103 = graph.getNode('automation:n8n:103')!;
      const res103 = UnbackedCriticalAssetCheck.evaluate(node103.entity, node103.facts, graph);
      expect(res103?.status).toBe('PASS');

      const node101 = graph.getNode('automation:n8n:101')!;
      const res101 = UnbackedCriticalAssetCheck.evaluate(node101.entity, node101.facts, graph);
      expect(res101?.status).toBe('FAIL');
      expect(res101?.reason).toContain('0 backups assigned');
    });

    it('C2: flags departed owner on active asset (Sarah Connor)', () => {
      const node104 = graph.getNode('automation:n8n:104')!;
      const res104 = DepartedOwnerCheck.evaluate(node104.entity, node104.facts, graph);
      expect(res104?.status).toBe('FAIL');
      expect(res104?.reason).toContain('Sarah Connor');
    });

    it('C3: flags undocumented critical asset and marks missing facts as UNKNOWN', () => {
      const node102 = graph.getNode('automation:n8n:102')!;
      const res102 = UndocumentedCriticalAssetCheck.evaluate(node102.entity, node102.facts, graph);
      expect(res102?.status).toBe('FAIL');

      const node104 = graph.getNode('automation:n8n:104')!;
      const res104 = UndocumentedCriticalAssetCheck.evaluate(node104.entity, node104.facts, graph);
      expect(res104?.status).toBe('UNKNOWN');
    });

    it('computes exact company headline metrics', () => {
      const metrics = calculateHeadlineMetrics(graph);
      expect(metrics.totalCriticalAssets).toBe(4); // 101, 102, 103, 104
      expect(metrics.fullyCoveredCriticalAssets).toBe(1); // 103 (has backup, doc, fallback)
      expect(metrics.exposedCriticalAssets).toBe(3); // 101, 102, 104
      expect(metrics.unknownCriticalFacts).toBeGreaterThan(0);
    });
  });

  describe('What-If Simulation Engine (S1 - S3)', () => {
    it('S1: simulates single departure of Omar (orphaned assets and lost run volume)', () => {
      const sim = new SimulationEngine(graph);
      const result = sim.simulateDeparture(['person:omar@acme.com']);

      expect(result.orphanedCriticalAssets.length).toBe(2);
      const orphanedIds = result.orphanedCriticalAssets.map((a) => a.entityId);
      expect(orphanedIds).toContain('automation:n8n:101');
      expect(orphanedIds).toContain('automation:n8n:102');
      expect(result.totalRunsPerWeekAffected).toBe(620); // 500 + 120
    });

    it('S1: simulates departure of David with personal credentials stopping automations', () => {
      const sim = new SimulationEngine(graph);
      const result = sim.simulateDeparture(['person:david@acme.com']);

      expect(result.stoppedPersonalCredentialAutomations.length).toBe(1);
      expect(result.stoppedPersonalCredentialAutomations[0].workflowId).toBe('automation:n8n:105');
      expect(result.stoppedPersonalCredentialAutomations[0].weeklyRuns).toBe(2500);
      expect(result.totalRunsPerWeekAffected).toBe(2500);
    });

    it('S2: simulates OpenAI gpt-4o outage disrupting dependent automations', () => {
      const sim = new SimulationEngine(graph);
      const result = sim.simulateModelOutage('model:openai:gpt-4o');

      expect(result.affectedAutomations.length).toBe(1);
      expect(result.affectedAutomations[0].id).toBe('automation:n8n:105');
      expect(result.totalRunsPerWeekAffected).toBe(2500);
    });

    it('S3: tests succession handover from Omar to Maya with concentration load', () => {
      const sim = new SimulationEngine(graph);
      const result = sim.testSuccession('person:omar@acme.com', 'person:maya@acme.com');

      expect(result.transferredAssetCount).toBe(2);
      expect(result.successorNewConcentrationLoad.totalCriticalAssetsOwned).toBe(3); // 1 prior + 2 transferred
      expect(result.successorNewConcentrationLoad.shareOfCompanyCriticalAutomationsPct).toBe(75); // 3 of 4 = 75%
      expect(result.successorNewConcentrationLoad.overloadWarning).toBe(true);
    });
  });

  describe('A/B Testing Deterministic Allocator', () => {
    it('allocates the exact same variant deterministically on every call', () => {
      const variants = [
        { name: 'control', weight: 50 },
        { name: 'variant_a', weight: 50 },
      ];

      const variant1 = ABTestingEngine.assignVariant('exp_attestation_form', 'omar@acme.com', variants);
      const variant2 = ABTestingEngine.assignVariant('exp_attestation_form', 'omar@acme.com', variants);
      const variant3 = ABTestingEngine.assignVariant('exp_attestation_form', 'omar@acme.com', variants);

      expect(variant1).toBe(variant2);
      expect(variant2).toBe(variant3);
    });

    it('distributes distinct subjects across variants according to weights', () => {
      const variants = [
        { name: 'control', weight: 50 },
        { name: 'variant_a', weight: 50 },
      ];

      const assignments = fixture.entities
        .filter((e) => e.kind === 'person')
        .map((p) => ABTestingEngine.assignVariant('exp_attestation_form', p.id, variants));

      const hasControl = assignments.includes('control');
      const hasVariantA = assignments.includes('variant_a');
      expect(hasControl).toBe(true);
      expect(hasVariantA).toBe(true);
    });
  });
});

// ── Vendor keys: the central key rule and C5 ────────────────────────────────
describe('vendor keys', () => {
  const now = new Date();
  const entity = (id: string, kind: EntityKind, name = id, externalRefs: Record<string, string> = {}): CanonicalEntity => ({ id, kind, name, externalRefs, createdAt: now, updatedAt: now });
  const fact = (entityId: string, attribute: FactAttribute, value: unknown): CanonicalFact => ({ entityId, attribute, value, grade: 'stated', source: 'connector:test', validFrom: now });
  const owns = (fromId: string, toId: string): CanonicalEdge => ({ fromId, toId, type: 'owns', grade: 'stated', source: 'connector:test', validFrom: now });

  const OMAR = 'person:omar@acme.com';
  const assets = ['automation:n8n:1', 'automation:n8n:2', 'credential:openai:k1', 'credential:openai:k2', 'credential:anthropic:k3'];

  it('getOwnedAssets leaves vendor keys out unless asked for', () => {
    const g = ContinuityGraph.fromSnapshot(
      [entity(OMAR, 'person'), ...assets.map((id) => entity(id, id.startsWith('automation') ? 'automation' : 'credential'))],
      assets.map((id) => owns(OMAR, id)),
      []
    );
    expect(g.getOwnedAssets(OMAR).map((a) => a.id)).toEqual(['automation:n8n:1', 'automation:n8n:2']);
    expect(g.getOwnedAssets(OMAR, { includeVendorKeys: true })).toHaveLength(5);
  });

  const c5 = (owner: CanonicalEntity | null, ownerStatus: string | null, keyFacts: Array<[FactAttribute, unknown]> = []) => {
    const key = entity('credential:openai:key', 'credential', 'Key');
    const g = ContinuityGraph.fromSnapshot(
      [key, ...(owner ? [owner] : [])],
      owner ? [owns(owner.id, key.id)] : [],
      [...(owner && ownerStatus ? [fact(owner.id, 'status', ownerStatus)] : []), ...keyFacts.map(([a, v]) => fact(key.id, a, v))]
    );
    return KeyOutlivesOwnerCheck.evaluate(key, g.getNode(key.id)!.facts, g)?.status;
  };
  const omar = entity(OMAR, 'person', 'Omar Farooq');

  it('C5: FAIL when the owner left or lost project access', () => {
    expect(c5(omar, 'departed')).toBe('FAIL');
    expect(c5(omar, 'active', [['owner_access', 'inactive']])).toBe('FAIL');
  });

  it('C5: FAIL for a key whose owner Entra synced with accountEnabled false, with no departure recorded', () => {
    // The Entra connector writes status 'departed' for a disabled account (B3 keeps accountEnabled in refs).
    expect(c5(entity(OMAR, 'person', 'Omar Farooq', { entraId: 'e-omar', accountEnabled: 'false' }), 'departed')).toBe('FAIL');
  });

  it('C5: PASS for a service-account key or an active owner; UNKNOWN with no owner or no status', () => {
    expect(c5(null, null, [['owner_type', 'service_account']])).toBe('PASS');
    expect(c5(omar, 'active')).toBe('PASS');
    expect(c5(null, null)).toBe('UNKNOWN');
    expect(c5(omar, null)).toBe('UNKNOWN');
  });

  it('C5 ignores everything but vendor keys', () => {
    const n8nCred = entity('credential:n8n:1', 'credential');
    const g = ContinuityGraph.fromSnapshot([n8nCred], [], []);
    expect(KeyOutlivesOwnerCheck.evaluate(n8nCred, g.getNode(n8nCred.id)!.facts, g)).toBeNull();
  });

  it("S1 lists the leaver's keys in keysAtRisk without counting them as orphaned assets", () => {
    const key = entity('credential:anthropic:k9', 'credential', 'Claude key', { vendor: 'anthropic' });
    const g = ContinuityGraph.fromSnapshot([omar, key], [owns(OMAR, key.id)], [fact(key.id, 'last_used_at', 1793000000)]);
    const result = new SimulationEngine(g).simulateDeparture([OMAR]);
    expect(result.orphanedCriticalAssets).toEqual([]);
    expect(result.keysAtRisk).toEqual([
      { keyId: key.id, keyName: 'Claude key', ownerId: OMAR, vendor: 'anthropic', lastUsedAt: new Date(1793000000 * 1000).toISOString() },
    ]);
    // No keys, no field: existing results keep their exact shape.
    expect('keysAtRisk' in new SimulationEngine(g).simulateDeparture(['person:nobody@acme.com'])).toBe(false);
  });
});

describe('vendor keys stay out of criticality work', () => {
  const now = new Date();
  const key: CanonicalEntity = { id: 'credential:openai:orphan', kind: 'credential', name: 'Orphan key', externalRefs: {}, createdAt: now, updatedAt: now };
  const owned: CanonicalEntity = { id: 'credential:openai:owned', kind: 'credential', name: 'Owned key', externalRefs: {}, createdAt: now, updatedAt: now };
  const omar: CanonicalEntity = { id: 'person:omar@acme.com', kind: 'person', name: 'Omar', externalRefs: {}, createdAt: now, updatedAt: now };
  const g = () =>
    ContinuityGraph.fromSnapshot([omar, key, owned], [{ fromId: omar.id, toId: owned.id, type: 'owns', grade: 'stated', source: 'connector:test', validFrom: now }], []);

  it('the all-unknown-critical campaign does not ask about keys', async () => {
    const { previewCampaign } = await import('../../src/attestation/attestationService.js');
    const preview = previewCampaign(g(), { kind: 'all_unknown_critical' });
    expect(preview.tasks.map((t) => t.assetEntityId)).not.toContain(owned.id);
    expect(preview.unassignedAssets.map((a: any) => a.id ?? a)).not.toContain(key.id);
  });

  it('Ask does not count keys as assets with unknown criticality', async () => {
    const { answerFromGraph } = await import('../../src/ai/graphAnswers.js');
    expect(answerFromGraph('which critical assets have no backup?', g())).not.toMatch(/unknown criticality/);
  });
});
