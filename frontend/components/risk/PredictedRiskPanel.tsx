'use client';

import React, { useEffect, useState } from 'react';
import { predictiveApi, PredictiveSummary, PredictedAgent } from '../../lib/api';
import { ShieldAlert, TrendingUp } from 'lucide-react';
import { TruthBadge } from '../dashboard/TruthBadge';
import { SignalDrilldown } from './SignalDrilldown';

export function PredictedRiskPanel() {
  const [summary, setSummary] = useState<PredictiveSummary | null>(null);
  const [agents, setAgents] = useState<PredictedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      predictiveApi.summary().catch(() => null),
      predictiveApi.agents().catch(() => [])
    ]).then(([sumData, agentData]) => {
      setSummary(sumData);
      setAgents(agentData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-48 rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] animate-pulse" />;
  }

  if (!summary) return null;

  const emergingThreats = agents.filter(a => a.isEmergingThreat);

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />

      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Predictive Risk Forecast</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Forward-looking threat classification model</p>
        </div>
        <TruthBadge verified={agents.length > 0} />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8 z-10">
        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <span className="text-2xl font-bold text-red-400">{summary.breakdown.CRITICAL}</span>
          <span className="text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider mt-1">Critical</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <span className="text-2xl font-bold text-amber-500">{summary.breakdown.HIGH}</span>
          <span className="text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider mt-1">High</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <span className="text-2xl font-bold text-yellow-400">{summary.breakdown.MEDIUM}</span>
          <span className="text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider mt-1">Medium</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <span className="text-2xl font-bold text-emerald-400">{summary.breakdown.LOW}</span>
          <span className="text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider mt-1">Low</span>
        </div>
      </div>

      {emergingThreats.length > 0 && (
        <div className="z-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-[color:var(--text-primary)]">Emerging Threats</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium ml-2">{emergingThreats.length} Detected</span>
          </div>
          
          <div className="space-y-3">
            {emergingThreats.map((agent, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] transition-colors hover:border-amber-500/30">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-[color:var(--text-primary)]">{agent.agentName}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[color:var(--text-tertiary)]">Current: {agent.currentRisk}</span>
                      <ArrowRight className="w-3 h-3 text-[color:var(--text-tertiary)]" />
                      <span className="text-xs font-medium text-rose-400">Predicted: {agent.threatLevel}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedAgent(selectedAgent === agent.agentName ? null : agent.agentName)}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] hover:bg-[color:var(--bg-cardHover)] text-[color:var(--text-secondary)] transition-colors"
                  >
                    {selectedAgent === agent.agentName ? 'Hide Signals' : 'View Drilldown'}
                  </button>
                </div>
                
                {selectedAgent === agent.agentName && (
                  <div className="mt-2 pt-3 border-t border-[color:var(--border-subtle)]">
                    <SignalDrilldown entityName={agent.agentName} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14"></path>
      <path d="m12 5 7 7-7 7"></path>
    </svg>
  );
}
