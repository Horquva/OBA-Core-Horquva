'use strict';

/**
 * server.js — HTTP wrapper around the Trust & Governance engine.
 * Runs the SAME 3 real scenarios from demo.js through the live decision
 * chain (Authority -> Rules -> Trust -> Decision -> Evidence -> Audit),
 * and exposes them + the full audit trail as JSON.
 *
 * Also accepts POST /api/evaluate with a custom action request, so other
 * services can ask governance for a live ruling on a real action.
 *
 * Run: node server.js
 * Default port: 4003 (override with PORT env var)
 */
const http = require('http');
const { handleActionRequest } = require('./runtimeEnforcement');
const { createTrustSignal } = require('./models');
const { RULES } = require('./rules');
const { queryAuditTrail, requestGovernanceDecision } = require('./governanceApi');

const PORT = process.env.PORT || 4003;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
}

function runScenarios() {
  const scenarios = [
    {
      label: "Agent proposes deleting a customer record",
      actionRequest: { id: 'DEMO-1', action: 'delete_customer_record', actorId: 'agent-zeeshan-047', actorRole: 'verified_agent', resourceType: 'customer_record', claimedAuthority: 'customer_deletion_request' },
      context: { platform: 'zeeshan-agent-platform', demo: true },
      trustSignals: [createTrustSignal({ id: 'TS-1', actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE', value: 0.87, source: 'trust-engine' })],
    },
    {
      label: "A trusted agent reads a customer record",
      actionRequest: { id: 'DEMO-2', action: 'read_customer_record', actorId: 'agent-1', actorRole: 'verified_agent', resourceType: 'customer_record' },
      context: { platform: 'zeeshan-agent-platform', demo: true },
      trustSignals: [createTrustSignal({ id: 'TS-2', actorId: 'agent-1', signalType: 'ORG_TRUST_SCORE', value: 0.92, source: 'trust-engine' })],
    },
    {
      label: "An unverified actor attempts to read a customer record",
      actionRequest: { id: 'DEMO-3', action: 'read_customer_record', actorId: 'agent-x', actorRole: 'unverified_agent', resourceType: 'customer_record' },
      context: { platform: 'zeeshan-agent-platform', demo: true },
      trustSignals: [],
    },
  ];

  return scenarios.map((s) => {
    const result = handleActionRequest(s.actionRequest, s.context, RULES, s.trustSignals);
    return {
      label: s.label,
      actor: s.actionRequest.actorId,
      action: s.actionRequest.action,
      stageReached: result.stageReached,
      riskLevel: result.decision ? result.decision.riskLevel : null,
      outcome: result.decision.outcome,
      reason: result.decision.reason,
      accountableOwner: result.decision.accountableOwner,
      evidenceId: result.evidence.id,
      auditEntryId: result.auditEntryId,
    };
  });
}

const server = http.createServer((req, res) => {
  cors(res);

  if (req.method === 'GET' && req.url === '/api/rules') {
    // Din 3: exposes the engine's REAL active rule set read-only, so an external
    // platform (Zeeshan's agent_engine) can sync real governance rules instead of
    // hand-typing a rule and mislabeling it as coming from this engine.
    res.writeHead(200);
    res.end(JSON.stringify({ service: 'governance-engine', rules: RULES }));
    return;
  }

  if (req.method === 'GET' && (req.url === '/api/decisions' || req.url === '/')) {
    // Din 5: make ACTUAL governance state available to the unified product.
    // Previously this endpoint's `decisions` field re-ran runScenarios() (3 canned
    // demo cases) on every single call — so the dashboard was displaying fake replayed
    // demo data as if it were live governance activity, and `governance_decisions`
    // count in the aggregate dashboard never reflected anything real (Din 1 finding).
    // Fixed: `decisions` is now the REAL audit trail. The demo walkthrough still exists
    // for illustration/docs, but under its own `sampleScenarios` key so it can never be
    // mistaken for real state again.
    try {
      const audit = queryAuditTrail();
      const decisions = audit.map((entry) => ({
        decisionId: entry.decisionId,
        auditEntryId: entry.auditEntryId,
        evidenceId: entry.evidenceId,
        outcome: entry.outcome,
        accountableOwner: entry.accountableOwner,
        recordedAt: entry.recordedAt,
      }));
      const sampleScenarios = runScenarios();
      res.writeHead(200);
      res.end(JSON.stringify({ service: 'governance-engine', decisions, auditTrail: audit, sampleScenarios }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/evaluate') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const input = JSON.parse(body || '{}');
        // Din 2 fix: go through governanceApi.js (the Din 7 public contract), not
        // handleActionRequest directly. Calling handleActionRequest here skipped the
        // AT-5 fix (dropping trust signals from an untrusted `source`) — an external
        // HTTP caller could previously self-report a fake ORG_TRUST_SCORE and buy an
        // ALLOW. requestGovernanceDecision() applies the same validated-signal path
        // that direct JS importers already get.
        const result = requestGovernanceDecision({
          actionRequest: input.actionRequest,
          context: input.context || {},
          trustSignals: input.trustSignals || []
        });
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'governance-engine' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`[governance-engine] listening on http://localhost:${PORT}`);
});
