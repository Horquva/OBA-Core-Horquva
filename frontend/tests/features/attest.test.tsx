import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { AttestForm } from '@/features/attest/AttestForm';
import { ReviewerView } from '@/features/reviewer/ReviewerView';
import type { AttestSession, ReviewerTasks } from '@/types/view';
import * as attestApi from '@/lib/api/attest';
import * as reviewerApi from '@/lib/api/reviewer';

const sampleSession: AttestSession = {
  token: 'tok-abc-123',
  legacy: false,
  reviewer: { name: 'Sarah Connor', email: 'sarah@horquva.internal' },
  requestedBy: 'Guido van Rossum',
  company: { name: 'Cyberdyne Systems', logoUrl: null },
  expired: false,
  submitted: false,
  assets: [
    {
      taskId: 'task-1',
      asset: { id: 'w-billing', name: 'Stripe Billing Pipeline', kind: 'automation' },
      status: 'todo',
    },
    {
      taskId: 'task-2',
      asset: { id: 'w-db-sync', name: 'Customer Database Sync', kind: 'automation' },
      status: 'todo',
    },
  ],
};

const sampleReviewerTasks: ReviewerTasks = {
  confirmations: [
    {
      token: 'tok-abc-123',
      campaignName: 'Q4 Systems Certification',
      assetCount: 2,
      dueDate: '2026-10-31T00:00:00.000Z',
    },
  ],
  handovers: [
    {
      id: 'ho-1',
      from: { id: 'p-omar', name: 'Omar Haddad', kind: 'person' },
      assets: [
        {
          asset: { id: 'w-infra-bot', name: 'AWS Deploy Bot', kind: 'automation' },
          criticality: 'high',
          runbookUrl: 'https://wiki/runbooks/aws-deploy',
          credentialNote: 'Personal OAuth token must be rotated to service account',
        },
      ],
    },
  ],
};

describe('Reviewer Surfaces (Task 31)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(attestApi, 'fetchAttestSession').mockResolvedValue(sampleSession);
    vi.spyOn(attestApi, 'saveAttestAnswers').mockResolvedValue(undefined);
    vi.spyOn(reviewerApi, 'fetchReviewerTasks').mockResolvedValue(sampleReviewerTasks);
    vi.spyOn(reviewerApi, 'acceptHandover').mockResolvedValue(undefined);
    vi.spyOn(reviewerApi, 'declineHandover').mockResolvedValue(undefined);
  });

  describe('AttestForm Component (/attest/[token])', () => {
    it('renders landing header, progress count, and first asset card with all 5 questions', async () => {
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);

      expect(screen.getByText('Cyberdyne Systems')).toBeInTheDocument();
      expect(screen.getByText(/Ownership check requested by Guido van Rossum/)).toBeInTheDocument();
      expect(screen.getByText('Confirm 2 automations · about 1 min each')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Stripe Billing Pipeline' })).toBeInTheDocument();

      // All 5 questions
      expect(screen.getByText('1. Do you still own this system?')).toBeInTheDocument();
      expect(screen.getByText('2. Who is your designated secondary backup?')).toBeInTheDocument();
      expect(screen.getByText('3. How critical is this system to business continuity?')).toBeInTheDocument();
      expect(screen.getByText('4. Where is the operational runbook or recovery documentation?')).toBeInTheDocument();
      expect(screen.getByText('5. Is there a verified manual or automated fallback if this stops?')).toBeInTheDocument();
    });

    it('supports "Don\'t know" fallback option adhering to Unknown invariant', async () => {
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);

      const dontKnowBtn = screen.getByRole('button', { name: "Don't know" });
      expect(dontKnowBtn).toBeInTheDocument();
      expect(
        screen.getByText(
          /Honest invariant: selecting "Don't know" preserves Unknown state rather than inventing answers./
        )
      ).toBeInTheDocument();
    });

    it('submits answers for current asset and advances to next asset', async () => {
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);

      // Select "No Backup" to satisfy backup question easily
      const noBackupBtn = screen.getByRole('button', { name: /No Backup \(Critical Gap\)/ });
      fireEvent.click(noBackupBtn);

      // Provide criticality justification
      const critInput = screen.getByLabelText(/One-line operational justification/);
      fireEvent.change(critInput, { target: { value: 'Direct revenue processing' } });

      // Provide runbook URL
      const runbookInput = screen.getByPlaceholderText(/wiki.internal/);
      fireEvent.change(runbookInput, { target: { value: 'https://wiki/stripe' } });

      const submitBtn = screen.getByRole('button', { name: 'Save & Next Asset →' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(attestApi.saveAttestAnswers).toHaveBeenCalledWith(
          sampleSession,
          'task-1',
          expect.objectContaining({
            isOwner: true,
            backup: { kind: 'none' },
            criticalityReason: 'Direct revenue processing',
          })
        );
      });

      // Advances to second asset
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Customer Database Sync' })).toBeInTheDocument();
      });
    });

    it('renders expired state when session is expired', async () => {
      const expiredSession: AttestSession = {
        ...sampleSession,
        expired: true,
      };

      render(<AttestForm token="tok-abc-123" initialSession={expiredSession} />);
      expect(screen.getByText('Attestation Link Expired')).toBeInTheDocument();
      expect(screen.getByText(/This verification link has expired/)).toBeInTheDocument();
    });

    it('renders completed state when session was submitted', async () => {
      const completedSession: AttestSession = {
        ...sampleSession,
        submitted: true,
        assets: sampleSession.assets.map((a) => ({ ...a, status: 'saved' })),
      };

      render(<AttestForm token="tok-abc-123" initialSession={completedSession} />);
      expect(screen.getByText('Thanks — 2 of 2 confirmed.')).toBeInTheDocument();
      expect(screen.getByText('Powered by OBA · Horquva')).toBeInTheDocument();
    });

    it('satisfies axe accessibility standards in AttestForm', async () => {
      const { container } = render(
        <AttestForm token="tok-abc-123" initialSession={sampleSession} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ReviewerView Component (/my)', () => {
    it('renders pending confirmations and successor handover requests', async () => {
      render(<ReviewerView initialTasks={sampleReviewerTasks} />);

      expect(screen.getByRole('heading', { level: 1, name: 'My Review Tasks' })).toBeInTheDocument();
      expect(screen.getByText('Pending System Attestations (1)')).toBeInTheDocument();
      expect(screen.getByText('Q4 Systems Certification')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Start Confirmation →' })).toHaveAttribute(
        'href',
        '/attest/tok-abc-123'
      );

      expect(screen.getByText('Successor Handover Requests (1)')).toBeInTheDocument();
      expect(screen.getByText('Omar Haddad is handing over 1 system')).toBeInTheDocument();
      expect(screen.getByText('AWS Deploy Bot')).toBeInTheDocument();
      expect(
        screen.getByText(/Personal OAuth token must be rotated to service account/)
      ).toBeInTheDocument();
    });

    it('handles handover acceptance action', async () => {
      render(<ReviewerView initialTasks={sampleReviewerTasks} />);

      const acceptBtn = screen.getByRole('button', { name: 'Accept Handover' });
      fireEvent.click(acceptBtn);

      await waitFor(() => {
        expect(reviewerApi.acceptHandover).toHaveBeenCalledWith('ho-1');
      });

      expect(await screen.findByText('Handover successfully accepted.')).toBeInTheDocument();
    });

    it('handles decline handover workflow with mandatory reason', async () => {
      render(<ReviewerView initialTasks={sampleReviewerTasks} />);

      const declineToggleBtn = screen.getByRole('button', { name: "I can't take this" });
      fireEvent.click(declineToggleBtn);

      const reasonTextarea = screen.getByLabelText(/Reason you cannot take over these assets/i);
      fireEvent.change(reasonTextarea, {
        target: { value: 'Moving to mobile team; lacks AWS admin role.' },
      });

      const confirmDeclineBtn = screen.getByRole('button', { name: 'Confirm Decline' });
      fireEvent.click(confirmDeclineBtn);

      await waitFor(() => {
        expect(reviewerApi.declineHandover).toHaveBeenCalledWith(
          'ho-1',
          'Moving to mobile team; lacks AWS admin role.'
        );
      });

      expect(await screen.findByText('Handover declined with feedback.')).toBeInTheDocument();
    });

    it('renders empty state when reviewer has zero tasks', async () => {
      render(
        <ReviewerView
          initialTasks={{
            confirmations: [],
            handovers: [],
          }}
        />
      );

      expect(screen.getByText('All caught up')).toBeInTheDocument();
      expect(
        screen.getByText(
          'You have no pending system certifications or asset handovers to review.'
        )
      ).toBeInTheDocument();
    });

    it('satisfies axe accessibility standards in ReviewerView', async () => {
      const { container } = render(
        <ReviewerView initialTasks={sampleReviewerTasks} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
