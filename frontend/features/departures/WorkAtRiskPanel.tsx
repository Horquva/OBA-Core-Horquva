'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { EntityKindIcon } from '@/components/ui/EntityKindIcon';
import { CriticalityDots } from '@/components/ui/marks';
import { ErrorState } from '@/components/ui/states';
import { formatDate, formatNumber, formatRelative } from '@/lib/format';
import type { WorkAtRisk } from '@/types/view';

const COLLAPSED_ROWS = 6;

export interface WorkAtRiskPanelProps {
  /** undefined = loading, null = failed to load. */
  data?: WorkAtRisk | null;
  onRetry?: () => void;
  className?: string;
}

function headline({ totals }: WorkAtRisk): string {
  const assets = `${totals.assets} critical ${totals.assets === 1 ? 'asset' : 'assets'}`;
  const runs = totals.runsPerWeek > 0 ? ` and ${formatNumber(totals.runsPerWeek)} automation runs a week` : '';
  const people = `${totals.people} ${totals.people === 1 ? 'person' : 'people'} leaving`;
  return `${assets}${runs} depend on ${people}.`;
}

/**
 * Across every open departure: the critical work still without an accepted successor, and
 * anything running on a leaver's own credentials. Counted, never estimated.
 */
export function WorkAtRiskPanel({ data, onRetry, className }: WorkAtRiskPanelProps) {
  const [expanded, setExpanded] = React.useState(false);
  const rows = data ? (expanded ? data.assets : data.assets.slice(0, COLLAPSED_ROWS)) : [];

  return (
    <Panel className={className} aria-labelledby="at-risk-heading">
      <PanelHeader
        titleId="at-risk-heading"
        title="Work at risk"
        icon={<ShieldAlert />}
        count={data?.totals.assets}
        description="Critical work that departing people leave without an accepted successor."
      />

      {data === null && (
        <div className="p-5">
          <ErrorState onRetry={onRetry} message="We couldn't work out what's at risk." />
        </div>
      )}

      {data === undefined && (
        <div className="space-y-3 px-5 py-4">
          <span className="skeleton block h-5 w-2/3" />
          <span className="skeleton block h-10 w-full" />
          <span className="skeleton block h-10 w-full" />
        </div>
      )}

      {data && data.assets.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="type-heading text-ink">Nothing at risk</p>
          <p className="type-meta mt-1 text-ink-3">Every critical asset of a departing person has an accepted successor.</p>
        </div>
      )}

      {data && data.assets.length > 0 && (
        <>
          <div className="border-b border-rule px-5 py-3.5">
            <p className="text-[15px] font-medium text-ink">{headline(data)}</p>
            <p className="type-meta mt-0.5 text-ink-3">
              {data.totals.personalCredential > 0 &&
                `${data.totals.personalCredential} of these ${data.totals.personalCredential === 1 ? 'runs' : 'run'} on a leaver's own credentials and will stop when the account is disabled. `}
              {data.totals.unknownRuns > 0 && `${data.totals.unknownRuns} with no recorded run count.`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="type-meta border-b border-rule text-ink-3">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Asset</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Owner leaving</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Why it&apos;s at risk</th>
                  <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-medium">Runs per week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((a) => (
                  <tr key={`${a.departureId}-${a.asset.id}`} className="group relative transition-colors hover:bg-surface-sunken/50">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
                          <EntityKindIcon kind={a.asset.kind} />
                        </span>
                        <div className="min-w-0">
                          {/* The asset name opens the departure; the link covers the row. */}
                          <Link href={`/departures/${a.departureId}`} className="text-sm font-medium text-ink after:absolute after:inset-0 after:content-['']">
                            {a.asset.name}
                          </Link>
                          {a.criticality && (
                            <div className="mt-1">
                              <CriticalityDots level={a.criticality} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.owner.name} size={28} />
                        <div className="min-w-0">
                          <p className="type-meta truncate font-medium text-ink">{a.owner.name}</p>
                          <p className="text-[11px] text-ink-3" title={formatDate(a.leaveDate)}>
                            Leaves {formatRelative(a.leaveDate)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {a.noSuccessor && (
                          <span className="inline-flex h-6 items-center rounded-full bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] px-2.5 text-xs font-medium text-st-fail">
                            {a.successor ? (a.acceptance === 'declined' ? 'Successor declined' : 'Not accepted yet') : 'No successor'}
                          </span>
                        )}
                        {a.personalCredential && (
                          <span className="inline-flex h-6 items-center rounded-full bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] px-2.5 text-xs font-medium text-amber-ink">
                            Their credentials
                          </span>
                        )}
                      </div>
                      {a.successor && a.noSuccessor && <p className="mt-1 text-[11px] text-ink-3">Named: {a.successor.name}</p>}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      {a.runsPerWeek === null ? (
                        <span className="type-meta text-ink-3">Unknown</span>
                      ) : (
                        <span className="text-sm font-medium text-ink tabular-nums">{formatNumber(a.runsPerWeek)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.assets.length > COLLAPSED_ROWS && (
            <div className="border-t border-rule px-5 py-2.5 text-center">
              <button type="button" onClick={() => setExpanded((v) => !v)} className="type-meta cursor-pointer font-medium text-ink-2 hover:text-ink">
                {expanded ? 'Show fewer' : `Show all ${data.assets.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
