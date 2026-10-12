// =============================================================================
// Horquva Continuity Platform — Server Entry Point
// =============================================================================

import dotenv from 'dotenv';
import { app } from './server.js';
import { defaultProviders } from './routes/auth.js';
import { DataService } from './services/dataService.js';
import { secretKeyFromEnv } from './security/encryption.js';
import { ConnectorRunner } from './connectors/sdk/runner.js';
import { defaultScheduler } from './jobs/scheduler.js';
import { getMigrationStatus } from '../db/migrate.js';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production (SRS SEC-01).');
}
// Fails fast on a missing/malformed connector key instead of on the first sync.
secretKeyFromEnv();

// Fail fast on half-configured SSO providers instead of on the first sign-in.
const ssoProviders = defaultProviders().map((p) => p.id);
console.log(`[Horquva Core] SSO providers: ${ssoProviders.length ? ssoProviders.join(', ') : 'none configured'}`);

const PORT = parseInt(process.env.PORT || '4000', 10);

async function main(): Promise<void> {
  if (process.env.DATABASE_URL) {
    const pending = (await getMigrationStatus()).filter((m) => !m.applied).map((m) => m.name);
    if (pending.length) throw new Error(`Database schema is behind: ${pending.join(', ')} not applied. Run \`npm run migrate\` first.`);
  }
  // Load state from Postgres (or the in-memory fixture in dev) before serving any request.
  const ds = await DataService.initialize();
  console.log(`[Horquva Core] State: ${ds.isPersistent() ? 'PostgreSQL' : 'in-memory demo fixture'}`);

  if (ds.isPersistent()) {
    const interrupted = await ConnectorRunner.recoverInterruptedSyncs();
    if (interrupted) console.warn(`[Horquva Core] ${interrupted} connector sync(s) were interrupted by the last shutdown; marked as failed.`);
    if (process.env.JOBS_ENABLED !== 'false') {
      // Hourly connector syncs, reminders, briefings, post-departure checks. Production needs pg-boss.
      await defaultScheduler.startScheduler({ requirePgBoss: process.env.NODE_ENV === 'production' });
      console.log(`[Horquva Core] Background jobs: ${defaultScheduler.isUsingPgBoss() ? 'pg-boss' : 'in-process'}`);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`[Horquva Core] Continuity Platform API running on http://localhost:${PORT}`);
    console.log(`[Horquva Core] Health check available at http://localhost:${PORT}/health`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Horquva Core] ${signal}: stopping.`);
    server.close();
    await defaultScheduler.stopScheduler();
    await ds.flushWrites();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Horquva Core] Startup failed:', err);
  process.exit(1);
});
