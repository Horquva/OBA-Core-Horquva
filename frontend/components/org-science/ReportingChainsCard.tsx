'use client';

import { UsersRound } from 'lucide-react';
import { orgScience, type ReportingChainsPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/**
 * M20 — org-chart reporting structure (reports_to/manages edges). Not the
 * RACI system at GET /api/accountability/* — a different structure under
 * the same word.
 */
export function ReportingChainsCard() {
  return (
    <GraphIntelligenceCard<ReportingChainsPayload>
      title="Reporting Chains"
      icon={UsersRound}
      fetcher={orgScience.reportingChains}
      errorLabel="Failed to load reporting chains"
      toView={(data) => ({
        headline: data.assetsWithoutAccountableOwner.length,
        headlineLabel: 'Assets Without an Accountable Owner',
        badge:
          data.assetsWithoutAccountableOwner.length === 0
            ? { text: 'ACCOUNTABLE', tone: 'good' }
            : { text: 'GAPS FOUND', tone: 'bad' },
        rows: [
          { label: 'Reporting Chains', value: data.reportingChains.length },
          { label: 'Management Links', value: data.managementLinks.length },
        ],
      })}
    />
  );
}
