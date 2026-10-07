// =============================================================================
// Horquva Continuity Platform — Reviewer REST API (/api/me)
// =============================================================================
// GET /api/me/tasks — the signed-in person's own confirmations and handover
// requests (B-16, HND-04). Read model in views/reviewerViews.ts.
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { reviewerTasksFor } from '../views/reviewerViews.js';

export const reviewerRouter = Router();

reviewerRouter.get('/tasks', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return;
  }
  res.json(reviewerTasksFor(DataService.getInstance(), req.user));
});
