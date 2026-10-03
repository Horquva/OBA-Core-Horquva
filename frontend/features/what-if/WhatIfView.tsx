'use client';

import * as React from 'react';
import Link from 'next/link';
import type {
  EntityRef,
  ScenarioResult,
  ScenarioSelection,
  WorstLosses,
} from '@/types/view';
import {
  SentenceBuilder,
  type SentenceBuilderState,
} from '@/components/ui/SentenceBuilder';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CriticalityDots,
  EvidenceBadge,
  CheckStatusBadge,
  NoneValue,
  UnknownValue,
} from '@/components/ui/marks';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { runScenario, fetchWorstLosses } from '@/lib/api/simulations';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface WhatIfViewProps {
  initialWorstLosses?: WorstLosses;
  initialResult?: ScenarioResult;
  initialSentence?: SentenceBuilderState;
}

export function WhatIfView({
  initialWorstLosses,
  initialResult,
  initialSentence,
}: WhatIfViewProps) {
  const [sentence, setSentence] = React.useState<SentenceBuilderState>(
    initialSentence || {
      persons: [{ id: 'p-1', kind: 'person', name: 'Sarah Connor' }],
      entities: [{ id: 'v-openai', kind: 'vendor', name: 'OpenAI Enterprise API' }],
    },
  );

  const [isRunning, setIsRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScenarioResult | null>(initialResult || null);

  // Fetch Worst Losses (S6)
  const worstLossesResource = useResource<WorstLosses>(
    'simulations-worst-losses',
    fetchWorstLosses,
  );

  const worstLosses =
    worstLossesResource.status === 'ready'
      ? worstLossesResource.data
      : initialWorstLosses;

  // Execute simulation
  const handleSimulate = async (state: SentenceBuilderState) => {
    setIsRunning(true);
    setError(null);
    try {
      const sel: ScenarioSelection = {
        people: state.persons,
        unavailable: state.entities.filter((e) => e.kind === 'vendor' || e.kind === 'model'),
        failing: state.entities.filter((e) => (e.kind as string) === 'automation' || (e.kind as string) === 'workflow' || e.kind === 'credential'),

      };
      const res = await runScenario(sel);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to simulate scenario.');
    } finally {
      setIsRunning(false);
    }
  };

  // Run initial simulation on mount if default values exist and no initial result
  React.useEffect(() => {
    if (!initialResult && (sentence.persons.length > 0 || sentence.entities.length > 0)) {
      handleSimulate(sentence);
    }
  }, []);

  return (
    <div className="space-y-10 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-rule/50 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
            Scenario Modeling
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink font-normal tracking-tight">
          What-If Continuity Simulator
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Model leavers, service outages, and combined multi-point disaster scenarios with graph-backed impact analysis.
        </p>
      </div>

      {/* Sentence Builder */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
          Scenario Definition
        </h2>
        <SentenceBuilder
          value={sentence}
          onChange={setSentence}
          onSimulate={handleSimulate}
          isLoading={isRunning}
        />
      </div>

      {/* Simulation Results Section */}
      {error && (
        <div className="p-4 rounded-card border border-st-fail/30 bg-st-fail/10 text-xs text-st-fail">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Simulated Blast Radius & Impact
            </h2>
            <span className="font-mono text-xs text-ink-3">
              {result.unknownFactsEncountered > 0 && (
                <span className="text-ev-unknown font-semibold">
                  {result.unknownFactsEncountered} unknown facts encountered
                </span>
              )}
            </span>
          </div>

          {/* Results Metric Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-surface shadow-xs">
              <span className="text-xs text-ink-3 font-mono block">Orphaned Critical</span>
              <span className="font-serif text-3xl text-st-fail mt-1 block tabular-nums">
                {result.orphanedCriticalAssets.length}
              </span>
              <span className="text-[11px] text-ink-3 mt-1 block">Critical assets without backup</span>
            </Card>

            <Card className="p-5 bg-surface shadow-xs">
              <span className="text-xs text-ink-3 font-mono block">Halted Automations</span>
              <span className="font-serif text-3xl text-amber-ink mt-1 block tabular-nums">
                {result.stoppedAutomations.length}
              </span>
              <span className="text-[11px] text-ink-3 mt-1 block">Workflows directly stopped</span>
            </Card>

            <Card className="p-5 bg-surface shadow-xs">
              <span className="text-xs text-ink-3 font-mono block">Runs / Wk Affected</span>
              <span className="font-serif text-3xl text-ink mt-1 block tabular-nums">
                {formatNumber(result.runsPerWeekAffected)}
              </span>
              <span className="text-[11px] text-ink-3 mt-1 block">Weekly executions disrupted</span>
            </Card>

            <Card className="p-5 bg-surface shadow-xs">
              <span className="text-xs text-ink-3 font-mono block">Downstream Dependents</span>
              <span className="font-serif text-3xl text-ink mt-1 block tabular-nums">
                {result.downstream.length}
              </span>
              <span className="text-[11px] text-ink-3 mt-1 block">Connected cascading assets</span>
            </Card>
          </div>

          {/* Detailed Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Orphaned Critical Assets Table */}
            <Card className="p-6 bg-surface shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-rule/50 pb-3">
                <h3 className="text-sm font-semibold text-ink">
                  Orphaned Critical Assets ({result.orphanedCriticalAssets.length})
                </h3>
                <span className="text-[11px] font-mono text-ink-3 uppercase">Exposed</span>
              </div>

              {result.orphanedCriticalAssets.length === 0 ? (
                <p className="text-xs text-ink-3 italic">
                  No critical assets orphaned under this scenario. All have secondary backups.
                </p>
              ) : (
                <div className="divide-y divide-rule text-xs">
                  {result.orphanedCriticalAssets.map((item) => (
                    <div key={item.asset.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <Link
                          href={`/assets/${item.asset.id}`}
                          className="font-medium text-ink hover:text-amber-ink transition-colors"
                        >
                          {item.asset.name}
                        </Link>
                        {item.priorOwner && (
                          <p className="text-[11px] text-ink-3 font-mono">
                            Prior owner: {item.priorOwner.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CriticalityDots level={item.criticality} />
                        <NoneValue />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Stopped Automations Table */}
            <Card className="p-6 bg-surface shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-rule/50 pb-3">
                <h3 className="text-sm font-semibold text-ink">
                  Directly Stopped Automations ({result.stoppedAutomations.length})
                </h3>
                <span className="text-[11px] font-mono text-ink-3 uppercase">Halted</span>
              </div>

              {result.stoppedAutomations.length === 0 ? (
                <p className="text-xs text-ink-3 italic">
                  No automated workflows are halted by personal credential revocations or vendor outages.
                </p>
              ) : (
                <div className="divide-y divide-rule text-xs">
                  {result.stoppedAutomations.map((item) => (
                    <div key={item.workflow.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <Link
                          href={`/assets/${item.workflow.id}`}
                          className="font-medium text-ink hover:text-amber-ink transition-colors"
                        >
                          {item.workflow.name}
                        </Link>
                        {item.credentialOwner && (
                          <p className="text-[11px] text-amber-ink font-mono">
                            Credential owner: {item.credentialOwner.name}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-ink-2 font-semibold">
                        {formatNumber(item.weeklyRuns)} runs/wk
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* S6: Worst Losses Section (Strict Fairness: Ranked Vendors & Models ONLY; People Aggregate Count) */}
      <div className="space-y-4 pt-6 border-t border-rule/50">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Worst Single Points of Failure
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Ranked external service exposures and aggregated key-person concentration risks.
          </p>
        </div>

        {worstLossesResource.status === 'loading' && !worstLosses ? (
          <Skeleton variant="card" className="h-44" />
        ) : worstLossesResource.status === 'error' && !worstLosses ? (
          <ErrorState
            onRetry={worstLossesResource.reload}
            message="Could not load Worst Losses analysis."
          />
        ) : !worstLosses ? null : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Ranked Vendors & Models (2 Columns) */}
            <Card className="lg:col-span-2 p-6 bg-surface shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-rule/50 pb-3">
                <h3 className="text-sm font-semibold text-ink">
                  Top External Vendor & Model Exposures
                </h3>
                <span className="text-[11px] font-mono text-ink-3">Ranked by Volume Impact</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-ink" aria-label="Worst vendor losses table">
                  <thead className="border-b border-rule font-mono text-[11px] uppercase text-ink-3">
                    <tr>
                      <th scope="col" className="pb-2">Provider / Model</th>
                      <th scope="col" className="pb-2">Kind</th>
                      <th scope="col" className="pb-2 text-right">Workflows Halted</th>
                      <th scope="col" className="pb-2 text-right">Runs / Wk Affected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-sans">
                    {worstLosses.vendorsAndModels.map((item, index) => (
                      <tr key={item.entity.id} className="hover:bg-surface-sunken/20">
                        <td className="py-2.5 font-medium">
                          <span className="font-mono text-ink-3 mr-2">{index + 1}.</span>
                          <span className="text-ink">{item.entity.name}</span>
                        </td>
                        <td className="py-2.5">
                          <span className="px-1.5 py-0.2 rounded-badge bg-surface-sunken text-[10px] font-mono capitalize text-ink-3">
                            {item.entity.kind}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-ink tabular-nums">
                          {item.automationsHalted}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-amber-ink tabular-nums">
                          {formatNumber(item.runsPerWeekAffected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* People Concentration Aggregate Callout (Zero Individual Ranking Invariant) */}
            <Card className="p-6 bg-surface-sunken/40 border border-rule space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
                  Human Concentration Floor
                </h3>
                <p className="font-serif text-2xl text-ink leading-tight">
                  <strong className="text-amber-ink font-semibold">
                    {worstLosses.peopleHoldingManyUnbacked} people
                  </strong>{' '}
                  each hold {worstLosses.threshold}+ unbacked critical assets.
                </p>
              </div>

              <div className="rounded-control bg-surface p-3 text-xs text-ink-3 border border-rule/60 space-y-2">
                <p className="font-semibold text-ink">Zero Employee Scoring Guarantee</p>
                <p className="leading-relaxed">
                  To eliminate toxic employee risk scoring and surveillance, individual team members are never ranked by attrition severity.
                </p>
                <Link
                  href="/people"
                  className="text-amber-ink font-medium hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>Review team rosters alphabetically</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
