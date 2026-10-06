// =============================================================================
// Horquva Continuity Platform — S4 & S6 Simulation Vitest Suite
// =============================================================================
// Tests SRS SIM-03 (S4 Combined Multi-Failure Scenario) and
// SIM-06 / SEC-07 (S6 Worst Single Loss Ranking & Zero Individual Ranking).
// =============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { SimulationEngine } from '../../src/domain/simulation/index.js';
import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SimulationEngine: S4 Combined Scenario & S6 Worst Loss Ranking', () => {
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

  describe('S4 Combined Multi-Failure Scenario (SIM-03)', () => {
    it('returns empty result when no failures or leavers specified', () => {
      const sim = new SimulationEngine(graph);
      const res = sim.simulateCombined({});

      expect(res.orphanedCriticalAssets).toEqual([]);
      expect(res.stoppedAutomations).toEqual([]);
      expect(res.runsPerWeekAffected).toBe(0);
      expect(res.downstream).toEqual([]);
      expect(res.unknownFactsEncountered).toBe(0);
    });

    it('simulates combined departure and model outage with accurate impact synthesis', () => {
      const sim = new SimulationEngine(graph);
      // Omar departs (owns 101, 102 - both unbacked critical) AND GPT-4o is unavailable (called by 105)
      const res = sim.simulateCombined({
        departingPersonIds: ['person:omar@acme.com'],
        unavailableIds: ['model:openai:gpt-4o'],
      });

      // Omar leaves -> 101 and 102 become orphaned
      expect(res.orphanedCriticalAssets.length).toBe(2);
      const orphanedIds = res.orphanedCriticalAssets.map((a) => a.asset.id);
      expect(orphanedIds).toContain('automation:n8n:101');
      expect(orphanedIds).toContain('automation:n8n:102');

      // Model outage -> 105 stopped
      const stoppedIds = res.stoppedAutomations.map((s) => s.workflow.id);
      expect(stoppedIds).toContain('automation:n8n:105');

      // Weekly runs: 101 (500) + 102 (120) + 105 (2500) = 3120
      expect(res.runsPerWeekAffected).toBe(3120);
    });

    it('deduplicates automations affected across multiple failure vectors without double counting runs', () => {
      const sim = new SimulationEngine(graph);
      // David departs (credentials of 105) AND GPT-4o unavailable (model of 105)
      const res = sim.simulateCombined({
        departingPersonIds: ['person:david@acme.com'],
        unavailableIds: ['model:openai:gpt-4o'],
      });

      // 105 should appear in stoppedAutomations without duplicate
      const matching105 = res.stoppedAutomations.filter((s) => s.workflow.id === 'automation:n8n:105');
      expect(matching105.length).toBe(1);
      // 105 weekly runs (2500) counted only once
      expect(res.runsPerWeekAffected).toBe(2500);
    });

    it('executes combined scenario in under 100ms (<500ms SLA)', () => {
      const sim = new SimulationEngine(graph);
      const start = performance.now();
      for (let i = 0; i < 20; i++) {
        sim.simulateCombined({
          departingPersonIds: ['person:omar@acme.com', 'person:david@acme.com'],
          unavailableIds: ['model:openai:gpt-4o'],
          failingAssetIds: ['automation:n8n:103'],
        });
      }
      const elapsedMs = performance.now() - start;
      const avgMs = elapsedMs / 20;
      expect(avgMs).toBeLessThan(100);
    });
  });

  describe('S6 Worst Single Loss Ranking & Zero Individual Ranking (SIM-06, SEC-07)', () => {
    it('ranks models and vendors descending by weekly runs affected', () => {
      const sim = new SimulationEngine(graph);
      const ranking = sim.rankWorstLosses(2);

      // Model gpt-4o should be ranked
      expect(ranking.vendorsAndModels.length).toBeGreaterThan(0);
      const topModel = ranking.vendorsAndModels[0];
      expect(topModel.entity.id).toBe('model:openai:gpt-4o');
      expect(topModel.automationsHalted).toBe(1);
      expect(topModel.runsPerWeekAffected).toBe(2500);
    });

    it('STRICTLY enforces SEC-07: Never returns an array of ranked or scored individuals', () => {
      const sim = new SimulationEngine(graph);
      const ranking = sim.rankWorstLosses(2) as any;

      // Invariant SEC-07: people MUST NOT be in vendorsAndModels or any individual ranking list
      expect(ranking.people).toBeUndefined();
      expect(ranking.rankedPeople).toBeUndefined();
      expect(ranking.peopleRanking).toBeUndefined();

      for (const entry of ranking.vendorsAndModels) {
        expect(entry.entity.kind).not.toBe('person');
      }

      // Instead, strictly reports aggregate count of people holding >= threshold unbacked critical assets
      expect(typeof ranking.peopleHoldingManyUnbacked).toBe('number');
      // In benchmark truth: Omar owns 2 unbacked critical assets (101, 102). So count is 1.
      expect(ranking.peopleHoldingManyUnbacked).toBe(1);
      expect(ranking.threshold).toBe(2);
    });

    it('respects custom threshold for people holding unbacked critical assets count', () => {
      const sim = new SimulationEngine(graph);
      const rankingThreshold1 = sim.rankWorstLosses(1);
      // Omar owns 2 (101, 102), Sarah is departed (owns 104). Maya owns 103 (has Chen as backup).
      // Omar owns >= 1 unbacked critical asset.
      expect(rankingThreshold1.peopleHoldingManyUnbacked).toBeGreaterThanOrEqual(1);

      const rankingThreshold5 = sim.rankWorstLosses(5);
      expect(rankingThreshold5.peopleHoldingManyUnbacked).toBe(0);
      expect(rankingThreshold5.threshold).toBe(5);
    });
  });
});
