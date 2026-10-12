// =============================================================================
// Horquva Continuity Platform — Durable writes before the response
// =============================================================================
// DataService changes its in-memory state synchronously and queues the
// matching Postgres writes. For any request that changes something, this holds
// the response until those writes have landed. If one fails, the client gets a
// 500 instead of a success that a restart would undo, and the in-memory state
// is reloaded from Postgres so the two agree again.
//
// Reads (GET/HEAD) are not held: the only writes they cause are audit entries,
// and a failure there is logged rather than turned into a failed page load.
// =============================================================================

import type { NextFunction, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { currentContext } from './requestContext.js';

export function persistBeforeRespond(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const originalEnd = res.end.bind(res) as (...args: any[]) => Response;
  let settled = false;

  (res as any).end = (...args: any[]) => {
    const pending = currentContext()?.pendingWrites ?? [];
    if (settled || pending.length === 0 || res.headersSent) {
      settled = true;
      return originalEnd(...args);
    }
    settled = true;
    Promise.all(pending).then(
      () => originalEnd(...args),
      (err) => {
        console.error(`[persist] ${req.method} ${req.originalUrl} changed state that did not reach Postgres:`, err);
        const ds = DataService.getInstance();
        if (ds.isPersistent()) {
          ds.loadFromDatabase().catch((e) => console.error('[persist] Reloading state from Postgres failed:', e));
        }
        if (res.headersSent) return originalEnd();
        res.status(500);
        res.removeHeader('Content-Length');
        res.removeHeader('ETag');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        originalEnd(JSON.stringify({ error: 'The change could not be saved. Nothing was changed; please try again.' }));
      }
    );
    return res;
  };

  next();
}
