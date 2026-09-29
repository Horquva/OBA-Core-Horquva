'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Cpu, Users } from 'lucide-react';
import { request } from '../../lib/api';

/**
 * Feature 2 (Phase 2.2) — Dependency Concentration card.
 *
 * Reads GET /api/intelligence/concentration (domain/concentration.js): per
 * class (humans / models / vendors) the HHI with DOJ/FTC banding, plus the
 * typed chokepoint alerts — a node holding >25% of its class's
 * criticality-weighted exposure with no recorded fallback. This component
 * renders; it computes nothing locally.
 */

interface ConcentrationAlert {
  kind: 'KEY_PERSON' | 'MODEL_CHOKEPOINT' | 'VENDOR_CHOKEPOINT';
  nodeId: string;
  name: string;
  share: number;
  exposure: number;
}

interface ConcentrationClass {
  population: number;
  hhi: number;
  band: 'DISTRIBUTED' | 'MODERATE' | 'CRITICAL_CHOKEPOINT';
  gini: number;
  entropy: number;
}

interface ConcentrationResponse {
  classes: Record<string, ConcentrationClass>;
  alerts: ConcentrationAlert[];
}

const KIND_META: Record<string, { label: string; icon: typeof Users }> = {
  KEY_PERSON: { label: 'Key Person', icon: Users },
  MODEL_CHOKEPOINT: { label: 'Model Chokepoint', icon: Cpu },
  VENDOR_CHOKEPOINT: { label: 'Vendor Chokepoint', icon: Building2 },
};

const BAND_COLORS: Record<string, string> = {
  DISTRIBUTED: 'text-emerald-400',
  MODERATE: 'text-amber-400',
  CRITICAL_CHOKEPOINT: 'text-red-400',
};

export function ConcentrationAlertsCard() {
  const [data, setData] = useState<ConcentrationResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    request<ConcentrationResponse>('/api/intelligence/concentration')
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <AlertTriangle size={16} className="text-[var(--accent)]" />
          Dependency Concentration
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] italic">
          Concentration intelligence is unavailable right now.
        </p>
      </div>
    );
  }

  if (!data) {
    return <div className="card p-6 h-56 animate-pulse bg-[var(--border-subtle)] rounded-xl" />;
  }

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
          <AlertTriangle size={16} className="text-[var(--accent)]" />
          Dependency Concentration
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Herfindahl-Hirschman exposure per class — how much of the enterprise
          runs through too few entities.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Object.entries(data.classes).map(([key, c]) => (
          <div key={key} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{key}</div>
            <div className={`text-lg font-bold ${BAND_COLORS[c.band] ?? ''}`}>{c.hhi}</div>
            <div className="text-[10px] text-[var(--text-tertiary)]">{c.band.replace(/_/g, ' ').toLowerCase()}</div>
          </div>
        ))}
      </div>

      {data.alerts.length === 0 ? (
        <p className="text-xs text-emerald-400">
          No chokepoints — no node holds more than a quarter of its class&apos;s exposure without a fallback.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.alerts.map((a) => {
            const meta = KIND_META[a.kind];
            const Icon = meta.icon;
            return (
              <li key={`${a.kind}-${a.nodeId}`} className="flex items-center justify-between gap-3 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                  <Icon size={14} className="text-red-400 shrink-0" />
                  <span className="font-semibold">{a.name}</span>
                  <span className="text-[var(--text-tertiary)]">{meta.label}</span>
                </span>
                <span className="text-xs font-mono text-red-400 shrink-0">{(a.share * 100).toFixed(0)}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
