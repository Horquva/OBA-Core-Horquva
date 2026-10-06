// =============================================================================
// Horquva Continuity Platform — RBAC Enforcement (SRS SEC-02)
// =============================================================================
// One policy table for every /api route, mounted once in server.ts so no
// router can forget it. First matching rule wins. Anything unmatched fails
// closed: GET needs a signed-in user, every other method needs admin.
//
// Roles mirror frontend/lib/permissions.ts:
//   read      — any signed-in user (admin, reviewer, viewer)
//   edit      — admin, reviewer
//   departure — admin, or any user flagged as HR manager
//   admin     — admin only
//   public    — no session (magic-link attestation, free v0 check)
// =============================================================================

import type { NextFunction, Request, Response } from 'express';
import type { UserAccount } from '../services/dataService.js';
import { resolveUser } from '../auth/middleware.js';
import { currentContext } from './requestContext.js';

export type Permission = 'public' | 'read' | 'edit' | 'departure' | 'admin';

interface Rule {
  methods: string[] | '*';
  /** Matched against the path below /api, without query string. */
  path: RegExp;
  permission: Permission;
}

const ID = '[^/]+';
const rule = (methods: Rule['methods'], path: string, permission: Permission): Rule => ({
  methods,
  path: new RegExp(`^${path}/?$`),
  permission,
});

export const POLICY: Rule[] = [
  // Public: the token in the magic link is the credential (CHK-02); v0 check is the free funnel (V0-01).
  rule(['GET'], `/attest/${ID}(/people)?`, 'public'),
  rule(['PUT'], `/attest/${ID}/tasks/${ID}`, 'public'),
  rule(['POST'], '/v0/n8n-check', 'public'),

  // Admin-only surfaces (Settings screens, governance decisions).
  rule('*', `/connections(/.*)?`, 'admin'),
  rule('*', `/users(/.*)?`, 'admin'),
  rule('*', `/audit-log(/.*)?`, 'admin'),
  rule('*', `/identity-queue(/.*)?`, 'admin'),
  rule(['PUT'], '/settings/organization', 'admin'),
  rule(['POST'], '/attestation/campaigns', 'admin'),
  rule(['POST'], '/attestation/campaigns/preview', 'admin'),
  rule(['POST'], `/actions/${ID}/accept-risk`, 'admin'),

  // Departure workflow (HND-01, HND-03).
  rule(['POST'], '/departures', 'departure'),
  rule(['PUT'], `/departures/${ID}/successors`, 'departure'),
  rule(['POST'], `/departures/${ID}/acceptance-requests`, 'departure'),
  rule(['POST'], `/departures/${ID}/(account-disabled|verify)`, 'departure'),

  // Any signed-in user may respond to a handover; the service then requires
  // them to be the named successor (HND-04), whatever their role.
  rule(['POST'], `/handovers/${ID}/(accept|decline)`, 'read'),

  // Editing operational state.
  rule(['POST'], `/actions/${ID}/assign-backup`, 'edit'),
  rule(['POST'], `/changes/${ID}/ack`, 'edit'),
  rule(['POST'], '/changes/ack-all', 'edit'),

  // POSTs that only compute (what-if, Ask) — readable by everyone signed in.
  rule(['POST'], '/continuity/simulations/[a-z-]+', 'read'),
  rule(['POST'], '/continuity/assistant/ask', 'read'),
  rule(['POST'], '/assistant/messages', 'read'),
  rule(['POST'], `/departures/${ID}/succession-test`, 'read'),
];

export function permissionFor(method: string, path: string): Permission {
  const m = method.toUpperCase();
  for (const r of POLICY) {
    if ((r.methods === '*' || r.methods.includes(m)) && r.path.test(path)) return r.permission;
  }
  return m === 'GET' || m === 'HEAD' ? 'read' : 'admin';
}

export function hasPermission(user: UserAccount, permission: Permission): boolean {
  switch (permission) {
    case 'public':
    case 'read':
      return true;
    case 'edit':
      return user.role === 'admin' || user.role === 'reviewer';
    case 'departure':
      return user.role === 'admin' || user.isHrManager;
    case 'admin':
      return user.role === 'admin';
  }
}

/** Mount at /api. Resolves the session, then applies POLICY. */
export function authorize(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') return next();
  const permission = permissionFor(req.method, req.path);

  resolveUser(req).then((user) => {
    if (user) {
      req.user = user;
      const ctx = currentContext();
      if (ctx) ctx.user = user;
    }
    if (permission === 'public') return next();
    if (!user) {
      res.status(401).json({ error: 'Sign in to continue.' });
      return;
    }
    if (!hasPermission(user, permission)) {
      res.status(403).json({ error: "Your role doesn't allow this action." });
      return;
    }
    next();
  }, next);
}
