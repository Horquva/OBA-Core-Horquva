'use client';

import { Bot } from 'lucide-react';
import { orgScience, type AiAgentGovernancePayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/**
 * M07 — governedBy/dependsOn/supports per graph `ai_agent` entity, automation
 * agents and platforms both (unlike GET /api/tool-intelligence, which is
 * platforms only).
 */
export function AiAgentGovernanceCard() {
  return (
    <GraphIntelligenceCard<AiAgentGovernancePayload>
      title="AI Agent Governance"
      icon={Bot}
      fetcher={orgScience.aiAgentGovernance}
      errorLabel="Failed to load AI agent governance data"
      toView={(data) => ({
        headline: data.aiAgentCount,
        headlineLabel: 'AI Agents & Platforms',
        badge:
          data.ungovernedAgents.length === 0
            ? { text: 'GOVERNED', tone: 'good' }
            : { text: `${data.ungovernedAgents.length} UNGOVERNED`, tone: 'bad' },
        rows: [
          {
            label: 'Ungoverned',
            value: data.ungovernedAgents.length,
            tone: data.ungovernedAgents.length ? 'bad' : 'good',
          },
        ],
      })}
    />
  );
}
