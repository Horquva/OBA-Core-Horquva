import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { TopBar } from '@/components/shell/TopBar';
import { FreshnessIndicator } from '@/components/shell/FreshnessIndicator';
import { AskField } from '@/components/shell/AskField';
import { BellPopover } from '@/components/shell/BellPopover';
import { SessionProvider } from '@/lib/session';
import type { ChangeEventView, Session } from '@/types/view';

// Mock navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('TopBar & Navigation Shell (Task 16)', () => {
  const adminSession: Session = {
    userId: 'u1',
    name: 'Admin User',
    email: 'admin@acme.corp',
    role: 'admin',
    isHrManager: true,
    title: 'Platform Admin',
  };

  const sampleEvents: ChangeEventView[] = [
    {
      id: 'evt-1',
      kind: 'credential_invalidated',
      title: 'AWS Key Revoked',
      impact: 'Stripe sync credentials expired',
      href: '/assets/1',
      detectedAt: '2026-10-01T12:00:00Z',
    },
  ];

  describe('FreshnessIndicator', () => {
    const freshness = {
      latestDataAt: '2025-01-01T00:00:00.000Z',
      sources: [
        { source: 'entra', latestAt: '2025-01-01T00:00:00.000Z' },
        { source: 'n8n', latestAt: null },
      ],
      syncStatus: 'not_tracked' as const,
    };

    it('shows the newest real data date and never a made-up sync count', async () => {
      const { container } = render(<FreshnessIndicator freshness={freshness} />);
      expect(screen.getByText(/Newest data Jan 1, 2025/)).toBeInTheDocument();
      expect(screen.queryByText(/synced/)).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'View data freshness details' }));
      const dialog = screen.getByRole('dialog', { name: 'Data freshness breakdown' });
      expect(dialog).toHaveTextContent('Microsoft Entra ID');
      expect(dialog).toHaveTextContent('Unknown');
      expect(dialog).toHaveTextContent("Connector sync status isn't tracked yet.");
      expect(screen.queryByText(/operational|synchronized/i)).toBeNull();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('says when freshness could not be loaded', () => {
      render(<FreshnessIndicator freshness={null} />);
      expect(screen.getByText('Data age unavailable')).toBeInTheDocument();
    });
  });

  describe('AskField', () => {
    it('submits search query and navigates to /ask', () => {
      render(<AskField />);
      const input = screen.getByRole('searchbox');

      fireEvent.change(input, { target: { value: 'Who owns Billing Sync?' } });
      fireEvent.submit(input);

      expect(mockPush).toHaveBeenCalledWith('/ask?q=Who%20owns%20Billing%20Sync%3F');
    });
  });

  describe('BellPopover', () => {
    it('renders event count badge and handles acknowledge callback', async () => {
      const handleAck = vi.fn();
      const { container } = render(
        <BellPopover events={sampleEvents} onAcknowledge={handleAck} />
      );

      const bell = screen.getByRole('button', { name: /Notifications: 1 unread changes/ });
      expect(bell).toBeInTheDocument();
      fireEvent.click(bell);

      expect(screen.getByText('AWS Key Revoked')).toBeInTheDocument();

      const ackBtn = screen.getByRole('button', { name: 'Acknowledge' });
      fireEvent.click(ackBtn);
      expect(handleAck).toHaveBeenCalledWith('evt-1');

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('BellPopover failure states', () => {
    it('a failed load is shown as a failure with retry, never "All caught up"', () => {
      const retry = vi.fn();
      render(<BellPopover error="Could not load changes: offline" onRetry={retry} />);
      const bell = screen.getByRole('button', { name: 'Notifications: could not load changes' });
      fireEvent.click(bell);
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load changes: offline');
      expect(screen.queryByText('All caught up')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(retry).toHaveBeenCalled();
    });

    it('shows loading, not "All caught up", before the feed arrives', () => {
      render(<BellPopover />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications: loading' }));
      expect(screen.getByText('Loading changes…')).toBeInTheDocument();
      expect(screen.queryByText('All caught up')).toBeNull();
    });

    it('viewers get no Acknowledge buttons when no handler is passed', () => {
      render(<BellPopover events={sampleEvents} />);
      fireEvent.click(screen.getByRole('button', { name: /Notifications: 1 unread/ }));
      expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
    });
  });

  describe('TopBar', () => {
    it('renders all components and dev session badge', async () => {
      const { container } = render(
        <SessionProvider initialSession={adminSession}>
          <TopBar
            title="Overview"
            events={sampleEvents}
          />
        </SessionProvider>
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByTestId('dev-session-badge')).toHaveTextContent('Dev: admin');

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
