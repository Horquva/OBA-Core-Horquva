'use client';

import { useEffect, useState } from 'react';
import { computeRiskIntelligence, RiskIntelligenceReport } from '../../lib/riskIntelligence';
import { RiskHeader } from '../../components/risk/RiskHeader';
import { CriticalRiskPanel } from '../../components/risk/CriticalRiskPanel';
import { RiskScoreTable } from '../../components/risk/RiskScoreTable';
import { OrgHealthBanner } from '../../components/risk/OrgHealthBanner';
import { PredictedRiskPanel } from '../../components/risk/PredictedRiskPanel';
import { Agent, Dependency } from '../../types';
import { authHeader } from '../../lib/authFetch';
import { normalizeAgent } from '../../lib/normalize';
import { buildPredictiveRiskByAgentName } from '../../lib/predictiveRisk';

interface RawDependency {
  source_id?: string | number;
  target_id?: string | number;
  dependency_type?: string;
}

interface RawSpof {
  agentId?: string | number;
}

export default function RiskPage() {
  const [report, setReport] = useState<RiskIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
    
    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load agents');
        return r.json();
      }),
      fetch(`${base}/api/dependencies`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load dependencies');
        return r.json();
      }),
      fetch(`${base}/api/dependencies/agent-spofs`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load SPOF data');
        return r.json();
      }),
      fetch(`${base}/api/predictive-risk/agents`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load predictive risk scores');
        return r.json();
      }),
      fetch(`${base}/api/health/summary`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load org health');
        return r.json();
      })
    ])
    .then(([agentsData, depsData, spofData, predictiveData, healthData]) => {
      const agents: Agent[] = Array.isArray(agentsData) ? agentsData.map(normalizeAgent) : [];

      const dependencies: Dependency[] = Array.isArray(depsData.dependencies) ? depsData.dependencies.map((d: RawDependency) => ({
        from: d.source_id?.toString() || '',
        to: d.target_id?.toString() || '',
        type: d.dependency_type || 'sequential',
      })) : [];

      const spofAgentIds = new Set<string>(
        (spofData.spofs || []).map((s: RawSpof) => s.agentId?.toString() || '')
      );
      const riskByAgentName = buildPredictiveRiskByAgentName(predictiveData);
      const orgHealth = healthData
        ? { healthIndex: healthData.healthIndex ?? null, healthStatus: healthData.healthStatus ?? null }
        : null;
      const calculatedReport = computeRiskIntelligence(
        agents,
        dependencies,
        spofAgentIds,
        riskByAgentName,
        orgHealth
      );
      setReport(calculatedReport);
    })
    .catch((err) => {
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 pb-12 animate-pulse mt-8">
        <div className="h-48 w-full bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="h-96 w-full bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="h-96 w-full bg-[var(--border-subtle)] rounded-xl"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10">
        Failed to load risk intelligence dataset: {error || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <RiskHeader report={report} />
      <PredictedRiskPanel />
      <CriticalRiskPanel criticalAgents={report.criticalAgents} />
      <RiskScoreTable
        agents={report.highAgents}
        title="High Risk Agents"
        subtitle="Score ≥ 55 — Escalate to department heads"
        tier="HIGH"
      />
      <RiskScoreTable
        agents={report.mediumAgents}
        title="Medium Risk Agents"
        subtitle="Score ≥ 35 — Monitor and schedule review"
        tier="MEDIUM"
      />
      <RiskScoreTable
        agents={report.lowAgents}
        title="Low Risk Agents"
        subtitle="Score < 35 — Well-governed, continue maintaining"
        tier="LOW"
      />
      <OrgHealthBanner report={report} />
    </div>
  );
}
