import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Button } from '@/components/ui/Button';
import { ActionPill } from '@/components/ui/ActionPill';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Can, hasPermission } from '@/components/ui/Can';

describe('Action Elements & Controls', () => {
  describe('Button', () => {
    it('renders all 4 visual variants and passes axe', async () => {
      const { container, rerender } = render(<Button variant="primary">Primary Action</Button>);
      expect(screen.getByRole('button', { name: 'Primary Action' })).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('bg-ink');
      expect(await axe(container)).toHaveNoViolations();

      rerender(<Button variant="secondary">Secondary Action</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-surface');
      expect(await axe(container)).toHaveNoViolations();

      rerender(<Button variant="ghost">Ghost Action</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');
      expect(await axe(container)).toHaveNoViolations();

      rerender(<Button variant="destructive">Delete Item</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-st-fail');
      expect(await axe(container)).toHaveNoViolations();
    });

    it('handles loading state with spinner and aria-busy', async () => {
      const handleClick = vi.fn();
      const { container } = render(
        <Button isLoading onClick={handleClick}>
          Submitting
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toBeDisabled();

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('renders left and right icon slots', () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          Icon Button
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('Icon Button')).toBeInTheDocument();
    });
  });

  describe('ActionPill', () => {
    it('renders action pill button and handles click', async () => {
      const handleReview = vi.fn();
      const { container } = render(
        <ActionPill onClick={handleReview}>Review Ownership</ActionPill>
      );

      const pill = screen.getByRole('button', { name: 'Review Ownership' });
      expect(pill).toBeInTheDocument();
      fireEvent.click(pill);
      expect(handleReview).toHaveBeenCalledTimes(1);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('renders link when href is provided', () => {
      render(<ActionPill href="/assets/42">Inspect Asset</ActionPill>);
      const link = screen.getByRole('link', { name: 'Inspect Asset' });
      expect(link).toHaveAttribute('href', '/assets/42');
    });
  });

  describe('Tabs and TabPanel', () => {
    const tabsData = [
      { id: 'all', label: 'All Departures', count: 12 },
      { id: 'critical', label: 'Critical Only', count: 3 },
      { id: 'archived', label: 'Archived', count: 0 },
    ];

    function TabsWrapper() {
      const [active, setActive] = React.useState('all');
      return (
        <div>
          <Tabs tabs={tabsData} activeTab={active} onChange={setActive} />
          <TabPanel id="all" activeTab={active}>
            <p>All Content</p>
          </TabPanel>
          <TabPanel id="critical" activeTab={active}>
            <p>Critical Content</p>
          </TabPanel>
          <TabPanel id="archived" activeTab={active}>
            <p>Archived Content</p>
          </TabPanel>
        </div>
      );
    }

    it('switches tabs on click and cycles with arrow keys', async () => {
      const { container } = render(<TabsWrapper />);

      const allTab = screen.getByRole('tab', { name: /All Departures/ });
      const critTab = screen.getByRole('tab', { name: /Critical Only/ });

      expect(allTab).toHaveAttribute('aria-selected', 'true');
      expect(critTab).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByText('All Content')).toBeInTheDocument();

      // Click to change tab
      fireEvent.click(critTab);
      expect(critTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Critical Content')).toBeInTheDocument();
      expect(screen.queryByText('All Content')).not.toBeInTheDocument();

      // Keyboard navigation: ArrowRight from critical -> archived
      fireEvent.keyDown(critTab, { key: 'ArrowRight' });
      expect(screen.getByRole('tab', { name: /Archived/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Archived Content')).toBeInTheDocument();

      // Home key -> jumps to first tab (all)
      const archTab = screen.getByRole('tab', { name: /Archived/ });
      fireEvent.keyDown(archTab, { key: 'Home' });
      expect(screen.getByRole('tab', { name: /All Departures/ })).toHaveAttribute('aria-selected', 'true');

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('Can RBAC Gate', () => {
    it('verifies permission matrix helper', () => {
      expect(hasPermission('admin', 'admin')).toBe(true);
      expect(hasPermission('admin', 'edit')).toBe(true);
      expect(hasPermission('owner', 'edit')).toBe(true);
      expect(hasPermission('owner', 'attest')).toBe(true);
      expect(hasPermission('owner', 'admin')).toBe(false);
      expect(hasPermission('contributor', 'edit')).toBe(true);
      expect(hasPermission('contributor', 'attest')).toBe(false);
      expect(hasPermission('viewer', 'edit')).toBe(false);
      expect(hasPermission('viewer', 'export')).toBe(true);
    });

    it('renders children only when permitted, fallback when denied', () => {
      const { rerender } = render(
        <Can perform="edit" role="viewer" fallback={<span data-testid="fallback">Read Only</span>}>
          <button data-testid="edit-btn">Edit System</button>
        </Can>
      );

      expect(screen.getByTestId('fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-btn')).not.toBeInTheDocument();

      rerender(
        <Can perform="edit" role="admin" fallback={<span data-testid="fallback">Read Only</span>}>
          <button data-testid="edit-btn">Edit System</button>
        </Can>
      );

      expect(screen.getByTestId('edit-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    });
  });
});
