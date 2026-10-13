import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SentenceBuilder, SentenceBuilderState } from '@/components/ui/SentenceBuilder';

describe('What-If SentenceBuilder', () => {
  const people = [
    { id: 'p1', kind: 'person' as const, name: 'Omar Haddad', title: 'Lead Architect' },
    { id: 'p2', kind: 'person' as const, name: 'Elena Rostova', title: 'DevOps' },
  ];

  const entities = [
    { id: 'e1', kind: 'vendor' as const, name: 'OpenAI API' },
    { id: 'e2', kind: 'model' as const, name: 'Claude 3.5 Sonnet' },
  ];

  it('renders initial sentence structure and passes axe audit', async () => {
    const initialState: SentenceBuilderState = {
      persons: [people[0]],
      entities: [entities[0]],
    };

    const handleChange = vi.fn();
    const handleSimulate = vi.fn();

    const { container } = render(
      <SentenceBuilder
        value={initialState}
        onChange={handleChange}
        onSimulate={handleSimulate}
        peopleOptions={people}
        entityOptions={entities}
      />
    );

    expect(screen.getByText('What if')).toBeInTheDocument();
    expect(screen.getByText('Omar Haddad')).toBeInTheDocument();
    expect(screen.getByText('OpenAI API')).toBeInTheDocument();
    expect(screen.getByText('leaves')).toBeInTheDocument();
    expect(screen.getByText('goes down?')).toBeInTheDocument();

    const simBtn = screen.getByRole('button', { name: 'Run simulation' });
    expect(simBtn).toBeEnabled();
    fireEvent.click(simBtn);
    expect(handleSimulate).toHaveBeenCalledWith(initialState);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('handles removal of person and entity chips', () => {
    const state: SentenceBuilderState = {
      persons: [people[0]],
      entities: [entities[0]],
    };

    const handleChange = vi.fn();

    render(
      <SentenceBuilder
        value={state}
        onChange={handleChange}
        peopleOptions={people}
        entityOptions={entities}
      />
    );

    const removePersonBtn = screen.getByRole('button', { name: 'Remove Omar Haddad' });
    fireEvent.click(removePersonBtn);
    expect(handleChange).toHaveBeenCalledWith({
      persons: [],
      entities: [entities[0]],
    });

    const removeEntityBtn = screen.getByRole('button', { name: 'Remove OpenAI API' });
    fireEvent.click(removeEntityBtn);
    expect(handleChange).toHaveBeenCalledWith({
      persons: [people[0]],
      entities: [],
    });
  });

  it('disables simulate button when no persons or entities are selected', () => {
    const emptyState: SentenceBuilderState = {
      persons: [],
      entities: [],
    };

    render(
      <SentenceBuilder
        value={emptyState}
        onChange={() => {}}
        peopleOptions={people}
        entityOptions={entities}
      />
    );

    const simBtn = screen.getByRole('button', { name: 'Run simulation' });
    expect(simBtn).toBeDisabled();
  });
});
