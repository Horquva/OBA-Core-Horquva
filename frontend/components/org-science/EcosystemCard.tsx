'use client';

import { Globe } from 'lucide-react';
import { orgScience, type EcosystemPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/**
 * M31 — internal vs. external entity census. externalActors is empty until
 * W2 wires data/company.json in — see backend/brain/README.md's "Known gaps".
 */
export function EcosystemCard() {
  return (
    <GraphIntelligenceCard<EcosystemPayload>
      title="Organizational Ecosystem"
      icon={Globe}
      fetcher={orgScience.ecosystem}
      errorLabel="Failed to load ecosystem data"
      toView={(data) => ({
        headline: data.internalEntities,
        headlineLabel: 'Internal Entities',
        badge:
          data.externalEntities === 0
            ? { text: 'INTERNAL ONLY', tone: 'neutral' }
            : { text: 'MAPPED', tone: 'good' },
        rows: [
          { label: 'External Entities', value: data.externalEntities },
          { label: 'External Actors', value: data.externalActors.length },
        ],
      })}
    />
  );
}
