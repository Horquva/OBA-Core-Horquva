'use client';

import * as React from 'react';
import { Play, Plus, X } from 'lucide-react';
import type { EntityKind, EntityRef } from '@/types/view';
import { cn } from '@/lib/cn';
import { PersonPicker, PersonItem } from './PersonPicker';
import { EntityPicker } from './EntityPicker';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { EntityKindIcon } from './EntityKindIcon';

export interface SentenceBuilderState {
  persons: EntityRef[];
  entities: EntityRef[];
}

export interface SentenceBuilderProps {
  value: SentenceBuilderState;
  onChange: (nextState: SentenceBuilderState) => void;
  onSimulate?: (state: SentenceBuilderState) => void;
  /** Clears the whole scenario; shown when something is picked. */
  onClear?: () => void;
  peopleOptions?: PersonItem[];
  entityOptions?: EntityRef[];
  onSearchPeople?: (q: string) => Promise<PersonItem[]> | PersonItem[];
  onSearchEntities?: (q: string) => Promise<EntityRef[]> | EntityRef[];
  isLoading?: boolean;
  /** Extra content under the sentence, e.g. quick starts. */
  footerNote?: React.ReactNode;
  className?: string;
}

function Chip({ entity, onRemove }: { entity: EntityRef; onRemove: () => void }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full border border-rule bg-surface-sunken pl-0.5 pr-2 align-middle text-sm font-medium text-ink">
      {entity.kind === 'person' ? (
        <Avatar name={entity.name} size={28} />
      ) : (
        <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface text-ink-2">
          <EntityKindIcon kind={entity.kind} />
        </span>
      )}
      {entity.name}
      <button type="button" onClick={onRemove} aria-label={`Remove ${entity.name}`} className="cursor-pointer rounded-full p-0.5 text-ink-3 transition-colors hover:bg-surface hover:text-ink">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-dashed border-ink-3/50 px-3 align-middle text-sm font-medium text-ink-2 transition-colors hover:border-ink-2 hover:text-ink"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </button>
  );
}

/** "What if [people] leave and [services or automations] go down?" */
export function SentenceBuilder({
  value,
  onChange,
  onSimulate,
  onClear,
  peopleOptions = [],
  entityOptions = [],
  onSearchPeople,
  onSearchEntities,
  isLoading = false,
  footerNote,
  className,
}: SentenceBuilderProps) {
  const [addingType, setAddingType] = React.useState<'person' | 'entity' | null>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  // Opening a picker puts the cursor straight into its search box.
  React.useEffect(() => {
    if (addingType) pickerRef.current?.querySelector('input')?.focus();
  }, [addingType]);

  const addPerson = (person: EntityRef | null) => {
    if (person && !value.persons.some((p) => p.id === person.id)) onChange({ ...value, persons: [...value.persons, person] });
    setAddingType(null);
  };
  const addEntity = (entity: EntityRef | null) => {
    if (entity && !value.entities.some((e) => e.id === entity.id)) onChange({ ...value, entities: [...value.entities, entity] });
    setAddingType(null);
  };

  const hasSelections = value.persons.length > 0 || value.entities.length > 0;

  return (
    <div role="region" aria-label="What-If simulation sentence builder" className={cn('rounded-panel border border-rule bg-surface shadow-panel', className)}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 px-6 py-6 text-xl font-medium leading-relaxed tracking-tight text-ink sm:px-8 sm:py-7 sm:text-2xl">
        <span>What if</span>

        {value.persons.map((person) => (
          <Chip key={person.id} entity={person} onRemove={() => onChange({ ...value, persons: value.persons.filter((p) => p.id !== person.id) })} />
        ))}

        {addingType === 'person' ? (
          <div ref={pickerRef} className="inline-block w-64 align-middle text-sm font-normal tracking-normal">
            <PersonPicker options={peopleOptions} onSearch={onSearchPeople} onChange={addPerson} placeholder="Pick a person…" />
          </div>
        ) : (
          <AddButton onClick={() => setAddingType('person')}>{value.persons.length > 0 ? 'Another person' : 'Person'}</AddButton>
        )}

        <span>{value.persons.length > 1 ? 'leave' : 'leaves'}</span>
        <span className="text-ink-3">and</span>

        {value.entities.map((entity) => (
          <Chip key={entity.id} entity={entity} onRemove={() => onChange({ ...value, entities: value.entities.filter((e) => e.id !== entity.id) })} />
        ))}

        {addingType === 'entity' ? (
          <div ref={pickerRef} className="inline-block w-64 align-middle text-sm font-normal tracking-normal">
            <EntityPicker
              options={entityOptions}
              onSearch={onSearchEntities}
              onChange={addEntity}
              placeholder="Pick a service or automation…"
              allowedKinds={['vendor', 'model', 'automation', 'credential', 'app'] as EntityKind[]}
            />
          </div>
        ) : (
          <AddButton onClick={() => setAddingType('entity')}>{value.entities.length > 0 ? 'Another service' : 'Service or automation'}</AddButton>
        )}

        <span>{value.entities.length > 1 ? 'go down?' : 'goes down?'}</span>
      </div>

      <div className="flex flex-col gap-3 border-t border-rule bg-surface-sunken/40 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="type-meta min-w-0 text-ink-3">{footerNote ?? 'Counts what loses its owner and what stops, from the facts on record.'}</div>
        <div className="flex shrink-0 items-center gap-2">
          {hasSelections && onClear && (
            <Button variant="secondary" size="sm" onClick={onClear} disabled={isLoading}>
              Clear
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={!hasSelections || isLoading}
            isLoading={isLoading}
            onClick={() => onSimulate?.(value)}
            leftIcon={!isLoading ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : undefined}
          >
            Run simulation
          </Button>
        </div>
      </div>
    </div>
  );
}
