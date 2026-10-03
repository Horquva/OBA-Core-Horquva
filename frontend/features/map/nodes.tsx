'use client';

import * as React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { EntityKind } from '@/types/view';
import { cn } from '@/lib/cn';

export interface MapNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  kind: EntityKind;
  ring: 'fail' | 'unknown' | null;
  isDimmed?: boolean;
  isBlastRadius?: boolean;
  isRoot?: boolean;
  onSelect?: (id: string) => void;
}

export type CustomMapNode = Node<MapNodeData>;

function getRingClass(ring: 'fail' | 'unknown' | null, isRoot?: boolean, isBlastRadius?: boolean) {
  if (ring === 'fail') {
    return 'border-2 border-st-fail shadow-[0_0_12px_rgba(179,38,30,0.35)]';
  }
  if (ring === 'unknown') {
    return 'border-2 border-dashed border-ev-unknown';
  }
  if (isBlastRadius) {
    return 'border-2 border-amber shadow-[0_0_10px_rgba(232,135,15,0.4)]';
  }
  if (isRoot) {
    return 'border-2 border-ink ring-2 ring-ink/10';
  }
  return 'border border-rule hover:border-ink-3';
}

/**
 * Person Node: Circular shape (rounded-full)
 */
export function PersonNode({ data }: NodeProps<CustomMapNode>) {
  const { name, ring, isDimmed, isBlastRadius, isRoot } = data;
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Person: ${name}${ring === 'fail' ? ' (failing checks)' : ''}`}
      onClick={() => data.onSelect?.(data.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          data.onSelect?.(data.id);
        }
      }}
      className={cn(
        'group relative flex h-20 w-20 flex-col items-center justify-center rounded-full bg-surface p-2 text-center transition-all cursor-pointer select-none',
        getRingClass(ring, isRoot, isBlastRadius),
        isDimmed ? 'opacity-15 pointer-events-none' : 'opacity-100 hover:scale-105',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-rule" />

      <span className="font-serif text-sm font-semibold text-ink leading-tight">
        {initials}
      </span>
      <span className="mt-0.5 max-w-[70px] truncate text-[10px] text-ink-2 font-medium">
        {name}
      </span>

      {isRoot && (
        <span className="absolute -top-2 rounded-badge bg-ink px-1.5 py-0.2 text-[9px] font-mono text-paper">
          Root
        </span>
      )}

      <Handle type="source" position={Position.Right} className="!bg-rule" />
    </div>
  );
}

/**
 * Automation / Workflow Node: Hexagonal chamfered shape
 */
export function AutomationNode({ data }: NodeProps<CustomMapNode>) {
  const { name, ring, isDimmed, isBlastRadius, isRoot } = data;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Automation: ${name}${ring === 'fail' ? ' (failing check)' : ''}`}
      onClick={() => data.onSelect?.(data.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          data.onSelect?.(data.id);
        }
      }}
      className={cn(
        'group relative flex min-w-[150px] max-w-[190px] flex-col rounded-card bg-surface px-3 py-2 transition-all cursor-pointer select-none shadow-xs',
        getRingClass(ring, isRoot, isBlastRadius),
        isDimmed ? 'opacity-15 pointer-events-none' : 'opacity-100 hover:scale-105',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-rule" />

      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="rounded-badge bg-bronze/15 px-1.5 py-0.2 text-[10px] font-mono font-semibold uppercase text-bronze-deep">
          Workflow
        </span>
        {ring === 'fail' && (
          <span className="h-2 w-2 rounded-full bg-st-fail shrink-0" title="Check Failed" />
        )}
      </div>

      <span className="font-serif text-xs font-medium text-ink truncate leading-snug">
        {name}
      </span>

      {isRoot && (
        <span className="absolute -top-2 right-2 rounded-badge bg-ink px-1.5 py-0.2 text-[9px] font-mono text-paper">
          Focused
        </span>
      )}

      <Handle type="source" position={Position.Right} className="!bg-rule" />
    </div>
  );
}

/**
 * Vendor & AI Model Node: Rectangular card
 */
export function VendorModelNode({ data }: NodeProps<CustomMapNode>) {
  const { name, kind, ring, isDimmed, isBlastRadius, isRoot } = data;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${kind === 'model' ? 'AI Model' : 'Vendor'}: ${name}`}
      onClick={() => data.onSelect?.(data.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          data.onSelect?.(data.id);
        }
      }}
      className={cn(
        'group relative flex min-w-[140px] max-w-[180px] flex-col rounded-control bg-surface px-3 py-2 transition-all cursor-pointer select-none shadow-xs',
        getRingClass(ring, isRoot, isBlastRadius),
        isDimmed ? 'opacity-15 pointer-events-none' : 'opacity-100 hover:scale-105',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-rule" />

      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="rounded-badge bg-surface-sunken px-1.5 py-0.2 text-[10px] font-mono capitalize text-ink-3">
          {kind === 'model' ? 'AI Model' : 'Vendor'}
        </span>
      </div>

      <span className="font-serif text-xs font-medium text-ink truncate leading-snug">
        {name}
      </span>

      <Handle type="source" position={Position.Right} className="!bg-rule" />
    </div>
  );
}

/**
 * Credential Node: Rounded square card
 */
export function CredentialNode({ data }: NodeProps<CustomMapNode>) {
  const { name, ring, isDimmed, isBlastRadius, isRoot } = data;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Credential: ${name}`}
      onClick={() => data.onSelect?.(data.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          data.onSelect?.(data.id);
        }
      }}
      className={cn(
        'group relative flex min-w-[130px] max-w-[170px] flex-col rounded-card bg-surface px-3 py-2 transition-all cursor-pointer select-none shadow-xs',
        getRingClass(ring, isRoot, isBlastRadius),
        isDimmed ? 'opacity-15 pointer-events-none' : 'opacity-100 hover:scale-105',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-rule" />

      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="rounded-badge bg-amber/15 px-1.5 py-0.2 text-[10px] font-mono font-semibold uppercase text-amber-ink">
          Credential
        </span>
      </div>

      <span className="font-serif text-xs font-medium text-ink truncate leading-snug">
        {name}
      </span>

      <Handle type="source" position={Position.Right} className="!bg-rule" />
    </div>
  );
}

export const nodeTypes = {
  person: PersonNode,
  workflow: AutomationNode,
  model: VendorModelNode,
  vendor: VendorModelNode,
  system: VendorModelNode,
  credential: CredentialNode,
};
