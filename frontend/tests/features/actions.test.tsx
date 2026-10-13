import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ActionsView } from '@/features/actions/ActionsView';
import { ConfirmationsTab } from '@/features/actions/ConfirmationsTab';
import { NewCampaignWizard } from '@/features/actions/NewCampaignWizard';
import { SessionProvider } from '@/lib/session';
import { ToastProvider } from '@/components/ui/Toast';
import type { Session } from '@/types/view';
import * as entitiesApi from '@/lib/api/entities';

const sessions: Record<'admin' | 'reviewer' | 'viewer', Session> = {
  admin: { userId: 'user:admin', name: 'Alex Rivera', email: 'alex@acme.com', role: 'admin', isHrManager: true, title: null },
  reviewer: { userId: 'user:chen', name: 'Chen Wei', email: 'chen@acme.com', role: 'reviewer', isHrManager: false, title: null },
  viewer: { userId: 'user:maya', name: 'Maya Lin', email: 'maya@acme.com', role: 'viewer', isHrManager: false, title: null },
};

// ActionsView needs a session (role-gated buttons) and toasts (honest feedback).
function renderActions(as: keyof typeof sessions = 'admin') {
  vi.spyOn(entitiesApi, 'fetchPeople').mockResolvedValue([
    { id: 'person:chen@acme.com', kind: 'person', name: 'Chen Wei' },
    { id: 'person:priya@acme.com', kind: 'person', name: 'Priya Sharma' },
  ]);
  return render(
    <SessionProvider initialSession={sessions[as]}>
      <ToastProvider>
        <ActionsView initialActions={sampleActions} />
      </ToastProvider>
    </SessionProvider>,
  );
}
import type {
  ActionView,
  CampaignSummary,
  CampaignDetail,
  CampaignPreview,
} from '@/types/view';
import * as actionsApi from '@/lib/api/actions';
import * as confirmationsApi from '@/lib/api/confirmations';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const sampleActions: ActionView[] = [
  {
    id: 'act-1',
    rank: 1,
    type: 'assign_backup',
    status: 'open',
    problem: 'Critical Billing Pipeline lacks a qualified secondary backup',
    asset: { id: 'w-billing', name: 'Stripe Billing Pipeline', kind: 'automation' },
    failingFact: 'backup: none',
    criticalAssetsAffected: 4,
    checkId: 'CHK-01-NO-BACKUP',
    primary: { kind: 'assign_backup' },
    acceptedRisk: null,
    resolvedAt: null,
  },
  {
    id: 'act-2',
    rank: 2,
    type: 'move_credential',
    status: 'open',
    problem: 'Production Database Sync runs under individual personal OAuth token',
    asset: { id: 'w-db-sync', name: 'Customer Database Sync', kind: 'automation' },
    failingFact: 'credential: user_account',
    criticalAssetsAffected: 2,
    checkId: 'CHK-03-PERSONAL-CRED',
    primary: { kind: 'link', label: 'Rotate Credential', href: '/settings/connections' },
    acceptedRisk: null,
    resolvedAt: null,
  },
  {
    id: 'act-3',
    rank: 3,
    type: 'assign_backup',
    status: 'accepted_risk',
    problem: 'Legacy SFDC Export lacks documented runbook',
    asset: { id: 'w-sfdc', name: 'SFDC Nightly Export', kind: 'automation' },
    failingFact: 'runbook: none',
    criticalAssetsAffected: 1,
    checkId: 'CHK-05-RUNBOOK',
    primary: { kind: 'assign_backup' },
    acceptedRisk: {
      reason: 'Scheduled for complete decommissioning at end of quarter.',
      expiresAt: '2026-12-31T00:00:00.000Z',
      acceptedBy: 'Sarah Connor',
    },
    resolvedAt: null,
  },
];

const sampleCampaigns: CampaignSummary[] = [
  {
    id: 'camp-1',
    name: 'Q3 Critical Systems Certification',
    status: 'active',
    dueDate: '2026-10-15T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    totalTasks: 20,
    completedTasks: 15,
  },
  {
    id: 'camp-2',
    name: 'Engineering Handover Attestation',
    status: 'completed',
    dueDate: '2026-09-30T00:00:00.000Z',
    createdAt: '2026-09-15T00:00:00.000Z',
    totalTasks: 8,
    completedTasks: 8,
  },
];

const sampleCampaignDetail: CampaignDetail = {
  id: 'camp-1',
  reviewers: [
    { person: { id: 'p-sarah', name: 'Sarah Connor', kind: 'person' }, completed: 10, total: 10 },
    { person: { id: 'p-alex', name: 'Alex Murphy', kind: 'person' }, completed: 5, total: 10 },
  ],
  reminderAt: '2026-10-08T09:00:00.000Z',
  escalationAt: '2026-10-13T09:00:00.000Z',
};

const samplePreview: CampaignPreview = {
  emailCount: 4,
  questionCount: 12,
  unassignedAssets: [{ id: 'automation:n8n:104', kind: 'automation', name: 'Customer Onboarding Flow' }],
  reviewers: [
    {
      person: { id: 'p-sarah', name: 'Sarah Connor', kind: 'person' },
      email: 'sarah@horquva.internal',
      assetCount: 6,
      viaManager: false,
    },
    {
      person: { id: 'p-alex', name: 'Alex Murphy', kind: 'person' },
      email: 'alex@horquva.internal',
      assetCount: 6,
      viaManager: false,
    },
  ],
  tasks: [
    { reviewerPersonId: 'p-sarah', assetEntityId: 'w-billing' },
    { reviewerPersonId: 'p-alex', assetEntityId: 'w-db-sync' },
  ],
  email: {
    subject: 'Action Required: Confirm ownership and secondary backup for 6 systems',
    bodyText: 'Please review and confirm your assigned production automations.',
  },
};

describe('Remediation & Certifications (Tasks 28-29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(actionsApi, 'fetchActions').mockResolvedValue(sampleActions);
    vi.spyOn(actionsApi, 'assignBackup').mockResolvedValue(undefined);
    vi.spyOn(actionsApi, 'acceptRisk').mockResolvedValue(undefined);
    vi.spyOn(confirmationsApi, 'fetchCampaigns').mockResolvedValue(sampleCampaigns);
    vi.spyOn(confirmationsApi, 'fetchCampaignDetail').mockResolvedValue(sampleCampaignDetail);
    vi.spyOn(confirmationsApi, 'previewCampaign').mockResolvedValue(samplePreview);
    vi.spyOn(confirmationsApi, 'createCampaign').mockResolvedValue({ campaignId: 'camp-new-123', reviewers: 2, emailsSent: 2, emailDelivery: 'logged' });
    vi.spyOn(confirmationsApi, 'previewCampaignEmail').mockResolvedValue({
      to: { person: { id: 'p-alex', name: 'Alex Murphy', kind: 'person' }, email: 'alex@horquva.internal' },
      reviewerCount: 2,
      subject: 'Action Required: Confirm ownership and secondary backup for 6 systems',
      html: '<p>Hi Alex Murphy</p>',
      text: 'Hi Alex Murphy',
    });
  });

  describe('ActionsView Component', () => {
    it('renders ranked remediation actions list ordered by rank', async () => {
      renderActions();

      expect(screen.getByRole('heading', { level: 1, name: 'Actions' })).toBeInTheDocument();
      expect(screen.getByText('Rank 1')).toBeInTheDocument();
      expect(screen.getByText('Critical Billing Pipeline lacks a qualified secondary backup')).toBeInTheDocument();
      expect(screen.getByText('Rank 2')).toBeInTheDocument();
      expect(screen.getByText('Production Database Sync runs under individual personal OAuth token')).toBeInTheDocument();
      expect(screen.getByText('affects 4 critical assets')).toBeInTheDocument();
      // Plain names, no check codes
      expect(screen.queryByText(/CHK-01/)).not.toBeInTheDocument();
    });

    it('filters actions by status pills correctly', async () => {
      renderActions();

      // Filter to Accepted Risk only
      const acceptedRiskPill = screen.getByRole('button', { name: /^Risk accepted/ });
      fireEvent.click(acceptedRiskPill);

      expect(screen.getByText('Legacy SFDC Export lacks documented runbook')).toBeInTheDocument();
      expect(screen.queryByText('Critical Billing Pipeline lacks a qualified secondary backup')).not.toBeInTheDocument();

      // Renders rationale callout
      expect(screen.getByText(/Scheduled for complete decommissioning at end of quarter./)).toBeInTheDocument();
      expect(screen.getByText(/accepted by Sarah Connor/)).toBeInTheDocument();
    });

    it('displays empty state when filter yields zero actions', async () => {
      renderActions();

      // Filter to Resolved
      const resolvedPill = screen.getByRole('button', { name: /^Resolved/ });
      fireEvent.click(resolvedPill);

      expect(screen.getByText('No actions in this view')).toBeInTheDocument();
      expect(screen.getByText('Nothing matches these filters.')).toBeInTheDocument();
    });

    it('shows only the actions each role may take (matches backend RBAC)', async () => {
      const { unmount } = renderActions('viewer');
      expect(screen.queryByRole('button', { name: 'Assign a backup' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /More actions for/ })).not.toBeInTheDocument();
      unmount();

      renderActions('reviewer');
      expect(screen.getAllByRole('button', { name: 'Assign a backup' }).length).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: /More actions for/ })).not.toBeInTheDocument();
    });

    it('lists real people in the backup picker and reports a refused assignment', async () => {
      vi.spyOn(actionsApi, 'assignBackup').mockRejectedValue(new Error('Omar Farooq already owns it; a backup must be someone else.'));
      renderActions();
      fireEvent.click(screen.getAllByRole('button', { name: 'Assign a backup' })[0]);

      const input = screen.getByPlaceholderText('Choose a person…');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Priya' } });
      fireEvent.click(await screen.findByText('Priya Sharma'));

      expect(await screen.findByText("Backup wasn't assigned")).toBeInTheDocument();
      expect(screen.getByText(/a backup must be someone else/)).toBeInTheDocument();
    });

    it('allows toggling inline backup assignment picker', async () => {
      renderActions();

      const assignButtons = screen.getAllByRole('button', { name: 'Assign a backup' });
      fireEvent.click(assignButtons[0]);

      expect(screen.getByText('Who backs up Stripe Billing Pipeline?')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Choose a person…')).toBeInTheDocument();

      // Click Cancel to dismiss
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);

      expect(screen.queryByText('Who backs up Stripe Billing Pipeline?')).not.toBeInTheDocument();
    });

    it('accepts risk from the row menu, in plain language, and still counts it as exposed', async () => {
      renderActions();

      fireEvent.click(screen.getAllByRole('button', { name: /More actions for/ })[0]);
      fireEvent.click(screen.getByRole('menuitem', { name: 'Accept risk' }));

      // Verify modal content
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Accept the risk' })).toBeInTheDocument();
      expect(screen.getByText(/still counts as exposed on Overview, and reopens on/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '180 days' }));
      expect(screen.getByRole('button', { name: '180 days' })).toHaveAttribute('aria-pressed', 'true');

      // Fill form
      const textarea = screen.getByLabelText(/Why is this acceptable/);
      fireEvent.change(textarea, { target: { value: 'Planned migration to SAP next month.' } });

      const submitBtn = screen.getByRole('button', { name: 'Accept risk' });
      expect(submitBtn).toBeEnabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(actionsApi.acceptRisk).toHaveBeenCalledWith(
          'act-1',
          expect.objectContaining({
            reason: 'Planned migration to SAP next month.',
          })
        );
      });
    });

    it('switches to the Confirmations tab', async () => {
      renderActions();

      fireEvent.click(screen.getByRole('tab', { name: /Confirmations/ }));

      expect(screen.getByRole('heading', { name: 'Confirmation campaigns' })).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /New campaign/ })[0]).toHaveAttribute('href', '/actions/confirmations/new');
    });

    it('?id= from Overview highlights that action, even when a filter would hide it', async () => {
      vi.spyOn(entitiesApi, 'fetchPeople').mockResolvedValue([]);
      render(
        <SessionProvider initialSession={sessions.admin}>
          <ToastProvider>
            <ActionsView initialActions={sampleActions} highlightId="act-3" initialStatus="open" />
          </ToastProvider>
        </SessionProvider>,
      );
      expect(await screen.findByText('Legacy SFDC Export lacks documented runbook')).toBeInTheDocument();
      expect(document.getElementById('action-act-3')?.className).toMatch(/amber/);
    });

    it('?status= sets the filter', async () => {
      vi.spyOn(entitiesApi, 'fetchPeople').mockResolvedValue([]);
      render(
        <SessionProvider initialSession={sessions.admin}>
          <ToastProvider>
            <ActionsView initialActions={sampleActions} initialStatus="accepted_risk" />
          </ToastProvider>
        </SessionProvider>,
      );
      expect(screen.getByText('Legacy SFDC Export lacks documented runbook')).toBeInTheDocument();
      expect(screen.queryByText('Critical Billing Pipeline lacks a qualified secondary backup')).not.toBeInTheDocument();
    });

    it('satisfies axe accessibility standards in ActionsView', async () => {
      const { container } = renderActions();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ConfirmationsTab Component', () => {
    it('renders campaigns with progress indicators', async () => {
      render(<ConfirmationsTab initialCampaigns={sampleCampaigns} />);

      expect(screen.getByText('Q3 Critical Systems Certification')).toBeInTheDocument();
      expect(screen.getByText('Engineering Handover Attestation')).toBeInTheDocument();
      expect(screen.getByText('15 of 20 systems')).toBeInTheDocument();
      expect(screen.getByText('8 of 8 systems')).toBeInTheDocument();
      // Counts, never percentages.
      expect(screen.queryByText(/\d+%/)).toBeNull();
    });

    it('marks overdue campaigns', () => {
      render(<ConfirmationsTab initialCampaigns={[{ ...sampleCampaigns[0], status: 'overdue' }]} />);
      expect(screen.getByText('overdue')).toBeInTheDocument();
    });

    it('says when the reviewer breakdown fails to load, with a retry (not "no reviewers")', async () => {
      vi.mocked(confirmationsApi.fetchCampaignDetail).mockRejectedValueOnce(new Error('Campaign not found.'));
      render(<ConfirmationsTab initialCampaigns={sampleCampaigns} />);
      fireEvent.click(screen.getByRole('button', { name: /View reviewer breakdown for Q3/ }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not load reviewers: Campaign not found.');
      expect(screen.queryByText(/No reviewers assigned/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(await screen.findByText('Sarah Connor')).toBeInTheDocument();
    });

    it('expands campaign to show reviewer breakdown and reminder schedule', async () => {
      render(<ConfirmationsTab initialCampaigns={sampleCampaigns} />);

      const expandBtn = screen.getByRole('button', {
        name: /View reviewer breakdown for Q3 Critical Systems Certification/i,
      });
      fireEvent.click(expandBtn);

      await waitFor(() => {
        expect(confirmationsApi.fetchCampaignDetail).toHaveBeenCalledWith('camp-1');
      });

      expect(await screen.findByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('(10 of 10 systems answered)')).toBeInTheDocument();
      expect(screen.getByText('Alex Murphy')).toBeInTheDocument();
      expect(screen.getByText('(5 of 10 systems answered)')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('Waiting')).toBeInTheDocument();
      expect(screen.getByText(/Reminder: Oct 8, 2026/)).toBeInTheDocument();
    });

    it('satisfies axe accessibility standards in ConfirmationsTab', async () => {
      const { container } = render(<ConfirmationsTab initialCampaigns={sampleCampaigns} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('NewCampaignWizard Component', () => {
    it('walks through the 4-step wizard progression and launches campaign', async () => {
      render(<NewCampaignWizard initialPreview={samplePreview} />);

      // Step 1: Scope
      expect(screen.getByRole('heading', { name: 'Who should we ask?' })).toBeInTheDocument();
      const nextBtn = screen.getByRole('button', { name: 'Continue' });
      fireEvent.click(nextBtn);

      // Step 2: Review Target Audience
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Review who gets asked' })).toBeInTheDocument();
      });
      expect(screen.getByText('Targeted Reviewers (2)')).toBeInTheDocument();
      // Systems with no current owner are named, not silently dropped.
      expect(screen.getByText(/1 system has no current owner on record.*Customer Onboarding Flow/)).toBeInTheDocument();
      expect(screen.getByText('Reviewers')).toBeInTheDocument();
      expect(screen.getByText('Questions')).toBeInTheDocument();

      const proceedToMsgBtn = screen.getByRole('button', { name: 'Continue' });
      fireEvent.click(proceedToMsgBtn);

      // Step 3: Notification Message Preview
      expect(screen.getByRole('heading', { name: "The email they'll get" })).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Action Required: Confirm ownership and secondary backup for 6 systems')
      ).toBeInTheDocument();
      // The real email, rendered by the server, for the first reviewer.
      expect(await screen.findByText('What Alex Murphy receives')).toBeInTheDocument();
      expect(screen.getByTitle('Email preview for Alex Murphy')).toHaveAttribute('sandbox', '');
      expect(confirmationsApi.previewCampaignEmail).toHaveBeenCalledWith(
        expect.objectContaining({ tasks: samplePreview.tasks, email: expect.objectContaining({ subject: expect.any(String) }) })
      );

      const proceedToScheduleBtn = screen.getByRole('button', { name: 'Continue' });
      fireEvent.click(proceedToScheduleBtn);

      // Step 4: Schedule & Launch
      expect(screen.getByRole('heading', { name: 'Name it and set a deadline' })).toBeInTheDocument();
      const launchBtn = screen.getByRole('button', { name: 'Launch campaign' });
      expect(launchBtn).toBeInTheDocument();
      expect(screen.getByText(/Reminder emails aren't sent automatically yet/)).toBeInTheDocument();

      fireEvent.click(launchBtn);

      await waitFor(() => {
        expect(confirmationsApi.createCampaign).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Q4 Critical Systems Certification',
            // The wording the admin reviewed is what gets sent.
            email: expect.objectContaining({ subject: 'Action Required: Confirm ownership and secondary backup for 6 systems' }),
          })
        );
      });
      // Honest result before leaving: no SMTP means nothing was emailed.
      expect(await screen.findByText(/nothing was emailed/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Back to Actions' }));
      expect(mockPush).toHaveBeenCalledWith('/actions?tab=confirmations');
    });

    it('satisfies axe accessibility standards in NewCampaignWizard', async () => {
      const { container } = render(<NewCampaignWizard initialPreview={samplePreview} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
