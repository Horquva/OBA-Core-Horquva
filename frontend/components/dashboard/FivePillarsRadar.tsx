'use client';

import { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Network, AlertTriangle } from 'lucide-react';
import { TruthBadge } from './TruthBadge';
import { authHeader } from '../../lib/authFetch';

interface Pillar {
  label: string;
  score: number;
  fullLabel: string;
  href: string;
}

// Labels match domain/derived.js's canonical pillar definitions (MI =
// Management Intelligence: accountability + backup + ownership coverage;
// DI = Data Intelligence: documentation + verification + contradiction
// penalty) rather than the "Memory"/"Domain" names this radar used to show,
// which didn't match any backend definition and sent MI's link to /memory —
// a page about institutional memory, not what MI actually measures. hrefs now
// point at the pages that actually surface each pillar's inputs: /ownership
// for MI's accountability/backup/ownership data, /knowledge for DI's
// documentation/verification data.
//
// OCI (Org Continuity Intelligence) is deliberately not a spoke here: it read
// orgHealth.continuityScore, which is already one of the five inputs
// orgHealth.healthIndex (OI's own spoke) is a mean of — two spokes partly
// restating the same figure. Four spokes now, each measuring something
// genuinely distinct.
const PILLAR_META: Record<string, { label: string; fullLabel: string; href: string }> = {
  DI:  { label: 'Data',        fullLabel: 'Data Intelligence',        href: '/knowledge' },
  MI:  { label: 'Management',  fullLabel: 'Management Intelligence',  href: '/ownership' },
  OI:  { label: 'Operations',  fullLabel: 'Operational Intelligence', href: '/workflows' },
  GI:  { label: 'Governance',  fullLabel: 'Governance Intelligence',  href: '/org-science' },
};

const DRAGGING_PAIRS = [
  { from: 'GI', to: 'DI', label: 'Governance gaps are weakening Data coverage' },
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
    <div className="px-3 py-2 rounded-lg text-xs max-w-[220px]"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
      <p className="font-semibold text-[color:var(--text-primary)]">{d.fullLabel}</p>
      <p style={{ color: ratingColor(d.score) }}>{d.score}/100</p>
      {d.label === 'Governance' && (
        <p className="text-[10px] text-[color:var(--text-tertiary)] mt-1">
          A weighted composite (runbooks + policy + violations) — different from /continuity&apos;s raw &quot;Governance Coverage (M19)&quot; ratio.
        </p>
      )}
    </div>
  );
}

export function FivePillarsRadar() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

    // Orchestrator modules have reliable per-pillar scores. A /api/intelligence/truth
    // fallback used to sit here for when this call failed, but truth's actual
    // response shape ({ totalClaims, verdictBreakdown, trustScore, entitiesChecked,
    // report }) has neither a `pillars` nor a `results` array, so the fallback's
    // `if (!built.length) throw` fired on every single use — it was unreachable
    // dead code that only ever produced the same error the primary fetch already had.
    fetch(`${base}/api/intelligence/orchestrator/modules`, { headers: authHeader() })
      .then(r => r.json())
      .then((data: { modules?: { key: string; score: number }[] }) => {
        if (!data.modules?.length) throw new Error('no modules');

        const API_KEY_MAP: Record<string, string> = {
          domainInt: 'DI',
          memory: 'MI',
          orgHealth: 'OI',
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
      })
      .then(setPillars)
      .catch((e) => setError(e?.message ?? 'Pillar data unavailable'))
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
            tick={(props: { x?: string | number; y?: string | number; payload?: { value: string } }) => {
              const { x, y, payload } = props;
              if (!payload) return <g />;
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
