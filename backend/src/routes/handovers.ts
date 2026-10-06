// =============================================================================
// Horquva Continuity Platform — Handovers REST API
// =============================================================================
// Implements SRS HND-04 (Handover Acceptance & Confirmed Upgrade)
// and HND-05 (Handover Decline). Only the named successor may respond;
// see handover/successionService.ts.
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataService } from '../services/dataService.js';
import { SuccessionError, acceptHandover, declineHandover } from '../handover/successionService.js';

export const handoversRouter = Router();

function sendError(res: Response, err: any, fallback: string): void {
  if (err instanceof SuccessionError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: err?.message || fallback });
}

// 1. POST /api/handovers/:id/accept
handoversRouter.post('/:id/accept', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return;
  }
  try {
    const dep = await acceptHandover(DataService.getInstance(), String(req.params.id), req.user);
    res.json({ success: true, stage: dep.stage });
  } catch (err: any) {
    sendError(res, err, 'Failed to accept handover.');
  }
});

// 2. POST /api/handovers/:id/decline
const DeclineSchema = z.object({
  reason: z.string().trim().min(1),
});

handoversRouter.post('/:id/decline', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return;
  }
  const parsed = DeclineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Decline reason is required.' });
    return;
  }

  try {
    const dep = declineHandover(DataService.getInstance(), String(req.params.id), req.user, parsed.data.reason);
    res.json({ success: true, stage: dep.stage });
  } catch (err: any) {
    sendError(res, err, 'Failed to decline handover.');
  }
});
