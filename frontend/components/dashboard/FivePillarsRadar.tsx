'use client';

import { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Network, AlertTriangle } from 'lucide-react';
import { TruthBadge } from './TruthBadge';

interface Pillar {
  label: string;
  score: number;
  fullLabel: string;
  href: string;
}

const PILLAR_META: Record<string, { label: string; fullLabel: string; href: string }> = {
  DI:  { label: 'Domain',      fullLabel: 'Domain Intelligence',                   href: '/ownership' },
  MI:  { label: 'Memory',      fullLabel: 'Memory Intelligence',                   href: '/memory' },
  OI:  { label: 'Operations',  fullLabel: 'Operational Intelligence',              href: '/workflows' },
  OCI: { label: 'Continuity',  fullLabel: 'Org Continuity Intelligence',            href: '/risk' },
  GI:  { label: 'Governance',  fullLabel: 'Governance Intelligence',               href: '/org-science' },
};

const DRAGGING_PAIRS = [
  { from: 'MI',  to: 'OCI', label: 'Weak Memory is dragging Continuity down' },
  { from: 'OI',  to: 'OCI', label: 'Weak Operations is constraining Continuity' },
  { from: 'GI',  to: 'DI',  label: 'Governance gaps are weakening Domain coverage' },
  { from: 'GI',  to: 'OCI', label: 'Governance gaps are limiting Continuity recovery' },
];

function ratingColor(score: number) {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#818cf8';
  if (score >= 40) return '#facc15';
  return '#f87171';
}

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Pillar }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-lg text-xs"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <p className="font-semibold text-[color:var(--text-primary)]">{d.fullLabel}</p>
      <p style={{ color: ratingColor(d.score) }}>{d.score}/100</p>
    </div>
  );
}

export function FivePillarsRadar() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    // Try orchestrator modules first (have reliable per-pillar scores), then truth
    const fetchModules = fetch(`${base}/api/intelligence/orchestrator/modules`)
      .then(r => r.json())
      .then((data: { modules?: { key: string; score: number }[] }) => {
        if (!data.modules?.length) throw new Error('no modules');
        
        const API_KEY_MAP: Record<string, string> = {
          domainInt: 'DI',
          memory: 'MI',
          orgHealth: 'OI',
          continuity: 'OCI',
          governance: 'GI'
        };

        const built: Pillar[] = [];
        data.modules.forEach(m => {
          const metaKey = API_KEY_MAP[m.key];
          if (metaKey && PILLAR_META[metaKey]) {
            built.push({
              label: PILLAR_META[metaKey].label,
              fullLabel: PILLAR_META[metaKey].fullLabel,
              href: PILLAR_META[metaKey].href,
              score: m.score,
            });
          }
        });
        
        if (!built.length) throw new Error('no pillar modules');
        return built;
      });

    // Build the truth fallback as a lazy thunk — only called if modules fail
    const fetchTruth = () => fetch(`${base}/api/intelligence/truth`)
      .then(r => r.json())
      .then((data: Record<string, unknown>) => {
        let built: Pillar[] = [];

        if (Array.isArray((data as { pillars?: unknown[] }).pillars)) {
          built = ((data as { pillars: { key: string; score: number }[] }).pillars)
            .filter(p => PILLAR_META[p.key])
            .map(p => ({
              label: PILLAR_META[p.key].label,
              fullLabel: PILLAR_META[p.key].fullLabel,
              href: PILLAR_META[p.key].href,
              score: p.score,
            }));
        }

        if (!built.length && Array.isArray((data as { results?: unknown[] }).results)) {
          const results = (data as { results: { result_key: string; score: number }[] }).results;
          Object.keys(PILLAR_META).forEach(key => {
            const match = results.find(r => r.result_key === key);
            if (match) {
              built.push({
                label: PILLAR_META[key].label,
                fullLabel: PILLAR_META[key].fullLabel,
                href: PILLAR_META[key].href,
                score: match.score,
              });
            }
          });
        }

        if (!built.length) throw new Error('no pillar data in truth response');
        return built;
      });

    // Try modules first; fall back to truth only if modules fail
    fetchModules
      .then(setPillars)
      .catch(() =>
        fetchTruth()
          .then(setPillars)
          .catch((e) => setError(e?.message ?? 'Pillar data unavailable'))
      )
      .finally(() => setLoading(false));
  }, []);

  const avgScore = pillars.length
    ? Math.round(pillars.reduce((s, p) => s + p.score, 0) / pillars.length)
    : 0;

  const activeDraggingPairs = pillars.length
    ? DRAGGING_PAIRS.filter(p => {
        const from = pillars.find(x => Object.keys(PILLAR_META).find(k => PILLAR_META[k].label === x.label || k === p.from));
        const to   = pillars.find(x => Object.keys(PILLAR_META).find(k => PILLAR_META[k].label === x.label || k === p.to));
        return (from?.score ?? 100) < 60 && (to?.score ?? 100) < 75;
      })
    : [];

  if (loading) {
    return (
      <div className="card p-5 animate-pulse h-72">
        <div className="h-4 w-32 rounded bg-[var(--border-default)] mb-4" />
        <div className="h-48 rounded bg-[var(--border-subtle)]" />
      </div>
    );
  }

  if (error || !pillars.length) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-4 h-4" style={{ color: '#818cf8' }} />
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">Five Pillars Intelligence</span>
        </div>
        <p className="text-xs text-[color:var(--text-tertiary)] mt-4">
          {error ?? 'Pillar scores are not yet available — run the intelligence engine to generate them.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 animate-fade-up delay-75 h-full flex flex-col min-h-[320px]">
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, rgba(99 102 241 / 0.6), transparent)' }} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4" style={{ color: '#818cf8' }} />
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">Five Pillars Intelligence</span>
        </div>
        <TruthBadge confidence={avgScore} />
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={pillars} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="var(--border-default)" />
          <PolarAngleAxis
            dataKey="label"
            tick={(props: any) => {
              const { x, y, payload } = props;
              const pillar = pillars.find(p => p.label === payload.value);
              const href = Object.values(PILLAR_META).find(m => m.label === payload.value)?.href ?? '/';
              return (
                <a href={href}>
                  <text
                    x={x} y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 11, fill: ratingColor(pillar?.score ?? 50), fontWeight: 600, cursor: 'pointer' }}
                  >
                    {payload.value}
                  </text>
                </a>
              );
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.18}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Dragging relationship callouts */}
      {activeDraggingPairs.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-wider mb-1">Dragging Relationships</p>
          {activeDraggingPairs.slice(0, 3).map((pair, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[color:var(--text-secondary)]">
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              <span>{pair.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
