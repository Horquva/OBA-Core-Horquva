// =============================================================================
// Horquva Continuity Platform — Handovers REST API
// =============================================================================
// Implements SRS HND-04 (Handover Acceptance & Confirmed Upgrade)
// and HND-05 (Handover Decline).
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';

export const handoversRouter = Router();

// 1. POST /api/handovers/:id/accept
handoversRouter.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    await dataService.acceptHandover(String(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to accept handover.' });
  }
});

// 2. POST /api/handovers/:id/decline
const DeclineSchema = z.object({
  reason: z.string().min(1),
});

handoversRouter.post('/:id/decline', (req: Request, res: Response) => {
  const parsed = DeclineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Decline reason is required.' });
    return;
  }

  try {
    const dataService = DataService.getInstance();
    dataService.declineHandover(String(req.params.id), parsed.data.reason);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to decline handover.' });
  }
});
