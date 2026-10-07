import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ToastProvider } from '@/components/ui/Toast';
import { BriefingView } from '@/features/briefing/BriefingView';
import type { BriefingDetail } from '@/types/view';

const sampleText = `
# Executive Summary
1 of 4 critical assets are fully covered. 3 are exposed, and 0 are unknown until their facts are confirmed.

# Critical Exposure
- Billing Sync to Stripe: only Omar Farooq owns it.
`.trim();

const detail = (over: Partial<BriefingDetail> = {}): BriefingDetail => ({
  text: sampleText,
  writtenBy: 'template',
  generatedAt: '2026-10-07T09:30:00.000Z',
  figures: {
    headline: { coveredCount: 1, exposedCount: 3, unknownCount: 0, totalCriticalAssets: 4 },
    upcomingDepartures: 1,
    overdueDepartures: 1,
    singlePointsOfFailure: 3,
    personalCredentialAutomations: 1,
    recentFailures: 0,
  },
  ...over,
});

vi.mock('@/lib/api/overview', () => ({ fetchBriefingDetail: vi.fn() }));
import { fetchBriefingDetail } from '@/lib/api/overview';

const renderView = (props: React.ComponentProps<typeof BriefingView> = {}) =>
  render(
    <ToastProvider>
      <BriefingView {...props} />
    </ToastProvider>,
  );

describe('BriefingView (D16: honest about who wrote it and from what)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchBriefingDetail).mockResolvedValue(detail());
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('renders the text, says the template wrote it, and lists the real figures', async () => {
    const { container } = renderView();
    expect(await screen.findByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('Written from a fixed template (AI not used)')).toBeInTheDocument();
    expect(screen.queryByText(/Written by AI/)).toBeNull();
    expect(screen.getByText(/^Written .* from OBA's current records\.$/)).toBeInTheDocument();

    // Figures, not invented citations.
    expect(screen.getByText('Figures this briefing was written from')).toBeInTheDocument();
    expect(screen.getByText('1 of 4')).toBeInTheDocument();
    expect(screen.queryByText(/Citation Ledger|immutable|SCD2|Monday 8:00/)).toBeNull();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('only says "AI" when the model actually wrote it', async () => {
    vi.mocked(fetchBriefingDetail).mockResolvedValue(detail({ writtenBy: 'ai' }));
    renderView();
    expect(await screen.findByText('Written by AI from the counted figures below')).toBeInTheDocument();
  });

  it('copies the briefing text', async () => {
    renderView({ initialBriefing: sampleText });
    fireEvent.click(screen.getByRole('button', { name: 'Copy briefing' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleText);
    expect(await screen.findByText('Briefing copied')).toBeInTheDocument();
  });

  it('shows an error with retry when the briefing fails to load', async () => {
    vi.mocked(fetchBriefingDetail).mockRejectedValueOnce(new Error('boom'));
    renderView();
    expect(await screen.findByText(/couldn't generate or load/)).toBeInTheDocument();
  });

  it('is honest when no text comes back (no invented schedule)', async () => {
    vi.mocked(fetchBriefingDetail).mockResolvedValue(detail({ text: '' }));
    renderView();
    await waitFor(() => expect(screen.getByText('No briefing text came back')).toBeInTheDocument());
    expect(screen.queryByText(/Monday/)).toBeNull();
  });
});
