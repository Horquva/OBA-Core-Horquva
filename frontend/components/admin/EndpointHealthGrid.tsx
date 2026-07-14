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

export type EndpointStatus = 'CHECKING' | 'LIVE' | 'ERROR' | 'NOT_MOUNTED';

export interface RouteEntry {
  name: string;
  /** Mount path from backend/index.js */
  path: string;
  /** Actual path to ping (may include a sub-route for router-based groups) */
  pingPath: string;
  category: string;
  module?: string;
  mounted: boolean;
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
  { name: 'Ownership',         path: '/api/ownership',              pingPath: '/api/ownership',              category: 'Reality Layer',  mounted: true },
  { name: 'Dependencies',      path: '/api/dependencies',           pingPath: '/api/dependencies',           category: 'Reality Layer',  mounted: true },
  { name: 'Risks',             path: '/api/risks',                  pingPath: '/api/risks',                  category: 'Reality Layer',  mounted: true },
  { name: 'Dashboard',         path: '/api/dashboard',              pingPath: '/api/dashboard',              category: 'Reality Layer',  mounted: true },
  { name: 'Data Quality',      path: '/api/data-quality',           pingPath: '/api/data-quality',           category: 'Reality Layer',  mounted: true },
  { name: 'Human-Agent Map',   path: '/api/human-agent-map',        pingPath: '/api/human-agent-map',        category: 'Reality Layer',  mounted: true },
  { name: 'Tools',             path: '/api/tools',                  pingPath: '/api/tools',                  category: 'Reality Layer',  mounted: true },
  { name: 'Tool Intelligence', path: '/api/tool-intelligence',      pingPath: '/api/tool-intelligence',      category: 'Reality Layer',  mounted: true },
  { name: 'Tool Impact',       path: '/api/tool-impact',            pingPath: '/api/tool-impact',            category: 'Reality Layer',  mounted: true },
  { name: 'Workflows',         path: '/api/workflows',              pingPath: '/api/workflows/intelligence', category: 'Reality Layer',  module: 'M08', mounted: true },
  { name: 'Knowledge Intel',   path: '/api/knowledge/intelligence', pingPath: '/api/knowledge/intelligence', category: 'Reality Layer',  mounted: true },
  { name: 'Knowledge Impact',  path: '/api/knowledge/impact',       pingPath: '/api/knowledge/impact',       category: 'Reality Layer',  mounted: true },
  { name: 'Knowledge Gaps',    path: '/api/knowledge/gaps',         pingPath: '/api/knowledge/gaps',         category: 'Reality Layer',  mounted: true },
  { name: 'Memory',            path: '/api/memory',                 pingPath: '/api/memory',                 category: 'Reality Layer',  mounted: true },

  // ── Simulation ─────────────────────────────────────────────
  { name: 'Employee Leaves',     path: '/api/simulations/employee-leaves',     pingPath: '/api/simulations/employee-leaves',     category: 'Simulation', mounted: true },
  { name: 'Agent Fails',        path: '/api/simulations/agent-fails',         pingPath: '/api/simulations/agent-fails',         category: 'Simulation', mounted: true },
  { name: 'Platform Down',      path: '/api/simulations/platform-down',       pingPath: '/api/simulations/platform-down',       category: 'Simulation', mounted: true },
  { name: 'Workflow Disruption', path: '/api/simulations/workflow-disruption', pingPath: '/api/simulations/workflow-disruption', category: 'Simulation', mounted: true },

  // ── Interaction + Intelligence ─────────────────────────────
  { name: 'Verification',    path: '/api/verification',    pingPath: '/api/verification/summary',  category: 'Interaction', module: 'M15', mounted: true },
  { name: 'Orchestration',   path: '/api/orchestration',   pingPath: '/api/orchestration/summary', category: 'Interaction', module: 'M16', mounted: true },
  { name: 'Decisions',       path: '/api/decisions',       pingPath: '/api/decisions',             category: 'Interaction', mounted: true },
  { name: 'Continuity',      path: '/api/continuity',      pingPath: '/api/continuity/score',      category: 'Interaction', module: 'M18', mounted: true },
  { name: 'Learning',        path: '/api/learning',        pingPath: '/api/learning/summary',      category: 'Interaction', mounted: true },
  { name: 'Governance',      path: '/api/governance',      pingPath: '/api/governance/score',       category: 'Interaction', module: 'M19', mounted: true },
  { name: 'Collaboration',   path: '/api/collaboration',   pingPath: '/api/collaboration/score',    category: 'Interaction', mounted: true },
  { name: 'Accountability',  path: '/api/accountability',  pingPath: '/api/accountability',         category: 'Interaction', mounted: true },
  { name: 'Forecast',        path: '/api/forecast',        pingPath: '/api/forecast/summary',       category: 'Interaction', module: 'M20', mounted: true },
  { name: 'Predictive Risk', path: '/api/predictive-risk', pingPath: '/api/predictive-risk',        category: 'Interaction', mounted: true },

  // ── Executive ──────────────────────────────────────────────
  { name: 'Executive',        path: '/api/executive',         pingPath: '/api/executive',         category: 'Executive', mounted: true },
  { name: 'Briefing',         path: '/api/briefing',          pingPath: '/api/briefing/latest',    category: 'Executive', module: 'M23', mounted: true },
  { name: 'Voice',            path: '/api/voice',             pingPath: '/api/voice',             category: 'Executive', module: 'M22', mounted: true },
  { name: 'Decision Support', path: '/api/decision-support',  pingPath: '/api/decision-support',  category: 'Executive', mounted: true },
  { name: 'Health',           path: '/api/health',            pingPath: '/api/health',            category: 'Executive', mounted: true },
  { name: 'Exec Memory',      path: '/api/executive-memory',  pingPath: '/api/executive-memory',  category: 'Executive', mounted: true },
  { name: 'Context',          path: '/api/context',           pingPath: '/api/context',           category: 'Executive', mounted: true },

  // ── Constitutional Intelligence ────────────────────────────
  { name: 'Truth Intelligence',   path: '/api/intelligence/truth',              pingPath: '/api/intelligence/truth',              category: 'Constitutional', module: 'M46', mounted: true },
  { name: 'Brain Core',           path: '/api/intelligence/brain-core',         pingPath: '/api/intelligence/brain-core',         category: 'Constitutional', module: 'M50', mounted: true },
  { name: 'Intel Orchestrator',   path: '/api/intelligence/orchestrator',       pingPath: '/api/intelligence/orchestrator',       category: 'Constitutional', module: 'M55', mounted: true },
  { name: 'Signal Intelligence',  path: '/api/intelligence/signals',           pingPath: '/api/intelligence/signals',            category: 'Constitutional', module: 'M36', mounted: false },
  { name: 'Opportunity Intel',    path: '/api/intelligence/opportunities',     pingPath: '/api/intelligence/opportunities',      category: 'Constitutional', module: 'M38', mounted: false },
  { name: 'Capability Intel',     path: '/api/intelligence/capability',        pingPath: '/api/intelligence/capability',         category: 'Constitutional', module: 'M39', mounted: false },
  { name: 'Strategic Alignment',  path: '/api/intelligence/alignment',         pingPath: '/api/intelligence/alignment',          category: 'Constitutional', module: 'M40', mounted: false },
  { name: 'Autonomous Advisor',   path: '/api/intelligence/advisor',           pingPath: '/api/intelligence/advisor',            category: 'Constitutional', module: 'M48', mounted: false },
  { name: 'Simulation Universe',  path: '/api/intelligence/simulation-universe', pingPath: '/api/intelligence/simulation-universe', category: 'Constitutional', module: 'M54', mounted: false },

  // ── Automation Layer (NOT MOUNTED) ─────────────────────────
  { name: 'Self-Healing',           path: '/api/self-healing',            pingPath: '/api/self-healing',            category: 'Automation', module: 'M51', mounted: false },
  { name: 'Executive Avatar',       path: '/api/avatar',                  pingPath: '/api/avatar',                  category: 'Automation', module: 'M21', mounted: false },
  { name: 'Governance Automation',  path: '/api/automation/governance',   pingPath: '/api/automation/governance',   category: 'Automation', module: 'M52', mounted: false },
  { name: 'Continuity Automation',  path: '/api/automation/continuity',   pingPath: '/api/automation/continuity',   category: 'Automation', module: 'M53', mounted: false },
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
  'Automation':      'text-slate-400',
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
  NOT_MOUNTED: { dot: 'bg-slate-500',                     text: 'text-slate-500',   label: 'NOT MOUNTED' },
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
        <span className="text-[10px] text-slate-600 ml-1">{latencyMs}ms</span>
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
        <Database className="w-10 h-10 text-slate-500 mb-3" />
        <h3 className="text-white font-semibold mb-1">No Endpoints Registered</h3>
        <p className="text-sm text-slate-400">The route registry is empty.</p>
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
            <h2 className="text-lg font-semibold text-white">Endpoint Health</h2>
            <p className="text-xs text-slate-400">
              {ROUTE_REGISTRY.length} route groups across {CATEGORY_ORDER.length} categories
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
            'bg-[#1f1f29] border-[#28283a] text-slate-400',
            'hover:text-white hover:border-[#3a3a52]',
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
              : catResults.every(r => r.status === 'NOT_MOUNTED')
                ? 'text-slate-500'
                : 'text-red-400';

          return (
            <div key={cat} className="card overflow-hidden border border-[#1f1f29]">
              {/* Category header — follows RiskScoreTable header pattern */}
              <div className="px-6 py-4 border-b border-[#1f1f29] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CatIcon className={clsx('w-4 h-4', catColor)} />
                  <h3 className="text-sm font-semibold text-white">{cat}</h3>
                </div>
                <span className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
                  'bg-[#1f1f29] border-[#28283a]',
                  countColor,
                )}>
                  {countText}
                </span>
              </div>

              {/* Route grid */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {catResults.map(result => {
                  const bgClass =
                    result.status === 'LIVE'        ? 'bg-[#111116] border-[#1f1f29]' :
                    result.status === 'ERROR'       ? 'bg-red-500/[0.04] border-red-500/15' :
                    result.status === 'NOT_MOUNTED' ? 'bg-[#0f0f13] border-[#1a1a24]' :
                                                      'bg-[#111116] border-[#1f1f29]';
                  return (
                    <div
                      key={result.route.path}
                      className={clsx('px-4 py-3 rounded-lg border transition-colors', bgClass)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-white truncate pr-2">
                          {result.route.name}
                        </span>
                        {result.route.module && (
                          <span className="text-[9px] text-slate-600 font-mono flex-shrink-0">
                            {result.route.module}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 truncate mb-2 font-mono">
                        {result.route.path}
                      </p>
                      <StatusIndicator status={result.status} latencyMs={result.latencyMs} />
                    </div>
                  );
                })}
              </div>

              {/* Success summary for fully-live categories */}
              {liveCount === catResults.length && liveCount > 0 && checkingCount === 0 && (
                <div className="px-6 py-2.5 border-t border-[#1f1f29] flex items-center gap-2">
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
