// =============================================================================
// Horquva Continuity Platform — Audit Trail Middleware (SRS SEC-06)
// =============================================================================
// Append-only. Records every state-changing API call and every denied
// request (401/403). Successful reads are not recorded: the store keeps the
// newest 500 entries, and page loads would evict real actions within minutes.
//
// Routes whose DataService method already writes a domain entry (e.g.
// INITIATE_DEPARTURE) are not double-logged; everything else gets a generic
// API_<METHOD> entry so no write goes unrecorded.
// =============================================================================

import type { NextFunction, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { currentContext } from './requestContext.js';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function auditTrail(req: Request, res: Response, next: NextFunction): void {
  const ctx = currentContext();
  // originalUrl is captured now; req.path is rewritten by mounted routers.
  const path = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return; // auth routes log their own events
    const denied = res.statusCode === 401 || res.statusCode === 403;
    if (READ_METHODS.has(req.method) && !denied) return;
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
