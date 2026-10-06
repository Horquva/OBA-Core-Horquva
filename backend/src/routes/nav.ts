// =============================================================================
// Horquva Continuity Platform — Sidebar badge counts (GET /api/nav-counts)
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { buildActions } from './actions.js';
import { navCountsFor } from '../views/overviewViews.js';

export const navRouter = Router();

navRouter.get('/', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return;
  }
  try {
    const ds = DataService.getInstance();
    res.json(await navCountsFor(ds, req.user, buildActions(ds)));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to count navigation badges.' });
  }
});
