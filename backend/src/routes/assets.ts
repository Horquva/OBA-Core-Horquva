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
import { CriticalityLevel, EvidenceGrade, CheckStatus, FactAttribute } from '@horquva/types';

export const assetsRouter = Router();

function toIso(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  try {
    return new Date(d).toISOString();
  } catch {
    return String(d);
  }
}

function formatAssetRow(node: any, dataService: DataService) {
  const graph = dataService.getGraph();
  const entity = node.entity;
  const facts = node.facts;

  // Owners
  const owners = graph.getOwners(entity.id);
  const ownerFact = owners.length > 0
    ? {
        state: 'value' as const,
        display: owners[0].name,
        grade: 'confirmed' as EvidenceGrade,
        source: 'n8n',
        observedAt: new Date().toISOString(),
        ref: { id: owners[0].id, kind: owners[0].kind, name: owners[0].name },
      }
    : {
        state: 'none' as const,
        display: null,
        grade: 'unknown' as EvidenceGrade,
        source: null,
        observedAt: null,
        ref: null,
      };

  // Backups
  const backups = graph.getBackups(entity.id);
  const backupFact = backups.length > 0
    ? {
        state: 'value' as const,
        display: backups[0].name,
        grade: 'confirmed' as EvidenceGrade,
        source: 'attestation',
        observedAt: new Date().toISOString(),
        ref: { id: backups[0].id, kind: backups[0].kind, name: backups[0].name },
      }
    : {
        state: 'none' as const,
        display: null,
        grade: 'unknown' as EvidenceGrade,
        source: null,
        observedAt: null,
        ref: null,
      };

  // Criticality
  const critF = facts.get('criticality');
  const level: CriticalityLevel = (critF?.value as CriticalityLevel) || 'medium';
  const isCritical = level === 'critical' || level === 'high';
  const criticality = {
    level,
    grade: (critF?.grade as EvidenceGrade) || 'stated',
    source: critF?.source || 'attestation',
    observedAt: toIso(critF?.validFrom),
  };

  // Documented
  const docF = facts.get('documented');
  const documented = docF
    ? {
        state: (docF.value ? 'value' : 'none') as any,
        display: docF.value ? 'Runbook documented' : 'Undocumented',
        grade: (docF.grade as EvidenceGrade) || 'stated',
        source: docF.source,
        observedAt: toIso(docF.validFrom),
      }
    : {
        state: 'unknown' as const,
        display: 'Unknown',
        grade: 'unknown' as EvidenceGrade,
        source: null,
        observedAt: null,
      };

  // Fallback
  const fallF = facts.get('fallback_exists');
  const fallback = fallF
    ? {
        state: (fallF.value ? 'value' : 'none') as any,
        display: fallF.value ? 'Configured' : 'None',
        grade: (fallF.grade as EvidenceGrade) || 'stated',
        source: fallF.source,
        observedAt: toIso(fallF.validFrom),
      }
    : {
        state: 'unknown' as const,
        display: 'Unknown',
        grade: 'unknown' as EvidenceGrade,
        source: null,
        observedAt: null,
      };

  // Runs per week
  const runF = facts.get('run_volume_weekly');
  const runsPerWeek = runF && typeof runF.value === 'number'
    ? {
        state: 'value' as const,
        display: String(runF.value),
        grade: (runF.grade as EvidenceGrade) || 'stated',
        source: runF.source,
        observedAt: toIso(runF.validFrom),
      }
    : {
        state: 'none' as const,
        display: '0',
        grade: 'unknown' as EvidenceGrade,
        source: null,
        observedAt: null,
      };

  // Checks evaluation for this entity
  const checks = evaluateAllChecks(graph).filter((c) => c.entityId === entity.id);
  let checkStatus: CheckStatus = 'PASS';
  if (checks.some((c) => c.status === 'FAIL')) checkStatus = 'FAIL';
  else if (checks.some((c) => c.status === 'UNKNOWN')) checkStatus = 'UNKNOWN';

  return {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    isCritical,
    owner: ownerFact,
    backup: backupFact,
    criticality,
    documented,
    fallback,
    runsPerWeek,
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

    const assets = assetNodes.map((n) => formatAssetRow(n, dataService));
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

    const asset = formatAssetRow(node, dataService);
    const checks = evaluateAllChecks(graph).filter((c) => c.entityId === assetId);

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
          state: r.value !== undefined ? 'value' : 'none',
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
