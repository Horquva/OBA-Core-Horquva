import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ToastProvider } from '@/components/ui/Toast';
import { DeparturesList } from '@/features/departures/DeparturesList';
import { DepartureDetail } from '@/features/departures/DepartureDetail';
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
}));

import {
  fetchDepartures,
  fetchDeparture,
  initiateDeparture,
  simulateSuccessionPlan,
  saveSuccessors,
  sendAcceptanceRequests,
} from '@/lib/api/departures';

describe('Departures & Handover Workbench (Tasks 21–23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchDepartures as any).mockResolvedValue(sampleDepartures);
    (fetchDeparture as any).mockResolvedValue(sampleDetail);
    (simulateSuccessionPlan as any).mockResolvedValue(sampleSimResult);
    (saveSuccessors as any).mockResolvedValue(undefined);
    (sendAcceptanceRequests as any).mockResolvedValue(undefined);
  });

  it('renders DeparturesList with grouped tabs, stage stepper, and passes axe', async () => {
    const { container } = render(
      <ToastProvider>
        <DeparturesList initialDepartures={sampleDepartures} />
      </ToastProvider>,
    );

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
    const { container } = render(
      <ToastProvider>
        <DepartureDetail id="dep-1" initialDetail={sampleDetail} />
      </ToastProvider>,
    );

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
      expect(screen.getByText('Succession Overload Warning (SIM-08)')).toBeInTheDocument();
      expect(screen.getByText('35% share')).toBeInTheDocument();
    });

    // Accept suggestion shortcut
    const acceptSuggestionBtn = screen.getByRole('button', { name: 'Accept' });
    fireEvent.click(acceptSuggestionBtn);

    // Click Save Successor Assignments once re-simulation settles
    const saveBtn = await screen.findByRole('button', { name: 'Save Successor Assignments' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSuccessors).toHaveBeenCalled();
    });

    // Verify accessibility
    expect(await axe(container)).toHaveNoViolations();
  });
});
