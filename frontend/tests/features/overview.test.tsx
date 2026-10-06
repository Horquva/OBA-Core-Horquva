import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { OverviewView } from '@/features/overview/OverviewView';
import { SessionProvider } from '@/lib/session';
import type { Session, CoverageMetrics, ChangeSummary, ActionView, DepartureSummary, SpofAsset } from '@/types/view';

// Mock navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

// Mock API endpoints
const mockCoverage: CoverageMetrics = {
  total: 52,
  covered: 38,
  exposed: 14,
  unknown: null,
  definition: 'An asset is covered if it has a confirmed backup owner and documented runbook.',
};

const mockChanges: ChangeSummary = {
  since: 'Monday',
  peopleLeft: 2,
  backupsLost: 3,
  newlyExposed: 3,
  resolved: 1,
};

const mockActions: ActionView[] = [
  {
    id: 'act-1',
    rank: 1,
    type: 'assign_backup',
    status: 'open',
    problem: 'Billing Gateway has no secondary maintainer.',
    asset: { id: 'ast-1', kind: 'automation', name: 'Billing Gateway' },
    failingFact: 'No secondary owner found',
    criticalAssetsAffected: 4,
    checkId: 'C1',
    primary: { kind: 'assign_backup' },
    acceptedRisk: null,
    resolvedAt: null,
  },
  {
    id: 'act-2',
    rank: 2,
    type: 'name_successor',
    status: 'open',
    problem: 'Core DB migration runner relies on single credential.',
    asset: { id: 'ast-2', kind: 'automation', name: 'Core DB Migration Runner' },
    failingFact: 'Credential is tied to departing user',
    criticalAssetsAffected: 2,
    checkId: 'C3',
    primary: { kind: 'link', label: 'View', href: '/assets/2' },
    acceptedRisk: null,
    resolvedAt: null,
  },
];

const mockDepartures: DepartureSummary[] = [
  {
    id: 'dep-1',
    person: { id: 'p1', kind: 'person', name: 'Sarah Connor' },
    role: 'VP Engineering',
    team: 'Platform',
    leaveDate: '2026-11-01',
    stage: 'successor_named',
    assetsTotal: 6,
    assetsHandedOver: 4,
    hasAlert: false,
    detectedFrom: 'entra',
    group: 'upcoming',
  },
];

const mockSpof: SpofAsset[] = [
  {
    asset: { id: 'ast-10', kind: 'automation', name: 'Invoice Processing Pipeline' },
    reason: 'one owner, no backup',
    dependsOn: { id: 'p-1', kind: 'person', name: 'Sarah Connor' },
    runsPerWeek: 1200,
  },
];

vi.mock('@/lib/api/overview', () => ({
  fetchCoverage: vi.fn().mockImplementation(() => Promise.resolve(mockCoverage)),
  fetchChangeSummary: vi.fn().mockImplementation(() => Promise.resolve(mockChanges)),
  fetchSpofAssets: vi.fn().mockImplementation(() => Promise.resolve(mockSpof)),
  fetchBriefing: vi.fn().mockImplementation(() => Promise.resolve('Executive Briefing text.')),
  fetchNavCounts: vi.fn().mockResolvedValue({ departuresSoon: 1, openCriticalActions: 2, identityPending: 0 }),
}));

vi.mock('@/lib/api/actions', () => ({
  fetchActions: vi.fn().mockImplementation(() => Promise.resolve(mockActions)),
}));

vi.mock('@/lib/api/departures', () => ({
  fetchDepartures: vi.fn().mockImplementation(() => Promise.resolve(mockDepartures)),
}));

// vitest.setup's restoreAllMocks() clears these implementations after each test; re-apply them.
beforeEach(async () => {
  const overviewApi = await import('@/lib/api/overview');
  const actionsApi = await import('@/lib/api/actions');
  const departuresApi = await import('@/lib/api/departures');
  vi.mocked(overviewApi.fetchCoverage).mockImplementation(() => Promise.resolve(mockCoverage));
  vi.mocked(overviewApi.fetchChangeSummary).mockImplementation(() => Promise.resolve(mockChanges));
  vi.mocked(overviewApi.fetchSpofAssets).mockImplementation(() => Promise.resolve(mockSpof));
  vi.mocked(overviewApi.fetchBriefing).mockImplementation(() => Promise.resolve('Executive Briefing text.'));
  vi.mocked(actionsApi.fetchActions).mockImplementation(() => Promise.resolve(mockActions));
  vi.mocked(departuresApi.fetchDepartures).mockImplementation(() => Promise.resolve(mockDepartures));
});

describe('OverviewView Component (Task 19)', () => {
  const adminSession: Session = {
    userId: 'u1',
    name: 'Guido van Rossum',
    email: 'guido@python.org',
    role: 'admin',
    isHrManager: true,
    title: 'Benevolent Dictator',
  };

  it('renders hero greeting, coverage strip, priority cards, departures, and SPOF assets', async () => {
    const { container } = render(
      <SessionProvider initialSession={adminSession}>
        <OverviewView />
      </SessionProvider>
    );

    // Verify hero greeting
    await waitFor(() => {
      expect(screen.getByText(/Guido/)).toBeInTheDocument();
      expect(screen.getByText(/2 people left and 3 critical assets lost their backup/)).toBeInTheDocument();
    });

    // Verify coverage strip heading
    expect(screen.getByRole('heading', { name: /38 of 52 critical assets fully covered/i })).toBeInTheDocument();

    // Verify priority cards
    expect(screen.getByText('Billing Gateway has no secondary maintainer.')).toBeInTheDocument();
    expect(screen.getAllByText('01').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);

    // Verify upcoming departures card
    expect(screen.getByText('Upcoming Departures')).toBeInTheDocument();
    expect(screen.getAllByText('Sarah Connor').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('4 of 6')).toBeInTheDocument();

    // Verify top SPOF card
    expect(screen.getByText('Top Single Points of Failure')).toBeInTheDocument();
    expect(screen.getByText('Invoice Processing Pipeline')).toBeInTheDocument();
    expect(screen.getByText(/1,200\/wk/)).toBeInTheDocument();

    // Verify briefing card
    expect(screen.getByText('This Week’s Continuity Briefing')).toBeInTheDocument();

    // Verify accessibility
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows failures as failures — never "no changes", "zero failing checks" or empty lists', async () => {
    const overviewApi = await import('@/lib/api/overview');
    const actionsApi = await import('@/lib/api/actions');
    const departuresApi = await import('@/lib/api/departures');
    const boom = () => Promise.reject(new Error('backend down'));
    vi.mocked(overviewApi.fetchChangeSummary).mockImplementationOnce(boom);
    vi.mocked(overviewApi.fetchSpofAssets).mockImplementationOnce(boom);
    vi.mocked(overviewApi.fetchBriefing).mockImplementationOnce(boom);
    vi.mocked(actionsApi.fetchActions).mockImplementationOnce(boom);
    vi.mocked(departuresApi.fetchDepartures).mockImplementationOnce(boom);

    render(
      <SessionProvider initialSession={adminSession}>
        <OverviewView />
      </SessionProvider>
    );

    expect(await screen.findByText("We couldn't check recent changes.")).toBeInTheDocument();
    expect(await screen.findByText("We couldn't load priority actions.")).toBeInTheDocument();
    expect(await screen.findByText("This week's briefing couldn't be loaded.")).toBeInTheDocument();
    expect(screen.queryByText('Zero failing checks')).not.toBeInTheDocument();
    expect(screen.queryByText(/No changes since/)).not.toBeInTheDocument();
  });

  it('words the hero sentence from real ISO dates and leaves untracked kinds out', async () => {
    const overviewApi = await import('@/lib/api/overview');
    vi.mocked(overviewApi.fetchChangeSummary).mockResolvedValueOnce({
      since: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      sinceKind: 'first_visit_window',
      peopleLeft: 1,
      backupsLost: null,
      newlyExposed: null,
      resolved: 0,
    });

    render(
      <SessionProvider initialSession={adminSession}>
        <OverviewView />
      </SessionProvider>
    );

    expect(await screen.findByText('1 person left in the last 7 days.')).toBeInTheDocument();
  });
});
