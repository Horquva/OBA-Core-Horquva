// =============================================================================
// Horquva Continuity Platform — On-Prem / Air-Gapped n8n Collector
// =============================================================================
// Standalone runner script designed to run inside customer VPC / Docker network
// adjacent to on-prem n8n instances. Queries n8n via private loopback, sanitizes
// payload (strips all secret credentials), and exports JSON bundle or pushes
// to Horquva Ingestion Endpoint.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { N8nConnector } from './index.js';

export interface CollectorCliOptions {
  n8nUrl: string;
  n8nApiKey: string;
  outputBundlePath?: string;
  horquvaIngestEndpoint?: string;
  horquvaIngestToken?: string;
}

export async function runN8nCollector(options: CollectorCliOptions): Promise<void> {
  console.log(`[Horquva Collector] Connecting to n8n instance at ${options.n8nUrl}...`);

  const connector = new N8nConnector('collector:local-n8n', 'On-Prem n8n Collector', {
    baseUrl: options.n8nUrl,
    apiKey: options.n8nApiKey,
  });

  const healthy = await connector.testConnection();
  if (!healthy) {
    throw new Error(`[Horquva Collector] Failed to authenticate with n8n at ${options.n8nUrl}`);
  }
  console.log('[Horquva Collector] n8n authenticated successfully. Starting read-only sync...');

  const syncResult = await connector.sync();
  console.log(
    `[Horquva Collector] Sync complete: ${syncResult.entities.length} entities, ${syncResult.edges.length} edges, ${syncResult.facts.length} facts.`
  );

  if (options.outputBundlePath) {
    const targetDir = path.dirname(options.outputBundlePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(options.outputBundlePath, JSON.stringify(syncResult, null, 2), 'utf-8');
    console.log(`[Horquva Collector] Exported sanitized bundle to: ${options.outputBundlePath}`);
  }

  if (options.horquvaIngestEndpoint && options.horquvaIngestToken) {
    console.log(`[Horquva Collector] Pushing bundle to Horquva endpoint: ${options.horquvaIngestEndpoint}`);
    const res = await fetch(options.horquvaIngestEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.horquvaIngestToken}`,
      },
      body: JSON.stringify(syncResult),
    });

    if (!res.ok) {
      throw new Error(`[Horquva Collector] Failed to push to ingest endpoint: HTTP ${res.status} ${res.statusText}`);
    }
    console.log('[Horquva Collector] Ingestion bundle accepted by Horquva successfully.');
  }
}
