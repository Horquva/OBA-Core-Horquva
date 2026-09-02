'use client';

import { EyeOff } from 'lucide-react';
import { orgScience, type HiddenDependenciesPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/** M34 — transitive dependencies that are real but not directly declared. */
export function HiddenDependenciesCard() {
  return (
    <GraphIntelligenceCard<HiddenDependenciesPayload>
      title="Hidden Dependencies"
      icon={EyeOff}
      fetcher={orgScience.hiddenDependencies}
      errorLabel="Failed to load hidden dependency data"
      toView={(data) => ({
        headline: data.hiddenDependencyCount,
        headlineLabel: 'Hidden Dependencies Found',
        badge:
          data.hiddenDependencyCount === 0
            ? { text: 'NONE FOUND', tone: 'good' }
            : { text: 'UNDOCUMENTED COUPLING', tone: 'warn' },
        rows: data.hiddenDependencies[0]
          ? [
              {
                label: 'Example',
                value: `${data.hiddenDependencies[0].entity} → ${data.hiddenDependencies[0].hiddenDependency}`,
              },
            ]
          : [],
        emptyMessage: 'No indirect couplings detected.',
      })}
    />
  );
}
