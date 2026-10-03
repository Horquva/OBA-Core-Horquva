import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { AppShell } from '@/components/shell/AppShell';
import { SessionProvider } from '@/lib/session';
import type { Session } from '@/types/view';

// Mock navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock API clients to return empty/clean responses
vi.mock('@/lib/api/changes', () => ({
  fetchChanges: vi.fn().mockResolvedValue([]),
  acknowledgeChange: vi.fn().mockResolvedValue(undefined),
  acknowledgeAllChanges: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api/overview', () => ({
  fetchNavCounts: vi.fn().mockResolvedValue({
    departuresSoon: 2,
    openCriticalActions: 5,
    identityPending: 1,
  }),
}));

describe('AppShell Component (Task 18)', () => {
  const adminSession: Session = {
    userId: 'u1',
    name: 'Admin User',
    email: 'admin@acme.corp',
    role: 'admin',
    isHrManager: true,
    title: 'Platform Admin',
  };

  it('renders Sidebar, TopBar, BottomTabBar, and children within responsive shell', async () => {
    const { container } = render(
      <SessionProvider initialSession={adminSession}>
        <AppShell>
          <div data-testid="test-content">Dashboard Content</div>
        </AppShell>
      </SessionProvider>
    );

    // Verify main landmarks
    expect(screen.getByRole('banner')).toBeInTheDocument(); // TopBar
    expect(screen.getByRole('complementary', { name: 'Main sidebar' })).toBeInTheDocument(); // Sidebar
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument(); // BottomTabBar
    expect(screen.getByTestId('test-content')).toBeInTheDocument();

    // Verify dynamic page title in TopBar (Overview appears in Sidebar, TopBar, and BottomTabBar)
    const overviewLabels = screen.getAllByText('Overview');
    expect(overviewLabels.length).toBeGreaterThanOrEqual(2);

    // Verify accessibility
    expect(await axe(container)).toHaveNoViolations();
  });
});
