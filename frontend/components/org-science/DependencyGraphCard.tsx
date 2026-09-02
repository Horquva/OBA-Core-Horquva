'use client';

import { GitBranch } from 'lucide-react';
import { orgScience, type DependencyGraphPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/** M28 — full dependency adjacency, cycle detection, longest dependency chain. */
export function DependencyGraphCard() {
  return (
    <GraphIntelligenceCard<DependencyGraphPayload>
      title="Universal Dependency Graph"
      icon={GitBranch}
      fetcher={orgScience.dependencyGraph}
      errorLabel="Failed to load the dependency graph"
      toView={(data) => ({
        headline: data.nodes,
        headlineLabel: 'Connected Nodes',
        badge: data.hasCycles
          ? { text: 'CYCLES DETECTED', tone: 'bad' }
          : { text: 'ACYCLIC', tone: 'good' },
        rows: [
          { label: 'Dependency Edges', value: data.dependencyEdges },
          { label: 'Longest Chain', value: data.longestDependencyChain.length },
        ],
      })}
    />
  );
}
