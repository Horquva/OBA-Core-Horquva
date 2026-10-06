// =============================================================================
// Horquva Continuity Platform — Combined Auth Middleware (SRS SEC-01)
// =============================================================================
// Provider-agnostic: Entra, Google and dev sign-ins all end in the same
// session cookie, so one middleware resolves the signed-in user for any of
// them. RBAC (SEC-02) builds on `req.user`.
// =============================================================================

import type { NextFunction, Request, Response } from 'express';
import { DataService, type UserAccount } from '../services/dataService.js';
import { SESSION_COOKIE, readCookie, verifySession } from './session.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserAccount;
    }
  }
}

/** Resolves the session cookie to a user, or null (signed out, expired, tampered, or user removed). */
export async function resolveUser(req: Request): Promise<UserAccount | null> {
  const token = readCookie(req, SESSION_COOKIE);
  const claims = token ? await verifySession(token) : null;
  return claims ? DataService.getInstance().getUserById(claims.userId) : null;
}

/** Sets `req.user` when a valid session exists; never rejects. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  resolveUser(req).then(
    (user) => {
      if (user) req.user = user;
      next();
    },
    next
  );
}

/** Rejects with 401 unless the request carries a valid session. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  resolveUser(req).then(
    (user) => {
      if (!user) {
        res.status(401).json({ error: 'Sign in to continue.' });
        return;
      }
      req.user = user;
      next();
    },
    next
  );
}
