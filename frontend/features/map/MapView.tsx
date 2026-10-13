'use client';

import * as React from 'react';
import Link from 'next/link';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, MarkerType, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { ArrowRight, Crosshair, X } from 'lucide-react';
import type { AssetRow, BlastRadius, EntityRef, EvidenceGrade, GraphEdgeView, GraphNodeView, Neighbourhood } from '@/types/view';
import { nodeKindLabel, nodeTypes, type CustomMapNode } from './nodes';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { EntityKindIcon } from '@/components/ui/EntityKindIcon';
import { EvidenceBadge } from '@/components/ui/marks';
import { ErrorState } from '@/components/ui/states';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { useResource } from '@/lib/useResource';
import { fetchNeighbourhood, fetchBlastRadius } from '@/lib/api/graph';
import { fetchAllEntities } from '@/lib/api/entities';
import { fetchAssets } from '@/lib/api/assets';
import { cn } from '@/lib/cn';

export interface MapViewProps {
  /** From `/map?root=<entity id>`; with none, the page asks which entity to centre on. */
  initialRootId?: string;
  initialNeighbourhood?: Neighbourhood;
  initialBlastRadius?: BlastRadius;
}

const RELATION_LABEL: Record<string, string> = {
  owns: 'owns',
  backs_up: 'backs up',
  depends_on: 'depends on',
  calls_model: 'calls the model',
  runs_on_credentials_of: 'runs on the credentials of',
  member_of: 'is a member of',
};
export const relationLabel = (type: string) => RELATION_LABEL[type] ?? type.replace(/_/g, ' ');

/** Evidence is shown by line style, in one neutral colour (theme tokens, so dark mode works). */
const LINE_STYLE: Record<EvidenceGrade, React.CSSProperties> = {
  confirmed: { strokeWidth: 1.75, opacity: 1 },
  stated: { strokeWidth: 1.25, opacity: 0.7 },
  inferred: { strokeWidth: 1.25, strokeDasharray: '6 4', opacity: 0.85 },
  unknown: { strokeWidth: 1.5, strokeDasharray: '1.5 4', strokeLinecap: 'round', opacity: 0.85 },
};

const pageHref = (n: { id: string; kind: string }) =>
  n.kind === 'person' ? `/people/${n.id}` : n.kind === 'group' ? `/people/teams/${n.id}` : `/assets/${n.id}`;

const plural = (n: number, word: string) => `${n} ${word.toLowerCase()}${n === 1 ? '' : 's'}`;

function layoutGraph(
  nodes: GraphNodeView[],
  edges: GraphEdgeView[],
  rootId: string,
  blast: BlastRadius | null,
  showBlast: boolean,
  selectedId: string | null,
  hoveredEdge: string | null,
  onSelect: (id: string) => void,
  onCentre: (id: string) => void,
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 90 });
  nodes.forEach((n) => g.setNode(n.id, { width: 220, height: 60 }));
  edges.forEach((e) => g.setEdge(e.from, e.to));
  dagre.layout(g);

  const downstream = new Set((blast?.downstream || []).map((d) => d.id));
  const flowNodes: CustomMapNode[] = nodes.map((n) => {
    const pos = g.node(n.id) || { x: 0, y: 0 };
    const isRoot = n.id === rootId;
    return {
      id: n.id,
      type: n.kind,
      position: { x: pos.x - 110, y: pos.y - 30 },
      data: {
        id: n.id,
        name: n.name,
        kind: n.kind,
        ring: n.ring,
        isRoot,
        isSelected: n.id === selectedId,
        isBlastRadius: showBlast && downstream.has(n.id),
        isDimmed: showBlast && !isRoot && !downstream.has(n.id),
        onSelect,
        onCentre,
      },
    };
  });

  const flowEdges: Edge[] = edges.map((e) => {
    const inBlast = (e.from === rootId || downstream.has(e.from)) && downstream.has(e.to);
    const dimmed = showBlast && !inBlast;
    const hovered = hoveredEdge === e.id;
    return {
      id: e.id,
      source: e.from,
      target: e.to,
      interactionWidth: 16,
      label: hovered ? relationLabel(e.type) : undefined,
      labelStyle: { fill: 'var(--ink-2)', fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: 'var(--surface)' },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        stroke: showBlast && inBlast ? 'var(--amber-ink)' : hovered ? 'var(--ink)' : 'var(--ink-3)',
        ...LINE_STYLE[e.grade],
        ...(dimmed ? { opacity: 0.12 } : {}),
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    };
  });

  return { nodes: flowNodes, edges: flowEdges };
}

function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex h-10 items-center rounded-control border border-rule bg-surface p-1">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'type-meta h-full cursor-pointer whitespace-nowrap rounded-[6px] px-3 font-medium transition-colors',
            value === o.id ? 'bg-surface-sunken text-ink' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  const line = (dash?: string, opacity = 1, width = 1.75) => (
    <svg width="22" height="6" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="3" x2="21" y2="3" style={{ stroke: 'var(--ink-3)', strokeWidth: width, strokeDasharray: dash, opacity, strokeLinecap: 'round' }} />
    </svg>
  );
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-10 hidden rounded-panel border border-rule bg-surface/95 px-3.5 py-3 shadow-panel backdrop-blur-sm sm:block">
      <p className="text-[11px] font-medium text-ink">Legend</p>
      <ul className="mt-2 space-y-1.5 text-[11px] text-ink-2">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-st-fail" /> Failing a check
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-4 rounded-[3px] border border-dashed border-ink-3" /> Has unknown facts
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-4 rounded-[3px] outline outline-2 outline-amber" /> Centred here
        </li>
      </ul>
      <ul className="mt-2.5 space-y-1.5 border-t border-rule pt-2.5 text-[11px] text-ink-2">
        <li className="flex items-center gap-2">{line()} Confirmed</li>
        <li className="flex items-center gap-2">{line(undefined, 0.7, 1.25)} Stated</li>
        <li className="flex items-center gap-2">{line('6 4', 0.85, 1.25)} Inferred</li>
        <li className="flex items-center gap-2">{line('1.5 4', 0.85, 1.5)} Unknown</li>
      </ul>
    </div>
  );
}

/** A list of entities that re-centres the map when one is chosen. */
function EntityList({ items, empty, onCentre, label }: { items: EntityRef[]; empty: string; onCentre: (id: string) => void; label: string }) {
  if (items.length === 0) return <p className="type-meta px-5 py-5 text-ink-3">{empty}</p>;
  return (
    <ul className="divide-y divide-rule" aria-label={label}>
      {items.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => onCentre(r.id)} className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-surface-sunken/50">
            {r.kind === 'person' ? (
              <Avatar name={r.name} size={28} />
            ) : (
              <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
                <EntityKindIcon kind={r.kind} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{r.name}</span>
              <span className="block text-[11px] text-ink-3">{nodeKindLabel(r.kind)}</span>
            </span>
            <Crosshair className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MapView({ initialRootId, initialNeighbourhood, initialBlastRadius }: MapViewProps) {
  const [rootId, setRootIdState] = React.useState<string | null>(initialRootId ?? null);
  const [hops, setHops] = React.useState<1 | 2>(2);
  const [viewMode, setViewMode] = React.useState<'canvas' | 'list'>('canvas');
  const [showBlast, setShowBlast] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = React.useState<string | null>(null);

  // Keep the URL shareable (/map?root=...) without a navigation.
  const setRootId = React.useCallback((id: string) => {
    setRootIdState(id);
    setSelectedId(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('root', id);
      window.history.replaceState(null, '', url);
    } catch {
      /* non-browser environment */
    }
  }, []);

  const entitiesResource = useResource<EntityRef[]>('graph-entities', fetchAllEntities);
  const entityOptions = React.useMemo(() => (entitiesResource.status === 'ready' ? entitiesResource.data : []), [entitiesResource]);
  const assetsResource = useResource<AssetRow[]>(rootId ? null : 'assets-catalog-list', fetchAssets);

  const neighbourhoodResource = useResource<Neighbourhood>(rootId ? `graph-neighbourhood-${rootId}-${hops}` : null, () => fetchNeighbourhood(rootId!, hops));
  const blastResource = useResource<BlastRadius>(rootId ? `graph-blast-radius-${rootId}` : null, () => fetchBlastRadius(rootId!));

  // Initial data only stands in for the root it was loaded for.
  const hood =
    neighbourhoodResource.status === 'ready' ? neighbourhoodResource.data : initialNeighbourhood?.rootId === rootId ? initialNeighbourhood : undefined;
  const blast = blastResource.status === 'ready' ? blastResource.data : initialBlastRadius?.rootId === rootId ? initialBlastRadius : undefined;

  React.useEffect(() => {
    if (!showBlast) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowBlast(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showBlast]);

  const [nodes, setNodes, onNodesChange] = useNodesState<CustomMapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  React.useEffect(() => {
    if (!hood || !rootId) return;
    const laid = layoutGraph(hood.nodes, hood.edges, rootId, blast || null, showBlast, selectedId, hoveredEdge, setSelectedId, setRootId);
    setNodes(laid.nodes);
    setEdges(laid.edges);
  }, [hood, blast, rootId, showBlast, selectedId, hoveredEdge, setNodes, setEdges, setRootId]);

  const byId = React.useMemo(() => new Map((hood?.nodes ?? []).map((n) => [n.id, n])), [hood]);
  const rootNode = rootId ? byId.get(rootId) ?? null : null;
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  // "If X fails, N things stop: 3 automations, 2 apps."
  const blastSentence = React.useMemo(() => {
    if (!blast || !rootNode) return null;
    const n = blast.downstream.length;
    if (n === 0) return `Nothing on record stops if ${rootNode.name} fails.`;
    const byKind = new Map<string, number>();
    blast.downstream.forEach((d) => byKind.set(nodeKindLabel(d.kind), (byKind.get(nodeKindLabel(d.kind)) ?? 0) + 1));
    const parts = [...byKind.entries()].map(([k, c]) => plural(c, k));
    return `If ${rootNode.name} fails, ${n} ${n === 1 ? 'thing stops' : 'things stop'}: ${parts.join(', ')}.`;
  }, [blast, rootNode]);

  const makePicker = (id: string, className: string) => (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        Centre the map on
      </label>
      <EntityPicker
        id={id}
        placeholder={entitiesResource.status === 'error' ? "Couldn't load the list" : 'Search people, automations, models…'}
        options={entityOptions}
        value={null}
        onChange={(e) => e && setRootId(e.id)}
        disabled={entitiesResource.status === 'error'}
      />
    </div>
  );

  const startingPoints =
    assetsResource.status === 'ready'
      ? assetsResource.data
          .filter((a) => a.checkStatus.toUpperCase() === 'FAIL')
          .sort((a, b) => Number(b.isCritical) - Number(a.isCritical) || a.name.localeCompare(b.name))
          .slice(0, 6)
      : [];

  const connections = selected && hood ? hood.edges.filter((e) => e.from === selected.id || e.to === selected.id) : [];

  return (
    <div className="flex h-full min-h-[520px] w-full flex-col gap-4 px-4 pb-4 pt-4 md:px-8 md:pb-6 md:pt-6">
      {/* Header */}
      <header className="flex min-w-0 shrink-0 flex-col gap-4">
        <div className="min-w-0">
          <h1 className="type-title text-ink">Dependency map</h1>
          <p className="mt-1 truncate text-sm text-ink-2">
            {rootNode ? (
              <>
                Centred on <span className="font-medium text-ink">{rootNode.name}</span> · {nodeKindLabel(rootNode.kind)}
              </>
            ) : (
              'What connects to what, and what stops if something fails.'
            )}
          </p>
        </div>
        {rootId && (
          <div className="flex flex-wrap items-center gap-2">
            {makePicker('map-root-picker', 'w-full sm:w-80')}
            <Segmented label="How far to look" value={hops} onChange={setHops} options={[{ id: 1, label: '1 hop' }, { id: 2, label: '2 hops' }]} />
            <button
              type="button"
              onClick={() => setShowBlast((v) => !v)}
              aria-pressed={showBlast}
              className={cn(
                'type-meta inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-control border px-3.5 font-medium transition-colors',
                showBlast ? 'border-amber/60 bg-[color-mix(in_srgb,var(--amber)_14%,transparent)] text-amber-ink' : 'border-rule bg-surface text-ink-2 hover:text-ink',
              )}
            >
              What stops if it fails
              {blast && <span className="tabular-nums opacity-80">{blast.downstream.length}</span>}
              {showBlast && <X className="-mr-1 h-3.5 w-3.5" aria-hidden="true" />}
            </button>
            <Segmented label="View" value={viewMode} onChange={setViewMode} options={[{ id: 'canvas', label: 'Map' }, { id: 'list', label: 'List' }]} />
          </div>
        )}
      </header>

      {showBlast && blastSentence && viewMode === 'canvas' && (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-control border border-amber/40 bg-[color-mix(in_srgb,var(--amber)_8%,transparent)] py-1.5 pl-4 pr-1.5">
          <p className="type-meta font-medium text-ink" aria-live="polite">
            {blastSentence}
          </p>
          <button
            type="button"
            onClick={() => setShowBlast(false)}
            aria-label="End simulation"
            className="type-meta inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border border-rule bg-surface px-3 font-medium text-ink transition-colors hover:bg-surface-sunken"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            End
          </button>
        </div>
      )}

      {/* Body */}
      <div className={cn('relative min-h-0 flex-1', viewMode === 'canvas' || !rootId ? 'overflow-hidden rounded-panel border border-rule bg-canvas shadow-panel' : 'overflow-y-auto')}>
        {!rootId ? (
          <div className="flex h-full w-full items-center justify-center overflow-y-auto p-6">
            <div className="w-full max-w-md text-center">
              <span aria-hidden="true" className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-rule bg-surface text-ink-3">
                <Crosshair className="h-5 w-5" />
              </span>
              <h2 className="type-heading mt-4 text-ink">Pick something to centre the map on</h2>
              <p className="type-meta mt-1 text-ink-3">A person, automation, model or app. You&apos;ll see what it connects to and what would stop if it failed.</p>
              {makePicker('map-start-picker', 'mt-5 text-left')}
              {startingPoints.length > 0 && (
                <div className="mt-7">
                  <p className="type-meta text-ink-3">Or start with an asset that&apos;s failing a check</p>
                  <ul className="mt-3 space-y-2 text-left">
                    {startingPoints.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => setRootId(a.id)}
                          className="group flex w-full cursor-pointer items-center gap-3 rounded-control border border-rule bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-ink-3"
                        >
                          <EntityKindIcon kind={a.kind} className="h-4 w-4 shrink-0 text-ink-3" />
                          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink">{a.name}</span>
                          <span className="type-meta inline-flex shrink-0 items-center gap-1.5 text-st-fail">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-st-fail" />
                            Failing
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-ink" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : neighbourhoodResource.status === 'loading' && !hood ? (
          <div className="flex h-full w-full items-center justify-center" aria-label="Loading map">
            <span className="skeleton block h-40 w-72 rounded-panel" />
          </div>
        ) : neighbourhoodResource.status === 'error' ? (
          <div className="flex h-full w-full items-center justify-center p-8">
            <ErrorState
              onRetry={neighbourhoodResource.reload}
              message={neighbourhoodResource.error.status === 404 ? 'That entity is not in the graph. Pick another one above.' : "We couldn't load the map for this entity."}
            />
          </div>
        ) : !hood || hood.nodes.length <= 1 ? (
          <div className="flex h-full w-full items-center justify-center p-8 text-center">
            <div>
              <p className="type-heading text-ink">Nothing connected</p>
              <p className="type-meta mt-1 text-ink-3">No people, automations or services on record connect to this entity.</p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-6">
            <Panel aria-labelledby="list-root-heading" className="px-5 py-4">
              <h2 id="list-root-heading" className="type-meta text-ink-3">
                Centred on
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
                  <EntityKindIcon kind={rootNode?.kind ?? 'app'} className="h-4 w-4" />
                </span>
                <span className="text-lg font-semibold tracking-tight text-ink">{rootNode?.name}</span>
                <span className="type-meta text-ink-3">{rootNode && nodeKindLabel(rootNode.kind)}</span>
                {rootNode?.ring === 'fail' && <span className="inline-flex h-6 items-center rounded-full bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] px-2.5 text-xs font-medium text-st-fail">Failing a check</span>}
                {rootNode && (
                  <Link href={pageHref(rootNode)} className="type-meta ml-auto inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
                    Open page <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
              {blastSentence && <p className="type-meta mt-3 text-ink-2">{blastSentence}</p>}
            </Panel>

            {blast && (
              <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
                <Panel aria-labelledby="list-down-heading">
                  <PanelHeader titleId="list-down-heading" title="What stops if it fails" count={blast.downstream.length} description="Everything that relies on it, directly or through other automations." />
                  <EntityList items={blast.downstream} empty="Nothing on record depends on it." onCentre={setRootId} label="Downstream" />
                </Panel>
                <Panel aria-labelledby="list-up-heading">
                  <PanelHeader titleId="list-up-heading" title="What it relies on" count={blast.upstream.length} description="People, models, apps and credentials it needs." />
                  <EntityList items={blast.upstream} empty="Relies on nothing on record." onCentre={setRootId} label="Upstream" />
                </Panel>
              </div>
            )}

            <Panel aria-labelledby="list-links-heading">
              <PanelHeader titleId="list-links-heading" title={`Connections within ${hops === 1 ? '1 hop' : '2 hops'}`} count={hood.edges.length} description="Each link, with how sure we are of it." />
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Connections table">
                <table className="w-full text-left">
                  <thead>
                    <tr className="type-meta border-b border-rule text-ink-3">
                      <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">From</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Relation</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">To</th>
                      <th scope="col" className="py-2.5 pl-3 pr-5 font-medium">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {hood.edges.map((e) => (
                      <tr key={e.id} className="transition-colors hover:bg-surface-sunken/40">
                        <td className="type-meta py-2.5 pl-5 pr-3 font-medium text-ink">{byId.get(e.from)?.name ?? e.from}</td>
                        <td className="type-meta px-3 py-2.5 text-ink-3">{relationLabel(e.type)}</td>
                        <td className="type-meta px-3 py-2.5 font-medium text-ink">{byId.get(e.to)?.name ?? e.to}</td>
                        <td className="py-2.5 pl-3 pr-5">
                          <EvidenceBadge grade={e.grade} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onEdgeMouseEnter={(_, e) => setHoveredEdge(e.id)}
              onEdgeMouseLeave={() => setHoveredEdge(null)}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
              className="oba-map h-full w-full"
              aria-label="Dependency map canvas"
            >
              <Background gap={18} size={1} />
              <Controls showInteractive={false} position="bottom-right" />
              <MiniMap
                position="top-right"
                pannable
                zoomable
                nodeClassName={(n) => (n.data?.ring === 'fail' ? 'mm-fail' : n.id === rootId ? 'mm-root' : 'mm-node')}
              />
            </ReactFlow>
            <Legend />

            {/* Inspector */}
            {selected && (
              <aside
                aria-label={`${selected.name} details`}
                className="absolute bottom-3 right-3 top-3 z-20 flex w-[min(20rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-panel border border-rule bg-surface shadow-panel"
              >
                <div className="flex items-start gap-3 border-b border-rule px-4 py-3.5">
                  {selected.kind === 'person' ? (
                    <Avatar name={selected.name} size={36} />
                  ) : (
                    <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
                      <EntityKindIcon kind={selected.kind} className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{selected.name}</p>
                    <p className="type-meta text-ink-3">
                      {nodeKindLabel(selected.kind)}
                      {selected.ring === 'fail' && <span className="font-medium text-st-fail"> · Failing a check</span>}
                      {selected.ring === 'unknown' && <span> · Has unknown facts</span>}
                    </p>
                  </div>
                  <button type="button" onClick={() => setSelectedId(null)} aria-label="Close details" className="cursor-pointer rounded-control p-1 text-ink-3 hover:bg-surface-sunken hover:text-ink">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="type-meta border-b border-rule px-4 py-2.5 text-ink-3">
                  <span className="font-medium tabular-nums text-ink">{connections.length}</span> {connections.length === 1 ? 'connection' : 'connections'} in view
                </p>
                <ul className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto">
                  {connections.map((e) => {
                    const other = byId.get(e.from === selected.id ? e.to : e.from);
                    return (
                      <li key={e.id} className="type-meta px-4 py-2.5 text-ink-2">
                        <span className="font-medium text-ink">{byId.get(e.from)?.name ?? e.from}</span> {relationLabel(e.type)}{' '}
                        <span className="font-medium text-ink">{byId.get(e.to)?.name ?? e.to}</span>
                        <span className="mt-1 flex items-center gap-2">
                          <EvidenceBadge grade={e.grade} />
                          {other && other.id !== rootId && (
                            <button type="button" onClick={() => setSelectedId(other.id)} className="cursor-pointer text-[11px] font-medium text-ink-3 hover:text-ink">
                              Inspect {other.name}
                            </button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex items-center justify-between gap-2 border-t border-rule bg-surface-sunken/40 px-4 py-3">
                  {selected.id !== rootId ? (
                    <button
                      type="button"
                      onClick={() => setRootId(selected.id)}
                      className="type-meta inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-control border border-rule bg-surface px-3 font-medium text-ink hover:bg-surface-sunken"
                    >
                      <Crosshair className="h-3.5 w-3.5" aria-hidden="true" /> Centre map here
                    </button>
                  ) : (
                    <span className="type-meta text-ink-3">Centred here</span>
                  )}
                  <Link href={pageHref(selected)} className="type-meta inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
                    Open page <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </aside>
            )}
          </>
        )}
      </div>
    </div>
  );
}
