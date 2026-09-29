'use client';

import { useEffect, useState } from 'react';
import { AlertOctagon, RefreshCw, Wrench } from 'lucide-react';
import { request } from '../../lib/api';

/**
 * Feature 1 (Phase 2.1) — the 2×2 Criticality × Replaceability matrix.
 *
 * Data comes from GET /api/intelligence/replaceability (domain/replaceability.js):
 * K_i = 0.40·S_doc + 0.30·S_alt + 0.30·S_bench per asset, crossed with Engine
 * A's blast radius into four quadrants. This component renders the map and the
 * worst offenders per quadrant; it computes nothing locally.
 *
 *   high criticality + low replaceability  → VULNERABLE_CORE  (existential)
 *   high criticality + high replaceability → REPLACEABLE_CRITICALITY (managed)
 *   low criticality  + low replaceability  → NICHE_DEPENDENCY (tech debt)
 *   low criticality  + high replaceability → COMMODITY_UTILITY (nominal)
 */

interface ReplaceabilityEntity {
  entityType: 'agent' | 'workflow' | 'platform';
  entityId: string;
  name: string;
  replaceability: number;
  band: string;
  criticality: number;
  quadrant: string;
  components: {
    doc: { score: number };
    alt: { score: number; via?: string; hotBackup?: boolean };
    bench: { score: number; crossTrainedPeers: number };
  };
}

interface ReplaceabilityResponse {
  entities: ReplaceabilityEntity[];
  quadrants: Record<string, { entityType: string; entityId: string; name: string }[]>;
  population: { total: number; vulnerableCore: number; irreplaceable: number; easy: number };
}

const QUADRANT_META: {
  key: string;
  title: string;
  action: string;
  className: string;
}[] = [
  {
    key: 'VULNERABLE_CORE',
    title: 'The Vulnerable Core',
    action: 'Immediate succession / redundancy plan',
    className: 'border-red-500/40 bg-red-500/5',
  },
  {
    key: 'REPLACEABLE_CRITICALITY',
    title: 'Replaceable Criticality',
    action: 'Maintain active fallbacks',
    className: 'border-amber-500/40 bg-amber-500/5',
  },
  {
    key: 'NICHE_DEPENDENCY',
    title: 'Niche Dependency',
    action: 'Deprecate or document',
    className: 'border-[var(--border-strong)] bg-[var(--bg-surface)]',
  },
  {
    key: 'COMMODITY_UTILITY',
    title: 'Commodity Utility',
    action: 'Monitor',
    className: 'border-emerald-500/30 bg-emerald-500/5',
  },
];

const KIND_LABEL: Record<string, string> = { agent: 'Agent', workflow: 'Workflow', platform: 'Platform' };

export function ReplaceabilityMatrix() {
  const [data, setData] = useState<ReplaceabilityResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    request<ReplaceabilityResponse>('/api/intelligence/replaceability')
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <Wrench size={16} className="text-[var(--accent)]" />
          Replaceability Matrix
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] italic">
          Replaceability intelligence is unavailable right now.
        </p>
      </div>
    );
  }

  if (!data) {
    return <div className="card p-6 h-64 animate-pulse bg-[var(--border-subtle)] rounded-xl" />;
  }

  const worst = (quadrant: string) =>
    data.entities
      .filter((e) => e.quadrant === quadrant)
      .sort((a, b) => b.criticality - a.criticality)
      .slice(0, 4);

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
            <Wrench size={16} className="text-[var(--accent)]" />
            Criticality × Replaceability
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {data.population.total} assets scored · {data.population.vulnerableCore} in the Vulnerable
            Core · {data.population.irreplaceable} irreplaceable. K_i = 0.4·docs + 0.3·alternatives +
            0.3·bench.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1">
          <RefreshCw size={11} /> live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {QUADRANT_META.map((q) => {
          const items = worst(q.key);
          return (
            <div key={q.key} className={`rounded-lg border p-4 ${q.className}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">{q.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-tertiary)]">
                  {data.quadrants[q.key]?.length ?? 0}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2">{q.action}</p>
              {items.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] italic">Nothing here.</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((e) => (
                    <li key={e.entityId} className="text-xs text-[var(--text-secondary)] flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="text-[var(--text-tertiary)]">{KIND_LABEL[e.entityType]}</span>{' '}
                        {e.name}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--text-tertiary)]">
                        K{e.replaceability} · B{e.criticality}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {data.population.vulnerableCore > 0 && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertOctagon size={13} />
          {data.population.vulnerableCore} asset(s) are critical and hard to replace — board-level exposure.
        </p>
      )}
    </div>
  );
}
