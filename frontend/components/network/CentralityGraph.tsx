'use client';

import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Lock, Unlock, Network, ShieldAlert, UserMinus } from 'lucide-react';
import { NetworkReport, PersonNode } from '../../lib/networkRisk';

// --- Custom Node ---
function PersonAgentNode({ data }: { data: { person: PersonNode } }) {
  const { person } = data;
  const isBottleneck = person.isBottleneck;
  const isIsolated = person.isIsolated;

  // Base sizing based on centrality to create a "centrality-sized node" effect
  const sizeClass = 
    person.centralityScore > 10 ? 'w-48 h-20 text-base' :
    person.centralityScore > 5 ? 'w-40 h-16 text-sm' :
    'w-32 h-14 text-xs';

  let colors = 'bg-[color:var(--bg-card)] border-[color:var(--border-subtle)]';
  if (isBottleneck) colors = 'bg-fuchsia-500/10 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)] text-fuchsia-400';
  else if (isIsolated) colors = 'bg-[color:var(--bg-base)] border-[color:var(--border-subtle)] text-[color:var(--text-tertiary)] opacity-60';

  return (
    <div className={`rounded-full flex flex-col justify-center items-center border-2 transition-all ${colors} ${sizeClass}`}>
      <Handle type="target" position={Position.Top} className="opacity-0 w-0 h-0" />
      
      <span className="font-bold truncate px-2">{person.name}</span>
      {!isIsolated && (
        <span className="text-[10px] opacity-70">Centrality: {person.centralityScore}</span>
      )}
      {isIsolated && (
        <span className="text-[10px] opacity-70">Isolated</span>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0 w-0 h-0" />
    </div>
  );
}

const nodeTypes = {
  personNode: PersonAgentNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR', align: 'UL', ranker: 'longest-path' });

  nodes.forEach((node) => {
    // Approx sizes based on centrality
    const size = (node.data.person as PersonNode).centralityScore > 10 ? 200 : 150;
    dagreGraph.setNode(node.id, { width: size, height: size });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 75,
        y: nodeWithPosition.y - 75,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface Props {
  report: NetworkReport;
}

export function CentralityGraph({ report }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    const initialNodes: Node[] = report.nodes.map(person => ({
      id: person.id,
      type: 'personNode',
      position: { x: 0, y: 0 },
      data: { person }
    }));

    const initialEdges: Edge[] = report.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: edge.weight > 2, 
      label: edge.weight > 1 ? `${edge.weight}x` : '',
      style: { 
        stroke: edge.weight > 2 ? 'var(--border-strong)' : 'var(--border-disabled)', 
        strokeWidth: edge.weight > 2 ? 2 : 1 
      },
      labelStyle: { fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: 'var(--bg-elevated)' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.weight > 2 ? 'var(--border-strong)' : 'var(--border-disabled)',
      },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [report, setNodes, setEdges]);

  // KPIs
  const maxCentrality = report.maxCentralityHolder;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="flex flex-col p-4 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/10 text-center items-center justify-center">
          <span className="text-xs text-fuchsia-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Network size={14}/> Network Core</span>
          <span className="text-2xl font-bold text-fuchsia-400">{maxCentrality?.name || 'N/A'}</span>
          <span className="text-[10px] text-fuchsia-400/60 mt-1">most connected person (score: {maxCentrality?.centralityScore})</span>
        </div>

        <div className="flex flex-col p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-center items-center justify-center">
          <span className="text-xs text-orange-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShieldAlert size={14}/> Bottlenecks</span>
          <span className="text-2xl font-bold text-orange-400">{report.bottleneckCount}</span>
          <span className="text-[10px] text-orange-400/60 mt-1">highly centralized people</span>
        </div>

        <div className="flex flex-col p-4 rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] text-center items-center justify-center">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider mb-2 flex items-center gap-1.5"><UserMinus size={14}/> Isolated</span>
          <span className="text-2xl font-bold text-[color:var(--text-secondary)]">{report.isolatedCount}</span>
          <span className="text-[10px] text-[color:var(--text-tertiary)] mt-1">no dependencies</span>
        </div>

      </div>

      <div className="h-[600px] w-full card border border-[color:var(--border-strong)] rounded-xl relative overflow-hidden bg-[color:var(--bg-base)] shadow-inner">
        <style>{`
          .react-flow__controls-button {
            background-color: var(--bg-surface);
            border-bottom: 1px solid var(--border-subtle);
            fill: var(--text-primary);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .react-flow__controls-button:hover { background-color: var(--bg-hover); }
          .react-flow__controls-button svg { max-width: 14px; max-height: 14px; }
        `}</style>
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
          proOptions={{ hideAttribution: true }}
          panOnDrag={!isLocked}
          panOnScroll={!isLocked}
          zoomOnScroll={!isLocked}
          zoomOnPinch={!isLocked}
          zoomOnDoubleClick={!isLocked}
          nodesDraggable={!isLocked}
          elementsSelectable={false}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            color="var(--border-strong)" 
            gap={20} 
            size={1} 
          />
          <Controls 
            showInteractive={false} 
            className="bg-[color:var(--bg-surface)] border-[color:var(--border-subtle)] fill-[color:var(--text-primary)] shadow-lg rounded-md overflow-hidden"
          >
            <ControlButton onClick={() => setIsLocked(!isLocked)} title="Toggle Lock">
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </ControlButton>
          </Controls>
          
          <div className="absolute inset-x-4 top-4 pointer-events-none">
            <div className="inline-flex flex-col bg-[color:var(--bg-surface)]/80 backdrop-blur-sm border border-[color:var(--border-subtle)] p-3 rounded-lg shadow-sm">
              <h4 className="text-xs font-bold text-[color:var(--text-primary)] uppercase tracking-wider mb-2">People Centrality Graph (M35)</h4>
              <div className="flex flex-col gap-1.5 text-[10px] text-[color:var(--text-secondary)]">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/50 shadow-[0_0_8px_rgba(217,70,239,0.3)]" /> Bottleneck Person</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]" /> Typical Person</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[color:var(--bg-base)] border border-[color:var(--border-subtle)] opacity-50" /> Isolated Person</div>
                <div className="flex items-center gap-2 mt-1"><div className="w-4 h-0.5 bg-[color:var(--border-strong)]" /> Strong dependency (multiple assets)</div>
              </div>
            </div>
          </div>
        </ReactFlow>
      </div>
    </div>
  );
}
