import { defineConfig, devices } from '@playwright/test';
import { API, APP, API_PORT, APP_PORT } from './e2e/env';

// E2E smoke suite (Sprint 3 D18): the core flows against the real app, no mocked API.
// Each run starts its own backend on the in-memory fixture (fresh state, so departures and
// campaigns created by one run never leak into the next) and a production build of the
// frontend pointed at it. Production matters: dev mode signs in automatically, so the
// sign-in redirect only exists in a production build. The dev servers are not touched.
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
      command: 'npx tsx src/index.ts',
      cwd: '../backend',
      url: `${API}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      // Every graph read tries the (deliberately closed) database first and logs the refusal;
      // that is noise here. Backend failures still show up as API assertion errors with status and body.
      stderr: 'ignore',
      env: {
        PORT: String(API_PORT),
        // dotenv never overrides a variable that is already set, so these win over backend/.env.
        // A closed port makes "database first" fail fast and fall back to the fixture.
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/horquva_e2e',
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
