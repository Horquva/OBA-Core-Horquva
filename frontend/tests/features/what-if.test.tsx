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
  runsUnknownCount: 0,
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
      runsUnknownCount: 0,
    },
    {
      entity: { id: 'm-1', name: 'Anthropic Claude 3.5 Sonnet', kind: 'model' },
      automationsHalted: 8,
      runsPerWeekAffected: 21000,
      runsUnknownCount: 0,
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
vi.mock('@/lib/api/entities', () => ({ fetchAllEntities: vi.fn() }));
vi.mock('@/lib/api/departures', () => ({ fetchDepartures: vi.fn() }));

import { runScenario, fetchWorstLosses } from '@/lib/api/simulations';
import { fetchAllEntities } from '@/lib/api/entities';
import { fetchDepartures } from '@/lib/api/departures';

const inventory = [
  { id: 'person:omar@acme.com', kind: 'person', name: 'Omar Farooq' },
  { id: 'model:openai:gpt-4o', kind: 'model', name: 'OpenAI GPT-4o' },
  { id: 'app:stripe', kind: 'app', name: 'Stripe' },
  { id: 'automation:n8n:101', kind: 'automation', name: 'Billing Sync to Stripe' },
  { id: 'group:platform-engineering', kind: 'group', name: 'Platform Engineering' },
];

describe('What-If Simulator Feature (Task 27)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (runScenario as any).mockResolvedValue(sampleResult);
    (fetchWorstLosses as any).mockResolvedValue(sampleWorstLosses);
    (fetchAllEntities as any).mockResolvedValue(inventory);
    (fetchDepartures as any).mockResolvedValue([]);
  });

  it('starts empty: no invented people or vendors, and nothing simulated', async () => {
    render(<WhatIfView />);
    expect(screen.queryByText('Sarah Connor')).toBeNull();
    expect(screen.getByText(/pick one or more people/i)).toBeDefined();
    expect(runScenario).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /run simulation/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('No simulation running')).toBeDefined();
  });

  it('pickers offer real people and services; services go down, automations fail', async () => {
    render(<WhatIfView />);
    await waitFor(() => expect(fetchAllEntities).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Person' }));
    fireEvent.change(screen.getByPlaceholderText('Pick a person…'), { target: { value: 'Omar' } });
    fireEvent.click(await screen.findByText('Omar Farooq'));

    for (const name of ['OpenAI GPT-4o', 'Stripe', 'Billing Sync to Stripe']) {
      fireEvent.click(screen.getByRole('button', { name: /^(Service or automation|Another service)$/ }));
      const input = screen.getByPlaceholderText('Pick a service or automation…');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: name } });
      fireEvent.click(await screen.findByRole('option', { name: new RegExp(`^${name}`) }));
    }
    // Groups are not something that "goes down".
    fireEvent.click(screen.getByRole('button', { name: 'Another service' }));
    const input = screen.getByPlaceholderText('Pick a service or automation…');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Platform' } });
    expect(screen.queryByRole('option', { name: /platform engineering/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /run simulation/i }));
    await waitFor(() => expect(runScenario).toHaveBeenCalledTimes(1));
    const sel = (runScenario as any).mock.calls[0][0];
    expect(sel.people.map((p: any) => p.id)).toEqual(['person:omar@acme.com']);
    expect(sel.unavailable.map((u: any) => u.id)).toEqual(['model:openai:gpt-4o', 'app:stripe']);
    expect(sel.failing.map((f: any) => f.id)).toEqual(['automation:n8n:101']);
  });

  it('shows an unknown run volume as Unknown, never 0', async () => {
    render(
      <WhatIfView
        initialSentence={sampleSentence}
        initialWorstLosses={sampleWorstLosses}
        initialResult={{
          ...sampleResult,
          stoppedAutomations: [{ workflow: { id: 'w-9', kind: 'automation', name: 'Mystery Flow' }, credentialOwner: null, weeklyRuns: null }],
          runsPerWeekAffected: 0,
          runsUnknownCount: 1,
        }}
      />,
    );
    expect(screen.getByLabelText('Run volume unknown')).toBeDefined();
    expect(screen.getByText(/1 affected automation has no run volume on record/i)).toBeDefined();
    expect(screen.queryByText('0 runs/wk')).toBeNull();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
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
    expect(screen.getByRole('heading', { level: 1, name: 'What-if' })).toBeDefined();

    // Sentence builder selections
    expect(screen.getByRole('button', { name: 'Remove Sarah Connor' })).toBeDefined();
    expect(screen.getAllByText('OpenAI Enterprise API').length).toBeGreaterThan(0);

    // Results metric strip
    expect(screen.getByRole('heading', {
      name: 'If Sarah Connor leaves and OpenAI Enterprise API goes down, 2 critical assets lose their owner and 2 automations stop: 4,600 runs a week.',
    })).toBeDefined();
    expect(screen.getByText('Critical assets without an owner')).toBeDefined();
    expect(screen.getAllByText('Automations that stop').length).toBeGreaterThan(0);
    expect(screen.getByText('Runs a week affected')).toBeDefined();


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
    expect(screen.getByRole('heading', { name: /Services that would hurt most/ })).toBeDefined();
    expect(screen.getByText('Anthropic Claude 3.5 Sonnet')).toBeDefined();

    // People are strictly represented as an aggregate count floor
    expect(screen.getByText(/7\s+people/i)).toBeDefined();
    expect(screen.getByText(/each hold 3\+ critical assets with no backup/i)).toBeDefined();
    expect(screen.getByText(/never ranked/i)).toBeDefined();

    // Verify no individual person risk rankings exist anywhere in the tables
    expect(screen.queryByText(/most dangerous employees/i)).toBeNull();
    expect(screen.queryByText(/highest risk leavers/i)).toBeNull();
  });

  it('ends the simulation, and marks results stale when the picks change', async () => {
    render(<WhatIfView initialSentence={sampleSentence} initialResult={sampleResult} initialWorstLosses={sampleWorstLosses} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove OpenAI Enterprise API' }));
    expect(screen.getByText(/These results are for the previous picks/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /End simulation/ }));
    expect(screen.queryByText(/Simulation result/)).toBeNull();
    expect(screen.queryByText('Sarah Connor')).toBeNull();
    expect(screen.getByText('No simulation running')).toBeDefined();
  });

  it('simulates a service straight from the worst-losses table', async () => {
    render(<WhatIfView initialWorstLosses={sampleWorstLosses} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Anthropic Claude 3.5 Sonnet going down' }));
    await waitFor(() => expect(runScenario).toHaveBeenCalledTimes(1));
    expect((runScenario as any).mock.calls[0][0].unavailable.map((u: any) => u.id)).toEqual(['m-1']);
  });

  it('triggers simulation on clicking Simulate button', async () => {
    render(
      <WhatIfView
        initialSentence={sampleSentence}
        initialResult={sampleResult}
        initialWorstLosses={sampleWorstLosses}
      />,
    );

    const simulateBtn = screen.getByRole('button', { name: /run simulation/i });
    fireEvent.click(simulateBtn);

    await waitFor(() => {
      expect(runScenario).toHaveBeenCalledTimes(1);
    });
  });
});
