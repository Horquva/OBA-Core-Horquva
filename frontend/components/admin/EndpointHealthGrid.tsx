'use client';

import {
  Database,
  Zap,
  ArrowLeftRight,
  Crown,
  Brain,
  Cpu,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Shared Types ────────────────────────────────────────────────────────────

export type EndpointStatus = 'CHECKING' | 'LIVE' | 'ERROR' | 'NOT_MOUNTED' | 'REQUIRES_PARAM' | 'DISABLED';

export interface RouteEntry {
  name: string;
  /** Mount path from backend/index.js */
  path: string;
  /** Actual path to ping (may include a sub-route for router-based groups) */
  pingPath: string;
  category: string;
  module?: string;
  mounted: boolean;
  requiresParam?: boolean;
  disabled?: boolean;
}

export interface HealthCheckResult {
  route: RouteEntry;
  status: EndpointStatus;
  latencyMs: number;
  checkedAt: Date | null;
}

// ─── Route Registry (from backend/index.js discovery) ────────────────────────
// mounted: true  = confirmed present in app.use() lines
// mounted: false = documented in API_REFERENCE.md but absent from index.js

export const ROUTE_REGISTRY: RouteEntry[] = [
  // ── Reality Layer ──────────────────────────────────────────
  { name: 'Agents',            path: '/api/agents',                 pingPath: '/api/agents',                 category: 'Reality Layer',  mounted: true },
  { name: 'Employees',         path: '/api/employees',              pingPath: '/api/employees',              category: 'Reality Layer',  mounted: true },
  { name: 'Ownership',         path: '/api/ownership',              pingPath: '/api/ownership',              category: 'Reality Layer',  mounted: true },
  { name: 'Dependencies',      path: '/api/dependencies',           pingPath: '/api/dependencies',           category: 'Reality Layer',  mounted: true },
  { name: 'Network',           path: '/api/network',                pingPath: '/api/network/centrality',     category: 'Reality Layer',  mounted: true },
  { name: 'Continuity',        path: '/api/continuity',             pingPath: '/api/continuity',             category: 'Reality Layer',  mounted: true },
  { name: 'Risks',             path: '/api/risks',                  pingPath: '/api/risks',                  category: 'Reality Layer',  mounted: true },
  { name: 'Dashboard',         path: '/api/dashboard',              pingPath: '/api/dashboard',              category: 'Reality Layer',  mounted: true },
  { name: 'Data Quality',      path: '/api/data-quality',           pingPath: '/api/data-quality',           category: 'Reality Layer',  mounted: true },
  { name: 'Human-Agent Map',   path: '/api/human-agent-map',        pingPath: '/api/human-agent-map',        category: 'Reality Layer',  mounted: true },
  { name: 'Tools',             path: '/api/tools',                  pingPath: '/api/tools',                  category: 'Reality Layer',  mounted: true },
  { name: 'Tool Intelligence', path: '/api/tool-intelligence',      pingPath: '/api/tool-intelligence',      category: 'Reality Layer',  mounted: true },
  { name: 'Tool Impact',       path: '/api/tool-impact',            pingPath: '/api/tool-impact',            category: 'Reality Layer',  mounted: true },
  { name: 'Workflows',         path: '/api/workflows',              pingPath: '/api/workflows/intelligence', category: 'Reality Layer',  mounted: true },
  { name: 'Knowledge Intel',   path: '/api/knowledge/intelligence', pingPath: '/api/knowledge/intelligence', category: 'Reality Layer',  mounted: true },
  { name: 'Knowledge Impact', path: '/api/knowledge/impact',       pingPath: '/api/knowledge/impact',       category: 'Reality Layer',  mounted: true },
  { name: 'Knowledge Gaps',    path: '/api/knowledge/gaps',         pingPath: '/api/knowledge/gaps',         category: 'Reality Layer',  mounted: true },
  { name: 'Memory',            path: '/api/memory',                 pingPath: '/api/memory/health',          category: 'Reality Layer',  mounted: true },

  // ── Simulation ─────────────────────────────────────────────
  { name: 'Employee Leaves',     path: '/api/simulations/employee-leaves',     pingPath: '/api/simulations/employee-leaves',     category: 'Simulation', mounted: true },
  { name: 'Agent Fails',        path: '/api/simulations/agent-fails',         pingPath: '/api/simulations/agent-fails',         category: 'Simulation', mounted: true },
  { name: 'Platform Down',      path: '/api/simulations/platform-down',       pingPath: '/api/simulations/platform-down',       category: 'Simulation', mounted: true },
  { name: 'Workflow Disruption', path: '/api/simulations/workflow-disruption', pingPath: '/api/simulations/workflow-disruption', category: 'Simulation', mounted: true },
  { name: 'Simulation Rank',    path: '/api/simulations/rank',                pingPath: '/api/simulations/rank',                category: 'Simulation', mounted: true },

  // ── Interaction + Intelligence ─────────────────────────────
  { name: 'Verification',    path: '/api/verification',    pingPath: '/api/verification/summary',  category: 'Interaction', mounted: true },
  { name: 'Orchestration',   path: '/api/orchestration',   pingPath: '/api/orchestration/summary', category: 'Interaction', mounted: true },
  { name: 'Decisions',       path: '/api/decisions',       pingPath: '/api/decisions/all',         category: 'Interaction', mounted: true },
  { name: 'Decision Intelligence', path: '/api/decision-intelligence', pingPath: '/api/decision-intelligence', category: 'Interaction', mounted: true },
  { name: 'Learning',        path: '/api/learning',        pingPath: '/api/learning/summary',      category: 'Interaction', mounted: true },
  { name: 'Collaboration',   path: '/api/collaboration',   pingPath: '/api/collaboration/score',    category: 'Interaction', mounted: true },
  { name: 'Accountability',  path: '/api/accountability',  pingPath: '/api/accountability/score',   category: 'Interaction', mounted: true },
  { name: 'Forecast',        path: '/api/forecast',        pingPath: '/api/forecast/summary',       category: 'Interaction', mounted: true },
  { name: 'Predictive Risk', path: '/api/predictive-risk', pingPath: '/api/predictive-risk/summary',category: 'Interaction', mounted: true },

  // ── Executive ──────────────────────────────────────────────
  { name: 'Executive',        path: '/api/executive',         pingPath: '/api/executive/briefing',category: 'Executive', mounted: true },
  { name: 'Briefing',         path: '/api/briefing',          pingPath: '/api/briefing/today',     category: 'Executive', mounted: true },
  { name: 'Voice',            path: '/api/voice',             pingPath: '/api/voice/intents',     category: 'Executive', mounted: true },
  { name: 'Decision Support', path: '/api/decision-support',  pingPath: '/api/decision-support/summary', category: 'Executive', mounted: true },
  { name: 'Health',           path: '/api/health',            pingPath: '/api/health/summary',    category: 'Executive', mounted: true },
  { name: 'Exec Memory',      path: '/api/executive-memory',  pingPath: '/api/executive-memory/summary', category: 'Executive', mounted: true },
  { name: 'Context',          path: '/api/context',           pingPath: '/api/context/summary',   category: 'Executive', mounted: true },

  // ── Constitutional Intelligence ────────────────────────────
  { name: 'Truth Intelligence',   path: '/api/intelligence/truth',              pingPath: '/api/intelligence/truth',              category: 'Constitutional', mounted: true },
  { name: 'Signal Drilldown',     path: '/api/signals',                         pingPath: '/api/signals/drilldown/:entityName',   category: 'Constitutional', mounted: true, requiresParam: true },
  { name: 'Recommendations',      path: '/api/intelligence/recommendations',    pingPath: '/api/intelligence/recommendations',    category: 'Constitutional', module: 'M04', mounted: true },
  { name: 'Continuity Intel',     path: '/api/intelligence/continuity',         pingPath: '/api/intelligence/continuity',         category: 'Constitutional', module: 'M18', mounted: true },
  { name: 'Governance Intel',     path: '/api/intelligence/governance',         pingPath: '/api/intelligence/governance',         category: 'Constitutional', module: 'M19', mounted: true },
  { name: 'Brain Core',           path: '/api/intelligence/brain-core',         pingPath: '/api/intelligence/brain-core',         category: 'Constitutional', mounted: true },
  { name: 'Intel Orchestrator',   path: '/api/intelligence/orchestrator',       pingPath: '/api/intelligence/orchestrator',       category: 'Constitutional', mounted: true },
  { name: 'Signal Intelligence',  path: '/api/intelligence/signals',           pingPath: '/api/intelligence/signals',            category: 'Constitutional', mounted: true },
  { name: 'Pattern Regularity',   path: '/api/intelligence/pattern',           pingPath: '/api/intelligence/pattern',            category: 'Constitutional', module: 'M37', mounted: true },
  { name: 'Opportunity Intel',    path: '/api/intelligence/opportunities',     pingPath: '/api/intelligence/opportunities',      category: 'Constitutional', mounted: true },
  { name: 'Capability Intel',     path: '/api/intelligence/capability-by-dept',pingPath: '/api/intelligence/capability-by-dept', category: 'Constitutional', module: 'M39', mounted: true },
  { name: 'Strategic Alignment',  path: '/api/intelligence/strategic-alignment',pingPath: '/api/intelligence/strategic-alignment', category: 'Constitutional', module: 'M40', mounted: true },
  { name: 'DNA Fingerprint',      path: '/api/intelligence/dna',               pingPath: '/api/intelligence/dna',                category: 'Constitutional', module: 'M41', mounted: true },
  { name: 'Culture Health',       path: '/api/intelligence/culture',           pingPath: '/api/intelligence/culture',            category: 'Constitutional', module: 'M42', mounted: true },
  { name: 'Maturity Curve',       path: '/api/intelligence/maturity',          pingPath: '/api/intelligence/maturity',           category: 'Constitutional', module: 'M43', mounted: true },
  { name: 'Behavioral Profile',   path: '/api/intelligence/behavior',          pingPath: '/api/intelligence/behavior',           category: 'Constitutional', module: 'M44', mounted: true },
  { name: 'Industry Benchmark',   path: '/api/intelligence/benchmark',         pingPath: '/api/intelligence/benchmark',          category: 'Constitutional', module: 'M45', mounted: true },
  { name: 'Graph Status',         path: '/api/intelligence/graph/status',      pingPath: '/api/intelligence/graph/status',       category: 'Constitutional', mounted: true },
  { name: 'Autonomous Advisor',   path: '/api/intelligence/advisor',           pingPath: '/api/intelligence/advisor',            category: 'Constitutional', mounted: true },
  { name: 'Simulation Universe',  path: '/api/intelligence/simulation-universe', pingPath: '/api/intelligence/simulation-universe', category: 'Constitutional', mounted: true },

  // ── Automation Layer ─────────────────────────
  { name: 'Self-Healing',           path: '/api/self-healing',            pingPath: '/api/self-healing/detect',            category: 'Automation', mounted: true, disabled: false },
  { name: 'Executive Avatar',       path: '/api/avatar',                  pingPath: '/api/avatar',                  category: 'Automation', mounted: true },
  { name: 'Governance Automation',  path: '/api/automation/governance',   pingPath: '/api/automation/governance',   category: 'Automation', mounted: true },
  { name: 'Continuity Automation',  path: '/api/automation/continuity',   pingPath: '/api/automation/continuity',   category: 'Automation', mounted: true },
];

// ─── Category Config ─────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ className?: string }>;

const CATEGORY_ICONS: Record<string, IconComponent> = {
  'Reality Layer':   Database,
  'Simulation':      Zap,
  'Interaction':     ArrowLeftRight,
  'Executive':       Crown,
  'Constitutional':  Brain,
  'Automation':      Cpu,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Reality Layer':   'text-indigo-400',
  'Simulation':      'text-yellow-400',
  'Interaction':     'text-emerald-400',
  'Executive':       'text-purple-400',
  'Constitutional':  'text-blue-400',
  'Automation':      'text-[color:var(--text-secondary)]',
};

// Ordered category list (preserves visual grouping)
const CATEGORY_ORDER = [
  'Reality Layer',
  'Simulation',
  'Interaction',
  'Executive',
  'Constitutional',
  'Automation',
];

// ─── Status Indicator ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EndpointStatus, { dot: string; text: string; label: string }> = {
  CHECKING:    { dot: 'bg-indigo-400 animate-pulse-soft', text: 'text-indigo-400',  label: 'CHECKING' },
  LIVE:        { dot: 'bg-emerald-400',                   text: 'text-emerald-400', label: 'LIVE' },
  ERROR:       { dot: 'bg-red-400',                       text: 'text-red-400',     label: 'ERROR' },
  NOT_MOUNTED: { dot: 'bg-slate-500',                     text: 'text-[color:var(--text-tertiary)]',   label: 'NOT MOUNTED' },
  REQUIRES_PARAM:{ dot: 'bg-yellow-400',                  text: 'text-yellow-400',  label: 'REQUIRES PARAM' },
  DISABLED:    { dot: 'bg-slate-500/50',                  text: 'text-[color:var(--text-secondary)]', label: 'DISABLED (PENDING BACKEND)' },
};

function StatusIndicator({ status, latencyMs }: { status: EndpointStatus; latencyMs: number }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex items-center gap-1.5">
      <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      <span className={clsx('text-[10px] font-bold uppercase tracking-widest', cfg.text)}>
        {cfg.label}
      </span>
      {status === 'LIVE' && latencyMs > 0 && (
        <span className="text-[10px] text-[color:var(--text-tertiary)] ml-1">{latencyMs}ms</span>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface EndpointHealthGridProps {
  results: HealthCheckResult[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function EndpointHealthGrid({ results, isLoading, onRefresh }: EndpointHealthGridProps) {
  // Empty state (should never happen with a hardcoded registry, but handled)
  if (ROUTE_REGISTRY.length === 0) {
    return (
      <div className="card px-6 py-10 flex flex-col items-center justify-center text-center animate-fade-up delay-300">
        <Database className="w-10 h-10 text-[color:var(--text-tertiary)] mb-3" />
        <h3 className="text-[color:var(--text-primary)] font-semibold mb-1">No Endpoints Registered</h3>
        <p className="text-sm text-[color:var(--text-secondary)]">The route registry is empty.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up delay-300">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Endpoint Health</h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              {ROUTE_REGISTRY.length} route groups across {CATEGORY_ORDER.length} categories
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
            'bg-[var(--border-subtle)] border-[var(--border-default)] text-[color:var(--text-secondary)]',
            'hover:text-[color:var(--text-primary)] hover:border-[var(--border-strong)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Category panels */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map(cat => {
          const catResults = results.filter(r => r.route.category === cat);
          if (catResults.length === 0) return null;

          const liveCount = catResults.filter(r => r.status === 'LIVE').length;
          const checkingCount = catResults.filter(r => r.status === 'CHECKING').length;
          const CatIcon = CATEGORY_ICONS[cat] ?? Database;
          const catColor = CATEGORY_COLORS[cat] ?? 'text-indigo-400';

          const countText = checkingCount > 0
            ? `${liveCount}/${catResults.length} Checking…`
            : `${liveCount}/${catResults.length} Live`;

          const countColor = liveCount === catResults.length
            ? 'text-emerald-400'
            : liveCount > 0
              ? 'text-yellow-400'
              : catResults.every(r => r.status === 'NOT_MOUNTED' || r.status === 'REQUIRES_PARAM' || r.status === 'DISABLED')
                ? 'text-[color:var(--text-tertiary)]'
                : 'text-red-400';

          return (
            <div key={cat} className="card overflow-hidden border border-[var(--border-subtle)]">
              {/* Category header �� follows RiskScoreTable header pattern */}
              <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CatIcon className={clsx('w-4 h-4', catColor)} />
                  <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{cat}</h3>
                </div>
                <span className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
                  'bg-[var(--border-subtle)] border-[var(--border-default)]',
                  countColor,
                )}>
                  {countText}
                </span>
              </div>

              {/* Route grid */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {catResults.map(result => {
                  const bgClass =
                    result.status === 'LIVE'           ? 'bg-[var(--bg-surface)] border-[var(--border-subtle)]' :
                    result.status === 'ERROR'          ? 'bg-red-500/[0.04] border-red-500/15' :
                    result.status === 'NOT_MOUNTED'    ? 'bg-[var(--bg-base)] border-[var(--border-subtle)]' :
                    result.status === 'DISABLED'       ? 'bg-[var(--bg-base)] border-dashed border-[var(--border-default)] opacity-70' :
                    result.status === 'REQUIRES_PARAM' ? 'bg-yellow-500/[0.04] border-yellow-500/20' :
                                                         'bg-[var(--bg-surface)] border-[var(--border-subtle)]';
                  return (
                    <div
                      key={result.route.path}
                      className={clsx('px-4 py-3 rounded-lg border transition-colors', bgClass)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[color:var(--text-primary)] truncate pr-2">
                          {result.route.name}
                        </span>
                        {/*
                          Only endpoints actually served by a brain analysis carry a
                          module code — the eight in routes/intelligence/prediction.js.
                          Every other row used to show one too: some had gone stale when
                          the dataset analyses were renamed off their codes, and some were
                          never right (/api/forecast was labelled M20, which is
                          Accountability Intelligence). A code that is not the analysis
                          answering the request is worse than no code at all.
                        */}
                        {result.route.module && (
                          <span className="text-[9px] text-[color:var(--text-tertiary)] font-mono flex-shrink-0">
                            {result.route.module}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[color:var(--text-tertiary)] truncate mb-2 font-mono">
                        {result.route.path}
                      </p>
                      <StatusIndicator status={result.status} latencyMs={result.latencyMs} />
                    </div>
                  );
                })}
              </div>

              {/* Success summary for fully-live categories */}
              {liveCount === catResults.length && liveCount > 0 && checkingCount === 0 && (
                <div className="px-6 py-2.5 border-t border-[var(--border-subtle)] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400 font-medium">
                    All {liveCount} endpoints responding
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
