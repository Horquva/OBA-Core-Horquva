// =============================================================================
// Horquva Continuity Platform — Audit Trail Middleware (SRS SEC-06)
// =============================================================================
// Append-only. Records every API call: reads (API_GET), writes, and every
// denied request (401/403 → ACCESS_DENIED). Sign-in events are written by the
// auth routes themselves.
//
// Writes whose DataService method already writes a domain entry (e.g.
// INITIATE_DEPARTURE) are not double-logged; every other call gets a generic
// API_<METHOD> entry.
// =============================================================================

import type { NextFunction, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { currentContext } from './requestContext.js';

export function auditTrail(req: Request, res: Response, next: NextFunction): void {
  const ctx = currentContext();
  // originalUrl is captured now; req.path is rewritten by mounted routers.
  const path = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return; // auth routes log their own events
    if (req.method === 'OPTIONS' || req.method === 'HEAD') return; // CORS preflights, not user actions
    const denied = res.statusCode === 401 || res.statusCode === 403;
    if (ctx?.audited && !denied) return;

    const actor = req.user?.id ?? 'anonymous';
    DataService.getInstance().addAuditEntry(
      actor,
      denied ? 'ACCESS_DENIED' : `API_${req.method}`,
      path,
      `${req.method} ${path} → ${res.statusCode}${req.ip ? ` from ${req.ip}` : ''}`
    );
  });

  next();
}
