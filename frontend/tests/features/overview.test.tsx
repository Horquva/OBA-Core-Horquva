import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { OverviewView } from '@/features/overview/OverviewView';
import { SessionProvider } from '@/lib/session';
import { ToastProvider } from '@/components/ui/Toast';
import { fireEvent } from '@testing-library/react';
import type { Session, OverviewCoverage, HistoryPoint, TeamSummary, ChangeSummary, ActionView, DepartureSummary, SpofAsset } from '@/types/view';

// Mock navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

// Mock API endpoints
const mockCoverage: OverviewCoverage = {
  total: 52,
  covered: 38,
  exposed: 14,
  unknown: null,
  definition: 'An asset is covered if it has a confirmed backup owner and documented runbook.',
  trend: { comparedTo: '2026-10-06', covered: 2, exposed: -1, unknown: 0 },
  exposureByCause: [
    { checkId: 'C1_UNBACKED_CRITICAL', label: 'One owner, no backup', assets: 9 },
    { checkId: 'C4_MISSING_FALLBACK', label: 'No fallback', assets: 0 },
  ],
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

const mockHistory: HistoryPoint[] = [
  { date: '2026-09-13', covered: 30, exposed: 22, unknown: 0, total: 52 },
  { date: '2026-10-13', covered: 38, exposed: 14, unknown: 0, total: 52 },
];

const mockTeams: TeamSummary[] = [
  { id: 'team:platform', name: 'Platform', memberCount: 6, rolledUp: false, coverage: { total: 5, covered: 2, exposed: 3, unknown: 0, definition: 'd' }, concentration: null },
  { id: 'team:empty', name: 'No Critical Assets', memberCount: 4, rolledUp: false, coverage: { total: 0, covered: 0, exposed: 0, unknown: 0, definition: 'd' }, concentration: null },
];

vi.mock('@/lib/api/overview', () => ({
  fetchCoverage: vi.fn().mockImplementation(() => Promise.resolve(mockCoverage)),
  fetchChangeSummary: vi.fn().mockImplementation(() => Promise.resolve(mockChanges)),
  fetchSpofAssets: vi.fn().mockImplementation(() => Promise.resolve(mockSpof)),
  fetchBriefing: vi.fn().mockImplementation(() => Promise.resolve('Executive Briefing text.')),
  fetchNavCounts: vi.fn().mockResolvedValue({ departuresSoon: 1, openCriticalActions: 2, identityPending: 0 }),
  fetchCoverageHistory: vi.fn().mockImplementation(() => Promise.resolve(mockHistory)),
}));

vi.mock('@/lib/api/people', () => ({
  fetchTeams: vi.fn().mockImplementation(() => Promise.resolve({ teams: mockTeams, minGroupSize: 3 })),
}));

const mockDownload = vi.fn();
vi.mock('@/lib/api/client', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/api/client')>()),
  downloadFile: (...args: unknown[]) => mockDownload(...args),
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
  vi.mocked(overviewApi.fetchCoverageHistory).mockImplementation(() => Promise.resolve(mockHistory));
  const peopleApi = await import('@/lib/api/people');
  vi.mocked(peopleApi.fetchTeams).mockImplementation(() => Promise.resolve({ teams: mockTeams, minGroupSize: 3 }));
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
      <ToastProvider><SessionProvider initialSession={adminSession}>
        <OverviewView />
      </SessionProvider></ToastProvider>
    );

    // Verify header: greeting, one linked chip per counted change, briefing link
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Guido/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '2 people left' })).toHaveAttribute('href', '/departures');
    });
    expect(screen.getByRole('link', { name: '3 lost their backup' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '3 newly exposed' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '1 resolved' })).toHaveAttribute('href', '/actions');
    expect(screen.getByRole('link', { name: /Read this week.s briefing/ })).toHaveAttribute('href', '/briefing');

    // Verify coverage strip heading
    expect(screen.getByRole('heading', { name: /38 of 52 critical assets fully covered/i })).toBeInTheDocument();

    // Verify posture panel: trend deltas and stat tiles
    expect(screen.getByRole('link', { name: /Exposed\s*14/ })).toHaveAttribute('href', '/assets');
    expect(screen.getByRole('link', { name: /Active departures\s*1/ })).toHaveAttribute('href', '/departures');
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('−1')).toBeInTheDocument();

    // Verify exposure causes and team coverage
    expect(screen.getByRole('heading', { name: 'Where the exposure comes from' })).toBeInTheDocument();
    expect(screen.getByText('One owner, no backup')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Platform: 2 of 5 critical assets covered' })).toBeInTheDocument();
    expect(screen.queryByText('No Critical Assets')).not.toBeInTheDocument();

    // Verify the ranked attention list
    expect(screen.getByRole('heading', { name: 'Needs your attention' })).toBeInTheDocument();
    expect(screen.getByText('Billing Gateway has no secondary maintainer.')).toBeInTheDocument();
    expect(screen.getByText('Single point of failure')).toBeInTheDocument();
    expect(screen.getAllByText('01').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);

    // Verify upcoming departures card
    expect(screen.getByRole('heading', { name: /Upcoming departures/ })).toBeInTheDocument();
    expect(screen.getAllByText('Sarah Connor').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('4 of 6')).toBeInTheDocument();

    // Verify top SPOF card
    expect(screen.getByRole('heading', { name: /Single points of failure/ })).toBeInTheDocument();
    expect(screen.getByText('Invoice Processing Pipeline')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();


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
    vi.mocked(actionsApi.fetchActions).mockImplementationOnce(boom);
    vi.mocked(departuresApi.fetchDepartures).mockImplementationOnce(boom);

    render(
      <ToastProvider><SessionProvider initialSession={adminSession}>
        <OverviewView />
      </SessionProvider></ToastProvider>
    );

    expect(await screen.findByText("We couldn't check recent changes.")).toBeInTheDocument();
    expect(await screen.findByText("We couldn't load priority actions.")).toBeInTheDocument();
    expect(screen.queryByText('Zero failing checks')).not.toBeInTheDocument();
    expect(screen.queryByText(/No changes since/)).not.toBeInTheDocument();
  });

  it('downloads the executive PDF from the header', async () => {
    mockDownload.mockResolvedValueOnce(undefined);
    render(
      <ToastProvider><SessionProvider initialSession={adminSession}>
        <OverviewView />
      </SessionProvider></ToastProvider>
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith('/api/reports/executive-scan/pdf', 'continuity-report.pdf'));
  });

  it('labels the change window from real ISO dates and leaves untracked kinds out', async () => {
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
      <ToastProvider><SessionProvider initialSession={adminSession}>
        <OverviewView />
      </SessionProvider></ToastProvider>
    );

    expect(await screen.findByRole('link', { name: '1 person left' })).toBeInTheDocument();
    expect(screen.getByText('In the last 7 days')).toBeInTheDocument();
    expect(screen.queryByText(/lost their backup|newly exposed/)).not.toBeInTheDocument();
  });
});
