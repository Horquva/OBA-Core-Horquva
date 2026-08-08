import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Experience Quality Platform - Playwright Configuration
 *
 * Owner: Castor / Experience Quality
 *
 * BASE_URL is intentionally not hardcoded. Until the real Castor application
 * environment is available, tests read BASE_URL from the environment (see
 * .env.example). This keeps the automation foundation ready to point at a
 * real environment without inventing a fake application URL.
 */

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  outputDir: './reports/test-results',

  // Fail the build on CI if test.only was left in the source.
  forbidOnly: !!process.env.CI,

  // Retries: none locally, retry once on CI to absorb flakiness.
  retries: process.env.CI ? 1 : 0,

  // Parallelism.
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  // Reasonable default timeouts (documented, not arbitrary).
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  reporter: [
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'reports/results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    navigationTimeout: 30_000,
    actionTimeout: 15_000,

    // Capture screenshots only on failure to keep reports lean.
    screenshot: 'only-on-failure',

    // Traces are the primary debugging artifact - capture on first retry.
    trace: 'on-first-retry',

    // Keep video off by default (expensive); enable per-project if needed.
    video: 'retain-on-failure',
  },

  // Browser matrix - Chromium, Firefox, WebKit, plus representative mobile
  // viewports. Each project can be run independently:
  //   npx playwright test --project=chromium
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
