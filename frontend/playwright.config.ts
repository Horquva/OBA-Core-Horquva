import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { API, APP, API_PORT, APP_PORT } from './e2e/env';

// E2E suite: the core flows against the real app, no mocked API.
// Each run starts its own backend on its own Postgres database, wiped and migrated first
// (backend/db/resetForE2E.ts), with the demo org seeded into it, so departures, campaigns and
// connections created by one run never leak into the next. The frontend is a production build
// pointed at it. Production matters: dev mode signs in automatically, so the sign-in redirect
// only exists in a production build. The dev servers and the dev database are not touched.
//
// Database: E2E_DATABASE_URL, or the DATABASE_URL in backend/.env with the database renamed to
// horquva_e2e. The reset refuses any database whose name doesn't end in _e2e.
function e2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  let dev: string | undefined;
  try {
    dev = readFileSync('../backend/.env', 'utf8').match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  } catch {
    /* no backend/.env */
  }
  if (!dev) throw new Error('Set E2E_DATABASE_URL (a Postgres database whose name ends in _e2e) to run the e2e suite.');
  const url = new URL(dev);
  url.pathname = '/horquva_e2e';
  return url.toString();
}
const E2E_DATABASE_URL = e2eDatabaseUrl();
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // One worker: the specs share one backend and one in-memory org.
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: APP,
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'msedge' },
    },
  ],
  webServer: [
    {
      command: 'npx tsx db/resetForE2E.ts && npx tsx src/index.ts',
      cwd: '../backend',
      url: `${API}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      // Backend failures show up as API assertion errors with status and body.
      stderr: 'ignore',
      env: {
        PORT: String(API_PORT),
        // dotenv never overrides a variable that is already set, so these win over backend/.env.
        DATABASE_URL: E2E_DATABASE_URL,
        DEMO_MODE: 'true',
        // Hourly syncs and reminders have no place in a test run; queued syncs still run in-process.
        JOBS_ENABLED: 'false',
        HORQUVA_SECRET_KEY: '',
        GEMINI_API_KEY: '',
        N8N_BASE_URL: '',
        SMTP_HOST: '',
        AUTH_DEV_LOGIN: 'true',
        FRONTEND_URL: APP,
      },
    },
    {
      // Builds first so the suite never runs against a stale build.
      command: `npm run build && npx next start -p ${APP_PORT}`,
      url: APP,
      reuseExistingServer: false,
      timeout: 600_000,
      env: { NEXT_PUBLIC_API_URL: API },
    },
  ],
});
