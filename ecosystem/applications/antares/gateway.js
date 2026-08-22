'use strict';

/**
 * gateway.js — Antares Integration Gateway
 * ------------------------------------------
 * Calls all 6 real, running team services and merges their LIVE responses
 * into one JSON contract the dashboard consumes. No static files, no
 * fabricated numbers — every field here comes from an actual running
 * service at request time. If a service is down, its section is marked
 * "unavailable" rather than silently faked.
 *
 * Run: node gateway.js
 * Default port: 4000 (override with PORT env var)
 * Serves the dashboard static files from ../apps/web/dashboard at "/"
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const DASHBOARD_DIR = path.join(__dirname, 'apps', 'web', 'dashboard');

// Host for each service — overridable via env vars so the same code runs
// standalone (127.0.0.1) or inside Docker Compose (service names).
const HOSTS = {
  lifecycle: process.env.LIFECYCLE_HOST || '127.0.0.1:4001',
  integration: process.env.INTEGRATION_HOST || '127.0.0.1:4002',
  governance: process.env.GOVERNANCE_HOST || '127.0.0.1:4003',
  capability: process.env.CAPABILITY_HOST || '127.0.0.1:4004',
  validation: process.env.VALIDATION_HOST || '127.0.0.1:4005',
  research: process.env.RESEARCH_HOST || '127.0.0.1:4006',
};

const SERVICES = {
  lifecycle: `http://${HOSTS.lifecycle}/api/observability`,
  integration: `http://${HOSTS.integration}/api/registry`,
  governance: `http://${HOSTS.governance}/api/decisions`,
  capability: `http://${HOSTS.capability}/api/summary`,
  validation: `http://${HOSTS.validation}/health`,
  research: `http://${HOSTS.research}/api/signals`,
};

async function safeFetch(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { available: true, data };
  } catch (err) {
    console.error(`[gateway] ${url} failed:`, err.message);
    return { available: false, error: err.message };
  }
}

async function aggregate() {
  const [lifecycle, integration, governance, capability, validation, research] = await Promise.all([
    safeFetch(SERVICES.lifecycle),
    safeFetch(SERVICES.integration),
    safeFetch(SERVICES.governance),
    safeFetch(SERVICES.capability),
    safeFetch(SERVICES.validation),
    safeFetch(SERVICES.research),
  ]);

  const platforms = lifecycle.available ? lifecycle.data.platforms : [];
  const jobs = lifecycle.available ? lifecycle.data.jobs : [];
  const capabilities = integration.available ? integration.data.capabilities : [];
  const governanceDecisions = governance.available ? governance.data.decisions : [];
  const signals = research.available ? research.data.signals : [];
  const researchCounts = research.available ? research.data.counts : {};
  const orgSummary = capability.available ? capability.data : null;

  return {
    generated_at: new Date().toISOString(),
    sources: {
      lifecycle: lifecycle.available ? 'live' : `down (${lifecycle.error})`,
      integration: integration.available ? 'live' : `down (${integration.error})`,
      governance: governance.available ? 'live' : `down (${governance.error})`,
      capability: capability.available ? 'live' : `down (${capability.error})`,
      validation: validation.available ? 'live' : `down (${validation.error})`,
      research: research.available ? 'live' : `down (${research.error})`,
    },
    overview: {
      platforms_registered: platforms.length,
      jobs_tracked: jobs.length,
      capabilities_in_registry: capabilities.length,
      research_signals: researchCounts.signals ?? signals.length,
      research_patterns: researchCounts.patterns ?? 0,
      governance_decisions: governanceDecisions.length,
    },
    platforms,
    jobs,
    capabilities,
    signals,
    governance_decisions: governanceDecisions,
    organization_summary: orgSummary,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function proxyPost(req, res, targetUrl) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = await readBody(req);
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(5000),
    });
    const text = await upstream.text();
    res.writeHead(upstream.status);
    res.end(text);
  } catch (err) {
    console.error(`[gateway] POST proxy to ${targetUrl} failed:`, err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ ok: false, error: `Couldn't reach the service: ${err.message}` }));
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/aggregate') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    try {
      const data = await aggregate();
      console.log(`[gateway] /api/aggregate served — sources:`, data.sources);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('[gateway] /api/aggregate FAILED:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ---- Interactive write endpoints — proxied straight to the real service ----
  if (req.method === 'POST' && req.url === '/api/capabilities') {
    return proxyPost(req, res, `http://${HOSTS.integration}/api/capabilities`);
  }
  if (req.method === 'POST' && req.url === '/api/signals') {
    return proxyPost(req, res, `http://${HOSTS.research}/api/signals`);
  }
  if (req.method === 'POST' && req.url === '/api/governance/evaluate') {
    return proxyPost(req, res, `http://${HOSTS.governance}/api/evaluate`);
  }

  // Serve dashboard static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(DASHBOARD_DIR, filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath);
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  });
});

const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`[gateway] Antares dashboard + API live at http://localhost:${PORT}`);
  console.log(`[gateway] aggregate endpoint: http://localhost:${PORT}/api/aggregate`);
});
