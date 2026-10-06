import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ReactFlowProvider } from '@xyflow/react';

// Feature Views
import { OverviewView } from '@/features/overview/OverviewView';
import { BriefingView } from '@/features/briefing/BriefingView';
import { DeparturesList } from '@/features/departures/DeparturesList';
import { DepartureDetail } from '@/features/departures/DepartureDetail';
import { PeopleView } from '@/features/people/PeopleView';
import { TeamDetail } from '@/features/people/TeamDetail';
import { PersonDetail } from '@/features/people/PersonDetail';
import { AssetsView } from '@/features/assets/AssetsView';
import { AssetDetailView } from '@/features/assets/AssetDetailView';
import { MapView } from '@/features/map/MapView';
import { WhatIfView } from '@/features/what-if/WhatIfView';
import { ActionsView } from '@/features/actions/ActionsView';
import { NewCampaignWizard } from '@/features/actions/NewCampaignWizard';
import { AskView } from '@/features/ask/AskView';
import { AttestForm } from '@/features/attest/AttestForm';
import { ReviewerView } from '@/features/reviewer/ReviewerView';
import { ConnectionsView } from '@/features/settings/ConnectionsView';
import { N8nCheckView } from '@/features/settings/N8nCheckView';
import { IdentityQueueView } from '@/features/settings/IdentityQueueView';
import { UsersView } from '@/features/settings/UsersView';
import { OrganizationView } from '@/features/settings/OrganizationView';
import { AuditLogView } from '@/features/settings/AuditLogView';

import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/lib/session';

// Navigation Mocks
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: '1', token: 'tok-123' }),
}));

function renderRoute(ui: React.ReactElement) {
  return render(
    <SessionProvider>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </SessionProvider>
  );
}

describe('Screen Accessibility Sweep (Task 34)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('verifies OverviewView has no axe violations', async () => {
    const { container } = renderRoute(
      <OverviewView
        initialStats={{
          unbackedCriticalAssets: 4,
          upcomingDeparturesCount: 2,
          totalCriticalAssets: 25,
          activeConfirmationsCount: 1,
          failingChecksCount: 3,
        }}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies BriefingView has no axe violations', async () => {
    const markdownBriefing = `# Executive Summary
The organization tracks 52 critical operational assets. 38 are fully protected with confirmed human backups. 14 assets are currently exposed to operational discontinuity.

# Critical Exposure
- Billing Gateway: Lacks secondary human owner.
- Customer Data Sync: Lacks verified fallback documentation.

# Immediate Actions
1. Launch Confirmation Campaign to verify unconfirmed assets.
2. Cross-train backup operators for exposed automations.`;

    const { container } = renderRoute(
      <BriefingView initialBriefing={markdownBriefing} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies DeparturesList has no axe violations', async () => {
    const { container } = renderRoute(<DeparturesList initialDepartures={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies DepartureDetail has no axe violations', async () => {
    const { container } = renderRoute(
      <DepartureDetail
        id="dep-1"
        initialDeparture={{
          id: 'dep-1',
          person: { id: 'p-1', name: 'Omar Haddad', kind: 'person' },
          role: 'Lead Architect',
          team: 'Engineering',
          leaveDate: '2026-10-15T00:00:00.000Z',
          stage: 'initiated',
          assetsTotal: 3,
          assetsHandedOver: 0,
          hasAlert: false,
          detectedFrom: 'manual',
          group: 'upcoming',
          stageTimestamps: { initiated: '2026-10-01T00:00:00.000Z' },
          handover: [],
          personalCredentialAutomations: [],
          undocumented: [],
          watchLog: [],
        }}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies PeopleView and TeamDetail have no axe violations', async () => {
    const { container: peopleContainer } = renderRoute(<PeopleView initialTeams={[]} />);
    expect(await axe(peopleContainer)).toHaveNoViolations();

    const { container: teamContainer } = renderRoute(
      <TeamDetail
        teamId="team-eng"
        initialDetail={{
          team: {
            id: 'team-eng',
            name: 'Core Platform',
            memberCount: 6,
            rolledUp: false,
            coverage: { covered: 8, exposed: 2, unknown: 1 },
            concentration: null,
          },
          members: [],
        }}
      />
    );
    expect(await axe(teamContainer)).toHaveNoViolations();
  });

  it('verifies AssetsView and AssetDetailView have no axe violations', async () => {
    const { container: assetsContainer } = renderRoute(<AssetsView initialAssets={[]} />);
    expect(await axe(assetsContainer)).toHaveNoViolations();

    const { container: detailContainer } = renderRoute(
      <AssetDetailView
        assetId="w-1"
        initialDetail={{
          asset: {
            id: 'w-1',
            kind: 'automation',
            name: 'Billing System',
            isCritical: true,
            owner: { state: 'value', display: 'Omar Haddad', grade: 'confirmed', source: null, observedAt: null },
            backup: { state: 'none', display: null, grade: 'confirmed', source: null, observedAt: null },
            criticality: { level: 'critical', grade: 'confirmed', source: null, observedAt: null },
            documented: { state: 'none', display: null, grade: 'confirmed', source: null, observedAt: null },
            fallback: { state: 'none', display: null, grade: 'confirmed', source: null, observedAt: null },
            runsPerWeek: { state: 'value', display: '500', grade: 'confirmed', source: null, observedAt: null },
            checkStatus: 'FAIL',
          },
          checks: [],
          upstream: [],
          downstream: [],
          history: [],
        }}
      />
    );
    expect(await axe(detailContainer)).toHaveNoViolations();
  });

  it('verifies MapView and WhatIfView have no axe violations', async () => {
    const { container: mapContainer } = renderRoute(
      <ReactFlowProvider>
        <MapView initialNodes={[]} initialEdges={[]} />
      </ReactFlowProvider>
    );
    expect(await axe(mapContainer)).toHaveNoViolations();

    const { container: whatIfContainer } = renderRoute(<WhatIfView />);
    expect(await axe(whatIfContainer)).toHaveNoViolations();
  });

  it('verifies ActionsView and NewCampaignWizard have no axe violations', async () => {
    const { container: actionsContainer } = renderRoute(<ActionsView initialActions={[]} />);
    expect(await axe(actionsContainer)).toHaveNoViolations();

    const { container: wizardContainer } = renderRoute(<NewCampaignWizard />);
    expect(await axe(wizardContainer)).toHaveNoViolations();
  });

  it('verifies AskView has no axe violations', async () => {
    const { container } = renderRoute(<AskView initialConversations={[]} initialMessages={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies AttestForm and ReviewerView have no axe violations', async () => {
    const { container: attestContainer } = renderRoute(
      <AttestForm
        token="tok-test"
        initialSession={{
          token: 'tok-test',
          legacy: false,
          reviewer: { name: 'Sarah Connor', email: 'sarah@test.internal' },
          requestedBy: 'Guido',
          company: { name: 'Acme Inc', logoUrl: null },
          expired: false,
          submitted: false,
          assets: [],
        }}
      />
    );
    expect(await axe(attestContainer)).toHaveNoViolations();

    const { container: reviewerContainer } = renderRoute(
      <ReviewerView initialTasks={{ confirmations: [], handovers: [] }} />
    );
    expect(await axe(reviewerContainer)).toHaveNoViolations();
  });

  it('verifies all Settings views have no axe violations', async () => {
    const { container: connContainer } = renderRoute(<ConnectionsView initialConnections={[]} />);
    expect(await axe(connContainer)).toHaveNoViolations();

    const { container: n8nContainer } = renderRoute(<N8nCheckView />);
    expect(await axe(n8nContainer)).toHaveNoViolations();

    const { container: idContainer } = renderRoute(<IdentityQueueView initialItems={[]} />);
    expect(await axe(idContainer)).toHaveNoViolations();

    const { container: usersContainer } = renderRoute(<UsersView initialUsers={[]} />);
    expect(await axe(usersContainer)).toHaveNoViolations();

    const { container: orgContainer } = renderRoute(<OrganizationView />);
    expect(await axe(orgContainer)).toHaveNoViolations();

    const { container: auditContainer } = renderRoute(<AuditLogView initialEntries={[]} />);
    expect(await axe(auditContainer)).toHaveNoViolations();
  });
});
