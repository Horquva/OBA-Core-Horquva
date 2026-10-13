'use client';

import * as React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { EntityKind } from '@/types/view';
import { Avatar } from '@/components/ui/Avatar';
import { EntityKindIcon, kindLabel } from '@/components/ui/EntityKindIcon';
import { cn } from '@/lib/cn';

export interface MapNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  kind: EntityKind;
  ring: 'fail' | 'unknown' | null;
  isDimmed?: boolean;
  isBlastRadius?: boolean;
  isRoot?: boolean;
  isSelected?: boolean;
  /** Single click: inspect. */
  onSelect?: (id: string) => void;
  /** Double click: centre the map here. */
  onCentre?: (id: string) => void;
}

export type CustomMapNode = Node<MapNodeData>;

/** Older mock data says "workflow"; the product calls these automations. */
export const nodeKindLabel = (kind: string) => (kind === 'workflow' ? 'Automation' : kindLabel(kind));

const STATUS_TEXT = { fail: ', failing a check', unknown: ', has unknown facts' } as const;

/**
 * One card for every kind: type icon (or avatar), name, type label.
 * Status is a dot plus edge treatment, never a glow; the centred node gets an amber outline.
 */
function MapNodeCard({ data }: NodeProps<CustomMapNode>) {
  const { id, name, kind, ring, isDimmed, isBlastRadius, isRoot, isSelected } = data;
  const label = nodeKindLabel(kind);
  const isPerson = kind === 'person';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${name}${ring ? STATUS_TEXT[ring] : ''}`}
      onClick={() => data.onSelect?.(id)}
      onDoubleClick={() => data.onCentre?.(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          data.onSelect?.(id);
        }
      }}
      className={cn(
        'group relative flex w-[220px] cursor-pointer select-none items-center gap-2.5 rounded-panel border bg-surface px-2.5 py-2 shadow-panel transition-[opacity,border-color,box-shadow] duration-150',
        ring === 'fail' ? 'border-st-fail/60 shadow-[inset_3px_0_0_var(--st-fail)]' : ring === 'unknown' ? 'border-dashed border-ink-3' : 'border-rule hover:border-ink-3',
        isBlastRadius && 'bg-[color-mix(in_srgb,var(--amber)_8%,var(--surface))]',
        isRoot && 'outline outline-2 outline-offset-2 outline-amber',
        isSelected && !isRoot && 'outline outline-2 outline-offset-2 outline-ink-3',
        isDimmed ? 'pointer-events-none opacity-20' : 'opacity-100',
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-rule" />

      {isPerson ? (
        <Avatar name={name} size={32} />
      ) : (
        <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-rule bg-surface-sunken text-ink-2">
          <EntityKindIcon kind={(kind as string) === 'workflow' ? 'automation' : kind} className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block break-words text-xs font-medium leading-snug text-ink" title={name}>
          {name}
        </span>
        <span className="block text-[11px] leading-snug text-ink-3">{label}</span>
      </span>
      {ring === 'fail' && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-st-fail" />}

      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-rule" />
    </div>
  );
}

// Named exports kept for callers and tests; they all render the same card.
export const PersonNode = MapNodeCard;
export const AutomationNode = MapNodeCard;
export const VendorModelNode = MapNodeCard;
export const CredentialNode = MapNodeCard;

// Keyed by the entity kinds the backend sends, plus the older mock kinds.
// A kind missing here renders as React Flow's blank default box.
export const nodeTypes = {
  person: MapNodeCard,
  automation: MapNodeCard,
  workflow: MapNodeCard,
  app: MapNodeCard,
  process: MapNodeCard,
  group: MapNodeCard,
  model: MapNodeCard,
  vendor: MapNodeCard,
  system: MapNodeCard,
  credential: MapNodeCard,
  ai_agent: MapNodeCard,
};
