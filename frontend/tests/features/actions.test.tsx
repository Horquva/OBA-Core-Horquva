import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ActionsView } from '@/features/actions/ActionsView';
import { ConfirmationsTab } from '@/features/actions/ConfirmationsTab';
import { NewCampaignWizard } from '@/features/actions/NewCampaignWizard';
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
    vi.spyOn(confirmationsApi, 'createCampaign').mockResolvedValue('camp-new-123');
  });

  describe('ActionsView Component', () => {
    it('renders ranked remediation actions list ordered by rank', async () => {
      render(<ActionsView initialActions={sampleActions} />);

      expect(screen.getByText('Actions & Confirmations')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('Critical Billing Pipeline lacks a qualified secondary backup')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('Production Database Sync runs under individual personal OAuth token')).toBeInTheDocument();
      expect(screen.getByText('4 critical assets affected')).toBeInTheDocument();
    });

    it('filters actions by status pills correctly', async () => {
      render(<ActionsView initialActions={sampleActions} />);

      // Filter to Accepted Risk only
      const acceptedRiskPill = screen.getByRole('button', { name: 'Accepted Risk' });
      fireEvent.click(acceptedRiskPill);

      expect(screen.getByText('Legacy SFDC Export lacks documented runbook')).toBeInTheDocument();
      expect(screen.queryByText('Critical Billing Pipeline lacks a qualified secondary backup')).not.toBeInTheDocument();

      // Renders rationale callout
      expect(screen.getByText(/"Scheduled for complete decommissioning at end of quarter."/)).toBeInTheDocument();
      expect(screen.getByText(/Under SIM-08, accepted risks remain fully counted in executive headline metrics/)).toBeInTheDocument();
    });

    it('displays empty state when filter yields zero actions', async () => {
      render(<ActionsView initialActions={sampleActions} />);

      // Filter to Resolved
      const resolvedPill = screen.getByRole('button', { name: 'Resolved' });
      fireEvent.click(resolvedPill);

      expect(screen.getByText('No actions in this view')).toBeInTheDocument();
      expect(screen.getByText('All identified continuity actions matching this status filter have been addressed.')).toBeInTheDocument();
    });

    it('allows toggling inline backup assignment picker', async () => {
      render(<ActionsView initialActions={sampleActions} />);

      const assignButtons = screen.getAllByRole('button', { name: 'Assign Backup' });
      fireEvent.click(assignButtons[0]);

      expect(screen.getByText(/Select Backup Nominee for Stripe Billing Pipeline:/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Choose person...')).toBeInTheDocument();

      // Click Cancel to dismiss
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);

      expect(screen.queryByText(/Select Backup Nominee for Stripe Billing Pipeline:/)).not.toBeInTheDocument();
    });

    it('opens accept risk modal with invariant notice and submits justification', async () => {
      render(<ActionsView initialActions={sampleActions} />);

      const acceptRiskButtons = screen.getAllByRole('button', { name: 'Accept Risk' });
      fireEvent.click(acceptRiskButtons[0]);

      // Verify modal content
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Accept Risk for #1')).toBeInTheDocument();
      expect(screen.getByText(/Integrity Invariant:/)).toBeInTheDocument();
      expect(
        screen.getByText(/Accepting risk documents organizational consent/i)
      ).toBeInTheDocument();

      // Fill form
      const textarea = screen.getByLabelText(/Business Justification/);
      fireEvent.change(textarea, { target: { value: 'Planned migration to SAP next month.' } });

      const submitBtn = screen.getByRole('button', { name: 'Confirm Risk Acceptance' });
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

    it('switches to Confirmation Campaigns tab', async () => {
      render(<ActionsView initialActions={sampleActions} />);

      const campaignsTabBtn = screen.getByRole('button', { name: /Confirmation Campaigns/ });
      fireEvent.click(campaignsTabBtn);

      expect(screen.getByText('Attestation & Confirmation Campaigns')).toBeInTheDocument();
      expect(screen.getByText('+ New Campaign')).toBeInTheDocument();
    });

    it('satisfies axe accessibility standards in ActionsView', async () => {
      const { container } = render(<ActionsView initialActions={sampleActions} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ConfirmationsTab Component', () => {
    it('renders campaigns with progress indicators', async () => {
      render(<ConfirmationsTab initialCampaigns={sampleCampaigns} />);

      expect(screen.getByText('Q3 Critical Systems Certification')).toBeInTheDocument();
      expect(screen.getByText('Engineering Handover Attestation')).toBeInTheDocument();
      expect(screen.getByText(/15 of 20 tasks/)).toBeInTheDocument();
      expect(screen.getByText(/8 of 8 tasks/)).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
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
      expect(screen.getByText('(10 of 10 questions answered)')).toBeInTheDocument();
      expect(screen.getByText('Alex Murphy')).toBeInTheDocument();
      expect(screen.getByText('(5 of 10 questions answered)')).toBeInTheDocument();
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
      expect(screen.getByText('Step 1: Choose Campaign Scope')).toBeInTheDocument();
      const nextBtn = screen.getByRole('button', { name: 'Continue to Review →' });
      fireEvent.click(nextBtn);

      // Step 2: Review Target Audience
      await waitFor(() => {
        expect(screen.getByText('Step 2: Review Attestation Scope')).toBeInTheDocument();
      });
      expect(screen.getByText('Targeted Reviewers (2)')).toBeInTheDocument();
      expect(screen.getByText('Reviewers')).toBeInTheDocument();
      expect(screen.getByText('Questions')).toBeInTheDocument();

      const proceedToMsgBtn = screen.getByRole('button', { name: 'Configure Message →' });
      fireEvent.click(proceedToMsgBtn);

      // Step 3: Notification Message Preview
      expect(screen.getByText('Step 3: Email Notification Preview')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Action Required: Confirm ownership and secondary backup for 6 systems')
      ).toBeInTheDocument();

      const proceedToScheduleBtn = screen.getByRole('button', { name: 'Schedule & Launch →' });
      fireEvent.click(proceedToScheduleBtn);

      // Step 4: Schedule & Launch
      expect(screen.getByText('Step 4: Campaign Schedule & Name')).toBeInTheDocument();
      const launchBtn = screen.getByRole('button', { name: '🚀 Launch Campaign' });
      expect(launchBtn).toBeInTheDocument();

      fireEvent.click(launchBtn);

      await waitFor(() => {
        expect(confirmationsApi.createCampaign).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Q4 Critical Systems Certification',
          })
        );
        expect(mockPush).toHaveBeenCalledWith('/actions');
      });
    });

    it('satisfies axe accessibility standards in NewCampaignWizard', async () => {
      const { container } = render(<NewCampaignWizard initialPreview={samplePreview} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
