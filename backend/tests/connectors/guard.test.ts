// HTTP guard retry policy, and how connector failures read to a person.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { ReadOnlyHttpGuard } from '../../src/connectors/sdk/guard.js';
import { ConnectorRunner } from '../../src/connectors/sdk/runner.js';

let server: http.Server;
let base: string;
let hits = 0;
let status = 200;

beforeAll(async () => {
  server = http.createServer((_req, res) => {
    hits++;
    res.writeHead(status, { 'content-type': 'application/json' }).end('{}');
  });
  await new Promise<void>((r) => server.listen(0, () => r()));
  base = `http://localhost:${(server.address() as any).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('ReadOnlyHttpGuard retries', () => {
  it('gives up at once on a 4xx (a bad key will not fix itself)', async () => {
    hits = 0;
    status = 401;
    const started = Date.now();
    await expect(new ReadOnlyHttpGuard(['localhost']).get(`${base}/x`, { maxRetries: 3 })).rejects.toThrow(/HTTP Error 401/);
    expect(hits).toBe(1);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('still retries a 5xx', async () => {
    hits = 0;
    status = 500;
    await expect(new ReadOnlyHttpGuard(['localhost']).get(`${base}/x`, { maxRetries: 1 })).rejects.toThrow(/HTTP Error 500/);
    expect(hits).toBe(2);
  });
});

describe('connector errors read like sentences', () => {
  it('says the connection was refused instead of "fetch failed"', async () => {
    const closed = http.createServer();
    await new Promise<void>((r) => closed.listen(0, () => r()));
    const port = (closed.address() as any).port;
    await new Promise<void>((r) => closed.close(() => r()));

    const result = await ConnectorRunner.testConfig('n8n', { baseUrl: `http://localhost:${port}`, apiKey: 'k' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Couldn't reach the service: the server refused the connection/);
  }, 30000);

  it('explains a port that fetch refuses outright', async () => {
    const result = await ConnectorRunner.testConfig('n8n', { baseUrl: 'http://localhost:9', apiKey: 'k' });
    expect(result.error).toMatch(/refuse that port .* check the port in the URL/);
  }, 30000);
});
