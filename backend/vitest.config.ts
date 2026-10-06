import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Tests run on the in-memory fixture. Point Postgres at a closed local port so
    // "try the database first" fails instantly instead of reaching whatever
    // DATABASE_URL is in .env (a remote server here, 1.5–4 s per query).
    // dotenv never overrides an already-set variable, so this wins over .env.
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/horquva_test',
      // Never call the real AI model from tests: Ask answers come from the graph.
      GEMINI_API_KEY: '',
    },
  },
});
