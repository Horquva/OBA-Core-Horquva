import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  EvidenceDot,
  EvidenceBadge,
  CheckStatusBadge,
  CriticalityDots,
  UnknownValue,
  NoneValue,
} from '@/components/ui/marks';

describe('Semantic Data Marks', () => {
  it('renders EvidenceDot with accessible tooltip and aria-label', async () => {
    const { container } = render(
      <EvidenceDot grade="stated" source="n8n" observedAt="2026-10-01T08:42:00Z" />
    );
    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('aria-label', expect.stringContaining('Stated · n8n'));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders EvidenceBadge for all grades', () => {
    render(
      <div>
        <EvidenceBadge grade="stated" />
        <EvidenceBadge grade="inferred" />
        <EvidenceBadge grade="confirmed" />
        <EvidenceBadge grade="unknown" />
      </div>
    );
    expect(screen.getByText('Stated')).toBeInTheDocument();
    expect(screen.getByText('Inferred')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders CheckStatusBadge for PASS, FAIL, UNKNOWN', () => {
    render(
      <div>
        <CheckStatusBadge status="PASS" />
        <CheckStatusBadge status="FAIL" />
        <CheckStatusBadge status="UNKNOWN" />
      </div>
    );
    expect(screen.getByText('PASS')).toBeInTheDocument();
    expect(screen.getByText('FAIL')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('renders CriticalityDots for all levels without using red', async () => {
    const { container } = render(
      <div>
        <CriticalityDots level="critical" />
        <CriticalityDots level="high" />
        <CriticalityDots level="medium" />
        <CriticalityDots level="low" />
        <CriticalityDots level="unknown" />
      </div>
    );
    expect(screen.getByLabelText('Criticality: Critical')).toHaveTextContent('●●●● Critical');
    expect(screen.getByLabelText('Criticality: High')).toHaveTextContent('●●●○ High');
    expect(screen.getByLabelText('Criticality: Unknown')).toHaveTextContent('○○○○ Unknown');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders UnknownValue with optional ask owner trigger', () => {
    const onAsk = vi.fn();
    render(<UnknownValue onAskOwner={onAsk} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    const btn = screen.getByText('Ask owner');
    fireEvent.click(btn);
    expect(onAsk).toHaveBeenCalledOnce();
  });

  it('renders NoneValue as confirmed absence', () => {
    render(<NoneValue />);
    const none = screen.getByText('None');
    expect(none).toHaveClass('text-st-fail');
  });
});
