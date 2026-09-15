'use client';

import { Network } from 'lucide-react';
import { orgScience, type NetworkCentralityPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/**
 * M35 — all-entity-type degree centrality over the full Knowledge Graph. Not
 * GET /api/network/centrality, which is people-only, ownership-derived
 * centrality — a different graph, named apart on purpose.
 */
export function NetworkCentralityCard() {
  return (
    <GraphIntelligenceCard<NetworkCentralityPayload>
      title="Network Centrality"
      icon={Network}
      fetcher={orgScience.networkCentrality}
      errorLabel="Failed to load network centrality data"
      toView={(data) => ({
        headline: data.averageDegree,
        headlineLabel: 'Average Degree',
        rows: [{ label: 'Most Connected', value: data.mostConnected ?? '—' }],
      })}
    />
  );
}
