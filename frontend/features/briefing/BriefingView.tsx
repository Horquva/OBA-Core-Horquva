'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchBriefingDetail } from '@/lib/api/overview';
import { formatDateTime } from '@/lib/format';
import type { BriefingDetail } from '@/types/view';
import { useToast } from '@/components/ui/Toast';

export interface BriefingViewProps {
  initialBriefing?: string | null;
}

export function BriefingView({ initialBriefing }: BriefingViewProps) {
  const { toast } = useToast();
  const briefingResource = useResource<BriefingDetail>('weekly-briefing', fetchBriefingDetail);
  const detail = briefingResource.status === 'ready' ? briefingResource.data : null;

  const rawBriefing = detail ? detail.text : initialBriefing;

  const handleCopy = React.useCallback(() => {
    if (!rawBriefing) return;
    navigator.clipboard.writeText(rawBriefing);
    toast({
      title: 'Briefing copied',
      description: 'The weekly executive briefing text was copied to your clipboard.',
    });
  }, [rawBriefing, toast]);


  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Overview</span>
          </Link>

          {rawBriefing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
            >
              Copy briefing
            </Button>
          )}
        </div>

        <div className="space-y-2 border-b border-rule/50 pb-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-2 font-mono">
              Weekly Continuity Reading View
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-ink leading-tight tracking-tight">
            Continuity Executive Briefing
          </h1>

          <p className="text-sm text-ink-3">
            {detail
              ? `Written ${formatDateTime(detail.generatedAt)} from OBA's current records.`
              : 'Written when you open it, from OBA’s current records.'}
          </p>
        </div>

        {/* Who wrote it: AI only when the model actually wrote it */}
        {detail && (
          <div className="rounded-control border border-amber/40 bg-amber/10 p-3.5 flex items-start gap-3">
            <span className="text-amber-ink text-base select-none" aria-hidden="true">✦</span>
            <div className="text-xs space-y-0.5 text-ink-2">
              <p className="font-semibold text-ink">
                {detail.writtenBy === 'ai'
                  ? 'Written by AI from the counted figures below'
                  : 'Written from a fixed template (AI not used)'}
              </p>
              <p className="text-ink-3 leading-relaxed">
                {detail.writtenBy === 'ai'
                  ? 'The AI only words the figures; it does not compute them. Check any number against the figures list.'
                  : 'The AI model is not configured or did not answer, so the figures were dropped into standard wording.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {briefingResource.status === 'loading' && !rawBriefing && (
        <Card className="p-8 space-y-6">
          <Skeleton variant="text" className="w-1/3 h-6" />
          <div className="space-y-3">
            <Skeleton variant="text" className="w-full h-4" />
            <Skeleton variant="text" className="w-5/6 h-4" />
            <Skeleton variant="text" className="w-4/5 h-4" />
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton variant="text" className="w-1/4 h-5" />
            <Skeleton variant="text" className="w-full h-4" />
            <Skeleton variant="text" className="w-3/4 h-4" />
          </div>
        </Card>
      )}

      {/* Error State */}
      {briefingResource.status === 'error' && !rawBriefing && (
        <ErrorState
          onRetry={briefingResource.reload}
          message="We couldn't generate or load this week's continuity briefing."
          lastLoadedAt={briefingResource.lastLoadedAt || undefined}
        />
      )}

      {/* Empty State */}
      {briefingResource.status === 'ready' && !rawBriefing && (
        <EmptyState
          title="No briefing text came back"
          description="OBA answered without any briefing text. Try again; if it persists, check the server log."
          actionLabel="Return to Overview"
          onAction={() => {
            window.location.href = '/';
          }}
        />
      )}

      {/* Reading Body */}
      {rawBriefing && (
        <article className="space-y-8">
          <Card className="p-8 sm:p-10 shadow-card bg-surface">
            <div className="prose-reading space-y-6">
              {rawBriefing
                .replace(/\r\n/g, '\n')
                .replace(/^(#+[^\n]+)\n([^\n])/gm, '$1\n\n$2')
                .split('\n\n')
                .map((block, idx) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                // Section Headers
                if (trimmed.startsWith('#')) {
                  const headingText = trimmed.replace(/^#+\s*/, '');
                  return (
                    <h2
                      key={idx}
                      className="text-2xl sm:text-3xl text-ink font-semibold tracking-tight pt-4 first:pt-0 pb-1 border-b border-rule/40"
                    >
                      {headingText}
                    </h2>
                  );
                }

                // Bullet Lists
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
                  const lines = trimmed.split('\n');
                  return (
                    <ul key={idx} className="space-y-2 my-4 pl-4 border-l-2 border-amber/30 text-ink">
                      {lines.map((line, lIdx) => (
                        <li key={lIdx} className="text-lg leading-relaxed text-ink/90">
                          {line.replace(/^[-*]\s+|\d+\.\s+/, '')}
                        </li>
                      ))}
                    </ul>
                  );
                }

                // Regular Paragraph
                return (
                  <p
                    key={idx}
                    className="text-xl sm:text-2xl text-ink leading-relaxed font-normal tracking-normal selection:bg-amber/20"
                  >
                    {trimmed}
                  </p>
                );
              })}
            </div>
          </Card>

          {/* The figures the text was written from (counts, not citations) */}
          {detail && (
            <section aria-labelledby="briefing-figures" className="space-y-3">
              <h3 id="briefing-figures" className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                Figures this briefing was written from
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded-card border border-rule bg-surface p-4 text-sm">
                {[
                  ['Critical assets fully covered', `${detail.figures.headline.coveredCount} of ${detail.figures.headline.totalCriticalAssets}`],
                  ['Exposed critical assets', detail.figures.headline.exposedCount],
                  ['Unknown (facts not yet confirmed)', detail.figures.headline.unknownCount],
                  ['Departures due in the next 14 days', detail.figures.upcomingDepartures],
                  ['Departures past their leave date, not verified', detail.figures.overdueDepartures],
                  ['Single points of failure', detail.figures.singlePointsOfFailure],
                  ['Automations on personal credentials', detail.figures.personalCredentialAutomations],
                  ['Failure events in the last 7 days', detail.figures.recentFailures],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-baseline justify-between gap-3 border-b border-rule/40 py-1">
                    <dt className="text-ink-3">{label}</dt>
                    <dd className="font-mono tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[11px] text-ink-3">
                <Link href="/" className="underline">Overview</Link> shows the same counts live.
              </p>
            </section>
          )}
        </article>
      )}
    </div>
  );
}
