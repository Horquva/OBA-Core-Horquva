"use client";

import React, { useCallback, useEffect, useState } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { AgentNode, AgentNodeData } from './CustomNodes';
import { Agent, Dependency } from '../../types';
import { getDownstream } from '../../lib/graph';
import { AlertTriangle, Info, Lock, Unlock } from 'lucide-react';

const nodeTypes = {
  agent: AgentNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node<AgentNodeData>[], edges: Edge[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 340, height: 160 });
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
        x: nodeWithPosition.x - 340 / 2,
        y: nodeWithPosition.y - 160 / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface FlowCanvasProps {
  agents: Agent[];
  dependencies: Dependency[];
  /** Server-computed SPOF agent ids (backend/routes/dependencies.js
   *  GET /agent-spofs) — one definition of "SPOF", not reimplemented here. */
  spofIds: Set<string>;
}

export function FlowCanvas({ agents, dependencies, spofIds }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    const initialNodes: Node<AgentNodeData>[] = agents.map(agent => ({
      id: agent.id,
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        agent,
        isSPOF: spofIds.has(agent.id),
      }
    }));

    const initialEdges: Edge[] = dependencies.map((dep, idx) => ({
      id: `${dep.from}-${dep.to}-${idx}`,
      source: dep.from,
      target: dep.to,
      type: 'smoothstep',
      animated: true,
      label: dep.type,
      style: { stroke: 'var(--border-strong)', strokeWidth: 2 },
      labelStyle: { fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: 'var(--bg-elevated)' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--border-strong)',
      },
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'TB'
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [agents, dependencies, spofIds, setNodes, setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedAgentId(prev => prev === node.id ? null : node.id);
  }, []);

  useEffect(() => {
    if (!selectedAgentId) {
      setNodes(nds => nds.map(n => ({
        ...n,
        data: { ...n.data, isFailed: false, isImpacted: false }
      })));
      setEdges(eds => eds.map(e => ({
        ...e,
        style: { stroke: 'var(--border-strong)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--border-strong)' },
        animated: true,
      })));
      return;
    }

    const downstreamIds = getDownstream(selectedAgentId, dependencies);

    setNodes(nds => nds.map(n => {
      const isFailed = n.id === selectedAgentId;
      const isImpacted = downstreamIds.has(n.id);
      
      return {
        ...n,
        data: {
          ...n.data,
          isFailed,
          isImpacted,
        }
      };
    }));

    setEdges(eds => eds.map(e => {
      const isPathAffected = 
        (e.source === selectedAgentId || downstreamIds.has(e.source)) && 
        downstreamIds.has(e.target);

      if (isPathAffected) {
        return {
          ...e,
          style: { stroke: '#ef4444', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
          animated: true,
        };
      } else {
        return {
          ...e,
          style: { stroke: 'var(--border-default)', strokeWidth: 1, opacity: 0.3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--border-default)' },
          animated: false,
        };
      }
    }));

  }, [selectedAgentId, dependencies, setNodes, setEdges]);

  return (
    <div className="flex flex-col gap-4">
      {/* Simulation Info Bar above the graph */}
      <div className="card p-4 bg-[var(--bg-elevated)] border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center">
            <Info size={16} className="mr-2 text-[var(--accent)]" />
            Cascade Simulation
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Click on any agent node to simulate its failure and highlight all downstream victims. 
            Agents marked with a <span className="text-red-400 font-bold">red shield</span> are Single Points of Failure (SPOFs).
          </p>
        </div>

        {selectedAgentId && (
          <div className="bg-red-950/30 border border-red-900/50 p-3 rounded-md min-w-[250px]">
            <div className="flex items-center text-red-400 text-sm font-bold mb-1">
              <AlertTriangle size={16} className="mr-1.5" />
              Failure Simulated
            </div>
            <div className="text-xs text-[var(--text-primary)] flex justify-between">
              <span>Agent:</span> 
              <span className="font-semibold">{agents.find(a => a.id === selectedAgentId)?.name}</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1 flex justify-between">
              <span>Downstream impacted:</span> 
              <span className="text-red-400 font-bold">{getDownstream(selectedAgentId, dependencies).size}</span>
            </div>
          </div>
        )}
      </div>

      <div className="h-[700px] w-full card border border-[var(--border-strong)] rounded-xl relative overflow-hidden bg-[var(--bg-base)]">
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
          .react-flow__controls-button:hover {
            background-color: var(--bg-hover);
          }
          .react-flow__controls-button svg {
            max-width: 14px;
            max-height: 14px;
          }
        `}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
          proOptions={{ hideAttribution: true }}
          panOnDrag={!isLocked}
          panOnScroll={!isLocked}
          zoomOnScroll={!isLocked}
          zoomOnPinch={!isLocked}
          zoomOnDoubleClick={!isLocked}
          nodesDraggable={!isLocked}
          elementsSelectable={true}
          className="bg-grid-pattern"
          minZoom={0.2}
        >
          <Background 
            variant={BackgroundVariant.Lines} 
            color="var(--border-subtle)" 
            gap={30} 
            lineWidth={1} 
          />
          <Controls 
            showInteractive={false} 
            className="bg-[var(--bg-surface)] border-[var(--border-subtle)] fill-[var(--text-primary)] shadow-lg rounded-md overflow-hidden"
          >
            <ControlButton onClick={() => setIsLocked(!isLocked)} title="Toggle Lock">
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </ControlButton>
          </Controls>
        </ReactFlow>
      </div>
    </div>
  );
}
