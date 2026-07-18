'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { selfHealing, ApiError, type SelfHealingIssue } from '../../lib/api';
import { RiskBadge } from '../ui/RiskBadge';

type FetchState = 'loading' | 'success' | 'error' | 'empty';

export function SelfHealingFeed() {
  const [issues, setIssues] = useState<SelfHealingIssue[]>([]);
  const [state, setState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await selfHealing.detect();
        if (cancelled) return;
        
        if (data.issues.length === 0) {
          setState('empty');
        } else {
          setIssues(data.issues);
          setState('success');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : 'Failed to fetch self-healing data',
        );
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="animate-fade-up delay-500">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Self-Healing Feed</h2>
          <p className="text-xs text-[color:var(--text-secondary)]">Automated issue detection and remediation</p>
        </div>
      </div>

      {state === 'loading' && (
        <div className="card px-6 py-5 border border-[var(--border-subtle)]">
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-16 w-full rounded-lg bg-[var(--border-subtle)] animate-pulse-soft" />
            ))}
          </div>
        </div>
      )}

      {state === 'empty' && (
        <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
          <Shield className="w-10 h-10 text-[color:var(--text-tertiary)] mb-3" />
          <h3 className="text-[color:var(--text-primary)] font-semibold mb-1">No Issues Detected</h3>
          <p className="text-sm text-[color:var(--text-secondary)]">Self-healing system reports all clear.</p>
        </div>
      )}

      {state === 'error' && (
        <div className="card px-6 py-6 border border-[var(--border-subtle)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[color:var(--text-primary)] font-medium mb-1">Failed to load self-healing feed</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-3">
          {issues.map(issue => (
            <div key={issue.id} className="px-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-1">
                <RiskBadge level={issue.severity} />
                <span className="text-sm font-medium text-[color:var(--text-primary)]">{issue.type}</span>
              </div>
              <p className="text-xs text-[color:var(--text-primary)]">{issue.description}</p>
              <p className="text-[10px] text-[color:var(--text-tertiary)] mt-1">
                Detected: {new Date(issue.detectedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
