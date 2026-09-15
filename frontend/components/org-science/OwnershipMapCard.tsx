'use client';

import { Users } from 'lucide-react';
import { orgScience, type OwnershipMapPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/** M01 — asset-first ownership across every asset type, not just agents. */
export function OwnershipMapCard() {
  return (
    <GraphIntelligenceCard<OwnershipMapPayload>
      title="Ownership Map"
      icon={Users}
      fetcher={orgScience.ownershipMap}
      errorLabel="Failed to load ownership map"
      toView={(data) => ({
        headline: `${Math.round(data.ownershipCoverage * 100)}%`,
        headlineLabel: 'Asset Ownership Coverage',
        badge:
          data.unownedAssets.length === 0
            ? { text: 'COVERED', tone: 'good' }
            : { text: 'GAPS FOUND', tone: 'bad' },
        rows: [
          { label: 'Total Assets', value: data.totalAssets },
          { label: 'Owned Assets', value: data.ownedAssets, tone: 'good' },
          {
            label: 'Unowned Assets',
            value: data.unownedAssets.length,
            tone: data.unownedAssets.length ? 'bad' : 'good',
          },
        ],
      })}
    />
  );
}
