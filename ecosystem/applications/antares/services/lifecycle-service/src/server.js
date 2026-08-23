'use strict';

/**
 * server.js — HTTP wrapper around the Engineering Operations engine.
 * Exposes the SAME live state that dashboard.js prints to the terminal,
 * as JSON, so other services (like the web dashboard) can consume it.
 *
 * Run: node src/server.js
 * Default port: 4001 (override with PORT env var)
 */
const http = require('http');
const { loadOrCreate } = require('./persistence');
const { getFullObservability } = require('./observability');

const PORT = process.env.PORT || 4001;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
}

const server = http.createServer((req, res) => {
  cors(res);

  if (req.url === '/api/observability' || req.url === '/') {
    try {
      const engine = loadOrCreate();
      const obs = getFullObservability(engine);
      res.writeHead(200);
      res.end(JSON.stringify({
        service: 'lifecycle-service',
        owner: 'Kamil Ejaz',
        platforms: Array.from(engine.platforms.values()),
        jobs: Array.from(engine.jobs.values()),
        observability: obs,
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'lifecycle-service' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`[lifecycle-service] listening on http://localhost:${PORT}`);
});
