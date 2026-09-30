// =============================================================================
// Horquva Continuity Platform — Free v0 n8n Ownership Check Route
// =============================================================================
// Implements Architecture Decision AD-7:
// - Stateless, server-side execution
// - Holds API key in memory only for the duration of the scan (never persisted)
// - Delivers instant value: owner concentration, unbacked workflows, and model calls
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { N8nConnector } from '../connectors/n8n/index.js';
import { ContinuityGraph } from '../domain/graph/index.js';
import { evaluateAllChecks, calculateHeadlineMetrics } from '../domain/checks/index.js';

export const v0Router = Router();

const N8nCheckRequestSchema = z.object({
  n8nUrl: z.string().url(),
  n8nApiKey: z.string().min(1),
});

v0Router.post('/n8n-check', async (req: Request, res: Response) => {
  const parsed = N8nCheckRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request: n8nUrl and n8nApiKey are required.' });
    return;
  }

  const { n8nUrl, n8nApiKey } = parsed.data;

  try {
    const connector = new N8nConnector('ephemeral-v0-check', 'v0 Scan', {
      baseUrl: n8nUrl,
      apiKey: n8nApiKey,
    });

    const isConnected = await connector.testConnection();
    if (!isConnected) {
      res.status(401).json({ error: 'Failed to authenticate with n8n instance. Check your URL and API Key.' });
      return;
    }

    // Perform read-only sync into memory
    const syncResult = await connector.sync();

    // Build in-memory graph
    const graph = ContinuityGraph.fromSnapshot(syncResult.entities, syncResult.edges, syncResult.facts);

    // Compute metrics and checks
    const metrics = calculateHeadlineMetrics(graph);
    const checks = evaluateAllChecks(graph);

    // Calculate owner concentration
    const ownerCounts: Record<string, { name: string; count: number; workflowIds: string[] }> = {};
    for (const edge of syncResult.edges) {
      if (edge.type === 'owns') {
        const owner = syncResult.entities.find((e) => e.id === edge.fromId);
        const ownerName = owner?.name || edge.fromId;
        if (!ownerCounts[edge.fromId]) {
          ownerCounts[edge.fromId] = { name: ownerName, count: 0, workflowIds: [] };
        }
        ownerCounts[edge.fromId].count++;
        ownerCounts[edge.fromId].workflowIds.push(edge.toId);
      }
    }

    const totalWorkflows = syncResult.entities.filter((e) => e.kind === 'automation').length;
    const sortedOwners = Object.values(ownerCounts)
      .sort((a, b) => b.count - a.count)
      .map((o) => ({
        ownerName: o.name,
        workflowsOwned: o.count,
        sharePct: totalWorkflows > 0 ? Math.round((o.count / totalWorkflows) * 100) : 0,
      }));

    // Find automations calling external AI models
    const aiCallingAutomations: Array<{ workflowName: string; modelName: string }> = [];
    for (const edge of syncResult.edges) {
      if (edge.type === 'calls_model') {
        const wf = syncResult.entities.find((e) => e.id === edge.fromId);
        const model = syncResult.entities.find((e) => e.id === edge.toId);
        if (wf && model) {
          aiCallingAutomations.push({
            workflowName: wf.name,
            modelName: model.name,
          });
        }
      }
    }

    res.json({
      success: true,
      scannedAt: new Date().toISOString(),
      summary: {
        totalWorkflows,
        totalUsers: syncResult.entities.filter((e) => e.kind === 'person').length,
        totalCredentials: syncResult.entities.filter((e) => e.kind === 'credential').length,
        aiIntegrationsCount: aiCallingAutomations.length,
      },
      ownerConcentration: sortedOwners,
      aiModelDependencies: aiCallingAutomations,
      headlineMetrics: metrics,
      detectedContinuityAlerts: checks.filter((c) => c.status === 'FAIL'),
    });
  } catch (err: any) {
    console.error('[v0Router] Error running n8n ownership scan:', err);
    res.status(500).json({ error: err.message || 'Failed to complete n8n scan.' });
  }
});
