'use client';

import { useEffect, useState } from 'react';
import { decisionSupportApi, ApiError, DecisionSupportSummary, DecisionQueueItem, DecisionDriverGroup } from '../../lib/api';
import { ListChecks, AlertTriangle, Clock, CheckCircle2, RotateCcw } from 'lucide-react';

const DRIVER_COLOR: Record<string, string> = {
  'Single Point of Failure': '#f87171',
  'Active Incident': '#fb923c',
  'Undocumented Knowledge': '#facc15',
  Other: '#8b8b9e',
};

function priorityColor(score: number) {
  if (score >= 75) return '#f87171';
  if (score >= 50) return '#fb923c';
  if (score >= 25) return '#facc15';
  return '#4ade80';
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)' }}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

/**
 * API-1: the first of the 59 previously-unreferenced endpoints to get a
 * frontend home. This is decision_queue's "what needs deciding now" view —
 * distinct from the Decision Quality Index above it on this page, which
 * audits decisions already made (organizational_decisions). Two real
 * tables, two real questions; this section is deliberately labeled apart
 * from DQI so neither reads as a duplicate of the other.
 */
export function DecisionSupportQueue() {
  const [summary, setSummary] = useState<DecisionSupportSummary | null>(null);
  const [queue, setQueue] = useState<DecisionQueueItem[]>([]);
  const [drivers, setDrivers] = useState<DecisionDriverGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      decisionSupportApi.summary(),
      decisionSupportApi.queue(),
      decisionSupportApi.drivers(),
    ])
      .then(([s, q, d]) => {
        setSummary(s);
        setQueue(q.decisions);
        setDrivers(d);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? `${err.status} — ${err.message}` : 'Failed to load the decision support queue'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: 24 }} className="animate-pulse">
        <div style={{ height: 20, width: 240, background: 'var(--border-subtle)', borderRadius: 6, marginBottom: 16 }} />
        <div style={{ height: 96, width: '100%', background: 'var(--border-subtle)', borderRadius: 8 }} />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div style={{ borderRadius: 12, border: '1px solid rgba(248,113,113,0.22)', background: 'rgba(248,113,113,0.06)', padding: 20, color: '#f87171', fontSize: 13 }}>
        Failed to load the decision support queue: {error ?? 'Unknown error'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Decision Support Queue</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          What needs a decision right now, ranked by impact, urgency, effort, and blast radius — not an audit of decisions already made.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        <StatCard icon={ListChecks} label="Total" value={summary.totalDecisions} color="#818cf8" />
        <StatCard icon={AlertTriangle} label="Pending" value={summary.pending} color="#f87171" />
        <StatCard icon={Clock} label="In Progress" value={summary.inProgress} color="#facc15" />
        <StatCard icon={CheckCircle2} label="Resolved" value={summary.resolved} color="#4ade80" />
        <StatCard icon={RotateCcw} label="To Revisit" value={summary.decisionsToRevisit} color="#fb923c" />
      </div>

      {drivers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {drivers.map((d) => (
            <div key={d.driverKey} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
              border: `1px solid ${DRIVER_COLOR[d.driver] ?? '#8b8b9e'}40`,
              background: `${DRIVER_COLOR[d.driver] ?? '#8b8b9e'}14`,
              fontSize: 11, color: DRIVER_COLOR[d.driver] ?? 'var(--text-secondary)',
            }}>
              <span style={{ fontWeight: 600 }}>{d.driver}</span>
              <span style={{ opacity: 0.75 }}>{d.count} · avg {d.avgPriorityScore}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Pending Decisions</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{queue.length} awaiting action</span>
        </div>

        {queue.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            No pending decisions in the queue.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {queue.map((d, i) => {
              const color = priorityColor(d.priorityScore);
              return (
                <div key={`${d.title}-${i}`} style={{
                  padding: '14px 18px',
                  borderBottom: i < queue.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.title}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '2px 6px', borderRadius: 4,
                        color: DRIVER_COLOR[d.driver] ?? 'var(--text-secondary)',
                        background: `${DRIVER_COLOR[d.driver] ?? '#8b8b9e'}18`,
                      }}>{d.driver}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</p>
                    {(d.entityName || d.responsiblePerson) && (
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                        {d.entityName}{d.entityName && d.responsiblePerson ? ' · ' : ''}{d.responsiblePerson}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{d.priorityScore}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>priority</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
