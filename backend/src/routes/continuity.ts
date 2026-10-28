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

import { DataService } from '../services/dataService.js';
import { spofAssets, coverageTrend, coverageHistory, exposureByCause, HISTORY_MAX_DAYS } from '../views/overviewViews.js';
import { WeeklyBriefingService } from '../services/briefing/weeklyBriefing.js';
import { runOrphanScan, orphanScanCsv } from '../services/orphanScan/orphanScanService.js';

/**
 * Loads the active snapshot from PostgreSQL or falls back to DataService.
 */
async function loadGraphFromDatabase(): Promise<ContinuityGraph> {
  try {
    const entitiesRes = await query(`SELECT id, kind, name, description, external_refs, created_at, updated_at FROM entity;`);
    if (entitiesRes && entitiesRes.rows && entitiesRes.rows.length > 0) {
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
  } catch (_err) {
    // Fall back to DataService benchmark graph
  }
  return DataService.getInstance().getGraph();
}

// 1. Overview: Headline Metrics & Alerts
continuityRouter.get('/overview', async (_req: Request, res: Response) => {
  try {
    const graph = await loadGraphFromDatabase();
    const metrics = calculateHeadlineMetrics(graph);
    const checks = evaluateAllChecks(graph);
    const trend = await coverageTrend(metrics);

    res.json({
      metrics,
      trend,
      exposureByCause: exposureByCause(checks),
      activeAlerts: checks.filter((c) => c.status === 'FAIL'),
      unknownChecks: checks.filter((c) => c.status === 'UNKNOWN'),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch overview metrics.' });
  }
});

// 1a. Coverage history for the Overview chart (daily snapshots + today's live counts)
continuityRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days ?? '60'), 10) || 60, 7), HISTORY_MAX_DAYS);
    const metrics = calculateHeadlineMetrics(await loadGraphFromDatabase());
    res.json({ days, points: await coverageHistory(metrics, days) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load coverage history.' });
  }
});

// 1b. Single points of failure for the Overview card (critical assets hanging on one person)
continuityRouter.get('/spof-assets', (req: Request, res: Response) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '5'), 10) || 5, 1), 50);
  res.json({ assets: spofAssets(DataService.getInstance(), limit) });
});

// 1c. Orphan scan: what is already orphaned on the current graph (JSON, or ?format=csv)
continuityRouter.get('/orphan-scan', async (req: Request, res: Response) => {
  try {
    const ds = DataService.getInstance();
    const connections = ds.isPersistent()
      ? (await query(`SELECT id, type, name FROM connection ORDER BY name`)).rows.map((r: any) => ({ id: r.id, type: r.type, name: r.name }))
      : [];
    const result = runOrphanScan(ds.getGraph(), new Date(), {
      departures: ds.getDepartures(),
      connectionsScanned: connections,
      // With saved connections, the directory counts as connected only if one is Entra or Google.
      ...(connections.length ? { directoryConnected: connections.some((c) => c.type === 'entra' || c.type === 'google') } : {}),
    });
    if (req.query.format === 'csv') {
      res
        .type('text/csv')
        .attachment(`orphan-scan-${result.scannedAt.slice(0, 10)}.csv`)
        .send(orphanScanCsv(result));
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to run the orphan scan.' });
  }
});

// 2. Inventory: Filterable catalog
continuityRouter.get('/inventory', async (req: Request, res: Response) => {
  try {
    // Same source as every other screen (Postgres snapshot, else the DataService graph),
    // so pickers work wherever the rest of the app does.
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
    const graph = await loadGraphFromDatabase();
    const entities = graph
      .getAllNodes()
      .map((n) => n.entity)
      .filter((e) => !kind || e.kind === kind)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({ id: e.id, kind: e.kind, name: e.name, description: e.description ?? null, external_refs: e.externalRefs ?? {} }));
    res.json({ entities });
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

// S4: Combined Multi-Failure Scenario (SIM-03)
const CombinedSimSchema = z.object({
  departingPersonIds: z.array(z.string()).optional(),
  unavailableIds: z.array(z.string()).optional(),
  failingAssetIds: z.array(z.string()).optional(),
});

continuityRouter.post('/simulations/combined', async (req: Request, res: Response) => {
  const parsed = CombinedSimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid combined simulation parameters.' });
    return;
  }

  const { departingPersonIds = [], unavailableIds = [], failingAssetIds = [] } = parsed.data;
  if (departingPersonIds.length + unavailableIds.length + failingAssetIds.length === 0) {
    res.status(400).json({ error: 'Pick at least one person, service or asset.' });
    return;
  }

  try {
    const graph = await loadGraphFromDatabase();
    // An id the graph doesn't know would silently simulate "no impact" — reject it instead.
    const unknownIds = [...departingPersonIds, ...unavailableIds, ...failingAssetIds].filter((id) => !graph.getNode(id));
    const notPeople = departingPersonIds.filter((id) => graph.getNode(id) && graph.getNode(id)!.entity.kind !== 'person');
    if (unknownIds.length > 0 || notPeople.length > 0) {
      res.status(400).json({
        error: unknownIds.length > 0 ? `Unknown ids: ${unknownIds.join(', ')}` : `Not people: ${notPeople.join(', ')}`,
      });
      return;
    }
    const sim = new SimulationEngine(graph);
    const result = sim.simulateCombined(parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate combined scenario.' });
  }
});

// S6: Worst Single Loss Ranking (SIM-06, SEC-07)
continuityRouter.get('/simulations/worst-losses', async (req: Request, res: Response) => {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string, 10) : 2;
    const graph = await loadGraphFromDatabase();
    const sim = new SimulationEngine(graph);
    const result = sim.rankWorstLosses(isNaN(threshold) ? 2 : threshold);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to rank worst losses.' });
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

// 7. Weekly Briefing — written on request by the same service that emails it (CHG-03).
// Returns the figures the prose was written from, and whether AI or the template wrote it.
continuityRouter.get('/briefing', async (_req: Request, res: Response) => {
  try {
    const b = await WeeklyBriefingService.compileBriefing(DataService.getInstance());
    res.json({
      success: true,
      briefing: b.prose,
      writtenBy: b.writtenBy,
      generatedAt: b.generatedAt,
      figures: {
        headline: b.headline,
        upcomingDepartures: b.upcomingDepartures.length,
        overdueDepartures: b.overdueDepartures.length,
        singlePointsOfFailure: b.spofAssets.length,
        personalCredentialAutomations: b.credentialExposures.length,
        recentFailures: b.recentFailures.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate weekly briefing.' });
  }
});
