'use client';

import { useEffect, useState } from 'react';
import { mapRecommendationsResponse, RecommendationEngineOutput } from '../../lib/recommendations';
import RecommendationHeader from '../../components/recommendations/RecommendationHeader';
import Top5Urgent from '../../components/recommendations/Top5Urgent';
import RecommendationList from '../../components/recommendations/RecommendationList';
import DemoSummary from '../../components/recommendations/DemoSummary';
import { DecisionSupportQueue } from '../../components/recommendations/DecisionSupportQueue';
import { OpportunityBacklogTab } from '../../components/recommendations/OpportunityBacklogTab';
import { authHeader } from '../../lib/authFetch';
import { VerifiedAdvisorPanel } from '../../components/recommendations/VerifiedAdvisorPanel';

export default function RecommendationsPage() {
  const [output, setOutput] = useState<RecommendationEngineOutput | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    Promise.all([
      // D-62 -- brain module M04, expanded to all 7 rules.
      fetch(`${base}/api/intelligence/recommendations`, { headers: authHeader() }).then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`))),
      fetch(`${base}/api/health/summary`, { headers: authHeader() }).then(r => r.ok ? r.json() : { healthIndex: 0 }),
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => r.ok ? r.json() : []),
    ])
    .then(([recJson, healthData, agentsData]) => {
      setOutput(mapRecommendationsResponse(recJson, healthData.healthIndex ?? 0));
      setAgentCount(Array.isArray(agentsData) ? agentsData.length : 0);
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 max-w-7xl mx-auto">
        Failed to load recommendations environment: {error}
      </div>
    );
  }

  if (loading || !output) {
    return (
      <div className="flex flex-col gap-5 pb-12 animate-pulse mt-8 px-6 md:px-10 max-w-7xl w-full mx-auto">
        <div className="h-48 w-full bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="h-64 w-full bg-[var(--border-subtle)] rounded-xl"></div>
        <div className="h-[400px] w-full bg-[var(--border-subtle)] rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-6 md:px-10 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <RecommendationHeader output={output} />
      <Top5Urgent top5={output.top5} />
      <DecisionSupportQueue recommendations={output.prioritized} />
      <OpportunityBacklogTab recommendations={output.prioritized} />
      <VerifiedAdvisorPanel recommendations={output.prioritized} />
      <RecommendationList recommendations={output.prioritized} />
      <DemoSummary
        output={output}
        company="Organizational Intelligence"
        agentCount={agentCount}
      />
    </div>
  );
}
