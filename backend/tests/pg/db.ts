// Shared setup for the Postgres suites: wipe the test database and migrate it.

import http from 'node:http';
import { query } from '../../src/db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { app } from '../../src/server.js';

export async function resetDatabase(): Promise<void> {
  await query('DROP SCHEMA public CASCADE');
  await query('CREATE SCHEMA public');
  await runMigrations();
}

export async function startServer(): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as any;
      resolve({ server, baseUrl: `http://localhost:${port}` });
    });
  });
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
