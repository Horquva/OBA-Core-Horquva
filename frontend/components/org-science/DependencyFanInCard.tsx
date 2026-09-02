'use client';

import { Link2 } from 'lucide-react';
import { orgScience, type DependencyFanInPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/**
 * M02 — fan-in ranking + critical-dependency list over depends_on edges the
 * graph unifies from `dependencies` + agent_platform + workflow_tool_
 * dependencies + system_dependencies + system_agent_usage.
 */
export function DependencyFanInCard() {
  return (
    <GraphIntelligenceCard<DependencyFanInPayload>
      title="Dependency Fan-In"
      icon={Link2}
      fetcher={orgScience.dependencyFanIn}
      errorLabel="Failed to load dependency fan-in data"
      toView={(data) => ({
        headline: data.dependencyCount,
        headlineLabel: 'Dependency Edges',
        badge:
          data.criticalDependencies.length === 0
            ? { text: 'STABLE', tone: 'good' }
            : { text: `${data.criticalDependencies.length} CRITICAL`, tone: 'warn' },
        rows: [
          {
            label: 'Most Depended Upon',
            value: data.mostDependedUpon[0]?.name ?? '—',
          },
          { label: 'Critical Dependencies', value: data.criticalDependencies.length },
        ],
      })}
    />
  );
}
