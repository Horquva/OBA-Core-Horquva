import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// The application under test is the Next.js "frontend" package, which binds
// to port 3001 (`npm run dev` -> `next dev --port 3001`). Playwright starts it
// automatically so a bare `npx playwright test` works without an externally
// running server. See frontend/package.json.
const FRONTEND_DIR = path.resolve(__dirname, '../../../../../../frontend');

// Authenticated storage state written by tests/support/global-setup.ts.
const STORAGE_STATE = path.resolve(__dirname, 'state/qa-storage.json');

export default defineConfig({
  testDir: './tests',
  outputDir: './reports/test-results',

  globalSetup: './tests/support/global-setup.ts',

  // A single web server (the frontend) is shared by every project in the
  // browser matrix. The frontend reaches the backend through NEXT_PUBLIC_API_URL
  // (see frontend/.env.local), so no second server is required.
  webServer: {
    command: 'npm run dev',
    cwd: FRONTEND_DIR,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  timeout: Number(process.env.DEFAULT_TIMEOUT || 30000),

  expect: {
    timeout: 15000,
  },

  reporter: [
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'reports/results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
    navigationTimeout: Number(
      process.env.NAVIGATION_TIMEOUT || 30000
    ),
    actionTimeout: 15000,

    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
});