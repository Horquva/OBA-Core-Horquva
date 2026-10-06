// =============================================================================
// Horquva Continuity Platform — Data freshness for the top bar (UI shell)
// =============================================================================
// How recent is the data OBA is showing? Answered from the graph itself: the
// newest relationship or fact per source. Connector sync runs aren't tracked
// yet (no orchestration, CON-10), so this never claims "N/N synced".
// =============================================================================

import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { sourcesOnRecord } from '../views/connectionViews.js';

export const freshnessRouter = Router();

freshnessRouter.get('/', (_req: Request, res: Response) => {
  try {
    const sources = sourcesOnRecord(DataService.getInstance().getGraph()).map(({ source, latestAt }) => ({ source, latestAt }));
    const latestDataAt = sources.reduce<string | null>((max, s) => (s.latestAt && (!max || s.latestAt > max) ? s.latestAt : max), null);
    res.json({ latestDataAt, sources, syncStatus: 'not_tracked' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read data freshness.' });
  }
});
