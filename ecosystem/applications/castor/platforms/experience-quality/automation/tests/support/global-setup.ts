import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { bootReportIsHealthy, loginViaApi } from './api';

/**
 * Runs once before the whole suite.
 *
 * 1. Fails fast (rather than 50 flaky UI failures) if the backend's 55/55
 *    boot report isn't healthy — see BACKEND_INTEGRATION.md section 3.
 * 2. Logs in with the QA test user and writes a Playwright storageState file
 *    so every spec starts with an authenticated session on the frontend origin
 *    (the app redirects unauthenticated visits to /login). The token is stored
 *    under the exact keys the app reads on boot (frontend/lib/AuthContext.tsx:
 *    'horquva-token' / 'horquva-user').
 */
const STORAGE_STATE = path.resolve(__dirname, '../../state/qa-storage.json');

export default async function globalSetup(_config: FullConfig) {
  const healthy = await bootReportIsHealthy();
  if (!healthy) {
    throw new Error(
      'Backend boot-report is unhealthy or unreachable (GET /api/brain/boot-report). ' +
        'Aborting QA run — check API_BASE_URL / QA_API_BASE_URL and backend deploy status.',
    );
  }

  // Seed an authenticated storage state for the dashboard/navigation suites.
  try {
    const { token, user } = await loginViaApi();
    const origin = process.env.BASE_URL || 'http://localhost:3001';
    const state = {
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [
            { name: 'horquva-token', value: token },
            { name: 'horquva-user', value: JSON.stringify(user) },
          ],
        },
      ],
    };
    fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
    fs.writeFileSync(STORAGE_STATE, JSON.stringify(state, null, 2));
  } catch (err) {
    throw new Error(
      `QA auth seeding failed: unable to log in for storage state. ` +
        `Check QA_API_BASE_URL/QA_TEST_EMAIL/QA_TEST_PASSWORD. ${(err as Error).message}`,
    );
  }
}
