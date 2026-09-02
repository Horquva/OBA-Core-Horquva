'use client';

import { useEffect, useState } from 'react';
import { Brain, AlertCircle, RotateCcw, BookOpen, ServerCrash } from 'lucide-react';
import { execMemoryApi, ExecMemoryItem, HeroDependency } from '../../lib/api';
import { TruthBadge } from './TruthBadge';

function SeverityDot({ severity }: { severity: string }) {
  const color = severity === 'critical' ? '#f87171'
    : severity === 'high' ? '#fb923c'
    : severity === 'medium' ? '#facc15'
    : '#4ade80';
  return <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: color, display: 'inline-block' }} />;
}

function HeroChip({ h }: { h: HeroDependency }) {
  const isCritical = h.riskLevel === 'critical';
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
      style={{
        background: isCritical ? 'rgba(220 38 38 / 0.08)' : 'rgba(234 88 12 / 0.08)',
        border: `1px solid ${isCritical ? 'rgba(220 38 38 / 0.2)' : 'rgba(234 88 12 / 0.2)'}`,
      }}>
      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: isCritical ? '#f87171' : '#fb923c' }} />
      <div>
        <span className="font-semibold text-[color:var(--text-primary)]">{h.personName}</span>
        {h.department && <span className="text-[color:var(--text-tertiary)] ml-1">· {h.department}</span>}
        <p className="text-[color:var(--text-tertiary)] mt-0.5">
          {h.criticalAssetCount} critical {h.criticalAssetCount === 1 ? 'asset' : 'assets'} owned, no backup
        </p>
      </div>
    </div>
  );
}

export function ExecutiveMemoryPanel() {
  const [items, setItems] = useState<ExecMemoryItem[]>([]);
  const [heroes, setHeroes] = useState<HeroDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      execMemoryApi.items().catch(() => ({ totalItems: 0, items: [] as ExecMemoryItem[] })),
      execMemoryApi.heroRisk().catch(() => ({
        totalHeroDependencies: 0,
        criticalHeroes: 0,
        heroes: [] as HeroDependency[],
        heroMemoryItems: [],
      })),
    ]).then(([memData, heroData]) => {
      setItems(memData.items ?? []);
      setHeroes(heroData.heroes ?? []);
    }).catch((e) => {
      setError(e?.message ?? 'Executive memory unavailable');
    }).finally(() => setLoading(false));
  }, []);

  const recurring  = items.filter(i => i.isRecurring);
  const lessons    = items.filter(i => i.memoryType === 'lesson');
  const badDec     = items.filter(i => i.memoryType === 'bad_decision');
  const dontForget = [...lessons, ...badDec].slice(0, 4);

  return (
    <div className="card p-5 relative overflow-hidden animate-fade-up delay-300">
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, rgba(168 85 247 / 0.5), transparent)' }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: '#a855f7' }} />
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">
            Executive Memory
          </span>
        </div>
        <TruthBadge verified={items.length > 0 || heroes.length > 0} />
      </div>

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-40 rounded bg-[var(--border-default)]" />
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded bg-[var(--border-subtle)]" />)}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <ServerCrash className="w-6 h-6 text-[color:var(--text-tertiary)]" />
          <p className="text-xs text-[color:var(--text-tertiary)]">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid md:grid-cols-3 gap-5">

          {/* Recurring Patterns */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Recurring Patterns
              </p>
            </div>
            {recurring.length === 0 && (
              <p className="text-xs text-[color:var(--text-tertiary)]">No recurring patterns detected</p>
            )}
            <div className="space-y-2">
              {recurring.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <SeverityDot severity={item.severity} />
                  <div>
                    <p className="font-medium text-[color:var(--text-primary)] leading-snug">{item.title}</p>
                    <p className="text-[color:var(--text-tertiary)] text-[10px] mt-0.5">{item.entityName ?? item.memoryType}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Dependencies */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <AlertCircle className="w-3 h-3 text-red-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Hero Dependencies
              </p>
            </div>
            {heroes.length === 0 && (
              <p className="text-xs text-[color:var(--text-tertiary)]">No hero dependencies detected</p>
            )}
            <div className="space-y-2">
              {heroes.slice(0, 3).map((h, i) => <HeroChip key={i} h={h} />)}
            </div>
          </div>

          {/* Don't Forget */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen className="w-3 h-3 text-indigo-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Don&apos;t Forget
              </p>
            </div>
            {dontForget.length === 0 && (
              <p className="text-xs text-[color:var(--text-tertiary)]">No pending reminders</p>
            )}
            <div className="space-y-2">
              {dontForget.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg"
                  style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                  <span className="text-indigo-400 font-bold shrink-0">!</span>
                  <div>
                    <p className="font-medium text-[color:var(--text-primary)] leading-snug">{item.title}</p>
                    <p className="text-[color:var(--text-tertiary)] text-[10px] mt-0.5 line-clamp-2">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
