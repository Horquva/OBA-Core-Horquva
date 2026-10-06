'use client';

import * as React from 'react';
import type { EntityKind, EntityRef } from '@/types/view';
import { cn } from '@/lib/cn';
import { PersonPicker, PersonItem } from './PersonPicker';
import { EntityPicker } from './EntityPicker';
import { Button } from './Button';

export interface SentenceBuilderState {
  persons: EntityRef[];
  entities: EntityRef[];
}

export interface SentenceBuilderProps {
  value: SentenceBuilderState;
  onChange: (nextState: SentenceBuilderState) => void;
  onSimulate?: (state: SentenceBuilderState) => void;
  peopleOptions?: PersonItem[];
  entityOptions?: EntityRef[];
  onSearchPeople?: (q: string) => Promise<PersonItem[]> | PersonItem[];
  onSearchEntities?: (q: string) => Promise<EntityRef[]> | EntityRef[];
  isLoading?: boolean;
  className?: string;
}

export function SentenceBuilder({
  value,
  onChange,
  onSimulate,
  peopleOptions = [],
  entityOptions = [],
  onSearchPeople,
  onSearchEntities,
  isLoading = false,
  className,
}: SentenceBuilderProps) {
  const [addingType, setAddingType] = React.useState<'person' | 'entity' | null>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  // Opening a picker puts the cursor straight into its search box.
  React.useEffect(() => {
    if (addingType) pickerRef.current?.querySelector('input')?.focus();
  }, [addingType]);

  const handleRemovePerson = (id: string) => {
    onChange({
      ...value,
      persons: value.persons.filter((p) => p.id !== id),
    });
  };

  const handleAddPerson = (person: EntityRef | null) => {
    if (person && !value.persons.some((p) => p.id === person.id)) {
      onChange({
        ...value,
        persons: [...value.persons, person],
      });
    }
    setAddingType(null);
  };

  const handleRemoveEntity = (id: string) => {
    onChange({
      ...value,
      entities: value.entities.filter((e) => e.id !== id),
    });
  };

  const handleAddEntity = (entity: EntityRef | null) => {
    if (entity && !value.entities.some((e) => e.id === entity.id)) {
      onChange({
        ...value,
        entities: [...value.entities, entity],
      });
    }
    setAddingType(null);
  };

  const hasSelections = value.persons.length > 0 || value.entities.length > 0;

  return (
    <div
      role="region"
      aria-label="What-If simulation sentence builder"
      className={cn(
        'rounded-card border border-rule bg-surface p-6 sm:p-8 shadow-xs space-y-6',
        className
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 font-serif text-2xl md:text-3xl text-ink leading-relaxed font-normal">
        <span className="text-ink">What if</span>

        {/* Selected Persons */}
        {value.persons.map((person) => (
          <span
            key={person.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-3.5 py-0.5 font-sans text-sm font-medium text-ink transition-colors"
          >
            <span>{person.name}</span>
            <button
              type="button"
              onClick={() => handleRemovePerson(person.id)}
              aria-label={`Remove ${person.name}`}
              className="text-amber-ink hover:text-ink cursor-pointer focus:outline-none"
            >
              ✕
            </button>
          </span>
        ))}

        {/* Add Person Trigger */}
        {addingType === 'person' ? (
          <div ref={pickerRef} className="inline-block w-64 font-sans text-sm">
            <PersonPicker
              options={peopleOptions}
              onSearch={onSearchPeople}
              onChange={handleAddPerson}
              placeholder="Pick person..."
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingType('person')}
            className="inline-flex items-center rounded-control border border-dashed border-ink-3/40 px-2.5 py-0.5 font-sans text-xs font-medium text-ink-2 hover:border-amber hover:text-amber-ink transition-colors cursor-pointer"
          >
            + person
          </button>
        )}

        <span className="text-ink">
          {value.persons.length > 1 ? 'leave' : 'leaves'}
        </span>

        {/* And Connector */}
        <span className="text-ink">and</span>

        {/* Selected Entities / Vendors */}
        {value.entities.map((entity) => (
          <span
            key={entity.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface-sunken px-3.5 py-0.5 font-sans text-sm font-medium text-ink transition-colors"
          >
            <span>{entity.name}</span>
            <button
              type="button"
              onClick={() => handleRemoveEntity(entity.id)}
              aria-label={`Remove ${entity.name}`}
              className="text-ink-3 hover:text-ink cursor-pointer focus:outline-none"
            >
              ✕
            </button>
          </span>
        ))}

        {/* Add Entity Trigger */}
        {addingType === 'entity' ? (
          <div ref={pickerRef} className="inline-block w-64 font-sans text-sm">
            <EntityPicker
              options={entityOptions}
              onSearch={onSearchEntities}
              onChange={handleAddEntity}
              placeholder="Pick a service or automation..."
              allowedKinds={['vendor', 'model', 'automation', 'credential', 'app'] as EntityKind[]}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingType('entity')}
            className="inline-flex items-center rounded-control border border-dashed border-ink-3/40 px-2.5 py-0.5 font-sans text-xs font-medium text-ink-2 hover:border-amber hover:text-amber-ink transition-colors cursor-pointer"
          >
            + service or automation
          </button>
        )}

        <span className="text-ink">
          {value.entities.length > 1 ? 'go down' : 'goes down'}?
        </span>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-rule">
        <p className="text-xs text-ink-3">
          Simulates immediate single point of failure (SPOF) exposure and orphan workflows across the graph.
        </p>
        <Button
          variant="primary"
          size="md"
          disabled={!hasSelections || isLoading}
          isLoading={isLoading}
          onClick={() => onSimulate?.(value)}
        >
          Simulate Impact →
        </Button>
      </div>
    </div>
  );
}
