'use client';

import { AgentRiskProfile, RiskTier } from '../../lib/riskIntelligence';
import { RiskBadge } from '../ui/RiskBadge';
import { CheckCircle2, XCircle, Zap, Users, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

interface RiskScoreTableProps {
  agents: AgentRiskProfile[];
  title: string;
  subtitle?: string;
  tier: RiskTier;
}

const TIER_META: Record<RiskTier, { headerBg: string; border: string; countBg: string; countText: string }> = {
  CRITICAL: {
    headerBg: 'bg-transparent',
    border: 'border-[#1f1f29]',
    countBg: 'bg-[#1f1f29] border-[#28283a]',
    countText: 'text-red-400',
  },
  HIGH: {
    headerBg: 'bg-transparent',
    border: 'border-[#1f1f29]',
    countBg: 'bg-[#1f1f29] border-[#28283a]',
    countText: 'text-orange-400',
  },
  MEDIUM: {
    headerBg: 'bg-transparent',
    border: 'border-[#1f1f29]',
    countBg: 'bg-[#1f1f29] border-[#28283a]',
    countText: 'text-yellow-400',
  },
  LOW: {
    headerBg: 'bg-transparent',
    border: 'border-[#1f1f29]',
    countBg: 'bg-[#1f1f29] border-[#28283a]',
    countText: 'text-emerald-400',
  },
};

const LEVEL_MAP: Record<RiskTier, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export function RiskScoreTable({ agents, title, subtitle, tier }: RiskScoreTableProps) {
  const meta = TIER_META[tier];
  const level = LEVEL_MAP[tier];

  if (agents.length === 0) return null;

  return (
    <div className={clsx('card overflow-hidden border', meta.border, 'animate-fade-up delay-400')}>
      {/* Header */}
      <div className={clsx('px-6 py-4 border-b border-[#1f1f29] flex items-center justify-between', meta.headerBg)}>
        <div>
          <div className="flex items-center gap-2.5">
            <BarChart3 className={clsx('w-4 h-4', meta.countText)} />
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 pl-6">{subtitle}</p>}
        </div>
        <span className={clsx(
          'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
          meta.countBg, meta.countText
        )}>
          {agents.length} Agents
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#111116] text-[10px] uppercase tracking-widest text-slate-500 border-b border-[#1f1f29]">
              <th className="px-5 py-3.5 font-medium">Agent</th>
              <th className="px-5 py-3.5 font-medium">Department</th>
              <th className="px-5 py-3.5 font-medium">Owner</th>
              <th className="px-5 py-3.5 font-medium">Backup</th>
              <th className="px-5 py-3.5 font-medium">Docs</th>
              <th className="px-5 py-3.5 font-medium">Cascade</th>
              <th className="px-5 py-3.5 font-medium text-right">Score</th>
              <th className="px-5 py-3.5 font-medium text-center">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111116]">
            {agents.map((profile, idx) => (
              <tr
                key={profile.agent.id}
                className="hover:bg-[#1a1a22] transition-colors group/row"
                style={{ animationDelay: `${400 + idx * 40}ms` }}
              >
                {/* Agent Name */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm group-hover/row:text-indigo-300 transition-colors">
                      {profile.agent.name}
                    </span>
                    {profile.isSPOF && (
                      <span title="Single Point of Failure">
                        <Zap className="w-3 h-3 text-rose-400 flex-shrink-0" />
                      </span>
                    )}
                    {profile.isOrphaned && (
                      <span title="No Owner — Orphaned">
                        <Users className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      </span>
                    )}
                  </div>
                </td>

                {/* Department */}
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1f1f29] border border-[#28283a] text-xs text-slate-300">
                    {profile.agent.department}
                  </span>
                </td>

                {/* Owner */}
                <td className="px-5 py-4">
                  {profile.agent.owner ? (
                    <span className="text-sm text-slate-300">{profile.agent.owner}</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> None
                    </span>
                  )}
                </td>

                {/* Backup */}
                <td className="px-5 py-4">
                  {profile.agent.backup_owner ? (
                    <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      {profile.agent.backup_owner}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-400/80 text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> Exposed
                    </span>
                  )}
                </td>

                {/* Docs */}
                <td className="px-5 py-4">
                  {profile.agent.documented ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400/70" />
                  )}
                </td>

                {/* Cascade */}
                <td className="px-5 py-4">
                  {profile.downstreamCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/8 border border-orange-500/15 text-orange-400 text-[11px] font-semibold">
                      {profile.downstreamCount} agents
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>

                {/* Score */}
                <td className="px-5 py-4 text-right">
                  <span className={clsx(
                    'text-sm font-bold tabular-nums',
                    level === 'critical' ? 'text-red-400' :
                    level === 'high'     ? 'text-orange-400' :
                    level === 'medium'   ? 'text-yellow-400' : 'text-emerald-400'
                  )}>
                    {profile.compositeScore}
                  </span>
                </td>

                {/* Risk Badge */}
                <td className="px-5 py-4 text-center">
                  <RiskBadge level={level} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
