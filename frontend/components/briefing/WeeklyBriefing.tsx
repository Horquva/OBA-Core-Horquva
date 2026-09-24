'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  UserX,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  changeImpactApi,
  ChangeEvent,
  ChangeEventsResponse,
  ApiError,
} from '@/lib/api';

export function WeeklyBriefing() {
  const [data, setData] = useState<ChangeEventsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | 'all'>('7d');

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: '100' };

      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        params.from = fromDate.toISOString();
      }

      const res = await changeImpactApi.events(params);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load weekly briefing');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // Backend computed figures directly from response
  const summaryMetrics = useMemo(() => {
    if (!data || !data.events) {
      return {
        totalChanges: 0,
        increasedExposureCount: 0,
        backupsLostCount: 0,
        recommendedAction: 'No action required.',
        summarySentence: 'No material changes this week.',
      };
    }

    const events = data.events;
    const totalChanges = events.length;

    // Filter events that increased risk exposure
    const increasedExposureEvents = events.filter((e) => {
      const healthDropped = (e.health_delta ?? 0) < 0;
      const agentWorse = e.impact?.agents?.some(
        (a) => a.direction === 'worse' || a.delta > 0 || a.becameSpof
      );
      const peopleWorse = e.impact?.people?.some(
        (p) => p.direction === 'worse' || p.delta > 0
      );
      return healthDropped || agentWorse || peopleWorse;
    });
    const increasedExposureCount = increasedExposureEvents.length;

    // Filter events where a backup was lost
    const backupsLostEvents = events.filter(
      (e) =>
        e.change_type === 'backup_removed' ||
        e.change_type === 'tool_backup_removed'
    );
    const backupsLostCount = backupsLostEvents.length;

    // Determine recommended action directly from real event data
    let recommendedAction = 'No action required.';
    
    // Check if any event created a SPOF or lost a backup
    const spofEvent = events.find((e) => e.impact?.spofChanges?.length || e.impact?.agents?.some((a) => a.becameSpof));
    const backupEvent = backupsLostEvents[0];
    
    if (spofEvent) {
      const targetName =
        spofEvent.impact?.spofChanges?.[0]?.agentName ||
        spofEvent.impact?.agents?.find((a) => a.becameSpof)?.agentName ||
        spofEvent.impact?.downstream?.workflows?.[0]?.name ||
        'Workflow X';
      recommendedAction = `assign a secondary owner to ${targetName}`;
    } else if (backupEvent) {
      const targetName =
        backupEvent.description ||
        backupEvent.impact?.downstream?.workflows?.[0]?.name ||
        'primary asset';
      recommendedAction = `re-assign backup coverage for ${targetName}`;
    } else if (increasedExposureCount > 0) {
      const targetName =
        events.find((e) => e.health_delta && e.health_delta < 0)?.description ||
        'exposed components';
      recommendedAction = `review exposure for ${targetName}`;
    }

    // Exact required briefing prose summary format:
    // "7 material changes this week, 2 increased exposure, 1 backup was lost, recommended action: assign a secondary owner to Workflow X."
    let summarySentence = '';
    if (totalChanges === 0) {
      summarySentence = 'No material changes this week.';
    } else {
      const backupText =
        backupsLostCount === 1 ? '1 backup was lost' : `${backupsLostCount} backups were lost`;
      summarySentence = `${totalChanges} material change${
        totalChanges === 1 ? '' : 's'
      } this week, ${increasedExposureCount} increased exposure, ${backupText}, recommended action: ${recommendedAction}.`;
    }

    return {
      totalChanges,
      increasedExposureCount,
      backupsLostCount,
      recommendedAction,
      summarySentence,
    };
  }, [data]);

  return (
    <div
      style={{
        padding: '32px 28px',
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <Sparkles size={13} /> Weekly Intelligence
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              FE-3 Briefing Module
            </span>
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              fontFamily: '"Outfit", var(--font-sans), sans-serif',
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Weekly Dependency Briefing
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Recurring breakdown of structural dependency changes, exposure shifts, and recommended mitigation.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Time range picker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '3px',
              gap: '2px',
            }}
          >
            {(['7d', '14d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: timeRange === r ? 600 : 500,
                  color: timeRange === r ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: timeRange === r ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {r === '7d' ? '7 Days' : r === '14d' ? '14 Days' : r === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchBriefing}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Error loading briefing data:</strong> {error}
          </div>
        </div>
      )}

      {/* ── Executive Briefing Highlight Banner ── */}
      <div
        style={{
          padding: '24px 28px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(30,30,56,0.95), rgba(15,15,30,0.98))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              backgroundColor:
                summaryMetrics.totalChanges === 0
                  ? 'rgba(34, 197, 94, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
              border:
                summaryMetrics.totalChanges === 0
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : '1px solid rgba(245, 158, 11, 0.3)',
              color: summaryMetrics.totalChanges === 0 ? '#4ade80' : '#fbbf24',
              flexShrink: 0,
            }}
          >
            {summaryMetrics.totalChanges === 0 ? (
              <CheckCircle2 size={24} />
            ) : (
              <ShieldAlert size={24} />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#a5b4fc',
                marginBottom: '6px',
              }}
            >
              Executive Summary Quote
            </div>

            {loading ? (
              <div
                style={{
                  height: '24px',
                  width: '70%',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  animation: 'pulse-soft 2.5s ease-in-out infinite',
                }}
              />
            ) : (
              <blockquote
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 600,
                  lineHeight: '1.5',
                  color: '#ffffff',
                  fontFamily: '"Outfit", var(--font-sans), sans-serif',
                }}
              >
                &ldquo;{summaryMetrics.summarySentence}&rdquo;
              </blockquote>
            )}

            {data?.baseline_taken_at && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '12px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                <Calendar size={13} /> Baseline established:{' '}
                {new Date(data.baseline_taken_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Material Changes
            </span>
            <Layers size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {loading ? '...' : summaryMetrics.totalChanges}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Detected in period
          </span>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Increased Exposure
            </span>
            <TrendingDown size={18} style={{ color: summaryMetrics.increasedExposureCount > 0 ? '#f87171' : '#4ade80' }} />
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: summaryMetrics.increasedExposureCount > 0 ? '#f87171' : 'var(--text-primary)',
            }}
          >
            {loading ? '...' : summaryMetrics.increasedExposureCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Events shifting risk upward
          </span>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Backups Lost
            </span>
            <UserX size={18} style={{ color: summaryMetrics.backupsLostCount > 0 ? '#fbbf24' : '#4ade80' }} />
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: summaryMetrics.backupsLostCount > 0 ? '#fbbf24' : 'var(--text-primary)',
            }}
          >
            {loading ? '...' : summaryMetrics.backupsLostCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Primary assets without backup
          </span>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Recommended Action
            </span>
            <ChevronRight size={18} style={{ color: '#818cf8' }} />
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '1.4',
              textTransform: 'capitalize',
            }}
          >
            {loading ? '...' : summaryMetrics.recommendedAction}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Top priority mitigation
          </span>
        </div>
      </div>

      {/* ── Events History Detail Section ── */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Recorded Dependency Events
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Exact events retrieved from <code>/api/change-impact/events</code>
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            Loading recorded dependency changes...
          </div>
        ) : !data || data.events.length === 0 ? (
          /* Edge case requirement: zero changes in period */
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <CheckCircle2 size={36} style={{ color: '#4ade80' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No material changes this week
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-tertiary)', maxWidth: '440px', margin: 0 }}>
              No structural changes (owner reassignments, backup removals, or model swaps) were recorded in the baseline during this timeframe.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: ChangeEvent }) {
  const isPriced = event.priced;
  const healthDelta = event.health_delta;
  const isHealthWorse = healthDelta !== null && healthDelta < 0;
  const isHealthBetter = healthDelta !== null && healthDelta > 0;

  const formattedDate = new Date(event.detected_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ChangeTypeBadge type={event.change_type} />
          <TargetBadge type={event.target_type} id={event.target_id} />
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {formattedDate}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {healthDelta !== null && healthDelta !== 0 && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: isHealthWorse ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                color: isHealthWorse ? '#f87171' : '#4ade80',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isHealthWorse ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
              {healthDelta > 0 ? `+${healthDelta}` : healthDelta} Health
            </span>
          )}

          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: isPriced ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface)',
              color: isPriced ? '#a5b4fc' : 'var(--text-tertiary)',
            }}
          >
            {isPriced ? 'Priced' : 'Unpriced'}
          </span>
        </div>
      </div>

      <div style={{ fontSize: '14.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
        {event.description}
      </div>

      {/* Downstream & SPOF Impacts */}
      {(event.impact?.spofChanges?.length || event.impact?.downstream?.workflows?.length) ? (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {event.impact?.spofChanges?.map((spof, idx) => (
            <div key={idx} style={{ color: '#fbbf24', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} /> SPOF Change: {spof.agentName} ({spof.before} &rarr; {spof.after})
            </div>
          ))}

          {event.impact?.downstream?.workflows?.length ? (
            <div style={{ color: 'var(--text-secondary)' }}>
              <strong>Downstream Workflows:</strong>{' '}
              {event.impact.downstream.workflows.map((w) => w.name).join(', ')}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChangeTypeBadge({ type }: { type: string }) {
  let label = type;
  let bg = 'rgba(99, 102, 241, 0.12)';
  let color = '#818cf8';

  switch (type) {
    case 'owner_changed':
      label = 'Owner Changed';
      bg = 'rgba(59, 130, 246, 0.12)';
      color = '#60a5fa';
      break;
    case 'backup_removed':
      label = 'Backup Removed';
      bg = 'rgba(239, 68, 68, 0.12)';
      color = '#f87171';
      break;
    case 'tool_backup_removed':
      label = 'Tool Backup Removed';
      bg = 'rgba(245, 158, 11, 0.12)';
      color = '#fbbf24';
      break;
    case 'model_swapped':
      label = 'Model Swapped';
      bg = 'rgba(168, 85, 247, 0.12)';
      color = '#c084fc';
      break;
    case 'vendor_changed':
      label = 'Vendor Changed';
      bg = 'rgba(20, 184, 166, 0.12)';
      color = '#2dd4bf';
      break;
  }

  return (
    <span
      style={{
        fontSize: '11.5px',
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: '6px',
        backgroundColor: bg,
        color: color,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  );
}

function TargetBadge({ type, id }: { type: string; id: string }) {
  return (
    <span
      style={{
        fontSize: '11.5px',
        fontWeight: 500,
        padding: '3px 8px',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {type}: {id}
    </span>
  );
}
