import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Agent } from '../../types';
import { User, ShieldX } from 'lucide-react';
import clsx from 'clsx';

export interface AgentNodeData extends Record<string, unknown> {
  agent: Agent;
  isFailed?: boolean;
  isImpacted?: boolean;
  isSPOF?: boolean;
}

export function AgentNode({ data }: { data: AgentNodeData }) {
  const { agent, isFailed, isImpacted, isSPOF } = data;

  const riskClass = 
    agent.criticality === 'critical' ? 'risk-critical' :
    agent.criticality === 'high' ? 'risk-high' :
    agent.criticality === 'medium' ? 'risk-medium' : 'risk-low';

  return (
    <div
      className={clsx(
        "card p-5 min-w-[300px] relative border-2 transition-all duration-300",
        isFailed ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" :
        isImpacted ? "border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] bg-orange-500/10" :
        isSPOF ? "border-[var(--risk-critical-border)]" : "border-transparent"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2 border-[var(--bg-base)] bg-[var(--text-tertiary)]"
      />
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          {isSPOF && (
            <div className="text-red-400" title="Single Point of Failure">
              <ShieldX size={16} />
            </div>
          )}
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {agent.name}
          </span>
        </div>
        <span className={clsx("px-2 py-0.5 text-xs font-semibold rounded-full capitalize", riskClass)}>
          {agent.criticality}
        </span>
      </div>

      <div className="space-y-1 mt-2 border-t border-[var(--border-default)] pt-2">
        <div className="flex items-center text-xs text-[var(--text-secondary)]">
          <User size={14} className="mr-1.5 opacity-70" />
          <span>{agent.owner || <span className="text-red-400 italic">Orphaned</span>}</span>
        </div>
        
        {isFailed && (
          <div className="mt-2 text-xs font-bold text-red-400 animate-pulse">
            [ SIMULATING FAILURE ]
          </div>
        )}
        {isImpacted && (
          <div className="mt-2 text-xs font-bold text-orange-400">
            [ CASCADE IMPACT ]
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2 border-[var(--bg-base)] bg-[var(--text-tertiary)]"
      />
    </div>
  );
}
