'use strict';

/**
 * server.js — HTTP wrapper around the integration pipeline's registry.
 * Exposes the real persisted capability registry (data/registry.json)
 * as JSON, so other services can consume it.
 *
 * Run: node src/server.js
 * Default port: 4002 (override with PORT env var)
 */
const http = require('http');
const { loadRegistry, register, DuplicateSubmissionError } = require('./persistence');

const PORT = process.env.PORT || 4002;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
}

const server = http.createServer((req, res) => {
  cors(res);

  if (req.url === '/api/registry' || req.url === '/') {
    try {
      const registry = loadRegistry();
      const capabilities = Object.entries(registry.capabilities || {}).map(([id, c]) => ({ id, ...c }));
      res.writeHead(200);
      res.end(JSON.stringify({
        service: 'integration-service',
        capabilities,
        count: capabilities.length,
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/capabilities') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const input = JSON.parse(body || '{}');
        if (!input.name) throw new Error('name is required');
        const record = register({
          name: input.name,
          readinessState: input.readinessState || 'Candidate',
          version: input.version || '0.1',
          dependencies: input.dependencies || [],
        });
        res.writeHead(201);
        res.end(JSON.stringify({ ok: true, capability: record }));
      } catch (err) {
        const status = err instanceof DuplicateSubmissionError ? 409 : 400;
        res.writeHead(status);
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'integration-service' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`[integration-service] listening on http://localhost:${PORT}`);
});
