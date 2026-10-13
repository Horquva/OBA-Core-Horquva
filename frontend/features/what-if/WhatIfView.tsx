'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CircleSlash, Network, PackageX, Play, RefreshCw, ServerCrash, Sparkles, UserMinus, X } from 'lucide-react';
import type { DepartureSummary, EntityRef, ScenarioResult, ScenarioSelection, WorstLosses } from '@/types/view';
import { SentenceBuilder, type SentenceBuilderState } from '@/components/ui/SentenceBuilder';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EntityKindIcon, kindLabel } from '@/components/ui/EntityKindIcon';
import { CriticalityDots, UnknownValue } from '@/components/ui/marks';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { runScenario, fetchWorstLosses } from '@/lib/api/simulations';
import { fetchAllEntities } from '@/lib/api/entities';
import { fetchDepartures } from '@/lib/api/departures';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface WhatIfViewProps {
  initialWorstLosses?: WorstLosses;
  initialResult?: ScenarioResult;
  initialSentence?: SentenceBuilderState;
}

const EMPTY: SentenceBuilderState = { persons: [], entities: [] };
const keyOf = (s: SentenceBuilderState) => [...s.persons.map((p) => p.id), '|', ...s.entities.map((e) => e.id)].join(',');

/** "Sarah Connor", "Sarah Connor and Omar Farooq", "Sarah Connor and 2 others". */
function names(list: EntityRef[]): string {
  if (list.length === 0) return '';
  if (list.length === 1) return list[0].name;
  if (list.length === 2) return `${list[0].name} and ${list[1].name}`;
  return `${list[0].name} and ${list.length - 1} others`;
}

/** Runs per week, honest about missing volumes: "at least 4,600", or "unknown". */
function runsText(known: number, unknownCount: number): string | null {
  if (unknownCount > 0 && known === 0) return null;
  return `${unknownCount > 0 ? 'at least ' : ''}${formatNumber(known)}`;
}

function headline(sel: SentenceBuilderState, r: ScenarioResult): string {
  const who = [
    sel.persons.length ? `${names(sel.persons)} ${sel.persons.length > 1 ? 'leave' : 'leaves'}` : '',
    sel.entities.length ? `${names(sel.entities)} ${sel.entities.length > 1 ? 'go' : 'goes'} down` : '',
  ]
    .filter(Boolean)
    .join(' and ');
  const orphaned = r.orphanedCriticalAssets.length;
  const stopped = r.stoppedAutomations.length;
  if (orphaned === 0 && stopped === 0) return `If ${who}, nothing on record loses its owner or stops.`;
  const parts: string[] = [];
  if (orphaned > 0) parts.push(`${orphaned} critical ${orphaned === 1 ? 'asset loses its' : 'assets lose their'} owner`);
  if (stopped > 0) parts.push(`${stopped} ${stopped === 1 ? 'automation stops' : 'automations stop'}`);
  const runs = runsText(r.runsPerWeekAffected, r.runsUnknownCount);
  const tail = stopped > 0 && runs ? `: ${runs} runs a week` : '';
  return `If ${who}, ${parts.join(' and ')}${tail}.`;
}

function Tile({ label, value, detail, tone }: { label: string; value: React.ReactNode; detail?: React.ReactNode; tone?: 'fail' }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="type-meta text-ink-3">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums', tone === 'fail' ? 'text-st-fail' : 'text-ink')}>{value}</p>
      {detail && <p className="type-meta mt-1 text-ink-3">{detail}</p>}
    </div>
  );
}

function AssetIcon({ kind }: { kind: string }) {
  return (
    <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
      <EntityKindIcon kind={kind} />
    </span>
  );
}

export function WhatIfView({ initialWorstLosses, initialResult, initialSentence }: WhatIfViewProps) {
  const [sentence, setSentence] = React.useState<SentenceBuilderState>(initialSentence || EMPTY);

  const entitiesResource = useResource<EntityRef[]>('what-if-entities', fetchAllEntities);
  const peopleOptions = React.useMemo(() => (entitiesResource.status === 'ready' ? entitiesResource.data.filter((e) => e.kind === 'person') : []), [entitiesResource]);
  const entityOptions = React.useMemo(
    () => (entitiesResource.status === 'ready' ? entitiesResource.data.filter((e) => e.kind !== 'person' && e.kind !== 'group') : []),
    [entitiesResource],
  );
  const departuresResource = useResource<DepartureSummary[]>('departures-list', fetchDepartures);

  const [isRunning, setIsRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScenarioResult | null>(initialResult || null);
  // The scenario the shown result belongs to; if the picks change, the result is stale.
  const [ranFor, setRanFor] = React.useState<SentenceBuilderState | null>(initialResult ? initialSentence || EMPTY : null);
  const stale = !!result && !!ranFor && keyOf(ranFor) !== keyOf(sentence);

  const worstLossesResource = useResource<WorstLosses>('simulations-worst-losses', fetchWorstLosses);
  const worstLosses = worstLossesResource.status === 'ready' ? worstLossesResource.data : initialWorstLosses;

  const resultsRef = React.useRef<HTMLDivElement>(null);

  const simulate = async (state: SentenceBuilderState) => {
    setIsRunning(true);
    setError(null);
    try {
      // Services (vendors, models, apps) go down for everything that uses them;
      // anything else picked fails itself.
      const isService = (e: EntityRef) => e.kind === 'vendor' || e.kind === 'model' || e.kind === 'app';
      const sel: ScenarioSelection = {
        people: state.persons,
        unavailable: state.entities.filter(isService),
        failing: state.entities.filter((e) => !isService(e)),
      };
      const res = await runScenario(sel);
      setResult(res);
      setRanFor(state);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
    } catch (err: any) {
      setError(err?.message || "We couldn't run this scenario.");
    } finally {
      setIsRunning(false);
    }
  };

  const loadAndRun = (state: SentenceBuilderState) => {
    setSentence(state);
    simulate(state);
  };

  const endSimulation = () => {
    setResult(null);
    setRanFor(null);
    setError(null);
    setSentence(EMPTY);
  };

  // Run once on mount only when the page was opened with a scenario already picked.
  React.useEffect(() => {
    if (!initialResult && (sentence.persons.length > 0 || sentence.entities.length > 0)) simulate(sentence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick starts, from real data only.
  const leavers: EntityRef[] =
    departuresResource.status === 'ready'
      ? departuresResource.data.filter((d) => d.stage !== 'verified' && d.group !== 'departed').map((d) => d.person)
      : [];
  const topService = worstLosses?.vendorsAndModels[0]?.entity ?? null;
  const quickStarts = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Try:
      </span>
      {leavers.length > 0 && (
        <button type="button" onClick={() => loadAndRun({ persons: leavers, entities: [] })} className="cursor-pointer font-medium text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink-3">
          Everyone with an open departure leaves ({leavers.length})
        </button>
      )}
      {leavers.length > 0 && topService && <span aria-hidden="true">·</span>}
      {topService && (
        <button type="button" onClick={() => loadAndRun({ persons: [], entities: [topService] })} className="cursor-pointer font-medium text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink-3">
          {topService.name} goes down
        </button>
      )}
      {leavers.length === 0 && !topService && <span>pick someone or something above.</span>}
    </span>
  );

  const runs = result ? runsText(result.runsPerWeekAffected, result.runsUnknownCount) : null;

  return (
    <div className="space-y-6 pb-16">
      <header className="pt-2">
        <h1 className="type-title text-ink">What-if</h1>
        <p className="mt-1 text-sm text-ink-2">See what breaks if people leave or services fail, before it happens.</p>
      </header>

      <div className="space-y-2">
        <SentenceBuilder
          value={sentence}
          onChange={setSentence}
          onSimulate={simulate}
          onClear={endSimulation}
          isLoading={isRunning}
          peopleOptions={peopleOptions}
          entityOptions={entityOptions}
          footerNote={quickStarts}
        />
        {entitiesResource.status === 'error' && <p className="type-meta text-st-fail">We couldn&apos;t load people and services for the pickers.</p>}
      </div>

      {error && (
        <Panel className="p-5">
          <ErrorState onRetry={() => simulate(sentence)} message={error} />
        </Panel>
      )}

      {result ? (
        <div ref={resultsRef} className="scroll-mt-6 space-y-6">
          {/* Headline + end */}
          <Panel aria-labelledby="result-heading">
            <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="type-meta text-ink-3">Simulation result</p>
                <h2 id="result-heading" className="mt-1 text-lg font-semibold leading-snug tracking-tight text-ink">
                  {headline(ranFor || sentence, result)}
                </h2>
                {result.unknownFactsEncountered > 0 && (
                  <p className="type-meta mt-1.5 text-st-unknown">
                    {result.unknownFactsEncountered} {result.unknownFactsEncountered === 1 ? 'fact was' : 'facts were'} unknown, so the real impact may be larger.
                  </p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={endSimulation} leftIcon={<X className="h-3.5 w-3.5" aria-hidden="true" />}>
                End simulation
              </Button>
            </div>

            {stale && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber/40 bg-[color-mix(in_srgb,var(--amber)_8%,transparent)] px-6 py-2.5" role="status">
                <p className="type-meta font-medium text-ink">Scenario changed. These results are for the previous picks.</p>
                <Button variant="primary" size="sm" onClick={() => simulate(sentence)} disabled={isRunning} leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}>
                  Run again
                </Button>
              </div>
            )}

            <div className={cn('grid grid-cols-2 gap-px border-t border-rule bg-rule transition-opacity lg:grid-cols-4', stale && 'opacity-50')}>
              <Tile label="Critical assets without an owner" value={result.orphanedCriticalAssets.length} tone={result.orphanedCriticalAssets.length > 0 ? 'fail' : undefined} />
              <Tile label="Automations that stop" value={result.stoppedAutomations.length} tone={result.stoppedAutomations.length > 0 ? 'fail' : undefined} />
              <Tile
                label="Runs a week affected"
                value={runs === null ? 'Unknown' : runs}
                detail={
                  result.runsUnknownCount > 0
                    ? `${result.runsUnknownCount} affected ${result.runsUnknownCount === 1 ? 'automation has' : 'automations have'} no run volume on record`
                    : undefined
                }
              />
              <Tile label="Also affected downstream" value={result.downstream.length} />
            </div>
          </Panel>

          <div className={cn('space-y-6 transition-opacity', stale && 'opacity-50')}>
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
              <Panel aria-labelledby="orphaned-heading" className="flex flex-col">
                <PanelHeader titleId="orphaned-heading" title="Critical assets left without an owner" icon={<PackageX />} count={result.orphanedCriticalAssets.length} description="Nobody else owns or backs these up." />
                {result.orphanedCriticalAssets.length === 0 ? (
                  <p className="type-meta flex flex-1 items-center px-5 py-6 text-ink-3">No critical asset is left without an owner or backup.</p>
                ) : (
                  <ul className="flex-1 divide-y divide-rule">
                    {result.orphanedCriticalAssets.map((item) => (
                      <li key={item.asset.id} className="flex items-center gap-3 px-5 py-3">
                        <AssetIcon kind={item.asset.kind} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/assets/${item.asset.id}`} className="text-sm font-medium text-ink transition-colors hover:text-amber-ink">
                            {item.asset.name}
                          </Link>
                          <div className="mt-0.5">
                            <CriticalityDots level={item.criticality} />
                          </div>
                        </div>
                        {item.priorOwner && (
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="type-meta hidden text-right text-ink-3 sm:block">
                              Was owned by
                              <span className="block font-medium text-ink-2">{item.priorOwner.name}</span>
                            </span>
                            <Avatar name={item.priorOwner.name} size={28} />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel aria-labelledby="stopped-heading" className="flex flex-col">
                <PanelHeader titleId="stopped-heading" title="Automations that stop" icon={<CircleSlash />} count={result.stoppedAutomations.length} description="They lose a service, a credential or the automation itself." />
                {result.stoppedAutomations.length === 0 ? (
                  <p className="type-meta flex flex-1 items-center px-5 py-6 text-ink-3">Nothing on record stops directly.</p>
                ) : (
                  <ul className="flex-1 divide-y divide-rule">
                    {result.stoppedAutomations.map((item) => (
                      <li key={item.workflow.id} className="flex items-center gap-3 px-5 py-3">
                        <AssetIcon kind={item.workflow.kind} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/assets/${item.workflow.id}`} className="text-sm font-medium text-ink transition-colors hover:text-amber-ink">
                            {item.workflow.name}
                          </Link>
                          {item.credentialOwner && <p className="type-meta mt-0.5 text-amber-ink">Runs on {item.credentialOwner.name}&apos;s credentials</p>}
                        </div>
                        {item.weeklyRuns === null ? (
                          <UnknownValue aria-label="Run volume unknown" />
                        ) : (
                          <span className="type-meta shrink-0 text-right tabular-nums text-ink-2">
                            <span className="font-medium text-ink">{formatNumber(item.weeklyRuns)}</span> / week
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {result.downstream.length > 0 && (
              <Panel aria-labelledby="downstream-heading">
                <PanelHeader titleId="downstream-heading" title="Also affected downstream" icon={<Network />} count={result.downstream.length} description="These depend on something above and would stop with it. Open one on the map." />
                <ul className="grid grid-cols-1 gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3" aria-label="Downstream dependents">
                  {result.downstream.map((d) => (
                    <li key={d.id} className="bg-surface">
                      <Link href={`/map?root=${encodeURIComponent(d.id)}`} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken/50">
                        <AssetIcon kind={d.kind} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{d.name}</span>
                          <span className="block text-[11px] text-ink-3">{kindLabel(d.kind)}</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-ink-3 transition-colors group-hover:text-ink" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  {/* Keep the last row even. */}
                  {Array.from({ length: (3 - (result.downstream.length % 3)) % 3 }).map((_, i) => (
                    <li key={`pad-${i}`} aria-hidden="true" className="hidden bg-surface lg:block" />
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      ) : (
        !isRunning &&
        !error && (
          <Panel className="px-6 py-10 text-center">
            <span aria-hidden="true" className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-rule bg-surface-sunken text-ink-3">
              <Play className="h-4 w-4" />
            </span>
            <p className="type-heading mt-4 text-ink">No simulation running</p>
            <p className="type-meta mx-auto mt-1 max-w-md text-ink-3">
              Pick one or more people, services or automations above and press Run simulation. Or try one of the suggestions, or simulate a service from the list below.
            </p>
          </Panel>
        )
      )}

      {/* Worst single points of failure */}
      <Panel aria-labelledby="worst-heading">
        <PanelHeader
          titleId="worst-heading"
          title="Services that would hurt most if they went down"
          icon={<ServerCrash />}
          count={worstLosses?.vendorsAndModels.length}
          description="Vendors and models, ordered by the automations that would stop."
        />
        {worstLossesResource.status === 'loading' && !worstLosses ? (
          <div className="space-y-2 p-5" aria-label="Loading">
            <span className="skeleton block h-10 w-full" />
            <span className="skeleton block h-10 w-full" />
          </div>
        ) : worstLossesResource.status === 'error' && !worstLosses ? (
          <div className="p-5">
            <ErrorState onRetry={worstLossesResource.reload} message="We couldn't work out the worst losses." />
          </div>
        ) : !worstLosses ? null : (
          <>
            {worstLosses.vendorsAndModels.length === 0 ? (
              <p className="type-meta px-5 py-6 text-ink-3">No vendors or models on record yet.</p>
            ) : (
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Worst losses table">
                <table className="w-full text-left">
                  <thead>
                    <tr className="type-meta border-b border-rule text-ink-3">
                      <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Service</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Automations that stop</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Runs a week</th>
                      <th scope="col" className="w-32 py-2.5 pl-3 pr-5">
                        <span className="sr-only">Simulate</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {worstLosses.vendorsAndModels.map((item) => {
                      const r = runsText(item.runsPerWeekAffected, item.runsUnknownCount);
                      return (
                        <tr key={item.entity.id} className="transition-colors hover:bg-surface-sunken/40">
                          <td className="py-3 pl-5 pr-3">
                            <div className="flex items-center gap-3">
                              <AssetIcon kind={item.entity.kind} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-ink">{item.entity.name}</p>
                                <p className="text-[11px] text-ink-3">{kindLabel(item.entity.kind)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-sm tabular-nums text-ink">{item.automationsHalted}</td>
                          <td className="px-3 py-3 text-right text-sm tabular-nums text-ink-2">{r === null ? <UnknownValue /> : r.replace('at least ', '≥ ')}</td>
                          <td className="py-3 pl-3 pr-5 text-right">
                            <button
                              type="button"
                              onClick={() => loadAndRun({ persons: [], entities: [item.entity] })}
                              aria-label={`Simulate ${item.entity.name} going down`}
                              className="type-meta inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-control border border-rule bg-surface px-2.5 font-medium text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink"
                            >
                              <Play className="h-3 w-3" aria-hidden="true" />
                              Simulate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-col gap-2 border-t border-rule bg-surface-sunken/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="type-meta flex items-center gap-2 text-ink-2">
                <UserMinus className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                <span>
                  <span className="font-medium text-ink">
                    {worstLosses.peopleHoldingManyUnbacked} {worstLosses.peopleHoldingManyUnbacked === 1 ? 'person' : 'people'}
                  </span>{' '}
                  {worstLosses.peopleHoldingManyUnbacked === 1 ? 'holds' : 'each hold'} {worstLosses.threshold}+ critical assets with no backup. People are never ranked.
                </span>
              </p>
              <Link href="/people" className="type-meta inline-flex shrink-0 items-center gap-1 font-medium text-ink-2 hover:text-ink">
                People &amp; Teams <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
