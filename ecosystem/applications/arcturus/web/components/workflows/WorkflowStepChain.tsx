'use client';

import { useState, useEffect } from 'react';
import {
  workflows,
  ApiError,
  type WorkflowIntelligenceResponse,
  type WorkflowIntelligenceItem,
} from '../../lib/api';
import { RiskBadge } from '../ui/RiskBadge';
import {
  GitFork,
  User,
  Wrench,
  Bot,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FetchState = 'loading' | 'success' | 'error' | 'empty';

function riskDotColor(risk: string): string {
  switch (risk) {
    case 'critical': return 'bg-red-400';
    case 'high':     return 'bg-orange-400';
    case 'medium':   return 'bg-yellow-400';
    case 'low':      return 'bg-emerald-400';
    default:         return 'bg-slate-400';
  }
}

function WorkflowStatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const color =
    lower === 'active' || lower === 'completed'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : lower === 'inactive' || lower === 'failed'
        ? 'bg-red-500/10 text-red-400 border-red-500/20'
        : 'bg-slate-500/10 text-[color:var(--text-secondary)] border-slate-500/20';

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border',
        color,
      )}
    >
      {status}
    </span>
  );
}

// ─── Chain Sub-components ────────────────────────────────────────────────────

function ChainNode({
  icon,
  label,
  color,
  bg,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('flex-1 min-w-[140px] px-4 py-3 rounded-lg border', bg)}>
      <div className={clsx('flex items-center gap-1.5 mb-2', color)}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ChainArrow() {
  return (
    <div className="flex items-center px-1.5 flex-shrink-0">
      <ChevronRight className="w-4 h-4 text-[color:var(--text-tertiary)]" />
    </div>
  );
}

// ─── Workflow Card ───────────────────────────────────────────────────────────

function WorkflowCard({
  wf,
  expanded,
  onToggle,
}: {
  wf: WorkflowIntelligenceItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card overflow-hidden border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300">
      {/* Header — clickable, matches CriticalRiskPanel expand pattern */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">{wf.workflow}</span>
          <WorkflowStatusBadge status={wf.status} />
          {wf.spofDetected && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">
              SPOF
            </span>
          )}
          {!wf.is_documented && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Undocumented
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] text-[color:var(--text-tertiary)]">Risk {wf.riskScore}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[color:var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[color:var(--text-tertiary)]" />
          )}
        </div>
      </button>

      {/* Expanded: Step Chain + Failure details */}
      {expanded && (
        <div className="px-6 py-5 border-t border-[var(--border-subtle)]">
          {/* Step Chain */}
          <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
            {/* Human */}
            <ChainNode
              icon={<User className="w-4 h-4" />}
              label="Human"
              color="text-indigo-400"
              bg="bg-indigo-500/10 border-indigo-500/20"
            >
              {wf.owner ? (
                <div>
                  <p className="text-xs text-[color:var(--text-primary)] font-medium">{wf.owner.name}</p>
                  <p className="text-[10px] text-[color:var(--text-tertiary)]">{wf.owner.role}</p>
                </div>
              ) : (
                <p className="text-[10px] text-[color:var(--text-tertiary)] italic">No owner assigned</p>
              )}
            </ChainNode>

            <ChainArrow />

            {/* Tools */}
            <ChainNode
              icon={<Wrench className="w-4 h-4" />}
              label={`Tools (${wf.totalTools})`}
              color="text-yellow-400"
              bg="bg-yellow-500/10 border-yellow-500/20"
            >
              {wf.impactedTools.length > 0 ? (
                <div className="space-y-1">
                  {wf.impactedTools.slice(0, 3).map(t => (
                    <div key={t.id} className="flex items-center justify-between">
                      <p className="text-[10px] text-[color:var(--text-primary)] truncate">{t.name}</p>
                      <span className="text-[9px] text-[color:var(--text-tertiary)]">{t.type}</span>
                    </div>
                  ))}
                  {wf.impactedTools.length > 3 && (
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">+{wf.impactedTools.length - 3} more</p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-[color:var(--text-tertiary)] italic">No tools</p>
              )}
            </ChainNode>

            <ChainArrow />

            {/* Agents */}
            <ChainNode
              icon={<Bot className="w-4 h-4" />}
              label={`Agents (${wf.totalAgents})`}
              color="text-purple-400"
              bg="bg-purple-500/10 border-purple-500/20"
            >
              {wf.impactedAgents.length > 0 ? (
                <div className="space-y-1">
                  {wf.impactedAgents.slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center gap-1.5">
                      <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', riskDotColor(a.risk))} />
                      <p className="text-[10px] text-[color:var(--text-primary)] truncate">{a.name}</p>
                    </div>
                  ))}
                  {wf.impactedAgents.length > 3 && (
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">+{wf.impactedAgents.length - 3} more</p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-[color:var(--text-tertiary)] italic">No agents</p>
              )}
            </ChainNode>

            <ChainArrow />

            {/* Outcome */}
            <ChainNode
              icon={wf.failures.length > 0 ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              label="Outcome"
              color={wf.failures.length > 0 ? 'text-red-400' : 'text-emerald-400'}
              bg={wf.failures.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}
            >
              <p className="text-xs text-[color:var(--text-primary)] font-medium">{wf.status}</p>
              {wf.failures.length > 0 && (
                <p className="text-[10px] text-red-400 mt-0.5">
                  {wf.failures.length} failure{wf.failures.length !== 1 ? 's' : ''}
                </p>
              )}
            </ChainNode>
          </div>

          {/* Failure breakdown — reuses RiskBadge for severity */}
          {wf.failures.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] text-[color:var(--text-tertiary)] uppercase tracking-widest font-medium">Failures</p>
              {wf.failures.map((f, fi) => (
                <div
                  key={fi}
                  className="px-4 py-2.5 rounded-lg bg-red-500/[0.04] border border-red-500/15 flex items-start gap-3"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <RiskBadge level={f.severity} />
                      <span className="text-[10px] text-[color:var(--text-secondary)] font-medium uppercase tracking-widest">
                        {f.failure_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[color:var(--text-primary)]">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkflowStepChain() {
  const [data, setData] = useState<WorkflowIntelligenceResponse | null>(null);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await workflows.intelligence();
        if (cancelled) return;
        if (res.workflows.length === 0) {
          setState('empty');
        } else {
          setData(res);
          setState('success');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch workflow data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="animate-fade-up delay-150">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <GitFork className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Workflow Step Chains</h2>
          <p className="text-xs text-[color:var(--text-secondary)]">Human → Tool → Agent → Outcome chain per workflow</p>
        </div>
        {data && (
          <span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border bg-[var(--border-subtle)] border-[var(--border-default)] text-indigo-400">
            {data.total} Workflow{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {state === 'loading' && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="card px-6 py-5 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-5 w-40 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
                <div className="h-5 w-16 rounded bg-[var(--border-subtle)] animate-pulse-soft" />
              </div>
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3].map(j => (
                  <div key={j} className="h-16 flex-1 rounded-lg bg-[var(--border-subtle)] animate-pulse-soft" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {state === 'empty' && (
        <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
          <GitFork className="w-10 h-10 text-[color:var(--text-tertiary)] mb-3" />
          <h3 className="text-[color:var(--text-primary)] font-semibold mb-1">No Workflows Found</h3>
          <p className="text-sm text-[color:var(--text-secondary)]">No workflow intelligence data is available.</p>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="card px-6 py-6 border border-[var(--border-subtle)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load workflow data</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {state === 'success' && data && (
        <div className="space-y-3">
          {data.workflows.map((wf, idx) => (
            <WorkflowCard
              key={wf.workflow}
              wf={wf}
              expanded={expandedIdx === idx}
              onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
