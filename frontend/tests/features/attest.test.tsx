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
      departureId: 'dep-omar',
      from: { id: 'p-omar', name: 'Omar Haddad', kind: 'person' },
      leaveDate: '2026-11-15T00:00:00.000Z',
      assets: [
        {
          handoverId: 'ho-1',
          asset: { id: 'w-infra-bot', name: 'AWS Deploy Bot', kind: 'automation' },
          criticality: 'high',
          criticalityGrade: 'confirmed',
          runbookUrl: 'https://wiki/runbooks/aws-deploy',
          credentialNote: "Runs on Omar Haddad's personal credentials. Move it to a service account before their account is disabled.",
        },
        {
          handoverId: 'ho-2',
          asset: { id: 'w-payroll', name: 'Payroll Trigger', kind: 'automation' },
          criticality: 'unknown',
          criticalityGrade: 'unknown',
          runbookUrl: null,
          credentialNote: null,
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
    vi.spyOn(attestApi, 'loadAttestPeople').mockResolvedValue([
      { id: 'person:sarah@horquva.internal', kind: 'person', name: 'Sarah Connor' },
      { id: 'person:priya@acme.com', kind: 'person', name: 'Priya Sharma' },
    ]);
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
        screen.getByText(/Honest invariant: selecting .Don't know. preserves Unknown state rather than inventing answers./)
      ).toBeInTheDocument();
    });

    it('announces which answer is selected (aria-pressed) and labels every field', () => {
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);
      const yes = screen.getByRole('button', { name: 'Yes, I own it' });
      const no = screen.getByRole('button', { name: 'No, someone else owns it' });
      expect(yes).toHaveAttribute('aria-pressed', 'true');
      expect(no).toHaveAttribute('aria-pressed', 'false');

      const dontKnow = screen.getByRole('button', { name: "Don't know" });
      fireEvent.click(dontKnow);
      expect(dontKnow).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: 'Documented URL' }));
      expect(screen.getByLabelText('Runbook or recovery documentation link')).toBeInTheDocument();

      fireEvent.click(no);
      expect(screen.getByLabelText('Who owns it now? (if you know)')).toBeInTheDocument();
    });

    it('submits answers for current asset and advances to next asset', async () => {
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);

      // Select "No Backup" to satisfy backup question easily
      const noBackupBtn = screen.getByRole('button', { name: /No Backup \(Critical Gap\)/ });
      fireEvent.click(noBackupBtn);

      // Criticality has no default: it must be chosen.
      fireEvent.click(
        screen.getAllByRole('button', { pressed: false }).find((b) => b.textContent?.trim().toLowerCase().endsWith('critical'))!,
      );

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
            criticality: 'critical',
            criticalityReason: 'Direct revenue processing',
          })
        );
      });

      // Advances to second asset
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Customer Database Sync' })).toBeInTheDocument();
      });
    });

    it('will not save without a chosen criticality (no default gets recorded as confirmed)', async () => {
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);
      fireEvent.click(screen.getByRole('button', { name: /No Backup \(Critical Gap\)/ }));
      fireEvent.change(screen.getByLabelText(/One-line operational justification/), { target: { value: 'x' } });
      fireEvent.change(screen.getByPlaceholderText(/wiki.internal/), { target: { value: 'https://wiki/x' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save & Next Asset →' }));
      expect(await screen.findByText('Please choose how critical this system is.')).toBeInTheDocument();
      expect(attestApi.saveAttestAnswers).not.toHaveBeenCalled();
    });

    it('the backup picker lists real people, minus the reviewer themselves', async () => {
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);
      await waitFor(() => expect(attestApi.loadAttestPeople).toHaveBeenCalled());
      const input = screen.getByPlaceholderText('Search backup nominee...');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'a' } });
      expect(await screen.findByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Sarah Connor/ })).toBeNull();
    });

    it('"not the owner" hides the other questions and sends only who owns it', async () => {
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);
      fireEvent.click(screen.getByRole('button', { name: 'No, someone else owns it' }));
      expect(screen.queryByText('2. Who is your designated secondary backup?')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Save & Next Asset →' }));
      await waitFor(() =>
        expect(attestApi.saveAttestAnswers).toHaveBeenCalledWith(sampleSession, 'task-1', { isOwner: false, ownerPersonId: null }),
      );
    });

    it('locks the answers while a save is in flight (edits then would be lost)', async () => {
      let finish!: () => void;
      (attestApi.saveAttestAnswers as any).mockReturnValue(new Promise<void>((r) => (finish = r)));
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);
      fireEvent.click(screen.getByRole('button', { name: 'No, someone else owns it' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save & Next Asset →' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Yes, I own it' })).toBeDisabled());
      finish();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Yes, I own it' })).toBeEnabled());
    });

    it("shows the server's reason when saving fails", async () => {
      (attestApi.saveAttestAnswers as any).mockRejectedValue(new Error('This link has expired.'));
      render(<AttestForm token="tok-abc-123" initialSession={sampleSession} />);
      fireEvent.click(screen.getByRole('button', { name: 'No, someone else owns it' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save & Next Asset →' }));
      expect(await screen.findByText('Could not save: This link has expired.')).toBeInTheDocument();
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
      expect(screen.getByText('Thanks — answers saved for 2 of 2.')).toBeInTheDocument();
      expect(screen.queryByText(/verified SCD2/)).toBeNull();
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

      expect(screen.getByText('Successor Handover Requests (2)')).toBeInTheDocument();
      expect(screen.getByText('Omar Haddad is handing over 2 systems to you')).toBeInTheDocument();
      expect(screen.getByText('AWS Deploy Bot')).toBeInTheDocument();
      expect(screen.getByText(/Omar Haddad's personal credentials/)).toBeInTheDocument();
      // Missing facts stay missing: unknown criticality, no invented runbook.
      expect(screen.getByLabelText('Criticality: Unknown')).toBeInTheDocument();
      expect(screen.getByText('No runbook link on record')).toBeInTheDocument();
      // One answer per system, not one button for the whole card.
      expect(screen.getAllByRole('button', { name: /^Accept / })).toHaveLength(2);
    });

    it('handles handover acceptance action', async () => {
      render(<ReviewerView initialTasks={sampleReviewerTasks} />);

      fireEvent.click(screen.getByRole('button', { name: 'Accept Payroll Trigger' }));

      await waitFor(() => {
        expect(reviewerApi.acceptHandover).toHaveBeenCalledWith('ho-2');
      });
      expect(reviewerApi.acceptHandover).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/You now own Payroll Trigger/)).toBeInTheDocument();
    });

    it("shows the server's reason when accepting fails", async () => {
      vi.mocked(reviewerApi.acceptHandover).mockRejectedValueOnce(
        new Error('This handover is not awaiting a response (status: accepted).')
      );
      render(<ReviewerView initialTasks={sampleReviewerTasks} />);
      fireEvent.click(screen.getByRole('button', { name: 'Accept AWS Deploy Bot' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not accept AWS Deploy Bot: This handover is not awaiting a response (status: accepted).'
      );
    });

    it('handles decline handover workflow with mandatory reason', async () => {
      render(<ReviewerView initialTasks={sampleReviewerTasks} />);

      fireEvent.click(screen.getByRole('button', { name: "I can't take AWS Deploy Bot" }));

      const reasonTextarea = screen.getByLabelText(/Why can't you take over AWS Deploy Bot/i);
      fireEvent.change(reasonTextarea, {
        target: { value: 'Moving to mobile team; lacks AWS admin role.' },
      });

      const confirmDeclineBtn = screen.getByRole('button', { name: 'Confirm decline' });
      fireEvent.click(confirmDeclineBtn);

      await waitFor(() => {
        expect(reviewerApi.declineHandover).toHaveBeenCalledWith(
          'ho-1',
          'Moving to mobile team; lacks AWS admin role.'
        );
      });

      expect(await screen.findByText(/Declined AWS Deploy Bot/)).toBeInTheDocument();
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
