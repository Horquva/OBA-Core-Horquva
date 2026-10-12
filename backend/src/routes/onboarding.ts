// =============================================================================
// Horquva Continuity Platform — First-run setup guide (AD-ONBOARD-02)
// =============================================================================
// GET  /api/onboarding/status  — which setup steps are done, read from real state
// POST /api/onboarding/dismiss — hide the guide (admin; RBAC default for POST)
//
// Each step is derived, never ticked by hand:
//   organization — the company name was changed from the placeholder
//   directory    — an Entra or Google Workspace connection has synced
//   automations  — an n8n connection or a CSV import has synced
//   baseline     — any sync has completed (the graph holds real data)
// =============================================================================

import { Router, type Request, type Response } from 'express';
import { DataService } from '../services/dataService.js';
import { listConnections } from '../views/connectionViews.js';

export const onboardingRouter = Router();

const PLACEHOLDER_NAMES = new Set(['Your organization', 'Acme Corporation']);

export async function onboardingStatus(ds: DataService) {
  const { store, connections } = await listConnections();
  const synced = connections.filter((c) => c.lastSyncAt !== null);
  const steps = {
    organization: !PLACEHOLDER_NAMES.has(ds.getOrganization().companyName.trim()),
    directory: synced.some((c) => c.type === 'entra' || c.type === 'google'),
    automations: synced.some((c) => c.type === 'n8n' || c.type === 'csv'),
    baseline: synced.length > 0,
  };
  return {
    store,
    dismissedAt: ds.getOnboardingDismissedAt(),
    completed: Object.values(steps).every(Boolean),
    steps,
  };
}

onboardingRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    res.json(await onboardingStatus(DataService.getInstance()));
  } catch (err) {
    console.error('[onboarding] status failed:', err);
    res.status(500).json({ error: 'Failed to read setup progress.' });
  }
});

onboardingRouter.post('/dismiss', (_req: Request, res: Response) => {
  const ds = DataService.getInstance();
  const dismissedAt = ds.dismissOnboarding();
  ds.addAuditEntry('user:admin', 'DISMISS_ONBOARDING', 'settings:onboarding', 'Setup guide dismissed.');
  res.json({ dismissedAt });
});
