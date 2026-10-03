import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ToastProvider } from '@/components/ui/Toast';
import { BriefingView } from '@/features/briefing/BriefingView';

const sampleBriefing = `
# Executive Summary
The organization tracks 52 critical operational assets. 38 are fully protected with confirmed human backups. 14 assets are currently exposed to operational discontinuity.

# Critical Exposure
- Billing Gateway: Lacks secondary human owner.
- Customer Data Sync: Lacks verified fallback documentation.

# Immediate Actions
1. Launch Confirmation Campaign to verify unconfirmed assets.
2. Cross-train backup operators for exposed automations.
`.trim();

const sampleCoverage = {
  total: 52,
  covered: 38,
  exposed: 14,
  unknown: 4,
  definition: 'An asset is covered if it has a confirmed backup owner and documented runbook.',
};

vi.mock('@/lib/api/overview', () => ({
  fetchBriefing: vi.fn(),
  fetchCoverage: vi.fn(),
}));

import { fetchBriefing, fetchCoverage } from '@/lib/api/overview';

describe('BriefingView Component (Task 20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchBriefing as any).mockResolvedValue(sampleBriefing);
    (fetchCoverage as any).mockResolvedValue(sampleCoverage);

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders briefing reading view with editorial typography and AI transparency marker', async () => {
    const { container } = render(
      <ToastProvider>
        <BriefingView />
      </ToastProvider>,
    );

    // Verify title and AI marker
    expect(screen.getByText('Continuity Executive Briefing')).toBeInTheDocument();
    expect(
      screen.getByText('Written by AI from counted deterministic facts'),
    ).toBeInTheDocument();

    // Wait for briefing data to load
    await waitFor(() => {
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    });

    expect(screen.getByText(/The organization tracks 52 critical operational assets/)).toBeInTheDocument();
    expect(screen.getByText(/Billing Gateway: Lacks secondary human owner/)).toBeInTheDocument();

    // Verify Grounding & Citation Ledger
    expect(screen.getByText('Grounding & Citation Ledger')).toBeInTheDocument();
    expect(screen.getByText(/4 immutable fact references/)).toBeInTheDocument();

    // Check accessibility
    expect(await axe(container)).toHaveNoViolations();
  });

  it('handles copy briefing action and notifies via toast', async () => {
    render(
      <ToastProvider>
        <BriefingView initialBriefing={sampleBriefing} />
      </ToastProvider>,
    );

    const copyBtn = screen.getByRole('button', { name: 'Copy briefing' });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleBriefing);
    expect(await screen.findByText('Briefing copied')).toBeInTheDocument();
  });

  it('renders honest empty state when no briefing is available', async () => {
    (fetchBriefing as any).mockResolvedValue('');

    render(
      <ToastProvider>
        <BriefingView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('No briefing available yet')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Weekly briefings compile every Monday at 8:00 AM/),
    ).toBeInTheDocument();
  });
});
