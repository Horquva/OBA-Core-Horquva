// =============================================================================
// Horquva Continuity Platform — Change Feed REST API
// =============================================================================
// Implements SRS CHG-01 & CHG-02:
// - GET /api/changes (Filterable by acknowledged state)
// - POST /api/changes/:id/ack (Single change acknowledgement)
// - POST /api/changes/ack-all (Bulk change acknowledgement)
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { changeSummaryFor } from '../views/overviewViews.js';

export const changesRouter = Router();

// 1. GET /api/changes
// GET /api/changes/summary — Overview hero sentence ("since your last sign-in")
changesRouter.get('/summary', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return;
  }
  res.json(await changeSummaryFor(DataService.getInstance(), req.user));
});

changesRouter.get('/', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const ackParam = req.query.acknowledged;
    let filterAck: boolean | undefined = undefined;
    if (ackParam === 'false') filterAck = false;
    else if (ackParam === 'true') filterAck = true;

    const events = dataService.getChangeEvents(filterAck).map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      impact: c.impact,
      href: c.href,
      detectedAt: c.detectedAt,
    }));

    res.json({ events });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch changes.' });
  }
});

// 2. POST /api/changes/:id/ack
changesRouter.post('/:id/ack', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    if (!dataService.acknowledgeChange(String(req.params.id), req.user!.name)) {
      res.status(404).json({ error: 'Change not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to acknowledge change.' });
  }
});

// 3. POST /api/changes/ack-all
changesRouter.post('/ack-all', (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const acknowledged = dataService.acknowledgeAllChanges(req.user!.name);
    res.json({ success: true, acknowledged });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to acknowledge all changes.' });
  }
});
