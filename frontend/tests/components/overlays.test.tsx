import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { SideSheet } from '@/components/ui/SideSheet';
import { FullPageWizard } from '@/components/ui/FullPageWizard';
import { LargeScreenNotice } from '@/components/ui/LargeScreenNotice';

interface Item {
  id: string;
  name: string;
  count: number;
}

describe('Tables, Overlays & Wizards', () => {
  describe('DataTable', () => {
    const columns: Column<Item>[] = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'count', header: 'Count', align: 'right', sortable: true },
    ];

    const data: Item[] = [
      { id: '1', name: 'Invoice Automation', count: 14 },
      { id: '2', name: 'Billing Webhook', count: 3 },
    ];

    it('renders table data and passes axe', async () => {
      const handleRowClick = vi.fn();
      const { container } = render(
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          onRowClick={handleRowClick}
        />
      );

      expect(screen.getByText('Invoice Automation')).toBeInTheDocument();
      expect(screen.getByText('Billing Webhook')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Invoice Automation'));
      expect(handleRowClick).toHaveBeenCalledWith(data[0]);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('handles column sorting callbacks', () => {
      const handleSort = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          sort={{ key: 'name', direction: 'asc' }}
          onSort={handleSort}
        />
      );

      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);
      expect(handleSort).toHaveBeenCalledWith('name', 'desc');
    });

    it('renders empty state when data array is empty', () => {
      render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={(item) => item.id}
          emptyTitle="No automations found"
        />
      );

      expect(screen.getByText('No automations found')).toBeInTheDocument();
    });
  });

  describe('Drawer and SideSheet', () => {
    it('renders drawer when open and handles escape and backdrop dismissal', async () => {
      const handleClose = vi.fn();
      const { container, rerender } = render(
        <Drawer
          isOpen={true}
          onClose={handleClose}
          title="Asset Details"
          description="Inspection sheet"
        >
          <p>Sheet body content</p>
        </Drawer>
      );

      expect(screen.getByRole('dialog', { name: 'Asset Details' })).toBeInTheDocument();
      expect(screen.getByText('Sheet body content')).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Click backdrop
      const backdrop = screen.getByTestId('drawer-backdrop');
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(2);

      // Re-render closed
      rerender(
        <Drawer isOpen={false} onClose={handleClose} title="Asset Details">
          <p>Sheet body content</p>
        </Drawer>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders SideSheet with custom size', () => {
      render(
        <SideSheet isOpen={true} onClose={() => {}} title="Side Sheet" size="lg">
          <p>Large side sheet</p>
        </SideSheet>
      );
      expect(screen.getByText('Large side sheet')).toBeInTheDocument();
    });
  });

  describe('FullPageWizard', () => {
    const steps = [
      { id: 'person', title: 'Select Departing Person' },
      { id: 'impact', title: 'Review Direct Impact' },
      { id: 'confirm', title: 'Schedule Plan' },
    ];

    it('navigates through steps and completes wizard', async () => {
      const handleStepChange = vi.fn();
      const handleCancel = vi.fn();
      const handleComplete = vi.fn();

      const { container, rerender } = render(
        <FullPageWizard
          title="Plan Departure"
          steps={steps}
          currentStepIndex={0}
          onStepChange={handleStepChange}
          onCancel={handleCancel}
          onComplete={handleComplete}
        >
          <p>Step 1 content</p>
        </FullPageWizard>
      );

      expect(screen.getByRole('heading', { name: 'Plan Departure' })).toBeInTheDocument();
      expect(screen.getByText('Step 1 content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

      // Next Step
      fireEvent.click(screen.getByRole('button', { name: 'Next Step →' }));
      expect(handleStepChange).toHaveBeenCalledWith(1);

      // Step 2
      rerender(
        <FullPageWizard
          title="Plan Departure"
          steps={steps}
          currentStepIndex={2}
          onStepChange={handleStepChange}
          onCancel={handleCancel}
          onComplete={handleComplete}
        >
          <p>Step 3 content</p>
        </FullPageWizard>
      );

      expect(screen.getByRole('button', { name: 'Confirm & Finish' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Confirm & Finish' }));
      expect(handleComplete).toHaveBeenCalledTimes(1);

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('LargeScreenNotice', () => {
    it('renders on small viewport and dismisses on click', async () => {
      // Mock window innerWidth
      window.innerWidth = 800;
      const { container } = render(<LargeScreenNotice thresholdPx={1000} />);

      expect(screen.getByLabelText('Viewport size notification')).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();

      const dismissBtn = screen.getByLabelText('Dismiss notice');
      fireEvent.click(dismissBtn);

      expect(screen.queryByLabelText('Viewport size notification')).not.toBeInTheDocument();
    });
  });
});
