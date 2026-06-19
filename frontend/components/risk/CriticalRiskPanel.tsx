'use client';

import { AgentRiskProfile } from '../../lib/riskIntelligence';
import { RiskBadge } from '../ui/RiskBadge';
import { ShieldAlert, AlertTriangle, Users, Zap, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

interface CriticalAgentCardProps {
  profile: AgentRiskProfile;
  rank: number;
}

function CriticalAgentCard({ profile, rank }: CriticalAgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { agent, compositeScore, isCriticalByRule, isOrphaned, isSPOF, factors, downstreamCount } = profile;

  return (
    <div className={clsx(
      'card overflow-hidden border-[#1f1f29] relative',
      'hover:border-[#28283a] transition-all duration-300'
    )}>

      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 relative z-10 gap-5">
        <div className="flex items-start gap-4">
          {/* Rank badge */}
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-red-400">#{rank}</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-white">{agent.name}</h3>
              <RiskBadge level="critical" />
              {isOrphaned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Users className="w-3 h-3" /> Orphaned
                </span>
              )}
              {isSPOF && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Zap className="w-3 h-3" /> SPOF
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1f1f29] border border-[#28283a] text-slate-300">
                {agent.department}
              </span>
              {agent.owner ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {agent.owner}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <XCircle className="w-3 h-3" />
                  No Owner
                </span>
              )}
              {agent.backup_owner ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />
                  <span className="text-slate-500">Backup: {agent.backup_owner}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400/80">
                  <XCircle className="w-3 h-3" />
                  No Backup
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between w-full md:w-auto md:flex-shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-[#1f1f29] gap-4">
          {/* Score pill */}
          <div className="flex flex-col items-end md:items-end">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Risk Score</span>
            <span className="text-2xl font-bold text-red-400 leading-none">{compositeScore}</span>
          </div>
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-8 h-8 rounded-lg bg-[#1f1f29] border border-[#28283a] flex items-center justify-center text-slate-400 hover:text-white hover:border-[#3a3a52] transition-all"
            aria-label="Toggle breakdown"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CRITICAL rule banner */}
      {isCriticalByRule && (
        <div className="mx-6 mb-4 px-4 py-2.5 rounded-lg bg-red-500/8 border border-red-500/20 flex items-start gap-3 relative z-10">
          <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-red-400">CRITICAL Rule Triggered — </span>
            <span className="text-slate-400">
              {isOrphaned
                ? 'Agent has no owner assigned. Any failure is unrecoverable.'
                : `Agent is a Single Point of Failure with no backup owner. ${downstreamCount} downstream agents exposed.`}
            </span>
          </div>
        </div>
      )}

      {/* Expandable breakdown */}
      {expanded && (
        <div className="border-t border-[#1f1f29] px-6 py-5 relative z-10 animate-fade-in">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">
            Risk Factor Breakdown
          </p>
          <div className="space-y-2.5">
            {factors.map((factor, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className={clsx(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    factor.severity === 'critical' ? 'bg-red-400' :
                    factor.severity === 'high'     ? 'bg-orange-400' :
                    factor.severity === 'medium'   ? 'bg-yellow-400' :
                    'bg-emerald-400'
                  )} />
                  <span className="text-sm text-slate-300">{factor.label}</span>
                </div>
                <div className={clsx(
                  'text-xs font-semibold px-2 py-0.5 rounded border',
                  factor.severity === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                  factor.severity === 'high'     ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                  factor.severity === 'medium'   ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                  'text-slate-400 bg-[#1f1f29] border-[#28283a]'
                )}>
                  {factor.points > 0 ? `+${factor.points}` : '—'}
                </div>
              </div>
            ))}
            {/* Total */}
            <div className="border-t border-[#1f1f29] pt-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Total Risk Score</span>
              <span className="text-sm font-bold text-red-400">{compositeScore}</span>
            </div>
          </div>

          {downstreamCount > 0 && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-[#111116] border border-[#1f1f29] flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                Failure of this agent cascades to{' '}
                <span className="text-orange-400 font-semibold">{downstreamCount} downstream agent{downstreamCount !== 1 ? 's' : ''}</span>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface CriticalRiskPanelProps {
  criticalAgents: AgentRiskProfile[];
}

export function CriticalRiskPanel({ criticalAgents }: CriticalRiskPanelProps) {
  if (criticalAgents.length === 0) {
    return (
      <div className="card px-6 py-10 flex flex-col items-center justify-center text-center animate-fade-up delay-300">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
        <h3 className="text-white font-semibold mb-1">No Critical Agents</h3>
        <p className="text-sm text-slate-400">All agents are below the CRITICAL risk threshold.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up delay-300">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Critical Risk Agents</h2>
          <p className="text-xs text-slate-400">
            {criticalAgents.length} agent{criticalAgents.length !== 1 ? 's' : ''} require immediate executive action
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-soft" />
          {criticalAgents.length} Critical
        </span>
      </div>

      <div className="space-y-4">
        {criticalAgents.map((profile, i) => (
          <CriticalAgentCard key={profile.agent.id} profile={profile} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
