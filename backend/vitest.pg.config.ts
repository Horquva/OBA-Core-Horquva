import { defineConfig } from 'vitest/config';

// Postgres-backed suites (persistence, connector sync, attestation locking).
// They DROP and recreate the public schema, so they refuse to run unless
// PG_TEST_URL names a database whose name ends in "_test".
//   PG_TEST_URL=postgresql://postgres:***@localhost:5432/horquva_test npm run test:pg
const url = process.env.PG_TEST_URL ?? '';
if (!/\/[^/?]+_test(\?|$)/.test(url)) {
  throw new Error('Set PG_TEST_URL to a throwaway database whose name ends in _test (the suites wipe it).');
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/pg/**/*.test.ts'],
    fileParallelism: false, // one database, shared
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      DATABASE_URL: url,
      NODE_ENV: 'test',
      GEMINI_API_KEY: '',
    },
  },
});
