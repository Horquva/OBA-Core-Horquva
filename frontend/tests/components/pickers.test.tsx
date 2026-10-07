import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PersonPicker, PersonItem } from '@/components/ui/PersonPicker';
import { EntityPicker } from '@/components/ui/EntityPicker';
import type { EntityRef } from '@/types/view';

describe('Searchable Autocomplete Pickers', () => {
  const people: PersonItem[] = [
    { id: 'u1', kind: 'person', name: 'Alice Smith', email: 'alice@acme.corp', title: 'VP Eng' },
    { id: 'u2', kind: 'person', name: 'Bob Jones', email: 'bob@acme.corp', title: 'Staff SRE' },
    { id: 'u3', kind: 'person', name: 'Carol White', email: 'carol@acme.corp', title: 'Product Ops' },
  ];

  const entities: EntityRef[] = [
    { id: 'sys1', kind: 'automation', name: 'Billing Pipeline' },
    { id: 'acc1', kind: 'credential', name: 'AWS Prod Credentials' },
    { id: 'repo1', kind: 'app', name: 'Core Admin Portal' },
    { id: 'usr1', kind: 'person', name: 'Alice Smith' },
  ];

  describe('PersonPicker', () => {
    it('renders input, filters results and selects with keyboard and passes axe', async () => {
      const handleChange = vi.fn();
      const { container } = render(
        <PersonPicker options={people} onChange={handleChange} label="Assignee" />
      );

      const input = screen.getByRole('combobox');
      expect(input).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();

      // Open and type query
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Alice' } });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();

      // Navigate down and select
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleChange).toHaveBeenCalledWith(people[0]);
    });

    it('displays selected person monogram and handles removal', async () => {
      const handleChange = vi.fn();
      const { container } = render(
        <PersonPicker value={people[0]} onChange={handleChange} label="Assignee" />
      );

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('AS')).toBeInTheDocument(); // Monogram

      const removeBtn = screen.getByRole('button', { name: 'Remove Alice Smith' });
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);
      expect(handleChange).toHaveBeenCalledWith(null);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('ties a visible label to the input', () => {
      render(<PersonPicker options={people} onChange={vi.fn()} label="Assignee" />);
      expect(screen.getByLabelText('Assignee')).toBe(screen.getByRole('combobox'));
    });

    it('shows no stray caption without a label, and takes a label the screen renders itself', async () => {
      const { container } = render(
        <>
          <label htmlFor="leaver">Departing employee</label>
          <PersonPicker id="leaver" options={people} onChange={vi.fn()} />
          <PersonPicker options={people} onChange={vi.fn()} />
        </>
      );
      // Only the screen's own label is visible; the bare picker is still named for screen readers.
      expect(screen.queryByText('Person')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Departing employee')).toHaveAttribute('id', 'leaver');
      expect(screen.getByRole('combobox', { name: 'Person' })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('supports async onSearch function', async () => {
      const handleSearch = vi.fn().mockResolvedValue([people[1]]);
      render(<PersonPicker onSearch={handleSearch} onChange={() => {}} />);

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Bob' } });

      await waitFor(() => {
        expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      });
    });
  });

  describe('EntityPicker', () => {
    it('shows no stray caption without a label', () => {
      render(<EntityPicker options={entities} onChange={vi.fn()} />);
      expect(screen.queryByText('Entity')).not.toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Entity' })).toBeInTheDocument();
    });

    it('filters by allowedKinds and selects entity', async () => {
      const handleChange = vi.fn();
      const { container } = render(
        <EntityPicker
          options={entities}
          allowedKinds={['automation', 'app']}
          onChange={handleChange}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      // Only automation and app should be present
      expect(screen.getByText('Billing Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Core Admin Portal')).toBeInTheDocument();
      expect(screen.queryByText('AWS Prod Credentials')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Billing Pipeline'));
      expect(handleChange).toHaveBeenCalledWith(entities[0]);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('renders selected entity with kind badge and clear button', () => {
      const handleChange = vi.fn();
      render(<EntityPicker value={entities[1]} onChange={handleChange} />);

      expect(screen.getByText('AWS Prod Credentials')).toBeInTheDocument();
      expect(screen.getByText('credential')).toBeInTheDocument();

      const clearBtn = screen.getByRole('button', { name: 'Remove AWS Prod Credentials' });
      fireEvent.click(clearBtn);
      expect(handleChange).toHaveBeenCalledWith(null);
    });
  });
});
