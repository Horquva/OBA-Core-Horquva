// =============================================================================
// Horquva Continuity Platform — Reviewer REST API (/api/me)
// =============================================================================
// Implements B-16 (Reviewer Task Queue: confirmations & handovers).
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';

export const reviewerRouter = Router();

reviewerRouter.get('/tasks', (_req: Request, res: Response) => {
  try {
    const dataService = DataService.getInstance();
    const tasks = dataService.getReviewerTasks();
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch reviewer tasks.' });
  }
});
