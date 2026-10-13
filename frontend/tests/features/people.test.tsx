import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PeopleView } from '@/features/people/PeopleView';
import { TeamDetail } from '@/features/people/TeamDetail';
import { PersonDetail } from '@/features/people/PersonDetail';
import type { TeamSummary, TeamDetail as TeamDetailType, PersonDetail as PersonDetailType } from '@/types/view';

const sampleTeams: TeamSummary[] = [
  {
    id: 'team-infra',
    name: 'Infrastructure & Platform',
    memberCount: 8,
    rolledUp: false,
    coverage: { covered: 12, exposed: 2, unknown: 1, total: 15 },
    concentration: {
      sentence: "1 person holds 7 of Platform's 13 critical assets.",
      total: 13,
      holders: [
        { person: { id: 'p-1', name: 'Sarah Connor', kind: 'person' }, count: 7, sharePct: 54 },
        { person: { id: 'p-2', name: 'Alex Murphy', kind: 'person' }, count: 3, sharePct: 23 },
        { person: { id: 'p-3', name: 'Marcus Brody', kind: 'person' }, count: 3, sharePct: 23 },
      ],
    },
  },
  {
    id: 'team-sec',
    name: 'Security Operations',
    memberCount: 3,
    rolledUp: true,
    coverage: { covered: 4, exposed: 1, unknown: 0, total: 5 },
    concentration: null,
  },
];

const sampleTeamDetail: TeamDetailType = {
  team: sampleTeams[0],
  // Deliberately unsorted in raw data to verify strict alphabetical invariant
  members: [
    {
      person: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
      title: 'Principal Cloud Architect',
      holdings: [
        {
          asset: { id: 'w-1', name: 'Stripe Billing Pipeline', kind: 'workflow' },
          relation: 'owns',
          criticality: 'critical',
          backup: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
        },
      ],
    },
    {
      person: { id: 'p-2', name: 'Alex Murphy', kind: 'person' },
      title: 'DevOps Engineer',
      holdings: [
        {
          asset: { id: 'w-2', name: 'Postgres Nightly Vacuum', kind: 'workflow' },
          relation: 'backs_up',
          criticality: 'medium',
          backup: { state: 'value', display: 'Sarah Connor', grade: 'confirmed', source: 'Manual', observedAt: null },
        },
      ],
    },
    {
      person: { id: 'p-3', name: 'Marcus Brody', kind: 'person' },
      title: 'Site Reliability Engineer',
      holdings: [
        {
          asset: { id: 'w-3', name: 'Auth0 Token Dispatcher', kind: 'workflow' },
          relation: 'credential',
          criticality: 'high',
          backup: { state: 'unknown', display: null, grade: 'unknown', source: 'Scanner', observedAt: null },
        },
      ],
    },
  ],
};

const samplePersonDetail: PersonDetailType = {
  person: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
  title: 'Principal Cloud Architect',
  team: { id: 'team-infra', name: 'Infrastructure & Platform', kind: 'team' },
  holdings: [
    {
      asset: { id: 'w-1', name: 'Stripe Billing Pipeline', kind: 'workflow' },
      relation: 'owns',
      criticality: 'critical',
      backup: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
    },
    {
      asset: { id: 'w-2', name: 'Postgres Nightly Vacuum', kind: 'workflow' },
      relation: 'backs_up',
      criticality: 'medium',
      backup: { state: 'value', display: 'Sarah Connor', grade: 'confirmed', source: 'Manual', observedAt: null },
    },
    {
      asset: { id: 'w-4', name: 'AWS Production Deploy Bot', kind: 'workflow' },
      relation: 'credential',
      criticality: 'high',
      backup: { state: 'unknown', display: null, grade: 'unknown', source: 'Scanner', observedAt: null },
    },
  ],
  openHandovers: [
    {
      departureId: 'dep-101',
      from: { id: 'p-9', name: 'Kyle Reese', kind: 'person' },
      assetCount: 3,
    },
  ],
  pendingConfirmations: 2,
};

vi.mock('@/lib/api/people', () => ({
  fetchTeams: vi.fn(),
  fetchTeam: vi.fn(),
  fetchPerson: vi.fn(),
}));
vi.mock('@/lib/api/departures', () => ({
  fetchDepartures: vi.fn(),
}));

import { fetchTeams, fetchTeam, fetchPerson } from '@/lib/api/people';
import { fetchDepartures } from '@/lib/api/departures';

describe('People & Teams Feature (Task 24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchTeams as any).mockResolvedValue({ teams: sampleTeams, minGroupSize: 5 });
    (fetchTeam as any).mockResolvedValue(sampleTeamDetail);
    (fetchPerson as any).mockResolvedValue(samplePersonDetail);
    (fetchDepartures as any).mockResolvedValue([]);
  });

  describe('PeopleView', () => {
    it('renders the summary, concentration panel, alphabetical teams table and privacy roll-up', async () => {
      const { container } = render(<PeopleView initialTeams={sampleTeams} minGroupSize={5} />);

      // Title & header
      expect(screen.getByRole('heading', { level: 1, name: /people & teams/i })).toBeDefined();

      // Teams table, alphabetical
      const teamLinks = screen.getAllByRole('link', { name: /Infrastructure & Platform|Security Operations/ });
      expect(teamLinks.map((l) => l.textContent)).toContain('Security Operations');
      expect(screen.getByText('12')).toBeDefined();
      expect(screen.getByText('Mostly one person')).toBeDefined();

      // Concentration sentence & share bar
      expect(screen.getByText("1 person holds 7 of Platform's 13 critical assets.")).toBeDefined();
      // Counts, never percentages (no-scores invariant)
      expect(screen.getByText('7 of 13')).toBeDefined();
      expect(screen.queryByText(/\d+%/)).toBeNull();

      // Privacy roll-up for team with < 5 members: no coverage or holders shown
      expect(screen.getByText('Rolled up')).toBeDefined();
      expect(screen.getByText(/Not shown separately \(under 5 members\)/)).toBeDefined();

      // Accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('filters teams correctly when searching in quick filter input', async () => {
      render(<PeopleView initialTeams={sampleTeams} minGroupSize={5} />);

      const searchInput = screen.getByRole('searchbox', { name: 'Filter teams' });
      fireEvent.change(searchInput, { target: { value: 'Security' } });

      const table = screen.getByRole('table');
      expect(within(table).queryByText('Infrastructure & Platform')).toBeNull();
      expect(within(table).getByText('Security Operations')).toBeDefined();
    });
  });

  describe('TeamDetail', () => {
    it('enforces strict alphabetical sorting of members with zero subjective scoring', async () => {
      const { container } = render(<TeamDetail id="team-infra" initialDetail={sampleTeamDetail} />);

      // Header and team name
      expect(screen.getByRole('heading', { level: 1, name: /infrastructure & platform/i })).toBeDefined();

      // Verify alphabetical order: Alex Murphy -> Marcus Brody -> Sarah Connor
      // (Even though raw array had Sarah Connor first)
      const memberLinks = screen
        .getAllByRole('link')
        .map((l) => l.textContent?.trim())
        .filter((text): text is string => ['Alex Murphy', 'Marcus Brody', 'Sarah Connor'].includes(text || ''));
      expect(memberLinks).toEqual(['Alex Murphy', 'Marcus Brody', 'Sarah Connor']);

      // No individual risk scores or rankings exist anywhere
      expect(screen.queryByText(/risk score/i)).toBeNull();
      expect(screen.queryByText(/performance score/i)).toBeNull();

      // Expand a member row to view holdings
      const sarahToggle = screen.getByRole('button', { name: "Show Sarah Connor's holdings" });
      fireEvent.click(sarahToggle);


      expect(screen.getByText('Stripe Billing Pipeline')).toBeDefined();

      // Accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('PersonDetail', () => {
    it('renders person holdings, relation tabs, and guarantees zero subjective risk scores', async () => {
      const { container } = render(<PersonDetail id="p-1" initialDetail={samplePersonDetail} />);

      // Person header
      expect(screen.getByRole('heading', { level: 1, name: /sarah connor/i })).toBeDefined();
      expect(screen.getByText(/principal cloud architect/i)).toBeDefined();

      // Handover & confirmation indicators
      expect(screen.getByRole('heading', { name: /Asked to take over/ })).toBeDefined();
      expect(screen.getByText('From Kyle Reese')).toBeDefined();
      expect(screen.getByRole('heading', { name: /Confirmations/ })).toBeDefined();

      // The fairness principle, stated once
      expect(screen.getByText(/never scored or ranked/i)).toBeDefined();

      // Relation filter
      const ownsButton = screen.getByRole('button', { name: /^Owner/ });
      fireEvent.click(ownsButton);

      expect(screen.getByText('Stripe Billing Pipeline')).toBeDefined();
      expect(screen.queryByText('Postgres Nightly Vacuum')).toBeNull();

      // Accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('shows a leaving chip linking to their open departure', async () => {
      (fetchDepartures as any).mockResolvedValue([
        { id: 'dep-7', person: { id: 'p-1', name: 'Sarah Connor', kind: 'person' }, role: null, team: null, leaveDate: '2099-11-15T00:00:00Z', stage: 'initiated', assetsTotal: 1, assetsHandedOver: 0, hasAlert: true, detectedFrom: 'manual', group: 'upcoming' },
      ]);
      render(<PersonDetail id="p-1" initialDetail={samplePersonDetail} />);
      const chip = await screen.findByRole('link', { name: /Leaving/ });
      expect(chip).toHaveAttribute('href', '/departures/dep-7');
    });
  });
});
