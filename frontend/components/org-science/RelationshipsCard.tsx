'use client';

import { GitMerge } from 'lucide-react';
import { orgScience, type RelationshipsPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/** M29 — relationship-type distribution, collaboration links, isolated entities. */
export function RelationshipsCard() {
  return (
    <GraphIntelligenceCard<RelationshipsPayload>
      title="Organizational Relationships"
      icon={GitMerge}
      fetcher={orgScience.relationships}
      errorLabel="Failed to load relationship data"
      toView={(data) => ({
        headline: data.totalRelationships,
        headlineLabel: 'Total Relationships',
        badge:
          data.isolatedEntities.length === 0
            ? { text: 'CONNECTED', tone: 'good' }
            : { text: `${data.isolatedEntities.length} ISOLATED`, tone: 'warn' },
        rows: [
          { label: 'Collaboration Links', value: data.collaborationLinks },
          {
            label: 'Isolated Entities',
            value: data.isolatedEntities.length,
            tone: data.isolatedEntities.length ? 'warn' : 'good',
          },
        ],
      })}
    />
  );
}
