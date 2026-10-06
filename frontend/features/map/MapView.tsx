'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type {
  Neighbourhood,
  BlastRadius,
  GraphNodeView,
  GraphEdgeView,
  EvidenceGrade,
  EntityRef,
} from '@/types/view';
import { nodeTypes, type MapNodeData, type CustomMapNode } from './nodes';
import { Card } from '@/components/ui/Card';
import { EvidenceBadge, CheckStatusBadge } from '@/components/ui/marks';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { useResource } from '@/lib/useResource';
import { fetchNeighbourhood, fetchBlastRadius } from '@/lib/api/graph';
import { fetchAllEntities } from '@/lib/api/entities';
import { cn } from '@/lib/cn';

export interface MapViewProps {
  /** From `/map?root=<entity id>`; with none, the page asks which entity to centre on. */
  initialRootId?: string;
  initialNeighbourhood?: Neighbourhood;
  initialBlastRadius?: BlastRadius;
}

const GRADE_COLORS: Record<EvidenceGrade, string> = {
  stated: '#1D5FA8',
  inferred: '#A85A00',
  confirmed: '#2F6B2A',
  unknown: '#6B6560',
};

// Dagre Layout: Left-to-Right
function layoutGraph(
  nodes: GraphNodeView[],
  edges: GraphEdgeView[],
  rootId: string,
  blastRadius: BlastRadius | null,
  showBlastRadius: boolean,
  onSelectNode: (id: string) => void,
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });

  const downstreamSet = new Set((blastRadius?.downstream || []).map((d) => d.id));

  nodes.forEach((n) => {
    // Width and height per node kind
    const isPerson = n.kind === 'person';
    g.setNode(n.id, {
      width: isPerson ? 80 : 170,
      height: isPerson ? 80 : 64,
    });
  });

  edges.forEach((e) => {
    g.setEdge(e.from, e.to);
  });

  dagre.layout(g);

  const flowNodes: CustomMapNode[] = nodes.map((n) => {
    const pos = g.node(n.id) || { x: 0, y: 0 };
    const isRoot = n.id === rootId;
    const isBlast = showBlastRadius && downstreamSet.has(n.id);
    const isDimmed = showBlastRadius && !isRoot && !downstreamSet.has(n.id);

    return {
      id: n.id,
      type: n.kind,
      position: { x: pos.x - 75, y: pos.y - 32 },
      data: {
        id: n.id,
        name: n.name,
        kind: n.kind,
        ring: n.ring,
        isRoot,
        isBlastRadius: isBlast,
        isDimmed,
        onSelect: onSelectNode,
      },
    };
  });

  const flowEdges: Edge[] = edges.map((e) => {
    const isConnectingBlast =
      showBlastRadius &&
      (e.from === rootId || downstreamSet.has(e.from)) &&
      downstreamSet.has(e.to);
    const isDimmed = showBlastRadius && !isConnectingBlast;
    const color = GRADE_COLORS[e.grade] || '#6B6560';

    return {
      id: e.id,
      source: e.from,
      target: e.to,
      animated: e.grade === 'inferred',
      style: {
        stroke: color,
        strokeWidth: e.grade === 'confirmed' ? 2 : 1.5,
        strokeDasharray: e.grade === 'unknown' ? '4 4' : undefined,
        opacity: isDimmed ? 0.15 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 14,
        height: 14,
      },
    };
  });

  return { nodes: flowNodes, edges: flowEdges };
}

export function MapView({
  initialRootId,
  initialNeighbourhood,
  initialBlastRadius,
}: MapViewProps) {
  const [rootId, setRootIdState] = React.useState<string | null>(initialRootId ?? null);
  const [hops, setHops] = React.useState<1 | 2>(2);
  const [viewMode, setViewMode] = React.useState<'canvas' | 'list'>('canvas');
  const [showBlastRadius, setShowBlastRadius] = React.useState(false);

  // Keep the URL shareable (/map?root=...) without a navigation.
  const setRootId = React.useCallback((id: string) => {
    setRootIdState(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('root', id);
      window.history.replaceState(null, '', url);
    } catch {
      /* non-browser environment */
    }
  }, []);

  const entitiesResource = useResource<EntityRef[]>('graph-entities', fetchAllEntities);
  const entityOptions = React.useMemo(
    () => (entitiesResource.status === 'ready' ? entitiesResource.data : []),
    [entitiesResource],
  );

  const neighbourhoodResource = useResource<Neighbourhood>(
    rootId ? `graph-neighbourhood-${rootId}-${hops}` : null,
    () => fetchNeighbourhood(rootId!, hops),
  );
  const blastResource = useResource<BlastRadius>(
    rootId ? `graph-blast-radius-${rootId}` : null,
    () => fetchBlastRadius(rootId!),
  );

  // Initial data only stands in for the root it was loaded for.
  const neighbourhoodData =
    neighbourhoodResource.status === 'ready'
      ? neighbourhoodResource.data
      : initialNeighbourhood?.rootId === rootId
        ? initialNeighbourhood
        : undefined;

  const blastData =
    blastResource.status === 'ready'
      ? blastResource.data
      : initialBlastRadius?.rootId === rootId
        ? initialBlastRadius
        : undefined;

  const [nodes, setNodes, onNodesChange] = useNodesState<CustomMapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Update layout when data changes
  React.useEffect(() => {
    if (!neighbourhoodData || !rootId) return;

    const { nodes: lNodes, edges: lEdges } = layoutGraph(
      neighbourhoodData.nodes,
      neighbourhoodData.edges,
      rootId,
      blastData || null,
      showBlastRadius,
      setRootId,
    );

    setNodes(lNodes);
    setEdges(lEdges);
  }, [neighbourhoodData, blastData, rootId, showBlastRadius, setNodes, setEdges, setRootId]);

  const rootNode = React.useMemo(() => {
    return neighbourhoodData?.nodes.find((n) => n.id === rootId) || null;
  }, [neighbourhoodData, rootId]);

  const rootPicker = (
    <EntityPicker
      label="Centre the map on"
      placeholder={entitiesResource.status === 'error' ? 'Could not load entities' : 'Search people, automations, models…'}
      options={entityOptions}
      value={null}
      onChange={(e) => e && setRootId(e.id)}
      disabled={entitiesResource.status === 'error'}
      className="w-72"
    />
  );

  return (
    <div className="flex h-[calc(100vh-100px)] w-full flex-col overflow-hidden pb-4">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule/50 bg-surface/60 backdrop-blur-xs p-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono">
              Topology & Blast Radius
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink font-normal tracking-tight">
            Dependency Map
          </h1>
          {rootNode && (
            <p className="text-xs text-ink-3 mt-0.5">
              Centered on <strong className="text-ink">{rootNode.name}</strong> ({rootNode.kind})
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {rootPicker}
          {/* Hops toggle */}
          <div className="flex items-center border border-rule rounded-control p-0.5 bg-surface">
            <button
              type="button"
              onClick={() => setHops(1)}
              className={cn(
                'px-2 py-1 rounded-control transition-colors cursor-pointer',
                hops === 1
                  ? 'bg-amber text-paper font-semibold'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              1 Hop
            </button>
            <button
              type="button"
              onClick={() => setHops(2)}
              className={cn(
                'px-2 py-1 rounded-control transition-colors cursor-pointer',
                hops === 2
                  ? 'bg-amber text-paper font-semibold'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              2 Hops
            </button>
          </div>

          {/* Blast Radius Toggle */}
          <button
            type="button"
            onClick={() => setShowBlastRadius(!showBlastRadius)}
            aria-pressed={showBlastRadius}
            className={cn(
              'px-3 py-1.5 rounded-control border font-medium transition-colors cursor-pointer flex items-center gap-1.5',
              showBlastRadius
                ? 'border-amber bg-amber/15 text-amber-ink font-semibold'
                : 'border-rule bg-surface text-ink-3 hover:text-ink',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                showBlastRadius ? 'bg-amber' : 'bg-ink-3/40',
              )}
              aria-hidden="true"
            />
            <span>Blast Radius</span>
            {blastData && (
              <span className="font-mono text-[11px] tabular-nums">
                ({blastData.downstream.length})
              </span>
            )}
          </button>

          {/* View Mode Toggle (Canvas vs Accessible List) */}
          <div className="flex items-center border border-rule rounded-control p-0.5 bg-surface">
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              aria-pressed={viewMode === 'canvas'}
              className={cn(
                'px-2.5 py-1 rounded-control transition-colors cursor-pointer',
                viewMode === 'canvas'
                  ? 'bg-surface-sunken font-semibold text-ink'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Canvas View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={cn(
                'px-2.5 py-1 rounded-control transition-colors cursor-pointer',
                viewMode === 'list'
                  ? 'bg-surface-sunken font-semibold text-ink'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              Accessible List
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-canvas">
        {!rootId ? (
          <div className="flex h-full w-full items-center justify-center p-8">
            <EmptyState
              title="Pick something to centre the map on"
              description="Choose a person, automation, model or app above to see what it connects to and what would stop if it failed."
            />
          </div>
        ) : neighbourhoodResource.status === 'loading' && !neighbourhoodData ? (
          <div className="flex h-full w-full items-center justify-center p-8">
            <div className="space-y-4 w-72 text-center">
              <Skeleton variant="card" className="h-40" />
              <p className="text-xs text-ink-3">Computing dependency graph...</p>
            </div>
          </div>
        ) : neighbourhoodResource.status === 'error' ? (
          <div className="flex h-full w-full items-center justify-center p-8">
            <ErrorState
              onRetry={neighbourhoodResource.reload}
              message={
                neighbourhoodResource.error.status === 404
                  ? 'That entity is not in the graph. Pick another one above.'
                  : 'Could not load the map for this entity.'
              }
            />
          </div>
        ) : !neighbourhoodData || neighbourhoodData.nodes.length <= 1 ? (
          <div className="flex h-full w-full items-center justify-center p-8">
            <EmptyState
              title="No dependencies found"
              description="Nothing on record connects this entity to people, automations or services."
            />
          </div>
        ) : viewMode === 'list' ? (
          /* Accessible Semantic Tree & List View */
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
            <Card className="p-6 bg-surface shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-rule/50 pb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
                  Focused Root Entity
                </h2>
                <span className="font-mono text-xs text-ink-3">ID: {rootNode?.id}</span>
              </div>
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-2xl text-ink font-normal">
                  {rootNode?.name}
                </h3>
                <span className="px-2 py-0.5 rounded-badge bg-surface-sunken text-xs capitalize font-mono text-ink-3">
                  {rootNode?.kind}
                </span>
                {rootNode?.ring === 'fail' && (
                  <span className="px-2 py-0.5 rounded-badge bg-st-fail/15 text-st-fail text-xs font-semibold">
                    Failing Check
                  </span>
                )}
              </div>
            </Card>

            {/* Blast Radius Section */}
            {blastData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 bg-surface space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono flex items-center justify-between">
                    <span>Downstream Blast Radius</span>
                    <span className="font-mono text-ink">{blastData.downstream.length}</span>
                  </h3>
                  <p className="text-xs text-ink-3">
                    Everything that relies on this entity, directly or through other automations, and would stop if it failed.
                  </p>
                  <ul className="divide-y divide-rule text-xs" aria-label="Downstream blast radius list">
                    {blastData.downstream.length === 0 ? (
                      <li className="py-2 text-ink-3 italic">Nothing on record depends on it</li>
                    ) : (
                      blastData.downstream.map((ref) => (
                        <li key={ref.id} className="py-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setRootId(ref.id)}
                            className="font-medium text-ink hover:text-amber-ink transition-colors cursor-pointer text-left truncate"
                          >
                            {ref.name}
                          </button>
                          <span className="px-1.5 py-0.2 rounded-badge bg-surface-sunken text-[10px] font-mono capitalize text-ink-3 shrink-0">
                            {ref.kind}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </Card>

                <Card className="p-5 bg-surface space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 font-mono flex items-center justify-between">
                    <span>Upstream Dependencies</span>
                    <span className="font-mono text-ink">{blastData.upstream.length}</span>
                  </h3>
                  <p className="text-xs text-ink-3">
                    Models, apps and personal credentials this entity relies on.
                  </p>
                  <ul className="divide-y divide-rule text-xs" aria-label="Upstream dependencies list">
                    {blastData.upstream.length === 0 ? (
                      <li className="py-2 text-ink-3 italic">No dependencies on record</li>
                    ) : (
                      blastData.upstream.map((ref) => (
                        <li key={ref.id} className="py-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setRootId(ref.id)}
                            className="font-medium text-ink hover:text-amber-ink transition-colors cursor-pointer text-left truncate"
                          >
                            {ref.name}
                          </button>
                          <span className="px-1.5 py-0.2 rounded-badge bg-surface-sunken text-[10px] font-mono capitalize text-ink-3 shrink-0">
                            {ref.kind}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </Card>
              </div>
            )}

            {/* Complete Graph Nodes List */}
            <Card className="p-6 bg-surface shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-ink">
                All Connected Nodes in {hops}-Hop Neighbourhood ({neighbourhoodData.nodes.length})
              </h3>
              <div className="divide-y divide-rule text-xs">
                {neighbourhoodData.nodes.map((n) => (
                  <div key={n.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => setRootId(n.id)}
                        className="font-serif text-sm font-medium text-ink hover:text-amber-ink transition-colors cursor-pointer text-left"
                      >
                        {n.name}
                      </button>
                      <p className="text-xs text-ink-3 font-mono mt-0.5">
                        <span className="capitalize">{n.kind}</span> · ID: {n.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {n.ring === 'fail' && (
                        <span className="px-2 py-0.5 rounded-badge bg-st-fail/15 text-st-fail font-semibold">
                          Failing Check
                        </span>
                      )}
                      {n.ring === 'unknown' && (
                        <span className="px-2 py-0.5 rounded-badge bg-ev-unknown/15 text-ev-unknown font-semibold">
                          Unknown facts
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setRootId(n.id)}
                        className="px-2.5 py-1 rounded-control border border-rule hover:bg-surface-sunken text-xs font-medium text-ink transition-colors cursor-pointer"
                      >
                        Center Graph
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Relationships & Evidence Grades Table */}
            <Card className="p-6 bg-surface shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-ink">
                Relationship Edges & Evidence Grades ({neighbourhoodData.edges.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="border-b border-rule font-mono text-[11px] uppercase text-ink-3">
                    <tr>
                      <th scope="col" className="pb-2">From Entity</th>
                      <th scope="col" className="pb-2">Relation Type</th>
                      <th scope="col" className="pb-2">To Entity</th>
                      <th scope="col" className="pb-2">Evidence Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-sans">
                    {neighbourhoodData.edges.map((e) => {
                      const fromNode = neighbourhoodData.nodes.find((n) => n.id === e.from);
                      const toNode = neighbourhoodData.nodes.find((n) => n.id === e.to);
                      return (
                        <tr key={e.id} className="hover:bg-surface-sunken/20">
                          <td className="py-2.5 font-medium">{fromNode?.name || e.from}</td>
                          <td className="py-2.5 font-mono text-ink-3 capitalize">{e.type}</td>
                          <td className="py-2.5 font-medium">{toNode?.name || e.to}</td>
                          <td className="py-2.5">
                            <EvidenceBadge grade={e.grade} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          /* Interactive ReactFlow Canvas */
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            className="h-full w-full"
            aria-label="Interactive Graph Canvas"
          >
            <Background gap={16} size={1} color="#DAD2C4" />
            <Controls showInteractive={false} className="!bg-surface !border-rule !shadow-xs" />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.ring === 'fail') return '#B3261E';
                if (n.data?.ring === 'unknown') return '#6B6560';
                return '#A9825A';
              }}
              className="!bg-surface !border-rule !rounded-card"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
