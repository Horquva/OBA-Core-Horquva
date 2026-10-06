'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { SourcesList, SourceFactItem } from '@/components/ui/SourcesList';
import { useResource } from '@/lib/useResource';
import { fetchBriefing, fetchCoverage } from '@/lib/api/overview';
import { useToast } from '@/components/ui/Toast';

export interface BriefingViewProps {
  initialBriefing?: string | null;
}

export function BriefingView({ initialBriefing }: BriefingViewProps) {
  const { toast } = useToast();
  const briefingResource = useResource<string>(
    'weekly-briefing',
    fetchBriefing,
  );
  const coverageResource = useResource('briefing-coverage', fetchCoverage);

  const rawBriefing =
    briefingResource.status === 'ready' ? briefingResource.data : initialBriefing;

  const handleCopy = React.useCallback(() => {
    if (!rawBriefing) return;
    navigator.clipboard.writeText(rawBriefing);
    toast({
      title: 'Briefing copied',
      description: 'The weekly executive briefing text was copied to your clipboard.',
    });
  }, [rawBriefing, toast]);

  // Transform coverage into verified SCD2 sources
  const sources: SourceFactItem[] = React.useMemo(() => {
    if (coverageResource.status !== 'ready') return [];
    const cov = coverageResource.data;
    return [
      {
        id: 'fact-total-assets',
        entityName: 'Operational Posture',
        attribute: 'Total Critical Automations',
        value: `${cov.total} assets tracked`,
        grade: 'confirmed',
        source: 'n8n & Directory Connectors (SCD2)',
      },
      {
        id: 'fact-covered-assets',
        entityName: 'Coverage Verification',
        attribute: 'Fully Covered Assets',
        value: `${cov.covered} assets with confirmed backup & runbook`,
        grade: 'confirmed',
        source: 'SIM-07 Coverage Invariant Engine',
      },
      {
        id: 'fact-exposed-assets',
        entityName: 'Discontinuity Exposure',
        attribute: 'Exposed Single Points of Failure',
        value: `${cov.exposed} assets without confirmed human backup`,
        grade: 'stated',
        source: 'ContinuityGraph Dependency Walks',
      },
      {
        id: 'fact-unknown-facts',
        entityName: 'Attestation Status',
        attribute: 'Pending Attestation Facts',
        value: `${cov.unknown ?? 0} unverified ownership facts`,
        grade: 'unknown',
        source: 'Access-Review Confirmation Campaigns',
      },
    ];
  }, [coverageResource]);

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

          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-ink leading-tight tracking-tight">
            Continuity Executive Briefing
          </h1>

          <p className="text-sm text-ink-3">
            Generated Monday 8:00 AM · Grounded in counted enterprise data & verified SCD2 history.
          </p>
        </div>

        {/* AI Transparency Banner */}
        <div className="rounded-control border border-amber/40 bg-amber/10 p-3.5 flex items-start gap-3">
          <span className="text-amber-ink text-base select-none" aria-hidden="true">✦</span>
          <div className="text-xs space-y-0.5 text-ink-2">
            <p className="font-semibold text-ink">
              Written by AI from counted deterministic facts
            </p>
            <p className="text-ink-3 leading-relaxed">
              Every figure and attribution below is synthesized strictly from verified entity states in the continuity graph. Zero subjective risk scores or hallucinated probabilities.
            </p>
          </div>
        </div>
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
          title="No briefing available yet"
          description="Weekly briefings compile every Monday at 8:00 AM after enterprise connectors complete their synchronizations."
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
                      className="font-serif text-2xl sm:text-3xl text-ink font-normal tracking-tight pt-4 first:pt-0 pb-1 border-b border-rule/40"
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
                        <li key={lIdx} className="font-serif text-lg leading-relaxed text-ink/90">
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
                    className="font-serif text-xl sm:text-2xl text-ink leading-relaxed font-normal tracking-normal selection:bg-amber/20"
                  >
                    {trimmed}
                  </p>
                );
              })}
            </div>
          </Card>

          {/* Cited SCD2 Fact Sources */}
          {sources.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                  Grounding & Citation Ledger
                </h3>
                <span className="text-xs text-ink-3">
                  {sources.length} immutable fact references
                </span>
              </div>
              <SourcesList sources={sources} defaultExpanded={true} />
            </div>
          )}
        </article>
      )}
    </div>
  );
}
