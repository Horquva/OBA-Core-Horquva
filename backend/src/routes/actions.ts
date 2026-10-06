// =============================================================================
// Horquva Continuity Platform — Actions REST API
// =============================================================================
// Implements SRS SIM-08:
// - Deterministic Action Ranking: Criticality -> Missing Backup -> Weekly Volume
// - Demotion of accepted risks to bottom
// - Action remediation endpoints (assign backup, accept risk)
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';
import { evaluateAllChecks } from '../domain/checks/index.js';
import { criticalityView } from '../views/factViews.js';
import { ActionError, acceptRisk, assignBackup } from '../actions/actionService.js';

export const actionsRouter = Router();

function sendActionError(res: Response, err: any, fallback: string): void {
  if (err instanceof ActionError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: err?.message || fallback });
}

export type ActionType = 'assign_backup' | 'confirm_facts' | 'name_successor' | 'move_credential' | 'document' | 'add_fallback';
export type ActionStatus = 'open' | 'in_progress' | 'resolved' | 'accepted_risk';

const CRIT_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

export function buildActions(dataService: DataService): any[] {
  const graph = dataService.getGraph();
  const checks = evaluateAllChecks(graph);

  const actions: any[] = [];

  for (const check of checks) {
    if (check.status === 'FAIL') {
      const node = graph.getNode(check.entityId);
      const asset = node?.entity
        ? { id: node.entity.id, kind: node.entity.kind, name: node.entity.name }
        : { id: check.entityId, kind: 'automation' as const, name: check.entityId };

      const critFact = node?.facts.get('criticality');
      const criticality = criticalityView(critFact).level; // unknown stays unknown, never 'medium'

      const runsFact = node?.facts.get('run_volume_weekly');
      const runs: number | null = typeof runsFact?.value === 'number' ? runsFact.value : null; // unknown volume sorts last, not as 0

      const checkId = check.checkId;
      let type: ActionType = 'assign_backup';
      let problem = check.reason;
      let failingFact = 'backup';
      let primary: any = { kind: 'assign_backup' };

      if (checkId.startsWith('C1')) {
        type = 'assign_backup';
        problem = `Single point of failure: unbacked critical asset "${asset.name}"`;
        failingFact = 'backup';
        primary = { kind: 'assign_backup' };
      } else if (checkId.startsWith('C2')) {
        type = 'name_successor';
        problem = `Departed owner: "${asset.name}" has no active owner`;
        failingFact = 'owner';
        primary = { kind: 'link', label: 'Plan Handover', href: '/departures' };
      } else if (checkId.startsWith('C3')) {
        type = 'document';
        problem = `Undocumented critical asset: "${asset.name}" missing operational runbook`;
        failingFact = 'documented';
        primary = { kind: 'link', label: 'Document', href: `/assets/${asset.id}` };
      } else {
        type = 'confirm_facts';
        problem = check.reason;
        failingFact = 'status';
        primary = { kind: 'link', label: 'Review', href: `/assets/${asset.id}` };
      }

      const actionId = `${checkId}:${check.entityId}`;
      const override = dataService.getActionOverride(actionId);

      let status: ActionStatus = 'open';
      let acceptedRisk = null;
      let resolvedAt = null;

      if (override) {
        status = override.status;
        acceptedRisk = override.acceptedRisk || null;
        resolvedAt = override.resolvedAt || null;
        // An accepted risk lapses at its expiry: the still-failing check is open again.
        if (status === 'accepted_risk' && acceptedRisk && new Date(acceptedRisk.expiresAt).getTime() <= Date.now()) {
          status = 'open';
          acceptedRisk = null;
        }
      }

      const backups = graph.getBackups(check.entityId);
      const isUnbacked = backups.length === 0;

      actions.push({
        id: actionId,
        type,
        status,
        problem,
        asset,
        failingFact,
        criticalAssetsAffected: 1,
        checkId: checkId,
        primary,
        acceptedRisk,
        resolvedAt,
        _criticality: criticality,
        _isUnbacked: isUnbacked,
        _weeklyRuns: runs,
      });
    }
  }

  // Also include any previously resolved or accepted_risk actions that might no longer fail the check
  // but exist in override map
  const includedIds = new Set(actions.map((a) => a.id));
  for (const [actionId, override] of dataService.getAllActionOverrides()) {
    if (!includedIds.has(actionId)) {
      const node = graph.getNode(override.entityId);
      const asset = node?.entity
        ? { id: node.entity.id, kind: node.entity.kind, name: node.entity.name }
        : { id: override.entityId, kind: 'automation' as const, name: override.entityId };
      const critFact = node?.facts.get('criticality');
      const criticality = criticalityView(critFact).level; // unknown stays unknown, never 'medium'
      const runsFact = node?.facts.get('run_volume_weekly');
      const runs: number | null = typeof runsFact?.value === 'number' ? runsFact.value : null; // unknown volume sorts last, not as 0

      actions.push({
        id: actionId,
        type: override.checkId.startsWith('C1') ? 'assign_backup' : 'confirm_facts',
        status: override.status,
        problem: `Remediated check ${override.checkId} for ${asset.name}`,
        asset,
        failingFact: 'backup',
        criticalAssetsAffected: 1,
        checkId: override.checkId,
        primary: { kind: 'assign_backup' },
        acceptedRisk: override.acceptedRisk || null,
        resolvedAt: override.resolvedAt || null,
        _criticality: criticality,
        _isUnbacked: false,
        _weeklyRuns: runs,
      });
    }
  }

  // Sort actions:
  // 1. Group: open/in_progress (0) < accepted_risk (1) < resolved (2)
  // 2. Criticality DESC
  // 3. Unbacked before backed
  // 4. Weekly runs DESC
  actions.sort((a, b) => {
    const groupWeight = (s: ActionStatus) => {
      if (s === 'open' || s === 'in_progress') return 0;
      if (s === 'accepted_risk') return 1;
      return 2;
    };

    const gA = groupWeight(a.status);
    const gB = groupWeight(b.status);
    if (gA !== gB) return gA - gB;

    const cA = CRIT_WEIGHT[a._criticality] || 0;
    const cB = CRIT_WEIGHT[b._criticality] || 0;
    if (cA !== cB) return cB - cA;

    if (a._isUnbacked !== b._isUnbacked) {
      return a._isUnbacked ? -1 : 1;
    }

    return (b._weeklyRuns ?? -1) - (a._weeklyRuns ?? -1);
  });

  // Assign 1-indexed ranks
  return actions.map((a, idx) => {
    const { _criticality, _isUnbacked, _weeklyRuns, ...rest } = a;
    return {
      ...rest,
      rank: idx + 1,
    };
  });
}

// 1. GET /api/actions
actionsRouter.get('/', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    let actions = buildActions(dataService);

    const statusParam = req.query.status as ActionStatus | undefined;
    if (statusParam) {
      actions = actions.filter((a) => a.status === statusParam);
    }

    const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    if (limitParam && !isNaN(limitParam)) {
      actions = actions.slice(0, limitParam);
    }

    res.json({ actions });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch actions.' });
  }
});

// 2. POST /api/actions/:id/assign-backup
const AssignBackupSchema = z.object({
  personId: z.string().min(1),
});

actionsRouter.post('/:id/assign-backup', (req: Request, res: Response) => {
  const parsed = AssignBackupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'personId is required.' });
    return;
  }

  try {
    assignBackup(DataService.getInstance(), String(req.params.id), parsed.data.personId);
    res.json({ success: true });
  } catch (err: any) {
    sendActionError(res, err, 'Failed to assign backup.');
  }
});

// 3. POST /api/actions/:id/accept-risk
const AcceptRiskSchema = z.object({
  reason: z.string().min(1),
  expiresAt: z.string().min(1),
});

actionsRouter.post('/:id/accept-risk', (req: Request, res: Response) => {
  const parsed = AcceptRiskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'reason and expiresAt are required.' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return;
  }
  try {
    acceptRisk(DataService.getInstance(), String(req.params.id), parsed.data, req.user);
    res.json({ success: true });
  } catch (err: any) {
    sendActionError(res, err, 'Failed to accept risk.');
  }
});
