'use client';

import React, { useEffect, useState } from 'react';
import { relationshipApi, RelationshipHealth } from '../../lib/api';
import { ArrowRight, HeartPulse } from 'lucide-react';
import Link from 'next/link';

export function RelationshipHealthStrip() {
  const [data, setData] = useState<RelationshipHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    relationshipApi.health()
      .then(setData)
      .catch(() => {
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-16 rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] animate-pulse" />;
  }

  if (!data) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-[color:var(--text-primary)]">Relationship Health</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-medium text-[color:var(--text-secondary)]">Healthy ({data.healthy})</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span className="text-xs font-medium text-[color:var(--text-secondary)]">At Risk ({data.atRisk})</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs font-medium text-red-400">Fragile ({data.fragile})</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-xs text-[color:var(--text-tertiary)]">
          Total mapped: <span className="font-medium text-[color:var(--text-secondary)]">{data.totalRelationships} relationships</span>
        </div>
        
        <Link href="/relationship-explorer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3b82f6] text-white text-xs font-medium hover:bg-[#2563eb] transition-colors">
          Explore Relationships
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
