import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ToastProvider } from '@/components/ui/Toast';
import { DeparturesList } from '@/features/departures/DeparturesList';
import { DepartureDetail } from '@/features/departures/DepartureDetail';
import { SessionProvider } from '@/lib/session';
import type { Session } from '@/types/view';
import type { DepartureSummary, DepartureDetail as DepartureDetailType } from '@/types/view';

const sampleDepartures: DepartureSummary[] = [
  {
    id: 'dep-1',
    person: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
    role: 'Lead Cloud Architect',
    team: 'Infrastructure',
    leaveDate: '2026-11-15T00:00:00Z',
    stage: 'successor_named',
    assetsTotal: 6,
    assetsHandedOver: 4,
    hasAlert: true,
    detectedFrom: 'entra',
    group: 'upcoming',
  },
  {
    id: 'dep-2',
    person: { id: 'p-2', name: 'John Doe', kind: 'person' },
    role: 'Data Engineer',
    team: 'Analytics',
    leaveDate: '2026-10-25T00:00:00Z',
    stage: 'accepted',
    assetsTotal: 3,
    assetsHandedOver: 3,
    hasAlert: false,
    detectedFrom: 'manual',
    group: 'in_handover',
  },
];

const sampleDetail: DepartureDetailType = {
  id: 'dep-1',
  person: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
  role: 'Lead Cloud Architect',
  team: 'Infrastructure',
  leaveDate: '2026-11-15T00:00:00Z',
  stage: 'successor_named',
  assetsTotal: 2,
  assetsHandedOver: 1,
  hasAlert: true,
  detectedFrom: 'entra',
  group: 'upcoming',
  stageTimestamps: {
    detected: '2026-10-01T08:00:00Z',
    successor_named: '2026-10-02T14:30:00Z',
  },
  handover: [
    {
      asset: { id: 'w-1', name: 'Stripe Billing Pipeline', kind: 'workflow' },
      criticality: 'critical',
      currentBackup: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
      successor: null,
      suggestion: {
        person: { id: 'p-3', name: 'Marcus Brody', kind: 'person' },
        reason: 'Maintains Stripe webhooks',
      },
      acceptance: 'none',
    },
    {
      asset: { id: 'w-2', name: 'Customer Identity Sync', kind: 'workflow' },
      criticality: 'high',
      currentBackup: { state: 'value', display: 'Marcus Brody', grade: 'confirmed', source: 'Manual', observedAt: null },
      successor: { id: 'p-3', name: 'Marcus Brody', kind: 'person' },
      suggestion: null,
      acceptance: 'accepted',
    },
  ],
  personalCredentialAutomations: [
    { workflow: { id: 'w-1', name: 'Stripe Billing Pipeline', kind: 'workflow' }, weeklyRuns: 1200 },
  ],
  undocumented: [
    { id: 'w-1', name: 'Stripe Billing Pipeline', kind: 'workflow' },
  ],
  watchLog: [
    {
      at: '2026-10-02T15:00:00Z',
      workflow: { id: 'w-1', name: 'Stripe Billing Pipeline', kind: 'workflow' },
      message: 'Workflow health check passed after backup nomination.',
      severity: 'info',
    },
  ],
};

const sampleSimResult = {
  coveredCount: 38,
  stillExposedCount: 14,
  loads: [
    {
      successor: { id: 'p-3', name: 'Marcus Brody', kind: 'person' as const },
      totalCriticalAssetsOwned: 18,
      shareOfCompanyCriticalAutomationsPct: 34.6,
      overloadWarning: true,
    },
  ],
};

vi.mock('@/lib/api/departures', () => ({
  fetchDepartures: vi.fn(),
  fetchDeparture: vi.fn(),
  initiateDeparture: vi.fn(),
  simulateSuccessionPlan: vi.fn(),
  saveSuccessors: vi.fn(),
  sendAcceptanceRequests: vi.fn(),
  markAccountDisabled: vi.fn(),
  verifyDeparture: vi.fn(),
}));

vi.mock('@/lib/api/entities', () => ({
  fetchPeople: vi.fn(),
}));

import { fetchPeople } from '@/lib/api/entities';

import {
  fetchDepartures,
  fetchDeparture,
  initiateDeparture,
  simulateSuccessionPlan,
  saveSuccessors,
  sendAcceptanceRequests,
  markAccountDisabled,
} from '@/lib/api/departures';

const admin: Session = { userId: 'user:admin', name: 'Alex Rivera', email: 'alex@acme.com', role: 'admin', isHrManager: true, title: null };
const viewer: Session = { userId: 'user:maya', name: 'Maya Lin', email: 'maya@acme.com', role: 'viewer', isHrManager: false, title: null };

function renderAs(session: Session, ui: React.ReactElement) {
  return render(
    <SessionProvider initialSession={session}>
      <ToastProvider>{ui}</ToastProvider>
    </SessionProvider>,
  );
}

describe('Departures & Handover Workbench (Tasks 21–23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchDepartures as any).mockResolvedValue(sampleDepartures);
    (fetchDeparture as any).mockResolvedValue(sampleDetail);
    (simulateSuccessionPlan as any).mockResolvedValue(sampleSimResult);
    (saveSuccessors as any).mockResolvedValue(undefined);
    (sendAcceptanceRequests as any).mockResolvedValue(1);
    (markAccountDisabled as any).mockResolvedValue({ stage: 'account_disabled' });
    (fetchPeople as any).mockResolvedValue([
      { id: 'p-1', kind: 'person', name: 'Sarah Connor' },
      { id: 'p-3', kind: 'person', name: 'Marcus Brody' },
      { id: 'p-4', kind: 'person', name: 'Priya Sharma' },
    ]);
  });

  it('renders DeparturesList with grouped tabs, stage stepper, and passes axe', async () => {
    const { container } = renderAs(admin, <DeparturesList initialDepartures={sampleDepartures} />);

    // Verify header and tabs
    expect(screen.getByText('Departures & Handover')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Upcoming/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /In Handover/ })).toBeInTheDocument();

    // Verify Upcoming list item
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('Lead Cloud Architect · Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('Discontinuity Alert')).toBeInTheDocument();
    expect(screen.getByText('Open Workbench')).toBeInTheDocument();

    // Verify accessibility
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders DepartureDetail workbench with table, suggestion accept, simulation panel, and passes axe', async () => {
    const { container } = renderAs(admin, <DepartureDetail id="dep-1" initialDetail={sampleDetail} />);

    // Verify Leaver header
    expect(screen.getByRole('heading', { name: 'Sarah Connor' })).toBeInTheDocument();
    expect(screen.getByText('Lead Cloud Architect · Infrastructure')).toBeInTheDocument();

    // Verify Handover Table
    expect(screen.getAllByText('Stripe Billing Pipeline').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Maintains Stripe webhooks/)).toBeInTheDocument();

    // Verify Personal Credential warning
    expect(screen.getByText(/Personal Credential Risk/)).toBeInTheDocument();
    expect(screen.getByText(/1,200\/wk/)).toBeInTheDocument();

    // Verify Sticky Succession Panel (async simulation)
    await waitFor(() => {
      expect(screen.getByText('Coverage Delta')).toBeInTheDocument();
      expect(screen.getByText('Succession Overload Warning')).toBeInTheDocument();
      expect(screen.getByText('35% share')).toBeInTheDocument();
    });

    // Accept suggestion shortcut
    const acceptSuggestionBtn = screen.getByRole('button', { name: 'Accept' });
    fireEvent.click(acceptSuggestionBtn);

    // Click Save Successor Assignments once re-simulation settles
    const saveBtn = await screen.findByRole('button', { name: 'Save Successor Assignments' });
    fireEvent.click(saveBtn);

    // Only the changed row is sent: w-2 is already accepted and locked server-side.
    await waitFor(() => {
      expect(saveSuccessors).toHaveBeenCalledWith('dep-1', [{ assetId: 'w-1', successorId: 'p-3' }]);
    });

    // Verify accessibility
    expect(await axe(container)).toHaveNoViolations();
  });

  it('viewers see the departure read-only: no initiate button, no successor pickers, no save', async () => {
    renderAs(viewer, <DeparturesList initialDepartures={sampleDepartures} />);
    expect(screen.queryByRole('button', { name: /Initiate Departure/ })).not.toBeInTheDocument();
  });

  it('viewer detail: successor names shown as text, no actions', async () => {
    renderAs(viewer, <DepartureDetail id="dep-1" initialDetail={sampleDetail} />);
    expect(await screen.findByText('Coverage Delta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Successor Assignments' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record account disabled' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(fetchPeople).not.toHaveBeenCalled();
  });

  it('a failed succession test says so instead of keeping a stale projection', async () => {
    (simulateSuccessionPlan as any).mockRejectedValue(new Error('backend down'));
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={sampleDetail} />);
    expect(await screen.findByText(/succession test couldn't run/)).toBeInTheDocument();
    expect(screen.queryByText('Protected Assets')).not.toBeInTheDocument();
    // Saving is still possible.
    expect(screen.getByRole('button', { name: 'Save Successor Assignments' })).toBeInTheDocument();
  });

  it('records the account as disabled from the workbench (stage 4)', async () => {
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={sampleDetail} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Record account disabled' }));
    await waitFor(() => expect(markAccountDisabled).toHaveBeenCalledWith('dep-1'));
  });

  it('verify is blocked until every asset has an accepted successor (stage 5)', async () => {
    const disabled = { ...sampleDetail, stage: 'account_disabled' as const };
    (fetchDeparture as any).mockResolvedValue(disabled);
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={disabled} />);
    const verify = await screen.findByRole('button', { name: 'Verify & close departure' });
    expect(verify).toBeDisabled();
    expect(screen.getByText(/1 of 2 assets still need an accepted successor/)).toBeInTheDocument();
  });

  it('requesting acceptance reports how many were asked and does not claim emails were sent', async () => {
    const named = {
      ...sampleDetail,
      handover: [{ ...sampleDetail.handover[0], successor: { id: 'p-3', name: 'Marcus Brody', kind: 'person' as const } }, sampleDetail.handover[1]],
    };
    (fetchDeparture as any).mockResolvedValue(named);
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={named} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Request Successor Acceptance' }));
    expect(await screen.findByText(/1 successor was asked to accept/)).toBeInTheDocument();
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
  });
});