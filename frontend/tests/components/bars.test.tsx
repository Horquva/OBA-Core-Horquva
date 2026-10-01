import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { SegmentedBar, NamedShareBar } from '@/components/ui/bars';
import { CoverageStrip } from '@/components/ui/CoverageStrip';
import { StageStepper } from '@/components/ui/StageStepper';
import { PriorityCard } from '@/components/ui/PriorityCard';

describe('Layout Containers, Cards & Bars', () => {
  it('renders Card with header and content', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>Test card description</CardDescription>
        </CardHeader>
        <CardContent>Body content</CardContent>
      </Card>
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Card');
    expect(screen.getByText('Test card description')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders SegmentedBar with proportional progressbar', async () => {
    const segments = [
      { count: 38, label: 'covered', colorClass: 'bg-st-pass' },
      { count: 14, label: 'exposed', colorClass: 'bg-st-fail' },
    ];
    const { container } = render(<SegmentedBar segments={segments} total={52} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '52');
    expect(screen.getByText('covered')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders NamedShareBar with holders', async () => {
    const holders = [
      { person: { id: 'p1', kind: 'person' as const, name: 'Alice Smith' }, sharePct: 60 },
      { person: { id: 'p2', kind: 'person' as const, name: 'Bob Jones' }, sharePct: 40 },
    ];
    const { container } = render(<NamedShareBar holders={holders} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders CoverageStrip with serif title and disclosure toggle', async () => {
    const metrics = {
      total: 52,
      covered: 38,
      exposed: 14,
      unknown: 0,
      definition: 'Coverage definition rule',
    };
    const { container } = render(<CoverageStrip metrics={metrics} />);
    expect(screen.getByText(/38 of 52 critical assets fully covered/)).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'What counts as covered?' });
    fireEvent.click(toggle);
    expect(screen.getByText('Coverage Definition (SIM-07)')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders StageStepper for 5 departure stages', async () => {
    const { container } = render(
      <StageStepper currentStage="accepted" />
    );
    expect(screen.getByLabelText('Departure lifecycle stages')).toBeInTheDocument();
    expect(screen.getByText('Successor named')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders PriorityCard with uniform styling and review callback', async () => {
    const onReview = vi.fn();
    const { container } = render(
      <PriorityCard
        rank="01"
        category="Credentials"
        problem="Single owner on personal credential"
        criticalAssetsAffected={4}
        onReview={onReview}
      />
    );
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('Credentials')).toBeInTheDocument();
    expect(screen.getByText('Single owner on personal credential')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: 'Review' });
    fireEvent.click(btn);
    expect(onReview).toHaveBeenCalledOnce();

    expect(await axe(container)).toHaveNoViolations();
  });
});
