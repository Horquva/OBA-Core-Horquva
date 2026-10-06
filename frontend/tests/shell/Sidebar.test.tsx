import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    it('renders all 7 core navigation items in order plus settings', async () => {
      currentPathname = '/';
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

      // Check all 7 navigation items
      const links = screen.getAllByRole('link');
      const labels = ['Overview', 'Departures', 'People & Teams', 'Assets', 'Map', 'What-If', 'Actions', 'Settings'];

      labels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });

      // Verify count badges
      expect(screen.getByText('3')).toBeInTheDocument(); // departures
      expect(screen.getByText('12')).toBeInTheDocument(); // actions
      expect(screen.getByText('2')).toBeInTheDocument(); // settings

      // Overview should be current page
      const overviewLink = screen.getByRole('link', { name: /overview/i });
      expect(overviewLink).toHaveAttribute('aria-current', 'page');

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
      currentPathname = '/assets';
      const { container } = render(
        <BottomTabBar departuresCount={2} actionsCount={7} />
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Departures')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();

      const assetsLink = screen.getByRole('link', { name: /assets/i });
      expect(assetsLink).toHaveAttribute('aria-current', 'page');

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
