// =============================================================================
// Horquva Continuity Platform — Settings, Connections & Audit Routes
// =============================================================================
// Implements B-02 (Users), B-17 (Connections Sync), B-19 (Org Settings),
// and B-20 (Audit Log) REST API surfaces.
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';

// ── Connections Router ────────────────────────────────────────────────────────
export const connectionsRouter = Router();

connectionsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const connections = dataService.getConnections();
    res.json({ connections });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch connections.' });
  }
});

connectionsRouter.post('/:id/sync', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const connection = dataService.syncConnection(String(req.params.id));
    res.json({ success: true, connection });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500;
    res.status(status).json({ error: err.message || 'Failed to sync connection.' });
  }
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

auditLogRouter.get('/', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    const entries = dataService.getAuditLog({ action, from, to });
    res.json({ entries });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit log.' });
  }
});
