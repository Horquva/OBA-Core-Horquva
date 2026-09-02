'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, FileText, UserPlus, ShieldAlert, Scale } from 'lucide-react';
import { request, type IntelligenceResponse } from '../../lib/api';
import { useAgents } from '../../lib/useAgents';

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  action: string;
  href: string;
}

interface RawRecommendation {
  id: string;
  title: string;
  description: string;
  category?: string;
  priority?: string;
}

// D-66: this panel used to build its list from GET /api/briefing/recommendations,
// which reads the `recommendations` SQL table -- seeded once, zero writers
// anywhere in the codebase, i.e. permanently frozen at whatever the seed said.
// When that call was empty (e.g. pre-login, or the table drained by status
// filtering), it fell back to a THIRD, hand-authored implementation (a static
// "Review Single-Point Dependencies" card plus a bare `!owner && criticality
// === 'critical'` check) -- neither path was real intelligence, and neither
// used brain module M04 (D-62), which is the actual, comprehensive, 7-rule
// recommendation engine this app already has. Both are gone; this now reads
// M04 directly, the same source app/recommendations/page.tsx uses.
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  OWNERSHIP: <UserPlus className="w-4 h-4 text-amber-400" />,
  DOCUMENTATION: <FileText className="w-4 h-4 text-blue-400" />,
  CONCENTRATION: <ShieldAlert className="w-4 h-4 text-indigo-400" />,
  TOOL_GOVERNANCE: <ShieldAlert className="w-4 h-4 text-indigo-400" />,
  DEPENDENCY: <Scale className="w-4 h-4 text-orange-400" />,
};

export function RiskSplit() {
  const { agents, loading: agentsLoading, error: agentsFetchError } = useAgents();
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [recsLoaded, setRecsLoaded] = useState(false);
  const [recsError, setRecsError] = useState(false);

  const agentsError = Boolean(agentsFetchError);
  const loading = agentsLoading || !recsLoaded;

  useEffect(() => {
    // "No priority actions — good standing" used to be the same message a
    // fetch failure produced, so a Supabase outage rendered as a clean bill
    // of health. Track failure explicitly so the panel can say "couldn't
    // load" instead of implying nothing needs attention.
    request<IntelligenceResponse<{ recommendations: RawRecommendation[] }>>('/api/intelligence/recommendations')
      .catch(() => { setRecsError(true); return null; })
      .then((m04) => {
      const m04Recs: RawRecommendation[] = m04?.payload?.recommendations ?? [];
      const builtRecs: RecommendationItem[] = m04Recs.slice(0, 4).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        icon: CATEGORY_ICON[r.category ?? ''] ?? <ShieldAlert className="w-4 h-4 text-indigo-400" />,
        type: r.priority?.toLowerCase() ?? 'medium',
        action: 'Review',
        href: '/recommendations',
      }));

      setRecs(builtRecs);
    }).finally(() => setRecsLoaded(true));
  }, []);

  const criticalAgents = agents.filter(a => a.criticality === 'critical').slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Left Column: Top Risks */}
      <div className="card p-6 flex flex-col">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Top At-Risk Agents</h3>
            <p className="text-sm text-[color:var(--text-secondary)] mt-1">Agents requiring immediate attention</p>
          </div>
        </div>

        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-[var(--border-subtle)]" />)}
          </div>
        )}

        {!loading && agentsError && (
          <p className="text-xs text-red-400 py-4">Could not load agent risk data — try refreshing.</p>
        )}

        {!loading && !agentsError && criticalAgents.length === 0 && (
          <p className="text-xs text-[color:var(--text-tertiary)] py-4">No critical agents found — good standing ✓</p>
        )}

        <div className="flex-grow flex flex-col space-y-3">
          {!loading && criticalAgents.map(agent => (
            <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[color:var(--text-primary)] group-hover:text-indigo-300 transition-colors">{agent.name}</h4>
                  <div className="text-xs text-[color:var(--text-tertiary)] mt-0.5 flex items-center space-x-2">
                    <span>{agent.department}</span>
                    {agent.department && <span>•</span>}
                    <span className={!agent.owner ? 'text-amber-500/80' : ''}>
                      {agent.owner ? `Owner: ${agent.owner}` : 'No Owner'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase risk-critical">
                Critical
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Recommendations */}
      <div className="card p-6 flex flex-col">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Priority Actions</h3>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">AI-generated recommendations to improve continuity</p>
        </div>

        {loading && (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-[var(--border-subtle)]" />)}
          </div>
        )}

        {!loading && recsError && (
          <p className="text-xs text-red-400 py-4">Could not load recommendations — try refreshing.</p>
        )}

        {!loading && !recsError && recs.length === 0 && (
          <p className="text-xs text-[color:var(--text-tertiary)] py-4">No priority actions — good standing ✓</p>
        )}

        <div className="flex-grow flex flex-col space-y-4">
          {!loading && recs.map(rec => (
            <div key={rec.id} className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)] flex flex-col">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">{rec.icon}</div>
                <div className="flex-grow">
                  <h4 className="text-sm font-medium text-[color:var(--text-primary)]">{rec.title}</h4>
                  <p className="text-sm text-[color:var(--text-secondary)] mt-1 leading-relaxed">{rec.description}</p>
                  <div className="mt-4 flex justify-end">
                    <a href={rec.href}
                      className="text-xs font-medium px-4 py-1.5 rounded-full bg-[var(--border-default)] text-[color:var(--text-primary)] hover:bg-[var(--border-strong)] transition-colors">
                      {rec.action}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
