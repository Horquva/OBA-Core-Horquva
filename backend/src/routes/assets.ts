// =============================================================================
// Horquva Continuity Platform — Assets REST API
// =============================================================================
// Implements SRS UI-03 & DATA-05:
// - GET /api/assets (Asset catalog with FactView evidence badges)
// - GET /api/assets/:id (Asset detail with checks, dependencies, and SCD2 fact history)
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { evaluateAllChecks } from '../domain/checks/index.js';
import { CheckResult, CheckStatus, FactAttribute } from '@horquva/types';
import { booleanFactView, criticalityView, edgeFactView, numberFactView, toIso } from '../views/factViews.js';

export const assetsRouter = Router();

/** checks is computed once per request by the caller; evaluating per row made the catalog O(n²). */
function formatAssetRow(node: any, dataService: DataService, checks: CheckResult[]) {
  const graph = dataService.getGraph();
  const entity = node.entity;
  const facts = node.facts;

  // Evidence comes from the records themselves (factViews.ts) — no assumed grades, sources or defaults.
  const criticality = criticalityView(facts.get('criticality'));
  const isCritical = criticality.level === 'critical' || criticality.level === 'high';

  let checkStatus: CheckStatus = 'PASS';
  const mine = checks.filter((c) => c.entityId === entity.id);
  if (mine.some((c) => c.status === 'FAIL')) checkStatus = 'FAIL';
  else if (mine.some((c) => c.status === 'UNKNOWN')) checkStatus = 'UNKNOWN';

  return {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    isCritical,
    owner: edgeFactView(graph, entity.id, 'owns'),
    backup: edgeFactView(graph, entity.id, 'backs_up'),
    criticality,
    documented: booleanFactView(facts.get('documented'), { yes: 'Runbook documented', no: 'Undocumented' }),
    fallback: booleanFactView(facts.get('fallback_exists'), { yes: 'Configured', no: 'None' }),
    runsPerWeek: numberFactView(facts.get('run_volume_weekly')),
    checkStatus,
  };
}

// 1. GET /api/assets
assetsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const graph = dataService.getGraph();
    const allNodes = graph.getAllNodes();

    // Assets: automations, processes, apps
    const assetNodes = allNodes.filter(
      (n) => n.entity.kind === 'automation' || n.entity.kind === 'process' || n.entity.kind === 'app'
    );

    const checks = evaluateAllChecks(graph);
    const assets = assetNodes.map((n) => formatAssetRow(n, dataService, checks));
    res.json({ assets });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch assets.' });
  }
});

// 2. GET /api/assets/:id
assetsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const assetId = decodeURIComponent(String(req.params.id));
    const dataService = DataService.getInstance();
    const graph = dataService.getGraph();
    const node = graph.getNode(assetId);

    if (!node) {
      res.status(404).json({ error: `Asset ${assetId} not found.` });
      return;
    }

    const allChecks = evaluateAllChecks(graph);
    const asset = formatAssetRow(node, dataService, allChecks);
    const checks = allChecks.filter((c) => c.entityId === assetId);

    // Dependencies (upstream and downstream)
    const upstream: any[] = [];
    const downstream: any[] = [];

    const edges = graph.getEdgesForEntity(assetId);
    for (const e of edges) {
      if (e.toId === assetId && e.fromId !== assetId) {
        const uNode = graph.getNode(e.fromId);
        if (uNode?.entity) {
          upstream.push({ id: uNode.entity.id, kind: uNode.entity.kind, name: uNode.entity.name });
        }
      } else if (e.fromId === assetId && e.toId !== assetId) {
        const dNode = graph.getNode(e.toId);
        if (dNode?.entity) {
          downstream.push({ id: dNode.entity.id, kind: dNode.entity.kind, name: dNode.entity.name });
        }
      }
    }

    // SCD2 Fact History
    const factStore = dataService.getFactStore();
    const attributes: FactAttribute[] = ['criticality', 'documented', 'fallback_exists', 'run_volume_weekly', 'status'];
    const history: any[] = [];

    for (const attr of attributes) {
      const records = await factStore.getFactHistory(assetId, attr);
      for (const r of records) {
        history.push({
          attribute: r.attribute,
          display: typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value),
          state: r.grade === 'unknown' || r.value === undefined || r.value === null ? 'unknown' : 'value',
          grade: r.grade,
          source: r.source,
          changedBy: r.attestedBy || null,
          validFrom: toIso(r.validFrom) || new Date().toISOString(),
          validTo: toIso(r.validTo),
        });
      }
    }

    // Sort history by validFrom DESC
    history.sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime());

    res.json({
      asset,
      checks,
      upstream,
      downstream,
      history,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch asset detail.' });
  }
});
