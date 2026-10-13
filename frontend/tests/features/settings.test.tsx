import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ConnectionsView } from '@/features/settings/ConnectionsView';
import { N8nCheckView } from '@/features/settings/N8nCheckView';
import { IdentityQueueView } from '@/features/settings/IdentityQueueView';
import { UsersView } from '@/features/settings/UsersView';
import { OrganizationView } from '@/features/settings/OrganizationView';
import { AuditLogView } from '@/features/settings/AuditLogView';
import type {
  ConnectionsOverview,
  N8nCheckReport,
  IdentityQueueItemView,
  UserView,
  OrganizationSettings,
  AuditLogPage,
  Session,
} from '@/types/view';
import * as entitiesApi from '@/lib/api/entities';
import { ApiError } from '@/lib/api/client';
import { SessionProvider } from '@/lib/session';
import SettingsLayout from '@/app/(app)/settings/layout';

vi.mock('next/navigation', () => ({ usePathname: () => '/settings/connections' }));

const adminSession: Session = { userId: 'user:admin', name: 'Alex Rivera', email: 'alex@acme.com', role: 'admin', isHrManager: true, title: null };
// ConnectionsView shows admin controls (add, sync, test), so it needs a session.
const renderConnections = (ui: React.ReactElement, session: Session = adminSession) =>
  render(<SessionProvider initialSession={session}>{ui}</SessionProvider>);
import * as settingsApi from '@/lib/api/settings';

const sampleOverview: ConnectionsOverview = {
  store: 'database',
  connections: [
    {
      id: 'conn-n8n',
      type: 'n8n',
      name: 'Production n8n Cluster',
      status: 'connected',
      lastSyncAt: '2026-10-01T12:00:00.000Z',
      lastError: null,
      lastRun: { status: 'completed', startedAt: '2026-10-01T12:00:00.000Z', completedAt: '2026-10-01T12:01:00.000Z', stats: { fetched: 42 }, error: null },
    },
    {
      id: 'conn-entra',
      type: 'entra',
      name: 'Corporate Microsoft Entra ID',
      status: 'error',
      lastSyncAt: '2026-09-30T08:00:00.000Z',
      lastError: 'Tenant certificate expired',
      lastRun: null,
    },
  ],
  sources: [
    { source: 'entra', relationships: 10, facts: 4, latestAt: '2025-01-01T00:00:00.000Z' },
    { source: 'attestation', relationships: 1, facts: 0, latestAt: '2025-01-01T00:00:00.000Z' },
  ],
};

const sampleN8nReport: N8nCheckReport = {
  scannedAt: '2026-10-01T12:00:00.000Z',
  summary: {
    totalWorkflows: 35,
    totalUsers: 8,
    totalCredentials: 14,
    aiIntegrationsCount: 5,
  },
  singleOwner: [
    { id: 'w-billing', name: 'Stripe Billing Pipeline', detail: 'Single owner: Omar Haddad' },
  ],
  personalCredential: [
    { id: 'w-db-sync', name: 'Customer Database Sync', detail: 'OAuth: omar@company.com' },
  ],
  failing: [
    { id: 'w-sfdc-sync', name: 'Salesforce Contact Sync', detail: '3 consecutive failures' },
  ],
  abandoned: [
    { id: 'w-test-bot', name: 'Legacy Slack Bot', detail: 'Dormant for 120 days' },
  ],
};

const sampleIdentityQueue: IdentityQueueItemView[] = [
  {
    id: 'alias-1',
    source: 'n8n',
    displayName: 'omar_h',
    emailCandidate: 'omar@external.net',
    suggestion: {
      person: { id: 'p-omar', name: 'Omar Haddad', kind: 'person' },
      reason: 'Name match and active editor',
    },
  },
];

const sampleUsers: UserView[] = [
  {
    id: 'u-1',
    name: 'Sarah Connor',
    email: 'sarah@horquva.internal',
    role: 'admin',
    isHrManager: true,
  },
  {
    id: 'u-2',
    name: 'Alex Murphy',
    email: 'alex@horquva.internal',
    role: 'viewer',
    isHrManager: false,
  },
];

const sampleOrg: OrganizationSettings = {
  companyName: 'Horquva Technologies Inc.',
  logoUrl: 'https://horquva.internal/logo.svg',
  minGroupSize: 5,
  departmentMappings: [{ raw: 'Eng', mapped: 'Engineering' }],
};

const sampleAuditPage: AuditLogPage = {
  entries: [
    {
      id: 'aud-1',
      at: '2026-10-01T12:30:00.000Z',
      actor: 'user:admin',
      actorName: 'Alex Rivera',
      action: 'ASSIGN_BACKUP',
      resource: 'w-billing',
      details: 'Assigned Priya Sharma as backup.',
    },
    {
      id: 'aud-2',
      at: '2026-10-01T11:00:00.000Z',
      actor: 'user:ghost',
      actorName: null,
      action: 'ACCEPT_RISK',
      resource: 'w-sfdc',
      details: 'Accepted risk for 90 days.',
    },
  ],
  total: 5,
  actions: ['ACCEPT_RISK', 'API_GET', 'ASSIGN_BACKUP'],
  retention: { storage: 'memory', capacity: 20000 },
};

describe('Settings & Stateless n8n Check (Tasks 32-33)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(settingsApi, 'fetchConnections').mockResolvedValue(sampleOverview);
    vi.spyOn(entitiesApi, 'fetchPeople').mockResolvedValue([
      { id: 'person:david@acme.com', kind: 'person', name: 'David Miller' },
      { id: 'person:maya@acme.com', kind: 'person', name: 'Maya Lin' },
    ]);
    vi.spyOn(settingsApi, 'runN8nCheck').mockResolvedValue(sampleN8nReport);
    vi.spyOn(settingsApi, 'fetchIdentityQueue').mockResolvedValue(sampleIdentityQueue);
    vi.spyOn(settingsApi, 'resolveIdentity').mockResolvedValue(undefined);
    vi.spyOn(settingsApi, 'fetchUsers').mockResolvedValue(sampleUsers);
    vi.spyOn(settingsApi, 'updateUser').mockResolvedValue(undefined);
    vi.spyOn(settingsApi, 'fetchOrganization').mockResolvedValue(sampleOrg);
    vi.spyOn(settingsApi, 'saveOrganization').mockResolvedValue(undefined);
    vi.spyOn(settingsApi, 'fetchAuditLog').mockResolvedValue(sampleAuditPage);
  });

  describe('ConnectionsView Component', () => {
    it('lists configured connectors with real status and errors, and never a secret', async () => {
      const { container } = renderConnections(<ConnectionsView initialOverview={sampleOverview} />);

      expect(screen.getByRole('heading', { level: 2, name: 'Connectors & Data Sources' })).toBeInTheDocument();
      expect(screen.getByText('Production n8n Cluster')).toBeInTheDocument();
      expect(screen.getByText('connected')).toBeInTheDocument();
      expect(screen.getByText(/Last run completed · fetched 42/)).toBeInTheDocument();
      expect(screen.getByText(/Error: Tenant certificate expired/)).toBeInTheDocument();
      expect(container.textContent).not.toMatch(/secret|credential:|key ending/i);
      // Real controls for admins: one Sync now per configured service.
      expect(screen.getAllByRole('button', { name: 'Sync now' })).toHaveLength(2);
      expect(screen.getByText(/sync automatically every hour/i)).toBeInTheDocument();
    });

    it('Sync now queues a sync, then polls until it finishes', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const sync = vi.spyOn(settingsApi, 'syncConnection').mockResolvedValue({ syncRunId: 'r1', status: 'queued' });
        const syncing = { ...sampleOverview, connections: sampleOverview.connections.map((c) => (c.id === 'conn-n8n' ? { ...c, status: 'syncing' as const } : c)) };
        const fetch = vi.spyOn(settingsApi, 'fetchConnections').mockResolvedValue(syncing);
        renderConnections(<ConnectionsView initialOverview={sampleOverview} />);
        await waitFor(() => expect(screen.getByText('syncing…')).toBeInTheDocument());
        const calls = fetch.mock.calls.length;

        fireEvent.click(screen.getAllByRole('button', { name: 'Sync now' })[0]);
        await waitFor(() => expect(sync).toHaveBeenCalled());

        fetch.mockResolvedValue(sampleOverview);
        await vi.advanceTimersByTimeAsync(2100);
        await waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(calls));
        await waitFor(() => expect(screen.queryByText('syncing…')).toBeNull());
      } finally {
        vi.useRealTimers();
      }
    });

    it('viewers see no connector controls', () => {
      renderConnections(<ConnectionsView initialOverview={sampleOverview} />, { ...adminSession, role: 'viewer' });
      expect(screen.queryByRole('button', { name: /sync now|add connection|^test$/i })).toBeNull();
      expect(screen.queryByText('Import from CSV')).toBeNull();
    });

    it('Test reports whether the saved credentials work', async () => {
      vi.spyOn(settingsApi, 'testSavedConnection').mockResolvedValue({ ok: false, error: 'HTTP 401' });
      renderConnections(<ConnectionsView initialOverview={sampleOverview} />);
      fireEvent.click(screen.getAllByRole('button', { name: 'Test' })[0]);
      expect(await screen.findByText("Couldn't connect: HTTP 401")).toBeInTheDocument();
    });

    it('imports a CSV and reports what changed', async () => {
      const NL = String.fromCharCode(10);
      const imp = vi.spyOn(settingsApi, 'importCsv').mockResolvedValue({ syncRunId: 'r2', ok: true, stats: { entitiesUpserted: 3, edgesCreated: 2, edgesClosed: 0, factsCreated: 4, factsVersioned: 0 } });
      renderConnections(<ConnectionsView initialOverview={sampleOverview} />);
      const file = new File(['email,name' + NL + 'lina@uni.edu,Lina' + NL], 'people.csv', { type: 'text/csv' });
      fireEvent.change(screen.getByLabelText('People CSV'), { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: 'Import' }));
      await waitFor(() => expect(imp).toHaveBeenCalledWith({ peopleCsv: 'email,name' + NL + 'lina@uni.edu,Lina' + NL, automationsCsv: undefined }));
      expect(await screen.findByText(/Imported\. 3 people & systems · \+2 \/ −0 relationships · 4 facts updated/)).toBeInTheDocument();
    });

    it('shows what each source contributed', () => {
      renderConnections(<ConnectionsView initialOverview={sampleOverview} />);
      const table = screen.getByRole('table', { name: 'Data on record by source' });
      expect(within(table).getByText('Microsoft Entra ID')).toBeInTheDocument();
      expect(within(table).getByText('Confirmed by the people themselves')).toBeInTheDocument();
      expect(within(table).getByText('10')).toBeInTheDocument();
    });

    it('says the connection store is unreachable instead of inventing connectors', () => {
      renderConnections(<ConnectionsView initialOverview={{ ...sampleOverview, store: 'unavailable', connections: [] }} />);
      expect(screen.getByText('No connectors to show.')).toBeInTheDocument();
      expect(screen.queryByText('Production n8n Cluster')).toBeNull();
    });

    it('satisfies axe accessibility standards in ConnectionsView', async () => {
      const { container } = renderConnections(<ConnectionsView initialOverview={sampleOverview} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('N8nCheckView Component (Task 33)', () => {
    it('submits in-memory scan and renders 4-panel exposure report', async () => {
      render(<N8nCheckView />);

      expect(screen.getByRole('heading', { level: 2, name: 'n8n Ownership & Exposure Check' })).toBeInTheDocument();
      expect(screen.getByLabelText('n8n Instance URL')).toBeInTheDocument();

      // No invented default instance URL.
      expect(screen.getByLabelText('n8n Instance URL')).toHaveValue('');
      fireEvent.change(screen.getByLabelText('n8n Instance URL'), { target: { value: 'https://n8n.example.test' } });
      const apiKeyInput = screen.getByLabelText('n8n API Key');
      fireEvent.change(apiKeyInput, { target: { value: 'n8n_api_secret123' } });

      const scanBtn = screen.getByRole('button', { name: 'Run Continuity Scan' });
      fireEvent.click(scanBtn);

      await waitFor(() => {
        expect(settingsApi.runN8nCheck).toHaveBeenCalledWith(
          'https://n8n.example.test',
          'n8n_api_secret123'
        );
      });

      // Counted summary sentence (no tile strip)
      expect(await screen.findByText(/^35 workflows, .* scanned/)).toBeInTheDocument();

      // 4 Categorized exposure panels
      expect(screen.getByText('Single Owner Workflows')).toBeInTheDocument();
      expect(screen.getByText('Stripe Billing Pipeline')).toBeInTheDocument();

      expect(screen.getByText('Personal Credential Workflows')).toBeInTheDocument();
      expect(screen.getByText('Customer Database Sync')).toBeInTheDocument();

      expect(screen.getByText('Failing Executions')).toBeInTheDocument();
      expect(screen.getByText('Salesforce Contact Sync')).toBeInTheDocument();

      expect(screen.getByText('Abandoned / Dormant Workflows')).toBeInTheDocument();
      expect(screen.getByText('Legacy Slack Bot')).toBeInTheDocument();
    });

    it("shows a check that didn't run as not checked, never as a green pass", () => {
      render(
        <N8nCheckView
          initialReport={{ ...sampleN8nReport, failing: null as never, abandoned: [] }}
        />
      );
      // failing: not produced → unknown, dashed
      expect(screen.getByText('Not checked: this scan did not produce this result.')).toBeInTheDocument();
      expect(screen.queryByText(/No failing executions detected/)).toBeNull();
      // abandoned: produced and empty → a real "none"
      expect(screen.getByText(/No abandoned workflows identified/)).toBeInTheDocument();
    });

    it('satisfies axe accessibility standards in N8nCheckView', async () => {
      const { container } = render(<N8nCheckView initialReport={sampleN8nReport} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('IdentityQueueView Component', () => {
    it('renders unmatched accounts and accepts suggested match', async () => {
      render(<IdentityQueueView initialItems={sampleIdentityQueue} />);

      expect(screen.getByRole('heading', { level: 2, name: 'Identity Resolution Queue' })).toBeInTheDocument();
      expect(screen.getByText('omar_h')).toBeInTheDocument();
      expect(screen.getByText(/Suggested match:/)).toBeInTheDocument();

      const acceptMatchBtn = screen.getByRole('button', { name: /Accept Match/ });
      fireEvent.click(acceptMatchBtn);

      await waitFor(() => {
        expect(settingsApi.resolveIdentity).toHaveBeenCalledWith('alias-1', {
          action: 'link',
          personId: 'p-omar',
        });
      });

      expect(await screen.findByText(/Identity resolved/)).toBeInTheDocument();
      expect(screen.queryByText(/immutable/i)).toBeNull();
    });

    it('"Pick person" offers real directory people and links the chosen one', async () => {
      render(<IdentityQueueView initialItems={sampleIdentityQueue} />);
      fireEvent.click(screen.getByRole('button', { name: 'Pick Person...' }));
      const input = screen.getByPlaceholderText('Select employee...');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Maya' } });
      fireEvent.click(await screen.findByText('Maya Lin'));
      fireEvent.click(screen.getByRole('button', { name: 'Confirm Link' }));
      await waitFor(() =>
        expect(settingsApi.resolveIdentity).toHaveBeenCalledWith('alias-1', { action: 'link', personId: 'person:maya@acme.com' }),
      );
    });

    it("shows the server's reason when a resolution is refused", async () => {
      vi.spyOn(settingsApi, 'resolveIdentity').mockRejectedValue(new ApiError(409, 'Already resolved (linked).'));
      render(<IdentityQueueView initialItems={sampleIdentityQueue} />);
      fireEvent.click(screen.getByRole('button', { name: 'Ignore' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Already resolved (linked).');
    });

    it('satisfies axe accessibility standards in IdentityQueueView', async () => {
      const { container } = render(<IdentityQueueView initialItems={sampleIdentityQueue} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('UsersView Component', () => {
    it('renders users list, role selector, and HR permissions toggle', async () => {
      render(<UsersView initialUsers={sampleUsers} />);

      expect(screen.getByRole('heading', { level: 2, name: 'Users & Permissions' })).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('Alex Murphy')).toBeInTheDocument();

      // Change role
      const roleSelect = screen.getByLabelText('Role:', { selector: '#role-select-u-2' });
      fireEvent.change(roleSelect, { target: { value: 'admin' } });

      await waitFor(() => {
        expect(settingsApi.updateUser).toHaveBeenCalledWith('u-2', { role: 'admin' });
      });

      // Toggle HR
      const hrCheckboxes = screen.getAllByRole('checkbox', { name: 'HR Permissions' });
      fireEvent.click(hrCheckboxes[1]);

      await waitFor(() => {
        expect(settingsApi.updateUser).toHaveBeenCalledWith('u-2', { isHrManager: true });
      });
    });

    it('satisfies axe accessibility standards in UsersView', async () => {
      const { container } = render(<UsersView initialUsers={sampleUsers} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('OrganizationView Component', () => {
    it('renders company settings, enforces minimum team size floor, and saves updates', async () => {
      render(<OrganizationView initialSettings={sampleOrg} />);

      expect(screen.getByRole('heading', { level: 2, name: 'Organization & Aggregation Rules' })).toBeInTheDocument();
      expect(screen.getByLabelText('Company Name')).toHaveValue('Horquva Technologies Inc.');

      // The save bar only appears once something changes.
      expect(screen.queryByRole('button', { name: 'Save Organization Settings' })).toBeNull();
      fireEvent.change(screen.getByLabelText('Smallest team reported on its own'), { target: { value: '6' } });
      const saveBtn = screen.getByRole('button', { name: 'Save Organization Settings' });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(settingsApi.saveOrganization).toHaveBeenCalledWith(
          expect.objectContaining({
            companyName: 'Horquva Technologies Inc.',
            minGroupSize: 6,
          })
        );
      });
    });

    it('satisfies axe accessibility standards in OrganizationView', async () => {
      const { container } = render(<OrganizationView initialSettings={sampleOrg} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AuditLogView Component', () => {
    it('shows names, newest first, and the real retention instead of a tamper-proof claim', async () => {
      render(<AuditLogView initialPage={sampleAuditPage} />);

      expect(screen.getByRole('heading', { level: 2, name: 'Audit Trail' })).toBeInTheDocument();
      expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
      expect(screen.getByText('user:ghost')).toBeInTheDocument(); // unknown actor: raw id, not a made-up name
      expect(screen.getAllByText('Assign backup').length).toBeGreaterThan(0);
      expect(screen.getByText(/most recent 20,000 entries/i)).toBeInTheDocument();
      expect(screen.queryByText(/cryptographic|tamper|immutable/i)).toBeNull();
      expect(screen.getByText('Showing 2 of 5')).toBeInTheDocument();
    });

    it('hides page reads by default and filters by action', async () => {
      render(<AuditLogView initialPage={sampleAuditPage} />);
      await waitFor(() => expect(settingsApi.fetchAuditLog).toHaveBeenCalledWith({ action: undefined, hideReads: true, limit: 200 }));
      fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'ACCEPT_RISK' } });
      await waitFor(() => expect(settingsApi.fetchAuditLog).toHaveBeenCalledWith({ action: 'ACCEPT_RISK', hideReads: true, limit: 200 }));
      fireEvent.click(screen.getByLabelText('Hide page reads'));
      await waitFor(() => expect(settingsApi.fetchAuditLog).toHaveBeenCalledWith({ action: 'ACCEPT_RISK', hideReads: false, limit: 200 }));
    });

    it('satisfies axe accessibility standards in AuditLogView', async () => {
      const { container } = render(<AuditLogView initialPage={sampleAuditPage} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Settings layout (RBAC)', () => {
    const session = (role: 'admin' | 'viewer') => ({
      userId: 'u', name: 'U', email: 'u@acme.com', role, isHrManager: false, title: null,
    });

    it('admins get the tabs and the page', () => {
      render(
        <SessionProvider initialSession={session('admin')}>
          <SettingsLayout><p>page body</p></SettingsLayout>
        </SessionProvider>,
      );
      expect(screen.getByRole('navigation', { name: 'Settings sections' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^Connections/ })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByText('page body')).toBeInTheDocument();
    });

    it('non-admins are told settings are admin-only instead of seeing error states', () => {
      render(
        <SessionProvider initialSession={session('viewer')}>
          <SettingsLayout><p>page body</p></SettingsLayout>
        </SessionProvider>,
      );
      expect(screen.queryByText('page body')).toBeNull();
      expect(screen.getByText(/settings are managed by admins/i)).toBeInTheDocument();
    });
  });
});
