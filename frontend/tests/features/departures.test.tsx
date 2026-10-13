import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ToastProvider } from '@/components/ui/Toast';
import { DeparturesList } from '@/features/departures/DeparturesList';
import { DepartureDetail } from '@/features/departures/DepartureDetail';
import { SessionProvider } from '@/lib/session';
import type { Session } from '@/types/view';
import type { DepartureSummary, DepartureDetail as DepartureDetailType, WorkAtRisk } from '@/types/view';

const sampleAtRisk: WorkAtRisk = {
  assets: [
    {
      asset: { id: 'w-1', kind: 'automation', name: 'Stripe Billing Pipeline' },
      criticality: 'critical',
      owner: { id: 'p-1', kind: 'person', name: 'Sarah Connor' },
      departureId: 'dep-1',
      leaveDate: '2026-11-15T00:00:00Z',
      runsPerWeek: 1200,
      noSuccessor: true,
      personalCredential: true,
      successor: null,
      acceptance: 'none',
    },
  ],
  totals: { assets: 1, runsPerWeek: 1200, unknownRuns: 0, personalCredential: 1, people: 1 },
};

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
      id: 'hnd-1',
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
      id: 'hnd-2',
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
  fetchWorkAtRisk: vi.fn(),
  fetchDeparture: vi.fn(),
  initiateDeparture: vi.fn(),
  simulateSuccessionPlan: vi.fn(),
  saveSuccessors: vi.fn(),
  sendAcceptanceRequests: vi.fn(),
  markAccountDisabled: vi.fn(),
  verifyDeparture: vi.fn(),
  reassignHandover: vi.fn(),
}));

vi.mock('@/lib/api/entities', () => ({
  fetchPeople: vi.fn(),
}));

import { fetchPeople } from '@/lib/api/entities';

import {
  fetchDepartures,
  fetchWorkAtRisk,
  fetchDeparture,
  initiateDeparture,
  simulateSuccessionPlan,
  saveSuccessors,
  sendAcceptanceRequests,
  markAccountDisabled,
  reassignHandover,
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
    (fetchWorkAtRisk as any).mockResolvedValue(sampleAtRisk);
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

  it('renders DeparturesList: summary, one table with filters, status pills, and passes axe', async () => {
    const { container } = renderAs(admin, <DeparturesList initialDepartures={sampleDepartures} />);

    // Header, summary and the record button
    expect(screen.getByRole('heading', { level: 1, name: 'Departures' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record a departure' })).toBeInTheDocument();
    expect(screen.getByText('Without an accepted successor')).toBeInTheDocument();

    // Everyone in one table; Sarah needs a successor
    expect(screen.getByRole('link', { name: 'Sarah Connor' })).toHaveAttribute('href', '/departures/dep-1');
    expect(screen.getByText('Lead Cloud Architect · Infrastructure')).toBeInTheDocument();
    expect(screen.getAllByText('Needs successor').length).toBeGreaterThanOrEqual(1);

    // Filters narrow the table
    fireEvent.click(screen.getByRole('button', { name: /^Departed/ }));
    expect(screen.queryByRole('link', { name: 'Sarah Connor' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^All/ }));

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

    // Automations on the leaver's own credentials
    expect(screen.getByRole('heading', { name: /Runs on their credentials/ })).toBeInTheDocument();
    expect(screen.getByText(/1,200\/wk/)).toBeInTheDocument();

    // Stage tracker says what's next; the handover pack can be downloaded
    expect(screen.getByRole('heading', { name: /Step 2 of 5: Successor named/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download handover pack' })).toBeInTheDocument();

    // Succession check (async simulation)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Succession check' })).toBeInTheDocument();
      expect(screen.getByText('Succession overload')).toBeInTheDocument();
      expect(screen.getByText('35% share')).toBeInTheDocument();
    });

    // Use the suggested successor; the action bar offers Save
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    const saveBtn = await screen.findByRole('button', { name: 'Save successors' });
    fireEvent.click(saveBtn);

    // Only the changed row is sent: w-2 is already accepted and locked server-side.
    await waitFor(() => {
      expect(saveSuccessors).toHaveBeenCalledWith('dep-1', [{ assetId: 'w-1', successorId: 'p-3' }]);
    });

    // Verify accessibility
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the work at risk across departures, with a counted headline', async () => {
    renderAs(admin, <DeparturesList initialDepartures={sampleDepartures} />);
    expect(await screen.findByText('1 critical asset and 1,200 automation runs a week depend on 1 person leaving.')).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: /Work at risk/ });
    expect(within(panel).getByText('No successor')).toBeInTheDocument();
    expect(within(panel).getByText('Their credentials')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Stripe Billing Pipeline' })).toHaveAttribute('href', '/departures/dep-1');
  });

  it('the pipeline counts departures per step, and selecting a step filters the table', async () => {
    renderAs(admin, <DeparturesList initialDepartures={sampleDepartures} />);
    const step = screen.getByRole('button', { name: /2\. Successor named/ });
    fireEvent.click(step);
    expect(step).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Sarah Connor' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'John Doe' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear step filter/ }));
    expect(screen.getByRole('link', { name: 'John Doe' })).toBeInTheDocument();
  });

  it('expanding a row shows that person\'s handover inline', async () => {
    renderAs(admin, <DeparturesList initialDepartures={sampleDepartures} />);
    fireEvent.click(screen.getByRole('button', { name: "Show Sarah Connor's handover" }));
    expect(await screen.findByText('Customer Identity Sync')).toBeInTheDocument();
    expect(fetchDeparture).toHaveBeenCalledWith('dep-1');
    expect(screen.getByRole('link', { name: /Open departure/ })).toHaveAttribute('href', '/departures/dep-1');
  });

  it('viewers see the departure read-only: no initiate button, no successor pickers, no save', async () => {
    renderAs(viewer, <DeparturesList initialDepartures={sampleDepartures} />);
    expect(screen.queryByRole('button', { name: /Record a departure/ })).not.toBeInTheDocument();
  });

  it('viewer detail: successor names shown as text, no actions', async () => {
    renderAs(viewer, <DepartureDetail id="dep-1" initialDetail={sampleDetail} />);
    expect(await screen.findByRole('heading', { name: 'Succession check' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save successors' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record account disabled' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use' })).not.toBeInTheDocument();
    expect(fetchPeople).not.toHaveBeenCalled();
  });

  it('a failed succession test says so instead of keeping a stale projection', async () => {
    (simulateSuccessionPlan as any).mockRejectedValue(new Error('backend down'));
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={sampleDetail} />);
    expect(await screen.findByText(/succession test couldn't run/)).toBeInTheDocument();
    expect(screen.queryByText('Would be covered')).not.toBeInTheDocument();
    // Saving is still possible once something changes.
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(await screen.findByRole('button', { name: 'Save successors' })).toBeEnabled();
  });

  it('records the account as disabled from the workbench (stage 4)', async () => {
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={sampleDetail} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Record account disabled' }));
    await waitFor(() => expect(markAccountDisabled).toHaveBeenCalledWith('dep-1'));
  });

  it('a departure with nothing to hand over says so instead of showing empty tables and zeros', async () => {
    const empty = { ...sampleDetail, stage: 'initiated' as const, stageTimestamps: { initiated: '2026-10-13T00:00:00Z' }, handover: [], assetsTotal: 0, assetsHandedOver: 0, personalCredentialAutomations: [], undocumented: [] };
    (fetchDeparture as any).mockResolvedValue(empty);
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={empty} />);
    expect(await screen.findByText('Sarah owns no tracked assets')).toBeInTheDocument();
    expect(screen.getByText('Nothing to check')).toBeInTheDocument();
    expect(screen.getAllByText('Not needed: nothing to hand over')).toHaveLength(2);
    expect(screen.queryByRole('region', { name: 'Handover table' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record account disabled' })).toBeInTheDocument();
  });

  it('the succession check compares exposure now with exposure after the picked successors', async () => {
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={sampleDetail} />);
    expect(await screen.findByText('Exposed now')).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 assets have nobody named yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(await screen.findByText(/Everyone is named/)).toBeInTheDocument();
    // Unsaved changes can be discarded.
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('button', { name: 'Save successors' })).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole('button', { name: 'Ask to accept' }));
    expect(await screen.findByText(/1 successor was asked to accept/)).toBeInTheDocument();
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
  });

  it('after the account is disabled, HR/admin reassigns a stuck row with a reason (never accepts it for them)', async () => {
    const stuck = {
      ...sampleDetail,
      stage: 'account_disabled' as const,
      handover: [
        { ...sampleDetail.handover[0], successor: { id: 'p-3', name: 'Marcus Brody', kind: 'person' as const }, acceptance: 'requested' as const },
        sampleDetail.handover[1],
      ],
    };
    (fetchDeparture as any).mockResolvedValue(stuck);
    (reassignHandover as any).mockResolvedValue({ stage: 'account_disabled' });
    renderAs(admin, <DepartureDetail id="dep-1" initialDetail={stuck} />);

    // Only the unaccepted row offers it; the accepted one doesn't.
    expect(screen.queryByRole('button', { name: 'Reassign Customer Identity Sync' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Reassign Stripe Billing Pipeline' }));

    const submit = screen.getByRole('button', { name: 'Reassign and ask to accept' });
    expect(submit).toBeDisabled(); // needs a person and a reason

    fireEvent.focus(screen.getByRole('combobox', { name: 'New successor' }));
    fireEvent.click(await screen.findByRole('option', { name: /Priya Sharma/ }));
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Marcus is on extended leave' } });
    fireEvent.click(submit);

    await waitFor(() => expect(reassignHandover).toHaveBeenCalledWith('hnd-1', 'p-4', 'Marcus is on extended leave'));
    expect(await screen.findByText(/Priya Sharma was asked to accept Stripe Billing Pipeline/)).toBeInTheDocument();
  });

  it('viewers never see the reassign action', async () => {
    const stuck = { ...sampleDetail, stage: 'account_disabled' as const };
    (fetchDeparture as any).mockResolvedValue(stuck);
    renderAs(viewer, <DepartureDetail id="dep-1" initialDetail={stuck} />);
    await screen.findAllByRole('link', { name: 'Stripe Billing Pipeline' });
    expect(screen.queryByRole('button', { name: /^Reassign/ })).not.toBeInTheDocument();
  });
});
