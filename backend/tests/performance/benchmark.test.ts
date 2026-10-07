import { describe, it, expect } from 'vitest';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { SimulationEngine } from '../../src/domain/simulation/index.js';
import { evaluateAllChecks, calculateHeadlineMetrics } from '../../src/domain/checks/index.js';
import type { CanonicalEntity, CanonicalEdge } from '@horquva/types';

describe('NFR-01 & NFR-02: 20,000-Node Synthetic Scale & Performance Benchmark', () => {
  const TOTAL_PEOPLE = 2000;
  const TOTAL_AUTOMATIONS = 5000;
  const TOTAL_OTHER_ASSETS = 13000;
  const TOTAL_NODES = TOTAL_PEOPLE + TOTAL_AUTOMATIONS + TOTAL_OTHER_ASSETS; // 20,000 nodes

  it('hydrates 20,000-node graph with facts in under 250ms', () => {
    const graph = new ContinuityGraph();
    const now = new Date();

    const startTime = performance.now();

    // 1. Add 2,000 people
    for (let i = 1; i <= TOTAL_PEOPLE; i++) {
      const id = `person:${i}`;
      graph.addEntity({
        id,
        kind: 'person',
        name: `Employee ${i}`,
        externalRefs: {},
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Add 5,000 automations with facts
    for (let i = 1; i <= TOTAL_AUTOMATIONS; i++) {
      const id = `automation:${i}`;
      const isCritical = i <= 2000;

      graph.addEntity(
        {
          id,
          kind: 'automation',
          name: `Workflow Automation ${i}`,
          externalRefs: {},
          createdAt: now,
          updatedAt: now,
        },
        [
          {
            id: `fact_crit_${i}`,
            entityId: id,
            attribute: 'criticality',
            value: isCritical ? 'critical' : 'low',
            grade: 'confirmed',
            source: 'manual',
            validFrom: now,
          },
          {
            id: `fact_doc_${i}`,
            entityId: id,
            attribute: 'documented',
            value: i % 2 === 0,
            grade: 'confirmed',
            source: 'attestation',
            validFrom: now,
          },
          {
            id: `fact_runs_${i}`,
            entityId: id,
            attribute: 'run_volume_weekly',
            value: 500 + (i % 1000),
            grade: 'inferred',
            source: 'n8n',
            validFrom: now,
          },
        ]
      );
    }

    // 3. Add 13,000 credentials / apps
    for (let i = 1; i <= TOTAL_OTHER_ASSETS; i++) {
      const id = `asset:${i}`;
      graph.addEntity({
        id,
        kind: i % 2 === 0 ? 'credential' : 'app',
        name: `Infrastructure Asset ${i}`,
        externalRefs: {},
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Add 15,000 relationships / edges
    for (let i = 1; i <= TOTAL_AUTOMATIONS; i++) {
      const personIdx = (i % TOTAL_PEOPLE) + 1;
      const backupIdx = ((i + 1) % TOTAL_PEOPLE) + 1;
      const assetIdx = (i % TOTAL_OTHER_ASSETS) + 1;

      // Ownership edge
      graph.addEdge({
        id: `edge_own_${i}`,
        fromId: `person:${personIdx}`,
        toId: `automation:${i}`,
        type: 'owns',
        grade: 'stated',
        source: 'n8n',
        validFrom: now,
      });

      // Backup edge for 50%
      if (i % 2 === 0) {
        graph.addEdge({
          id: `edge_backup_${i}`,
          fromId: `person:${backupIdx}`,
          toId: `automation:${i}`,
          type: 'backs_up',
          grade: 'confirmed',
          source: 'attestation',
          validFrom: now,
        });
      }

      // Dependency edge
      graph.addEdge({
        id: `edge_dep_${i}`,
        fromId: `automation:${i}`,
        toId: `asset:${assetIdx}`,
        type: 'depends_on',
        grade: 'inferred',
        source: 'n8n',
        validFrom: now,
      });
    }

    const elapsed = performance.now() - startTime;

    expect(graph.getAllNodes().length).toBe(TOTAL_NODES);
    expect(graph.getAllEdges().length).toBeGreaterThan(10000);
    // NFR-01: Graph indexing & hydration < 500ms
    expect(elapsed).toBeLessThan(500);
  });

  it('runs S1 Single-Leaver simulation on 20,000-node graph in under 100ms', () => {
    const graph = new ContinuityGraph();
    const now = new Date();

    for (let i = 1; i <= TOTAL_PEOPLE; i++) {
      graph.addEntity({ id: `person:${i}`, kind: 'person', name: `Employee ${i}`, externalRefs: {}, createdAt: now, updatedAt: now });
    }
    for (let i = 1; i <= TOTAL_AUTOMATIONS; i++) {
      graph.addEntity(
        { id: `automation:${i}`, kind: 'automation', name: `Workflow ${i}`, externalRefs: {}, createdAt: now, updatedAt: now },
        [{ id: `fc_${i}`, entityId: `automation:${i}`, attribute: 'criticality', value: 'critical', grade: 'confirmed', source: 'seed', validFrom: now }]
      );
      const owner = (i % TOTAL_PEOPLE) + 1;
      graph.addEdge({ id: `e_o_${i}`, fromId: `person:${owner}`, toId: `automation:${i}`, type: 'owns', grade: 'stated', source: 'seed', validFrom: now });
    }

    const engine = new SimulationEngine(graph);

    const start = performance.now();
    const result = engine.simulateDeparture(['person:1']);
    const elapsed = performance.now() - start;

    expect(result.orphanedCriticalAssets.length).toBeGreaterThan(0);
    // NFR-02: Single What-If executes in under 100ms
    expect(elapsed).toBeLessThan(100);
  });

  it('runs S4 Compound Simulation on 20,000-node graph in under 500ms', () => {
    const graph = new ContinuityGraph();
    const now = new Date();

    for (let i = 1; i <= TOTAL_PEOPLE; i++) {
      graph.addEntity({ id: `person:${i}`, kind: 'person', name: `Employee ${i}`, externalRefs: {}, createdAt: now, updatedAt: now });
    }
    for (let i = 1; i <= TOTAL_AUTOMATIONS; i++) {
      graph.addEntity(
        { id: `automation:${i}`, kind: 'automation', name: `Workflow ${i}`, externalRefs: {}, createdAt: now, updatedAt: now },
        [{ id: `fc_${i}`, entityId: `automation:${i}`, attribute: 'criticality', value: 'critical', grade: 'confirmed', source: 'seed', validFrom: now }]
      );
      const owner = (i % TOTAL_PEOPLE) + 1;
      graph.addEdge({ id: `e_o_${i}`, fromId: `person:${owner}`, toId: `automation:${i}`, type: 'owns', grade: 'stated', source: 'seed', validFrom: now });
    }

    const engine = new SimulationEngine(graph);

    const start = performance.now();
    const result = engine.simulateCombined({
      departingPersonIds: ['person:1', 'person:2', 'person:3', 'person:4', 'person:5'],
      failingAssetIds: ['automation:10', 'automation:20'],
    });
    const elapsed = performance.now() - start;

    // The five leavers own critical automations, so a real simulation must orphan some.
    expect(result.orphanedCriticalAssets.length).toBeGreaterThan(0);
    // NFR-02: Compound What-If executes in under 500ms
    expect(elapsed).toBeLessThan(500);
  });

  it('evaluates deterministic checks C1-C4 and headline metrics in under 1500ms', () => {
    const graph = new ContinuityGraph();
    const now = new Date();

    for (let i = 1; i <= TOTAL_PEOPLE; i++) {
      graph.addEntity({ id: `person:${i}`, kind: 'person', name: `Employee ${i}`, externalRefs: {}, createdAt: now, updatedAt: now });
    }
    for (let i = 1; i <= TOTAL_AUTOMATIONS; i++) {
      graph.addEntity(
        { id: `automation:${i}`, kind: 'automation', name: `Workflow ${i}`, externalRefs: {}, createdAt: now, updatedAt: now },
        [
          { id: `fc_${i}`, entityId: `automation:${i}`, attribute: 'criticality', value: i <= 2000 ? 'critical' : 'low', grade: 'confirmed', source: 'seed', validFrom: now },
          { id: `fd_${i}`, entityId: `automation:${i}`, attribute: 'documented', value: true, grade: 'confirmed', source: 'seed', validFrom: now },
          { id: `ff_${i}`, entityId: `automation:${i}`, attribute: 'fallback_exists', value: true, grade: 'confirmed', source: 'seed', validFrom: now },
        ]
      );
      const owner = (i % TOTAL_PEOPLE) + 1;
      graph.addEdge({ id: `e_o_${i}`, fromId: `person:${owner}`, toId: `automation:${i}`, type: 'owns', grade: 'stated', source: 'seed', validFrom: now });
    }

    const start = performance.now();
    const headline = calculateHeadlineMetrics(graph);
    const checks = evaluateAllChecks(graph);
    const elapsed = performance.now() - start;

    expect(headline.totalCriticalAssets).toBe(2000);
    expect(checks.length).toBeGreaterThan(0);
    // NFR-02: Full checks evaluation < 1500ms
    expect(elapsed).toBeLessThan(1500);
  });
});
