// =============================================================================
// Horquva Continuity Platform — First-admin bootstrap (AD-ONBOARD-01, revised)
// =============================================================================
// A fresh deployment has no users, so nobody could sign in. The deployer names
// the first admin in BOOTSTRAP_ADMIN_EMAIL. When that person signs in through
// the org's SSO (already pinned to its tenant / Workspace domain) and the
// deployment has no admin yet, they become admin + HR manager. Everyone else is
// invited by an admin (Settings → Users); SSO alone never grants access.
//
// Not "first person to sign in wins": any employee in the tenant could
// otherwise claim admin and with it every departure record.
// =============================================================================

import type { JWTPayload } from 'jose';
import crypto from 'node:crypto';
import type { DataService, UserAccount } from '../services/dataService.js';

export async function bootstrapAdminFor(
  ds: DataService,
  email: string,
  claims: JWTPayload,
  env: NodeJS.ProcessEnv = process.env
): Promise<UserAccount | null> {
  const pinned = env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const who = email.trim().toLowerCase();
  if (!pinned || who !== pinned) return null;
  if (ds.getUsers().some((u) => u.role === 'admin')) return null; // only while there is no admin

  const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : who.split('@')[0];
  const user = await ds.createUser({
    id: `user:${crypto.randomUUID()}`,
    name,
    email: who,
    role: 'admin',
    isHrManager: true,
    title: null,
  });
  ds.addAuditEntry(user.id, 'FIRST_ADMIN_BOOTSTRAP', `user:${user.id}`, `${who} became the first admin (BOOTSTRAP_ADMIN_EMAIL).`);
  return user;
}
