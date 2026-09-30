// =============================================================================
// Horquva Continuity Platform — Continuity Core & Simulation Routes
// =============================================================================
// Exposes overview metrics, inventory, what-if simulations (S1-S3),
// and Ask Horquva assistant query endpoints.
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/client.js';
import { ContinuityGraph } from '../domain/graph/index.js';
import { calculateHeadlineMetrics, evaluateAllChecks } from '../domain/checks/index.js';
import { SimulationEngine } from '../domain/simulation/index.js';
import { AskHorquvaEngine } from '../ai/gemini.js';
import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';

export const continuityRouter = Router();
const askEngine = new AskHorquvaEngine();

/**
 * Loads the active snapshot from PostgreSQL and instantiates ContinuityGraph.
 */
async function loadGraphFromDatabase(): Promise<ContinuityGraph> {
  const entitiesRes = await query(`SELECT id, kind, name, description, external_refs, created_at, updated_at FROM entity;`);
  const edgesRes = await query(`SELECT id, from_id, to_id, type, grade, source, source_ref, valid_from, valid_to FROM edge WHERE valid_to IS NULL;`);
  const factsRes = await query(`SELECT id, entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to FROM fact WHERE valid_to IS NULL;`);

  const entities: CanonicalEntity[] = entitiesRes.rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    description: r.description,
    externalRefs: r.external_refs || {},
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));

  const edges: CanonicalEdge[] = edgesRes.rows.map((r) => ({
    id: r.id,
    fromId: r.from_id,
    toId: r.to_id,
    type: r.type,
    grade: r.grade,
    source: r.source,
    sourceRef: r.source_ref,
    validFrom: new Date(r.valid_from),
    validTo: r.valid_to ? new Date(r.valid_to) : null,
  }));

  const facts: CanonicalFact[] = factsRes.rows.map((r) => ({
    id: r.id,
    entityId: r.entity_id,
    attribute: r.attribute,
    value: r.value,
    grade: r.grade,
    source: r.source,
    sourceRef: r.source_ref,
    attestedBy: r.attested_by,
    validFrom: new Date(r.valid_from),
    validTo: r.valid_to ? new Date(r.valid_to) : null,
  }));

  return ContinuityGraph.fromSnapshot(entities, edges, facts);
}

// 1. Overview: Headline Metrics & Alerts
continuityRouter.get('/overview', async (_req: Request, res: Response) => {
  try {
    const graph = await loadGraphFromDatabase();
    const metrics = calculateHeadlineMetrics(graph);
    const checks = evaluateAllChecks(graph);

    res.json({
      metrics,
      activeAlerts: checks.filter((c) => c.status === 'FAIL'),
      unknownChecks: checks.filter((c) => c.status === 'UNKNOWN'),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch overview metrics.' });
  }
});

// 2. Inventory: Filterable catalog
continuityRouter.get('/inventory', async (req: Request, res: Response) => {
  try {
    const kind = req.query.kind as string;
    let sql = `SELECT id, kind, name, description, external_refs, updated_at FROM entity`;
    const params: any[] = [];
    if (kind) {
      sql += ` WHERE kind = $1`;
      params.push(kind);
    }
    sql += ` ORDER BY name ASC;`;

    const entitiesRes = await query(sql, params);
    res.json({ entities: entitiesRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch inventory.' });
  }
});

// 3. S1: Leaver Simulation
const LeaverSimSchema = z.object({
  departingPersonIds: z.array(z.string()).min(1),
});

continuityRouter.post('/simulations/leaver', async (req: Request, res: Response) => {
  const parsed = LeaverSimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'departingPersonIds array is required.' });
    return;
  }

  try {
    const graph = await loadGraphFromDatabase();
    const sim = new SimulationEngine(graph);
    const result = sim.simulateDeparture(parsed.data.departingPersonIds);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate departure.' });
  }
});

// 4. S2: Outage Simulation
const OutageSimSchema = z.object({
  modelEntityId: z.string().min(1),
});

continuityRouter.post('/simulations/outage', async (req: Request, res: Response) => {
  const parsed = OutageSimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'modelEntityId is required.' });
    return;
  }

  try {
    const graph = await loadGraphFromDatabase();
    const sim = new SimulationEngine(graph);
    const result = sim.simulateModelOutage(parsed.data.modelEntityId);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate outage.' });
  }
});

// 5. S3: Succession Test
const SuccessionSimSchema = z.object({
  departingPersonId: z.string().min(1),
  successorPersonId: z.string().min(1),
});

continuityRouter.post('/simulations/succession', async (req: Request, res: Response) => {
  const parsed = SuccessionSimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'departingPersonId and successorPersonId are required.' });
    return;
  }

  try {
    const graph = await loadGraphFromDatabase();
    const sim = new SimulationEngine(graph);
    const result = sim.testSuccession(parsed.data.departingPersonId, parsed.data.successorPersonId);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to test succession.' });
  }
});

// 6. Ask Horquva AI Query
const AskSchema = z.object({
  query: z.string().min(1),
});

continuityRouter.post('/assistant/ask', async (req: Request, res: Response) => {
  const parsed = AskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Query string is required.' });
    return;
  }

  try {
    const graph = await loadGraphFromDatabase();
    const answer = await askEngine.ask(parsed.data.query, graph);
    res.json({ success: true, answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process AI query.' });
  }
});

// 7. Weekly Briefing
continuityRouter.get('/briefing', async (_req: Request, res: Response) => {
  try {
    const graph = await loadGraphFromDatabase();
    const briefing = await askEngine.generateWeeklyBriefing(graph);
    res.json({ success: true, briefing });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate weekly briefing.' });
  }
});
