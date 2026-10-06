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
    it('renders sync counts and toggles detail popover', async () => {
      const { container } = render(
        <FreshnessIndicator
          lastSyncedAt="2026-10-01T12:00:00Z"
          syncedSources={3}
          totalSources={3}
        />
      );

      expect(screen.getByText(/3\/3 synced/)).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'View data freshness details' });
      fireEvent.click(btn);

      expect(screen.getByRole('dialog', { name: 'Data freshness breakdown' })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
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

  describe('TopBar', () => {
    it('renders all components and dev session badge', async () => {
      const { container } = render(
        <SessionProvider initialSession={adminSession}>
          <TopBar
            title="Overview"
            lastSyncedAt="2026-10-01T12:00:00Z"
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
