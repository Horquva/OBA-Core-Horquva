import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { WhatIfView } from '@/features/what-if/WhatIfView';
import type { ScenarioResult, WorstLosses, EntityKind } from '@/types/view';
import type { SentenceBuilderState } from '@/components/ui/SentenceBuilder';

const sampleResult: ScenarioResult = {
  orphanedCriticalAssets: [
    {
      asset: { id: 'w-1', name: 'Stripe Billing Pipeline', kind: 'automation' as EntityKind },
      priorOwner: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
      criticality: 'critical',
    },
    {
      asset: { id: 'w-2', name: 'AWS Production Deployment Bot', kind: 'automation' as EntityKind },
      priorOwner: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
      criticality: 'high',
    },
  ],
  stoppedAutomations: [
    {
      workflow: { id: 'w-1', name: 'Stripe Billing Pipeline', kind: 'automation' as EntityKind },
      credentialOwner: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
      weeklyRuns: 1200,
    },
    {
      workflow: { id: 'w-3', name: 'Customer Support Escalation', kind: 'automation' as EntityKind },
      credentialOwner: null,
      weeklyRuns: 3400,
    },
  ],
  runsPerWeekAffected: 4600,
  downstream: [
    { id: 'w-4', name: 'Monthly Financial Audit', kind: 'automation' as EntityKind },
    { id: 'w-5', name: 'Tier-1 SLA Monitor', kind: 'automation' as EntityKind },
  ],
  unknownFactsEncountered: 1,
};


const sampleWorstLosses: WorstLosses = {
  vendorsAndModels: [
    {
      entity: { id: 'v-1', name: 'OpenAI Enterprise API', kind: 'vendor' },
      automationsHalted: 14,
      runsPerWeekAffected: 45000,
    },
    {
      entity: { id: 'm-1', name: 'Anthropic Claude 3.5 Sonnet', kind: 'model' },
      automationsHalted: 8,
      runsPerWeekAffected: 21000,
    },
  ],
  peopleHoldingManyUnbacked: 7,
  threshold: 3,
};

const sampleSentence: SentenceBuilderState = {
  persons: [{ id: 'p-1', name: 'Sarah Connor', kind: 'person' }],
  entities: [{ id: 'v-1', name: 'OpenAI Enterprise API', kind: 'vendor' }],
};

vi.mock('@/lib/api/simulations', () => ({
  runScenario: vi.fn(),
  fetchWorstLosses: vi.fn(),
}));

import { runScenario, fetchWorstLosses } from '@/lib/api/simulations';

describe('What-If Simulator Feature (Task 27)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (runScenario as any).mockResolvedValue(sampleResult);
    (fetchWorstLosses as any).mockResolvedValue(sampleWorstLosses);
  });

  it('renders WhatIfView with SentenceBuilder, results strip, and passes axe', async () => {
    const { container } = render(
      <WhatIfView
        initialSentence={sampleSentence}
        initialResult={sampleResult}
        initialWorstLosses={sampleWorstLosses}
      />,
    );

    // Title & header
    expect(screen.getByRole('heading', { level: 1, name: /what-if continuity simulator/i })).toBeDefined();

    // Sentence builder selections
    expect(screen.getByText('Sarah Connor')).toBeDefined();
    expect(screen.getAllByText('OpenAI Enterprise API').length).toBeGreaterThan(0);

    // Results metric strip
    expect(screen.getByText('Orphaned Critical')).toBeDefined();
    expect(screen.getByText('Halted Automations')).toBeDefined();
    expect(screen.getAllByText('Runs / Wk Affected').length).toBeGreaterThan(0);
    expect(screen.getByText('Downstream Dependents')).toBeDefined();


    // Counts
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Orphaned count
    expect(screen.getByText('4,600')).toBeDefined(); // Runs/wk


    // Tables
    expect(screen.getAllByText('Stripe Billing Pipeline').length).toBeGreaterThan(0);
    expect(screen.getByText('Customer Support Escalation')).toBeDefined();


    // Accessibility audit
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('enforces zero employee ranking invariant in S6 Worst Losses', async () => {
    render(
      <WhatIfView
        initialSentence={sampleSentence}
        initialResult={sampleResult}
        initialWorstLosses={sampleWorstLosses}
      />,
    );

    // Top external vendors/models are ranked
    expect(screen.getByText('Top External Vendor & Model Exposures')).toBeDefined();
    expect(screen.getByText('Anthropic Claude 3.5 Sonnet')).toBeDefined();

    // People are strictly represented as an aggregate count floor
    expect(screen.getByText(/7 people/i)).toBeDefined();
    expect(screen.getByText(/each hold 3\+ unbacked critical assets/i)).toBeDefined();
    expect(screen.getByText(/zero employee scoring guarantee/i)).toBeDefined();

    // Verify no individual person risk rankings exist anywhere in the tables
    expect(screen.queryByText(/most dangerous employees/i)).toBeNull();
    expect(screen.queryByText(/highest risk leavers/i)).toBeNull();
  });

  it('triggers simulation on clicking Simulate button', async () => {
    render(
      <WhatIfView
        initialSentence={sampleSentence}
        initialResult={sampleResult}
        initialWorstLosses={sampleWorstLosses}
      />,
    );

    const simulateBtn = screen.getByRole('button', { name: /simulate impact/i });
    fireEvent.click(simulateBtn);

    await waitFor(() => {
      expect(runScenario).toHaveBeenCalledTimes(1);
    });
  });
});
