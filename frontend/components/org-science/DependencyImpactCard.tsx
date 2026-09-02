'use client';

import { Zap } from 'lucide-react';
import { orgScience, type DependencyImpactPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/** M32 — blast-radius ranking across every entity type, not just agents. */
export function DependencyImpactCard() {
  return (
    <GraphIntelligenceCard<DependencyImpactPayload>
      title="Dependency Impact"
      icon={Zap}
      fetcher={orgScience.dependencyImpact}
      errorLabel="Failed to load dependency impact data"
      toView={(data) => ({
        headline: data.highestImpact?.cascadeImpact ?? 0,
        headlineLabel: data.highestImpact ? `Highest Cascade — ${data.highestImpact.entity}` : 'Highest Cascade Impact',
        badge: data.highestImpact
          ? data.highestImpact.severity === 'critical'
            ? { text: 'CRITICAL', tone: 'bad' }
            : data.highestImpact.severity === 'high'
              ? { text: 'HIGH', tone: 'warn' }
              : { text: 'MODERATE', tone: 'neutral' }
          : { text: 'NO IMPACT', tone: 'good' },
        rows: [{ label: 'Ranked Entities', value: data.impactCount }],
      })}
    />
  );
}
