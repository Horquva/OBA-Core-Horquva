'use client';

import { ShieldAlert } from 'lucide-react';
import { orgScience, type OrganizationalRiskPayload } from '../../lib/api';
import { GraphIntelligenceCard } from './GraphIntelligenceCard';

/** M03 — SPOF + critical-dependency risk score across every asset type, not just agents. */
export function OrganizationalRiskCard() {
  return (
    <GraphIntelligenceCard<OrganizationalRiskPayload>
      title="Organizational Risk"
      icon={ShieldAlert}
      fetcher={orgScience.organizationalRisk}
      errorLabel="Failed to load organizational risk data"
      toView={(data) => ({
        headline: `${Math.round(data.riskScore * 100)}%`,
        headlineLabel: `Risk Score — ${data.riskLevel.toUpperCase()}`,
        badge:
          data.riskLevel === 'low'
            ? { text: 'LOW RISK', tone: 'good' }
            : data.riskLevel === 'medium'
              ? { text: 'MEDIUM RISK', tone: 'warn' }
              : { text: 'HIGH RISK', tone: 'bad' },
        rows: [
          { label: 'Single Points of Failure', value: data.singlePointsOfFailure.length, tone: data.singlePointsOfFailure.length ? 'bad' : 'good' },
          { label: 'Critical Dependencies', value: data.criticalDependencyCount },
        ],
      })}
    />
  );
}
