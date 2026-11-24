// =============================================================================
// Horquva Continuity Platform — Bootstrap User Accounts
// =============================================================================
// CLI and programmatic utility to idempotently bootstrap user accounts into
// PostgreSQL user_account table and record the audit entry USER_BOOTSTRAPPED.
//
// Usage:
//   npx tsx db/bootstrapUser.ts --email <e> --name "<n>" --role admin|reviewer|viewer [--hr] [--title "<t>"]
// =============================================================================

import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import type { UserAccount, AuditEntry } from '../src/services/dataService.js';
import { query as defaultQuery, closePool } from '../src/db/client.js';
import type { Query } from '../src/repositories/graphRepository.js';
import { listUsers, saveUser, appendAudit } from '../src/repositories/settingsRepository.js';

dotenv.config();

export type Role = 'admin' | 'reviewer' | 'viewer';

export interface BootstrapUserInput {
  email: string;
  name: string;
  role: Role;
  isHrManager?: boolean;
  title?: string | null;
}

export interface BootstrapUserResult {
  created: boolean;
  user: UserAccount;
}

export function parseArgs(argv: string[]): {
  email?: string;
  name?: string;
  role?: string;
  isHrManager: boolean;
  title?: string;
} {
  const result: { email?: string; name?: string; role?: string; isHrManager: boolean; title?: string } = {
    isHrManager: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--email' && i + 1 < argv.length) {
      result.email = argv[++i];
    } else if (arg === '--name' && i + 1 < argv.length) {
      result.name = argv[++i];
    } else if (arg === '--role' && i + 1 < argv.length) {
      result.role = argv[++i];
    } else if (arg === '--hr') {
      result.isHrManager = true;
    } else if (arg === '--title' && i + 1 < argv.length) {
      result.title = argv[++i];
    }
  }

  return result;
}

export async function bootstrapUser(
  input: BootstrapUserInput,
  q: Query = defaultQuery,
): Promise<BootstrapUserResult> {
  const email = (input.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error(`Invalid email address: "${input.email}".`);
  }

  const name = (input.name ?? '').trim();
  if (!name) {
    throw new Error('Name must not be empty.');
  }

  const validRoles: Role[] = ['admin', 'reviewer', 'viewer'];
  if (!validRoles.includes(input.role)) {
    throw new Error(`Invalid role: "${input.role}". Allowed roles: ${validRoles.join(', ')}.`);
  }

  const isHrManager = Boolean(input.isHrManager);
  const title = input.title !== undefined ? input.title : null;

  const users = await listUsers(q);
  const existing = users.find((u) => u.email.toLowerCase() === email);

  if (existing) {
    const updated: UserAccount = {
      id: existing.id,
      name,
      email,
      role: input.role,
      isHrManager,
      title: title ?? existing.title,
    };
    await saveUser(updated, q);

    const audit: AuditEntry = {
      id: crypto.randomUUID(),
      actor: 'bootstrap-cli',
      action: 'USER_BOOTSTRAPPED',
      resource: `user:${updated.id}`,
      details: `User ${updated.email} (${updated.role}${updated.isHrManager ? ', HR' : ''}) updated via bootstrap.`,
      at: new Date().toISOString(),
    };
    await appendAudit(audit, q);

    return { created: false, user: updated };
  }

  const newUser: UserAccount = {
    id: crypto.randomUUID(),
    name,
    email,
    role: input.role,
    isHrManager,
    title,
  };
  await saveUser(newUser, q);

  const audit: AuditEntry = {
    id: crypto.randomUUID(),
    actor: 'bootstrap-cli',
    action: 'USER_BOOTSTRAPPED',
    resource: `user:${newUser.id}`,
    details: `User ${newUser.email} (${newUser.role}${newUser.isHrManager ? ', HR' : ''}) created via bootstrap.`,
    at: new Date().toISOString(),
  };
  await appendAudit(audit, q);

  return { created: true, user: newUser };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.name || !args.role) {
    console.error('Usage: npx tsx db/bootstrapUser.ts --email <email> --name "<name>" --role admin|reviewer|viewer [--hr] [--title "<title>"]');
    process.exit(1);
  }

  const result = await bootstrapUser({
    email: args.email,
    name: args.name,
    role: args.role as Role,
    isHrManager: args.isHrManager,
    title: args.title,
  });

  console.log(`[bootstrapUser] User ${result.user.email} ${result.created ? 'created' : 'updated'} (${result.user.role}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main()
    .catch((err) => {
      console.error('[bootstrapUser] Error:', err.message);
      process.exit(1);
    })
    .finally(() => closePool());
}
