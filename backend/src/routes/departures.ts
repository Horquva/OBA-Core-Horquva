// =============================================================================
// Horquva Continuity Platform — Departures REST API
// =============================================================================
// Implements SRS HND-01 through HND-05:
// - GET /api/departures (Summaries with grouping)
// - GET /api/departures/:id (Detailed handover pack, credentials, watchLog)
// - POST /api/departures (Initiate departure)
// - POST /api/departures/:id/succession-test (Simulation & overload checks)
// - PUT /api/departures/:id/successors (Update assigned successors)
// - POST /api/departures/:id/acceptance-requests (Request successor acceptance)
// - POST /api/departures/:id/account-disabled (Stage 4) and /verify (Stage 5)
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService, DepartureRecord } from '../services/dataService.js';
import { CriticalityLevel, EvidenceGrade } from '@horquva/types';
import { DepartureError, initiateDeparture } from '../handover/departureService.js';
import {
  SuccessionError,
  markAccountDisabled,
  nameSuccessors,
  requestAcceptance,
  verifyDeparture,
} from '../handover/successionService.js';

function sendSuccessionError(res: Response, err: any, fallback: string): void {
  if (err instanceof SuccessionError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: err?.message || fallback });
}

export const departuresRouter = Router();

/** The person's team from a `member_of` edge; null when the graph doesn't say (never a guess). */
function teamOf(personId: string, dataService: DataService): string | null {
  const graph = dataService.getGraph();
  const edge = graph.getEdgesForEntity(personId).find((e) => e.type === 'member_of' && e.fromId === personId);
  return edge ? graph.getNode(edge.toId)?.entity?.name ?? null : null;
}

function formatSummary(dep: DepartureRecord, dataService: DataService) {
  const graph = dataService.getGraph();
  const personNode = graph.getNode(dep.personId);
  const person = personNode?.entity
    ? { id: personNode.entity.id, kind: personNode.entity.kind, name: personNode.entity.name }
    : { id: dep.personId, kind: 'person' as const, name: dep.personId.replace('person:', '') };

  const assetsTotal = dep.handovers.length;
  const assetsHandedOver = dep.handovers.filter((h) => h.acceptance === 'accepted').length;

  const now = new Date();
  const leaveTime = new Date(dep.leaveDate).getTime();
  let group: 'upcoming' | 'in_handover' | 'departed' = 'upcoming';
  if (leaveTime < now.getTime()) {
    group = 'departed';
  } else if (dep.stage === 'successor_named' || dep.stage === 'accepted') {
    group = 'in_handover';
  }

  // Has alert if any handover is for a critical asset without an accepted successor
  let hasAlert = false;
  for (const h of dep.handovers) {
    const node = graph.getNode(h.assetId);
    const crit = node?.facts.get('criticality')?.value;
    if ((crit === 'critical' || crit === 'high') && h.acceptance !== 'accepted') {
      hasAlert = true;
      break;
    }
  }

  return {
    id: dep.id,
    person,
    role: personNode?.entity?.description || null,
    team: teamOf(dep.personId, dataService),
    leaveDate: dep.leaveDate,
    stage: dep.stage,
    assetsTotal,
    assetsHandedOver,
    hasAlert,
    detectedFrom: dep.detectedFrom,
    group,
  };
}

// 1. GET /api/departures
departuresRouter.get('/', (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const records = dataService.getDepartures();
    const summaries = records.map((r) => formatSummary(r, dataService));
    res.json({ departures: summaries });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch departures.' });
  }
});

// 2. GET /api/departures/:id
departuresRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const depId = String(req.params.id);
    const dep = dataService.getDeparture(depId);
    if (!dep) {
      res.status(404).json({ error: `Departure ${depId} not found.` });
      return;
    }

    const summary = formatSummary(dep, dataService);
    const graph = dataService.getGraph();

    // Map handovers
    const handover = dep.handovers.map((h) => {
      const assetNode = graph.getNode(h.assetId);
      const asset = assetNode?.entity
        ? { id: assetNode.entity.id, kind: assetNode.entity.kind, name: assetNode.entity.name }
        : { id: h.assetId, kind: 'automation' as const, name: h.assetId };

      const critFact = assetNode?.facts.get('criticality');
      const criticality: CriticalityLevel = (critFact?.value as CriticalityLevel) || 'medium';

      // Report the backup edge's real evidence, not a blanket 'confirmed'.
      const backupEdge = graph
        .getEdgesForEntity(h.assetId)
        .find((e) => e.type === 'backs_up' && e.toId === h.assetId && e.fromId !== dep.personId);
      const backupEntity = backupEdge ? graph.getNode(backupEdge.fromId)?.entity : undefined;
      const currentBackup = backupEdge && backupEntity
        ? {
            state: 'value' as const,
            display: backupEntity.name,
            grade: backupEdge.grade as EvidenceGrade,
            source: backupEdge.source,
            observedAt: new Date(backupEdge.validFrom).toISOString(),
            ref: { id: backupEntity.id, kind: backupEntity.kind, name: backupEntity.name },
          }
        : {
            state: 'none' as const,
            display: null,
            grade: 'unknown' as EvidenceGrade,
            source: null,
            observedAt: null,
            ref: null,
          };

      let successor = null;
      if (h.successorId) {
        const succNode = graph.getNode(h.successorId);
        successor = succNode?.entity
          ? { id: succNode.entity.id, kind: succNode.entity.kind, name: succNode.entity.name }
          : { id: h.successorId, kind: 'person' as const, name: h.successorId.replace('person:', '') };
      }

      // Suggest only someone the graph backs: the existing backup. No backup → no suggestion.
      const suggestion = !successor && backupEntity
        ? {
            person: { id: backupEntity.id, kind: backupEntity.kind, name: backupEntity.name },
            reason: 'Existing designated backup',
          }
        : null;

      return {
        id: h.id,
        asset,
        criticality,
        currentBackup,
        successor,
        suggestion,
        acceptance: h.acceptance,
      };
    });

    // Personal credentials
    const personalCredentialAutomations: Array<{ workflow: any; weeklyRuns: number | null }> = [];
    const edges = graph.getEdgesForEntity(dep.personId);
    for (const edge of edges) {
      if (edge.type === 'runs_on_credentials_of' && edge.toId === dep.personId) {
        const wfNode = graph.getNode(edge.fromId);
        if (wfNode?.entity) {
          const runs = typeof wfNode.facts.get('run_volume_weekly')?.value === 'number'
            ? (wfNode.facts.get('run_volume_weekly')!.value as number)
            : null;
          personalCredentialAutomations.push({
            workflow: { id: wfNode.entity.id, kind: wfNode.entity.kind, name: wfNode.entity.name },
            weeklyRuns: runs,
          });
        }
      }
    }

    // Undocumented assets: only a recorded "documented = false". A missing fact is unknown, not undocumented (DATA-03).
    const undocumented: any[] = [];
    for (const h of dep.handovers) {
      const node = graph.getNode(h.assetId);
      const docFact = node?.facts.get('documented');
      if (docFact && docFact.grade !== 'unknown' && docFact.value === false) {
        if (node?.entity) {
          undocumented.push({ id: node.entity.id, kind: node.entity.kind, name: node.entity.name });
        }
      }
    }

    // Watch log
    const watchLog = [
      {
        at: dep.createdAt,
        workflow: handover.length > 0 ? handover[0].asset : { id: 'sys', kind: 'system' as const, name: 'System' },
        message: `Departure workflow initiated for ${summary.person.name}. Handover checklist generated.`,
        severity: 'info' as const,
      },
    ];

    res.json({
      ...summary,
      stageTimestamps: dep.stageTimestamps,
      handover,
      personalCredentialAutomations,
      undocumented,
      watchLog,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch departure detail.' });
  }
});

// 3. POST /api/departures
const InitiateDepartureSchema = z.object({
  personId: z.string().min(1),
  leaveDate: z.string().min(1),
  note: z.string().nullable().optional(),
});

departuresRouter.post('/', (req: Request, res: Response) => {
  const parsed = InitiateDepartureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid departure initiation parameters.' });
    return;
  }

  try {
    const record = initiateDeparture(DataService.getInstance(), {
      personId: parsed.data.personId,
      leaveDate: parsed.data.leaveDate,
      note: parsed.data.note ?? null,
    });
    res.status(201).json({ id: record.id, handoverPack: record.handoverPack?.summary ?? null });
  } catch (err: any) {
    if (err instanceof DepartureError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message || 'Failed to initiate departure.' });
  }
});

// 3b. GET /api/departures/:id/handover-pack (HND-02 JSON manifest)
departuresRouter.get('/:id/handover-pack', (req: Request, res: Response) => {
  const dep = DataService.getInstance().getDeparture(String(req.params.id));
  if (!dep) {
    res.status(404).json({ error: `Departure ${req.params.id} not found.` });
    return;
  }
  if (!dep.handoverPack) {
    res.status(404).json({ error: 'This departure predates handover packs; no pack was compiled.' });
    return;
  }
  res.json(dep.handoverPack);
});

// 4. POST /api/departures/:id/succession-test
const SuccessionTestSchema = z.object({
  assignments: z.array(
    z.object({
      assetId: z.string(),
      successorId: z.string(),
    })
  ),
});

departuresRouter.post('/:id/succession-test', (req: Request, res: Response) => {
  const parsed = SuccessionTestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'assignments array required.' });
    return;
  }

  try {
    const dataService = DataService.getInstance();
    const graph = dataService.getGraph();

    // Count all company critical assets
    const allNodes = graph.getAllNodes();
    let totalCompanyCritical = 0;
    for (const n of allNodes) {
      const crit = n.facts.get('criticality')?.value;
      if (crit === 'critical' || crit === 'high') {
        totalCompanyCritical++;
      }
    }

    const successorMap = new Map<string, number>();
    let coveredCount = 0;
    let stillExposedCount = 0;

    for (const a of parsed.data.assignments) {
      const node = graph.getNode(a.assetId);
      const crit = node?.facts.get('criticality')?.value;
      const isCrit = crit === 'critical' || crit === 'high';

      if (a.successorId) {
        coveredCount++;
        if (isCrit) {
          successorMap.set(a.successorId, (successorMap.get(a.successorId) || 0) + 1);
        }
      } else {
        stillExposedCount++;
      }
    }

    const loads: any[] = [];
    for (const [successorId, transferredCritical] of successorMap.entries()) {
      const succNode = graph.getNode(successorId);
      const succOwned = graph.getOwnedAssets(successorId);
      const priorCritical = succOwned.filter((o) => {
        const n = graph.getNode(o.id);
        const c = n?.facts.get('criticality')?.value;
        return c === 'critical' || c === 'high';
      }).length;

      const totalOwned = priorCritical + transferredCritical;
      const sharePct = totalCompanyCritical > 0
        ? Math.round((totalOwned / totalCompanyCritical) * 100)
        : 0;

      const overloadWarning = sharePct >= 40 && totalOwned >= 3;

      loads.push({
        successor: succNode?.entity
          ? { id: succNode.entity.id, kind: succNode.entity.kind, name: succNode.entity.name }
          : { id: successorId, kind: 'person', name: successorId.replace('person:', '') },
        totalCriticalAssetsOwned: totalOwned,
        shareOfCompanyCriticalAutomationsPct: sharePct,
        overloadWarning,
      });
    }

    res.json({
      coveredCount,
      stillExposedCount,
      loads,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate succession plan.' });
  }
});

// 5. PUT /api/departures/:id/successors
departuresRouter.put('/:id/successors', (req: Request, res: Response) => {
  const parsed = SuccessionTestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'assignments array required.' });
    return;
  }

  try {
    const dep = nameSuccessors(DataService.getInstance(), String(req.params.id), parsed.data.assignments);
    res.json({ success: true, stage: dep.stage });
  } catch (err: any) {
    sendSuccessionError(res, err, 'Failed to update successors.');
  }
});

// 6. POST /api/departures/:id/acceptance-requests
departuresRouter.post('/:id/acceptance-requests', (req: Request, res: Response) => {
  try {
    const result = requestAcceptance(DataService.getInstance(), String(req.params.id));
    res.json({ success: true, ...result });
  } catch (err: any) {
    sendSuccessionError(res, err, 'Failed to send acceptance requests.');
  }
});

// 7. POST /api/departures/:id/account-disabled (stage 4)
departuresRouter.post('/:id/account-disabled', (req: Request, res: Response) => {
  try {
    const dep = markAccountDisabled(DataService.getInstance(), String(req.params.id));
    res.json({ success: true, stage: dep.stage });
  } catch (err: any) {
    sendSuccessionError(res, err, 'Failed to record account disable.');
  }
});

// 8. POST /api/departures/:id/verify (stage 5)
departuresRouter.post('/:id/verify', (req: Request, res: Response) => {
  try {
    const dep = verifyDeparture(DataService.getInstance(), String(req.params.id));
    res.json({ success: true, stage: dep.stage });
  } catch (err: any) {
    sendSuccessionError(res, err, 'Failed to verify departure.');
  }
});
