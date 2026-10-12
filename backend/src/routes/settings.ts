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
import { ConnectorRunner, ConnectorError, CONNECTOR_TYPES, type SyncableType } from '../connectors/sdk/runner.js';
import { defaultScheduler } from '../jobs/scheduler.js';

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

// Everything below writes the `connection` table, so it needs the Postgres-backed
// store; on the in-memory demo fixture there is nothing to sync into.
function requireDatabase(res: Response): boolean {
  if (DataService.getInstance().isPersistent()) return true;
  res.status(503).json({ error: 'Connections need the database. This server is running on the in-memory demo data.' });
  return false;
}

function sendConnectorError(res: Response, err: unknown, fallback: string): void {
  if (err instanceof ConnectorError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(`[connections] ${fallback}`, err);
  res.status(500).json({ error: fallback });
}

const CreateConnectionSchema = z.object({
  type: z.enum(CONNECTOR_TYPES as [SyncableType, ...SyncableType[]]),
  name: z.string().trim().min(1).max(255),
  config: z.record(z.unknown()),
});

// POST /api/connections — save a connector; its config is encrypted before it reaches the database
connectionsRouter.post('/', async (req: Request, res: Response) => {
  if (!requireDatabase(res)) return;
  const parsed = CreateConnectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'type, name and config are required.' });
    return;
  }
  try {
    res.status(201).json(await ConnectorRunner.createConnection(parsed.data));
  } catch (err) {
    sendConnectorError(res, err, 'Failed to save the connection.');
  }
});

// POST /api/connections/test — try credentials without saving them
connectionsRouter.post('/test', async (req: Request, res: Response) => {
  const parsed = CreateConnectionSchema.omit({ name: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'type and config are required.' });
    return;
  }
  try {
    res.json(await ConnectorRunner.testConfig(parsed.data.type, parsed.data.config));
  } catch (err) {
    sendConnectorError(res, err, 'Failed to test the connection.');
  }
});

const CsvImportSchema = z.object({
  peopleCsv: z.string().max(5_000_000).optional(),
  automationsCsv: z.string().max(5_000_000).optional(),
});

// POST /api/connections/csv — one-off import; the files are not kept in the connection settings
connectionsRouter.post('/csv', async (req: Request, res: Response) => {
  if (!requireDatabase(res)) return;
  const parsed = CsvImportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'peopleCsv and/or automationsCsv must be CSV text (max 5 MB each).' });
    return;
  }
  try {
    const outcome = await ConnectorRunner.importCsv(parsed.data);
    res.status(outcome.ok ? 200 : 422).json(outcome);
  } catch (err) {
    sendConnectorError(res, err, 'Failed to import the CSV.');
  }
});

const UpdateConnectionSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  config: z.record(z.unknown()).optional(),
});

// PUT /api/connections/:id — rename and/or replace settings
connectionsRouter.put('/:id', async (req: Request, res: Response) => {
  if (!requireDatabase(res)) return;
  const parsed = UpdateConnectionSchema.safeParse(req.body);
  if (!parsed.success || (!parsed.data.name && !parsed.data.config)) {
    res.status(400).json({ error: 'Send a new name, new settings, or both.' });
    return;
  }
  try {
    await ConnectorRunner.updateConnection(String(req.params.id), parsed.data);
    res.json({ success: true });
  } catch (err) {
    sendConnectorError(res, err, 'Failed to update the connection.');
  }
});

// POST /api/connections/:id/test — try the saved credentials
connectionsRouter.post('/:id/test', async (req: Request, res: Response) => {
  if (!requireDatabase(res)) return;
  try {
    res.json(await ConnectorRunner.testConnection(String(req.params.id)));
  } catch (err) {
    sendConnectorError(res, err, 'Failed to test the connection.');
  }
});

// POST /api/connections/:id/sync — 202: the sync runs in the background; poll GET /api/connections
connectionsRouter.post('/:id/sync', async (req: Request, res: Response) => {
  if (!requireDatabase(res)) return;
  const connectionId = String(req.params.id);
  try {
    const { syncRunId } = await ConnectorRunner.queueSync(connectionId);
    await defaultScheduler.enqueue('connector-sync', { connectionId, syncRunId }, { singletonKey: connectionId });
    DataService.getInstance().addAuditEntry('system', 'CONNECTOR_SYNC_QUEUED', `connection:${connectionId}`, `Sync ${syncRunId} queued.`);
    res.status(202).json({ syncRunId, status: 'queued' });
  } catch (err) {
    sendConnectorError(res, err, 'Failed to start the sync.');
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
