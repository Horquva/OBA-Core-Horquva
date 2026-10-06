// =============================================================================
// Horquva Continuity Platform — Settings, Connections & Audit Routes
// =============================================================================
// Implements B-02 (Users), B-17 (Connections Sync), B-19 (Org Settings),
// and B-20 (Audit Log) REST API surfaces.
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService, AUDIT_LOG_CAPACITY } from '../services/dataService.js';
import { listConnections, sourcesOnRecord } from '../views/connectionViews.js';

// ── Connections Router ────────────────────────────────────────────────────────
export const connectionsRouter = Router();

connectionsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { store, connections } = await listConnections();
    const sources = sourcesOnRecord(DataService.getInstance().getGraph());
    res.json({ store, connections, sources });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch connections.' });
  }
});

// Running a connector from the app (CON-10) isn't built yet: the connectors exist,
// but nothing schedules them or loads their results. Say so instead of
// pretending a sync happened.
connectionsRouter.post('/:id/sync', (_req: Request, res: Response) => {
  res.status(501).json({ error: "Syncing from the app isn't available yet. Data is loaded by the backend." });
});

// ── Users Router ─────────────────────────────────────────────────────────────
export const usersRouter = Router();

const UpdateUserSchema = z.object({
  role: z.enum(['admin', 'reviewer', 'viewer']).optional(),
  isHrManager: z.boolean().optional(),
});

usersRouter.get('/', (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const users = dataService.getUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch users.' });
  }
});

usersRouter.patch('/:id', (req: Request, res: Response) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid user update payload.', details: parsed.error.issues });
    return;
  }

  try {
    const dataService = DataService.getInstance();
    const user = dataService.updateUser(String(req.params.id), parsed.data);
    res.json({ success: true, user });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message || 'Failed to update user.' });
  }
});

// ── Organization Settings Router ─────────────────────────────────────────────
export const settingsRouter = Router();

const OrgSettingsSchema = z.object({
  companyName: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  minGroupSize: z.number().int().min(1).optional(),
  departmentMappings: z.array(
    z.object({
      raw: z.string().min(1),
      mapped: z.string().min(1),
    })
  ).optional(),
});

settingsRouter.get('/organization', (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const org = dataService.getOrganization();
    res.json(org);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch organization settings.' });
  }
});

settingsRouter.put('/organization', (req: Request, res: Response) => {
  const parsed = OrgSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid organization settings payload.', details: parsed.error.issues });
    return;
  }

  try {
    const dataService = DataService.getInstance();
    const current = dataService.getOrganization();
    const updated = dataService.saveOrganization({
      companyName: parsed.data.companyName,
      logoUrl: parsed.data.logoUrl ?? current.logoUrl,
      minGroupSize: parsed.data.minGroupSize ?? current.minGroupSize,
      departmentMappings: parsed.data.departmentMappings ?? current.departmentMappings,
    });
    res.json({ success: true, organization: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update organization settings.' });
  }
});

// ── Audit Log Router ─────────────────────────────────────────────────────────
export const auditLogRouter = Router();

const AUDIT_PAGE_DEFAULT = 200;
const AUDIT_PAGE_MAX = 1000;

auditLogRouter.get('/', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : undefined;
    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : undefined;
    for (const d of [from, to]) {
      if (d && Number.isNaN(new Date(d).getTime())) {
        res.status(400).json({ error: `Invalid date: ${d}` });
        return;
      }
    }
    const limitRaw = Number(req.query.limit ?? AUDIT_PAGE_DEFAULT);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, AUDIT_PAGE_MAX) : AUDIT_PAGE_DEFAULT;

    // Newest first. Actor ids are shown with the person's name when we know it.
    // hideReads=true drops the API_GET page-read entries (SEC-06 logs those too) so changes are findable.
    const hideReads = req.query.hideReads === 'true';
    const all = dataService.getAuditLog({ action, from, to }).filter((e) => !hideReads || e.action !== 'API_GET');
    const nameOf = (actor: string) => dataService.getUserById(actor)?.name ?? null;
    const entries = all.slice(0, limit).map((e) => ({ ...e, actorName: nameOf(e.actor) }));
    const actions = [...new Set(dataService.getAuditLog().map((e) => e.action))].sort();

    res.json({
      entries,
      total: all.length,
      actions,
      // Honest retention: in memory, newest AUDIT_LOG_CAPACITY entries, gone on restart.
      retention: { storage: 'memory', capacity: AUDIT_LOG_CAPACITY },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit log.' });
  }
});
