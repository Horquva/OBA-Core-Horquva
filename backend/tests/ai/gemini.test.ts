// =============================================================================
// Horquva Continuity Platform — Ask Horquva & Gemini Service Test
// =============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { AskHorquvaEngine } from '../../src/ai/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Ask Horquva & Grounded Gemini Engine', () => {
  let graph: ContinuityGraph;

  beforeAll(() => {
    const fixturePath = path.resolve(__dirname, '../fixtures/handCheckableTruth.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const fixture = JSON.parse(raw);
    graph = ContinuityGraph.fromSnapshot(fixture.entities, fixture.edges, fixture.facts);
  });

  it('answers operational continuity questions with factual metrics', async () => {
    const engine = new AskHorquvaEngine();
    const answer = await engine.ask('What is our current continuity overview and metrics?', graph);

    expect(answer).toBeDefined();
    expect(answer).toContain('Total Critical Assets');
    expect(answer).toContain('4');
  });

  it('generates weekly executive continuity briefing grounded in graph data', async () => {
    const engine = new AskHorquvaEngine();
    const briefing = await engine.generateWeeklyBriefing(graph);

    expect(briefing).toBeDefined();
    expect(briefing).toContain('Weekly Operational Continuity Briefing');
    expect(briefing).toContain('4 critical operational assets');
  });
});
