'use client';

import * as React from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import type { AssetRow, FactView } from '@/types/view';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { EntityKindIcon, kindLabel } from '@/components/ui/EntityKindIcon';
import { CriticalityDots, EvidenceDot } from '@/components/ui/marks';
import { ErrorState } from '@/components/ui/states';
import { useResource } from '@/lib/useResource';
import { fetchAssets } from '@/lib/api/assets';
import { cn } from '@/lib/cn';
import { AssetDrawer } from './AssetDrawer';
import { FactValue, StatusPill, upper } from './assetParts';

export interface AssetsViewProps {
  initialAssets?: AssetRow[];
  defaultSelectedAssetId?: string | null;
  /** From the address bar (?status=): covered | exposed | unknown, as the Overview links use them. */
  initialStatus?: string | null;
}

type KindTab = 'all' | 'automation' | 'model' | 'credential' | 'vendor' | 'system';
type StatusFilter = 'all' | 'fail' | 'unknown' | 'pass';

/** Tabs map to backend EntityKind values ('system' covers apps and processes). */
const TAB_KINDS: Record<Exclude<KindTab, 'all'>, string[]> = {
  automation: ['automation'],
  model: ['model'],
  credential: ['credential'],
  vendor: ['vendor'],
  system: ['app', 'process'],
};
const inTab = (kind: string, tab: KindTab) => tab === 'all' || TAB_KINDS[tab].includes(kind);

const TABS: Array<{ id: KindTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'automation', label: 'Automations' },
  { id: 'model', label: 'AI models' },
  { id: 'credential', label: 'Credentials' },
  { id: 'vendor', label: 'Vendors' },
  { id: 'system', label: 'Systems' },
];

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Any status' },
  { id: 'fail', label: 'Failing' },
  { id: 'unknown', label: 'Unknown' },
  { id: 'pass', label: 'Passing' },
];

const hasUnknownFact = (a: AssetRow) =>
  [a.owner, a.backup, a.documented, a.fallback, a.runsPerWeek].some((f) => f.state === 'unknown');

/** Overview links: covered / exposed / unknown are about critical assets. */
function filtersFromStatus(status: string | null | undefined): { critical: boolean; status: StatusFilter } {
  if (status === 'covered') return { critical: true, status: 'pass' };
  if (status === 'exposed') return { critical: true, status: 'fail' };
  if (status === 'unknown') return { critical: true, status: 'unknown' };
  return { critical: false, status: 'all' };
}

function Chip({ active, onClick, children, ...rest }: { active: boolean; onClick: () => void; children: React.ReactNode } & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'type-meta inline-flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium transition-colors',
        active ? 'bg-surface-sunken text-ink' : 'text-ink-3 hover:text-ink',
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function PersonFact({ fact }: { fact: FactView }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {fact.state === 'value' && fact.display ? <Avatar name={fact.display} size={28} /> : null}
      <span className="type-meta min-w-0 truncate">
        <FactValue fact={fact} className="font-normal text-ink" />
      </span>
      <EvidenceDot grade={fact.grade} source={fact.source} />
    </span>
  );
}

export function AssetsView({ initialAssets, defaultSelectedAssetId = null, initialStatus = null }: AssetsViewProps) {
  const assetsResource = useResource<AssetRow[]>('assets-catalog-list', fetchAssets);
  const assets = assetsResource.status === 'ready' ? assetsResource.data : initialAssets || [];

  const fromUrl = filtersFromStatus(initialStatus);
  const [tab, setTab] = React.useState<KindTab>('all');
  const [query, setQuery] = React.useState('');
  const [criticalOnly, setCriticalOnly] = React.useState(fromUrl.critical);
  const [status, setStatus] = React.useState<StatusFilter>(fromUrl.status);
  const [unknownOnly, setUnknownOnly] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(defaultSelectedAssetId);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (!inTab(a.kind, tab)) return false;
      if (q) {
        const hay = [a.name, a.owner.display, a.backup.display, a.id].map((s) => (s ?? '').toLowerCase());
        if (!hay.some((s) => s.includes(q))) return false;
      }
      if (criticalOnly && !a.isCritical) return false;
      if (status !== 'all' && upper(a.checkStatus) !== ({ fail: 'FAIL', unknown: 'UNKNOWN', pass: 'PASS' } as const)[status]) return false;
      if (unknownOnly && !hasUnknownFact(a)) return false;
      return true;
    });
  }, [assets, tab, query, criticalOnly, status, unknownOnly]);

  // Fixed order: failing critical, unknown critical, covered critical, then the rest; by name within each.
  const sorted = React.useMemo(() => {
    const rank = (a: AssetRow) => {
      if (!a.isCritical) return 4;
      const s = upper(a.checkStatus);
      return s === 'FAIL' ? 1 : s === 'UNKNOWN' ? 2 : 3;
    };
    return [...filtered].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [filtered]);

  const isFiltered = tab !== 'all' || query.trim() !== '' || criticalOnly || status !== 'all' || unknownOnly;
  const clearFilters = () => {
    setTab('all');
    setQuery('');
    setCriticalOnly(false);
    setStatus('all');
    setUnknownOnly(false);
  };

  const loading = assetsResource.status === 'loading' && !initialAssets;
  const failed = assetsResource.status === 'error' && !initialAssets;

  return (
    <div className="space-y-6 pb-16">
      <header className="pt-2">
        <h1 className="type-title text-ink">Assets</h1>
        <p className="mt-1 text-sm text-ink-2">Every automation, AI model, credential, vendor and system, with who owns it and who backs it up.</p>
      </header>

      <Panel aria-labelledby="assets-table-heading">
        <h2 id="assets-table-heading" className="sr-only">
          Asset list
        </h2>

        {/* Kind tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-rule px-3" role="group" aria-label="Asset type">
          {TABS.map((t) => {
            const count = t.id === 'all' ? assets.length : assets.filter((a) => inTab(a.kind, t.id)).length;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  'type-meta -mb-px inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 font-medium transition-colors',
                  active ? 'border-amber text-ink' : 'border-transparent text-ink-3 hover:text-ink',
                )}
              >
                {t.label}
                <span className="tabular-nums text-ink-3">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-rule px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block w-full sm:w-72">
              <span className="sr-only">Search assets</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by asset, owner or backup"
                className="type-meta h-8 w-full rounded-control border border-rule bg-surface pl-8 pr-2.5 text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-1">
              <Chip active={criticalOnly} onClick={() => setCriticalOnly((v) => !v)} aria-pressed={criticalOnly}>
                Critical only
              </Chip>
              <span className="mx-1 h-4 w-px bg-rule" aria-hidden="true" />
              {STATUS_FILTERS.map((f) => (
                <Chip key={f.id} active={status === f.id} onClick={() => setStatus(f.id)} aria-pressed={status === f.id}>
                  {f.label}
                </Chip>
              ))}
              <span className="mx-1 h-4 w-px bg-rule" aria-hidden="true" />
              <Chip active={unknownOnly} onClick={() => setUnknownOnly((v) => !v)} aria-pressed={unknownOnly}>
                Has unknown facts
              </Chip>
            </div>
          </div>
          <p className="type-meta shrink-0 text-ink-3" aria-live="polite">
            Showing <span className="font-medium tabular-nums text-ink">{sorted.length}</span> of <span className="tabular-nums">{assets.length}</span>
            {isFiltered && (
              <button type="button" onClick={clearFilters} className="ml-2 inline-flex cursor-pointer items-center gap-1 font-medium text-ink-2 hover:text-ink">
                <X className="h-3 w-3" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </p>
        </div>

        {loading ? (
          <div className="space-y-2 p-5" aria-label="Loading assets">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="skeleton block h-11 w-full" />
            ))}
          </div>
        ) : failed ? (
          <div className="p-5">
            <ErrorState onRetry={assetsResource.reload} message="We couldn't load assets." />
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="type-heading text-ink">{assets.length === 0 ? 'No assets yet' : 'No assets match these filters'}</p>
            <p className="type-meta mt-1 text-ink-3">
              {assets.length === 0 ? 'Connect a source in Settings and its assets appear here.' : 'Try a different search or clear the filters.'}
            </p>
            {isFiltered && (
              <button type="button" onClick={clearFilters} className="type-meta mt-4 cursor-pointer font-medium text-ink-2 hover:text-ink">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto lg:overflow-x-visible" tabIndex={0} role="region" aria-label="Assets table">
            <table className="w-full text-left">
              <thead>
                <tr className="type-meta text-ink-3">
                  {[
                    ['Asset', 'pl-5 pr-3'],
                    ['Criticality', 'px-3'],
                    ['Status', 'px-3'],
                    ['Owner', 'px-3'],
                    ['Backup', 'px-3'],
                    ['Runs / week', 'px-3 text-right'],
                  ].map(([label, cls]) => (
                    <th key={label} scope="col" className={cn('sticky top-0 z-[1] border-b border-rule bg-surface py-2.5 font-medium', cls)}>
                      {label}
                    </th>
                  ))}
                  <th scope="col" className="sticky top-0 z-[1] w-10 border-b border-rule bg-surface py-2.5 pr-4">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {sorted.map((a) => {
                  const s = upper(a.checkStatus);
                  const alert = a.isCritical && s === 'FAIL';
                  const open = () => setSelectedId(a.id);
                  return (
                    <tr
                      key={a.id}
                      onClick={open}
                      tabIndex={0}
                      role="button"
                      aria-label={`Inspect ${a.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          open();
                        }
                      }}
                      className={cn(
                        'group cursor-pointer transition-colors hover:bg-surface-sunken/50 focus-visible:bg-surface-sunken/60 focus-visible:outline-none',
                        selectedId === a.id && 'bg-surface-sunken/60',
                      )}
                    >
                      <td className={cn('py-3 pl-5 pr-3', alert && 'shadow-[inset_3px_0_0_var(--st-fail)]')}>
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
                            <EntityKindIcon kind={a.kind} />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate text-sm font-medium text-ink">{a.name}</p>
                            <p className="text-[11px] text-ink-3">{kindLabel(a.kind)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <CriticalityDots level={a.criticality.level} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={s} />
                      </td>
                      <td className="max-w-[180px] px-3 py-3">
                        <PersonFact fact={a.owner} />
                      </td>
                      <td className="max-w-[180px] px-3 py-3">
                        <PersonFact fact={a.backup} />
                      </td>
                      <td className="type-meta px-3 py-3 text-right tabular-nums text-ink-2">
                        <FactValue fact={a.runsPerWeek} className="font-normal text-ink-2" />
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AssetDrawer assetId={selectedId} isOpen={!!selectedId} onClose={() => setSelectedId(null)} onSelectDependency={setSelectedId} />
    </div>
  );
}
