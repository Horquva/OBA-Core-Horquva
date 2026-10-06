import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'msedge',
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        channel: 'msedge',
      },
    },
  ],
  webServer: {
    command: 'npm run start -- -p 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
