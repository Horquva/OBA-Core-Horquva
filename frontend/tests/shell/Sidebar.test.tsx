import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Sidebar } from '@/components/shell/Sidebar';
import { BottomTabBar } from '@/components/shell/BottomTabBar';
import { SessionProvider } from '@/lib/session';
import type { Session } from '@/types/view';

// Mock pathname
let currentPathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Sidebar & Navigation Shell (Task 17)', () => {
  const adminSession: Session = {
    userId: 'u1',
    name: 'Admin User',
    email: 'admin@acme.corp',
    role: 'admin',
    isHrManager: true,
    title: 'Platform Admin',
  };

  describe('Sidebar component', () => {
    it('renders Ask OBA first, the 7 core items, then settings', async () => {
      currentPathname = '/overview';
      const { container } = render(
        <SessionProvider initialSession={adminSession}>
          <Sidebar
            departuresCount={3}
            actionsCount={12}
            settingsCount={2}
          />
        </SessionProvider>
      );

      // Check Brand
      expect(screen.getByText('Horquva')).toBeInTheDocument();
      expect(screen.getByText(/OBA · Organizational Brain Analysis/)).toBeInTheDocument();

      // Ask OBA leads the primary navigation, in this order
      const primary = screen.getByRole('navigation', { name: 'Primary' });
      const labels = ['Ask OBA', 'Overview', 'Departures', 'People & Teams', 'Assets', 'Map', 'What-If', 'Actions'];
      expect(within(primary).getAllByRole('link').map((a) => a.textContent?.replace(/\d+$/, '').trim())).toEqual(labels);
      expect(screen.getByRole('link', { name: 'Ask OBA' })).toHaveAttribute('href', '/');
      expect(screen.getByText('Settings')).toBeInTheDocument();

      // Verify count badges
      expect(screen.getByText('3')).toBeInTheDocument(); // departures
      expect(screen.getByText('12')).toBeInTheDocument(); // actions
      expect(screen.getByText('2')).toBeInTheDocument(); // settings

      // Overview should be current page, and only it
      const overviewLink = screen.getByRole('link', { name: /overview/i });
      expect(overviewLink).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Ask OBA' })).not.toHaveAttribute('aria-current');

      // Accessibility audit
      expect(await axe(container)).toHaveNoViolations();
    });

    it('handles compact tablet rail mode', () => {
      currentPathname = '/departures';
      render(
        <SessionProvider initialSession={adminSession}>
          <Sidebar compact departuresCount={5} />
        </SessionProvider>
      );

      // In compact mode, text labels are omitted from main flow but available via title
      const departuresLink = screen.getByTitle('Departures');
      expect(departuresLink).toBeInTheDocument();
      expect(departuresLink).toHaveAttribute('aria-current', 'page');
    });

    it('toggles UserMenu preferences modal', () => {
      render(
        <SessionProvider initialSession={adminSession}>
          <Sidebar />
        </SessionProvider>
      );

      const userBtn = screen.getByRole('button', { name: /user settings for admin user/i });
      expect(userBtn).toBeInTheDocument();

      fireEvent.click(userBtn);

      expect(screen.getByRole('dialog', { name: 'User preferences and theme' })).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Dev Role Emulation')).toBeInTheDocument();
    });
  });

  describe('BottomTabBar component', () => {
    it('renders 5 mobile tabs and badges', async () => {
      currentPathname = '/actions';
      const { container } = render(
        <BottomTabBar departuresCount={2} actionsCount={7} />
      );

      expect(screen.getByText('Ask')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Departures')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();

      const actionsLink = screen.getByRole('link', { name: /actions/i });
      expect(actionsLink).toHaveAttribute('aria-current', 'page');

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
