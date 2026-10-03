import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ConnectionsView } from '@/features/settings/ConnectionsView';
import { N8nCheckView } from '@/features/settings/N8nCheckView';
import { IdentityQueueView } from '@/features/settings/IdentityQueueView';
import { UsersView } from '@/features/settings/UsersView';
import { OrganizationView } from '@/features/settings/OrganizationView';
import { AuditLogView } from '@/features/settings/AuditLogView';
import type {
  ConnectionView,
  N8nCheckReport,
  IdentityQueueItemView,
  UserView,
  OrganizationSettings,
  AuditEntry,
} from '@/types/view';
import * as settingsApi from '@/lib/api/settings';

const sampleConnections: ConnectionView[] = [
  {
    id: 'conn-n8n',
    type: 'n8n',
    name: 'Production n8n Cluster',
    status: 'healthy',
    lastSyncAt: '2026-10-01T12:00:00.000Z',
    itemsSynced: 42,
    lastError: null,
    secretHint: 'Key ending …9a2f',
  },
  {
    id: 'conn-entra',
    type: 'entra',
    name: 'Corporate Microsoft Entra ID',
    status: 'failed',
    lastSyncAt: '2026-09-30T08:00:00.000Z',
    itemsSynced: 120,
    lastError: 'Tenant certificate expired',
    secretHint: 'App ID ending …b14e',
  },
];

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

const sampleAuditEntries: AuditEntry[] = [
  {
    id: 'aud-1',
    at: '2026-10-01T12:30:00.000Z',
    actor: 'Guido van Rossum',
    action: 'ASSIGN_BACKUP',
    resource: 'w-billing',
    details: 'Assigned Alex Murphy as secondary backup nominee.',
  },
  {
    id: 'aud-2',
    at: '2026-10-01T11:00:00.000Z',
    actor: 'Sarah Connor',
    action: 'ACCEPT_RISK',
    resource: 'w-sfdc',
    details: 'Accepted risk for 90 days with justification: Decommissioning planned.',
  },
];

describe('Settings & Stateless n8n Check (Tasks 32-33)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(settingsApi, 'fetchConnections').mockResolvedValue(sampleConnections);
    vi.spyOn(settingsApi, 'syncConnection').mockResolvedValue(undefined);
    vi.spyOn(settingsApi, 'runN8nCheck').mockResolvedValue(sampleN8nReport);
    vi.spyOn(settingsApi, 'fetchIdentityQueue').mockResolvedValue(sampleIdentityQueue);
    vi.spyOn(settingsApi, 'resolveIdentity').mockResolvedValue(undefined);
    vi.spyOn(settingsApi, 'fetchUsers').mockResolvedValue(sampleUsers);
    vi.spyOn(settingsApi, 'updateUser').mockResolvedValue(undefined);
    vi.spyOn(settingsApi, 'fetchOrganization').mockResolvedValue(sampleOrg);
    vi.spyOn(settingsApi, 'saveOrganization').mockResolvedValue(undefined);
    vi.spyOn(settingsApi, 'fetchAuditLog').mockResolvedValue(sampleAuditEntries);
  });

  describe('ConnectionsView Component', () => {
    it('renders connectors list with status badges and secret hints', async () => {
      render(<ConnectionsView initialConnections={sampleConnections} />);

      expect(screen.getByRole('heading', { level: 2, name: 'Connectors & Data Sources' })).toBeInTheDocument();
      expect(screen.getByText('Production n8n Cluster')).toBeInTheDocument();
      expect(screen.getByText('healthy')).toBeInTheDocument();
      expect(screen.getByText('Corporate Microsoft Entra ID')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText(/Error: Tenant certificate expired/)).toBeInTheDocument();
      expect(screen.getByText('Key ending …9a2f')).toBeInTheDocument();
    });

    it('triggers connection sync on button click', async () => {
      render(<ConnectionsView initialConnections={sampleConnections} />);

      const syncButtons = screen.getAllByRole('button', { name: 'Sync Now' });
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(settingsApi.syncConnection).toHaveBeenCalledWith('conn-n8n');
      });

      expect(await screen.findByText('Sync triggered for connection.')).toBeInTheDocument();
    });

    it('satisfies axe accessibility standards in ConnectionsView', async () => {
      const { container } = render(<ConnectionsView initialConnections={sampleConnections} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('N8nCheckView Component (Task 33)', () => {
    it('submits in-memory scan and renders 4-panel exposure report', async () => {
      render(<N8nCheckView />);

      expect(screen.getByRole('heading', { level: 2, name: 'n8n Ownership & Exposure Check' })).toBeInTheDocument();
      expect(screen.getByLabelText('n8n Instance URL')).toBeInTheDocument();

      const apiKeyInput = screen.getByLabelText('n8n API Key');
      fireEvent.change(apiKeyInput, { target: { value: 'n8n_api_secret123' } });

      const scanBtn = screen.getByRole('button', { name: 'Run Continuity Scan' });
      fireEvent.click(scanBtn);

      await waitFor(() => {
        expect(settingsApi.runN8nCheck).toHaveBeenCalledWith(
          'https://n8n.internal:5678',
          'n8n_api_secret123'
        );
      });

      // Metric summary strip
      expect(await screen.findByText('35')).toBeInTheDocument();
      expect(screen.getByText('Total Workflows')).toBeInTheDocument();

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
      const hrCheckboxes = screen.getAllByRole('checkbox');
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

      const saveBtn = screen.getByRole('button', { name: 'Save Organization Settings' });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(settingsApi.saveOrganization).toHaveBeenCalledWith(
          expect.objectContaining({
            companyName: 'Horquva Technologies Inc.',
            minGroupSize: 5,
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
    it('renders immutable audit trail table with event records', async () => {
      render(<AuditLogView initialEntries={sampleAuditEntries} />);

      expect(screen.getByRole('heading', { level: 2, name: 'Immutable Audit Trail' })).toBeInTheDocument();
      expect(screen.getByText('Guido van Rossum')).toBeInTheDocument();
      expect(screen.getByText('ASSIGN_BACKUP')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('ACCEPT_RISK')).toBeInTheDocument();
    });

    it('satisfies axe accessibility standards in AuditLogView', async () => {
      const { container } = render(<AuditLogView initialEntries={sampleAuditEntries} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
