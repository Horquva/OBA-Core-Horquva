'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, Layers } from 'lucide-react';
import { orgScience, type ReplaceabilityResponse } from '../../lib/api';

interface Props {
  entityId?: string;
  initialEntity?: ReplaceabilityResponse;
}

const RATING_STYLES: Record<'High' | 'Medium' | 'Low', { badge: string; text: string; bg: string }> = {
  High: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'border-emerald-500/20 bg-emerald-950/10',
  },
  Medium: {
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    text: 'text-yellow-400',
    bg: 'border-yellow-500/20 bg-yellow-950/10',
  },
  Low: {
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    text: 'text-red-400',
    bg: 'border-red-500/20 bg-red-950/10',
  },
};

export function ReplaceabilityCard({ entityId, initialEntity }: Props) {
  const [entities, setEntities] = useState<ReplaceabilityResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string>(entityId || initialEntity?.entityId || '');
  const [currentEntity, setCurrentEntity] = useState<ReplaceabilityResponse | null>(initialEntity || null);
  const [loading, setLoading] = useState<boolean>(!initialEntity);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Load all entities for the selector if no specific entityId is pinned
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        setLoading(true);
        if (entityId) {
          const item = await orgScience.replaceability(entityId);
          if (cancelled) return;
          setCurrentEntity(item);
          setSelectedId(item.entityId);
        } else {
          const res = await orgScience.replaceabilityList();
          if (cancelled) return;
          setEntities(res.entities || []);
          if (res.entities?.length && !selectedId) {
            setSelectedId(res.entities[0].entityId);
            setCurrentEntity(res.entities[0]);
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load replaceability data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  // Handle entity selection change
  const handleSelect = (id: string) => {
    setSelectedId(id);
    const found = entities.find((e) => e.entityId === id);
    if (found) {
      setCurrentEntity(found);
    }
  };

  const filteredEntities = useMemo(() => {
    if (filterType === 'all') return entities;
    return entities.filter((e) => e.type === filterType);
  }, [entities, filterType]);

  const rating = currentEntity?.rating || 'Low';
  const ratingStyle = RATING_STYLES[rating];

  return (
    <div className="card border-[var(--border-subtle)] flex flex-col h-full min-h-[340px] p-6 relative overflow-hidden group">
      {/* Background glow according to rating */}
      <div
        className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          rating === 'High'
            ? 'bg-emerald-500/10'
            : rating === 'Medium'
            ? 'bg-yellow-500/10'
            : 'bg-red-500/10'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[color:var(--text-primary)]">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[color:var(--text-primary)] tracking-tight">
              Replaceability Analysis
            </h3>
            <p className="text-xs text-[color:var(--text-secondary)]">
              Resilience &amp; redundancy audit (FE-5)
            </p>
          </div>
        </div>

        {currentEntity && (
          <span
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${ratingStyle.badge}`}
          >
            {rating}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center animate-pulse">
          <RefreshCw className="w-6 h-6 text-[color:var(--text-tertiary)] animate-spin mb-3" />
          <p className="text-xs text-[color:var(--text-secondary)]">Evaluating graph replaceability...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-red-400 bg-red-500/5 rounded-xl border border-red-500/20">
          <XCircle className="w-8 h-8 mb-2 opacity-80" />
          <p className="text-xs">{error}</p>
        </div>
      ) : currentEntity ? (
        <div className="flex-1 flex flex-col justify-between space-y-5 relative z-10">
          {/* Entity Selector (when entities are loaded) */}
          {entities.length > 0 && !entityId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[color:var(--text-tertiary)] font-medium">Inspected Entity:</span>
                <div className="flex gap-1">
                  {['all', 'ai_agent', 'employee', 'vendor', 'system'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors capitalize ${
                        filterType === t
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]'
                      }`}
                    >
                      {t === 'ai_agent' ? 'AI' : t}
                    </button>
                  ))}
                </div>
              </div>
              <select
                aria-label="Inspected Entity"
                value={selectedId}
                onChange={(e) => handleSelect(e.target.value)}
                className="w-full text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[color:var(--text-primary)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {filteredEntities.map((e) => (
                  <option key={e.entityId} value={e.entityId}>
                    {e.name} ({e.type}) — {e.rating} Replaceability
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rating & Explanation Banner */}
          <div className={`p-4 rounded-xl border ${ratingStyle.bg}`}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-semibold text-[color:var(--text-primary)]">
                {currentEntity.name}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[color:var(--text-tertiary)]">
                {currentEntity.type}
              </span>
            </div>
            <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
              {currentEntity.explanation}
            </p>
          </div>

          {/* 3 Status Checkmarks */}
          <div className="space-y-2.5 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)] block">
              Rating Rule Checklist
            </span>

            {/* Condition 1: hasBackupOwner */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
              <div className="flex items-center gap-2">
                {currentEntity.hasBackupOwner ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span
                  className={
                    currentEntity.hasBackupOwner
                      ? 'text-[color:var(--text-primary)] font-medium'
                      : 'text-[color:var(--text-secondary)]'
                  }
                >
                  Backup Owner ({currentEntity.hasBackupOwner ? 'Assigned' : 'Missing'})
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  currentEntity.hasBackupOwner
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {currentEntity.hasBackupOwner ? 'YES' : 'NO'}
              </span>
            </div>

            {/* Condition 2: hasAltVendor */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
              <div className="flex items-center gap-2">
                {currentEntity.hasAltVendor ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span
                  className={
                    currentEntity.hasAltVendor
                      ? 'text-[color:var(--text-primary)] font-medium'
                      : 'text-[color:var(--text-secondary)]'
                  }
                >
                  Alternative Vendor / Model ({currentEntity.hasAltVendor ? 'Available' : 'Missing'})
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  currentEntity.hasAltVendor
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {currentEntity.hasAltVendor ? 'YES' : 'NO'}
              </span>
            </div>

            {/* Condition 3: isDocumented */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
              <div className="flex items-center gap-2">
                {currentEntity.isDocumented ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span
                  className={
                    currentEntity.isDocumented
                      ? 'text-[color:var(--text-primary)] font-medium'
                      : 'text-[color:var(--text-secondary)]'
                  }
                >
                  Documented Runbook &amp; Assets ({currentEntity.isDocumented ? 'Verified' : 'Missing'})
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  currentEntity.isDocumented
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {currentEntity.isDocumented ? 'YES' : 'NO'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[color:var(--text-tertiary)]">
          <Layers className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-xs">No entity selected</p>
        </div>
      )}
    </div>
  );
}
