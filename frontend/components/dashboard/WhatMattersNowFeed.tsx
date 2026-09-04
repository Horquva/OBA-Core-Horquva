'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Zap, ServerCrash } from 'lucide-react';
import { contextApi, ContextFeedItem } from '../../lib/api';
import { TruthBadge } from './TruthBadge';

const URGENCY_CONFIG = {
  CRITICAL: { bg: 'var(--risk-critical-bg)', text: 'var(--risk-critical-text)', border: 'var(--risk-critical-border)' },
  HIGH:     { bg: 'var(--risk-high-bg)',     text: 'var(--risk-high-text)',     border: 'var(--risk-high-border)' },
  MEDIUM:   { bg: 'var(--risk-medium-bg)',   text: 'var(--risk-medium-text)',   border: 'var(--risk-medium-border)' },
  LOW:      { bg: 'var(--risk-low-bg)',      text: 'var(--risk-low-text)',      border: 'var(--risk-low-border)' },
};

function UrgencyBadge({ urgency }: { urgency: ContextFeedItem['urgency'] }) {
  const style = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG['LOW'];
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
      {urgency}
    </span>
  );
}

const CONTEXT_TYPE_HREF: Record<string, string> = {
  spof:     '/risk',
  incident: '/workflows',
  decision: '/decision',
  metric:   '/risk',
};

export function WhatMattersNowFeed() {
  const [items, setItems] = useState<ContextFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contextApi.feed()
      .then(d => { setItems(d.feed ?? []); setTotal(d.totalItems ?? 0); })
      .catch((e) => setError(e?.message ?? 'Context feed unavailable'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-5 relative overflow-hidden animate-fade-up delay-225 flex flex-col h-full min-h-[400px]">
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, rgba(251 146 60 / 0.5), transparent)' }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">
            What Matters Now
          </span>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && <span className="text-xs text-[color:var(--text-tertiary)]">{total} items</span>}
          <TruthBadge verified={!error && items.length > 0} />
        </div>
      </div>

      {/* Feed */}
      <div className="overflow-y-auto space-y-2 flex-1 pr-1" style={{ maxHeight: '100%' }}>
        {loading && (
          <div className="space-y-2 animate-pulse">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 rounded bg-[var(--border-subtle)]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ServerCrash className="w-5 h-5 text-[color:var(--text-tertiary)]" />
            <p className="text-xs text-[color:var(--text-tertiary)]">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-xs text-[color:var(--text-tertiary)] py-4 text-center">
            No open context items — all clear ✓
          </div>
        )}

        {!loading && !error && items.slice(0, 12).map((item, i) => {
          const href = CONTEXT_TYPE_HREF[item.contextType] ?? '/';
          return (
            <a key={i} href={href}
              className="flex items-start gap-3 p-3 rounded-lg transition-all duration-200 group cursor-pointer"
              style={{ background: 'rgba(255 255 255 / 0.02)', border: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255 255 255 / 0.02)'; }}>

              {/* Rank */}
              <span className="text-xs tabular-nums font-medium text-[color:var(--text-tertiary)] shrink-0 mt-0.5 w-4 text-right">
                {item.rank}
              </span>

              {/* Urgency badge */}
              <UrgencyBadge urgency={item.urgency} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[color:var(--text-primary)] truncate leading-snug">
                  {item.title}
                </p>
                <p className="text-[10px] text-[color:var(--text-tertiary)] mt-0.5 truncate">
                  {[item.entityName, item.responsiblePerson].filter(Boolean).join(' · ') || item.contextType}
                  {item.blastRadius > 0 && ` · blast: ${item.blastRadius}`}
                </p>
              </div>

              {/* Deep-link arrow */}
              <ExternalLink className="w-3 h-3 text-[color:var(--text-tertiary)] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
