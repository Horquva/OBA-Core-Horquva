import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
      sentence: 'Sarah Connor holds 54% of critical automations in this team.',
      holders: [
        { person: { id: 'p-1', name: 'Sarah Connor', kind: 'person' }, sharePct: 54 },
        { person: { id: 'p-2', name: 'Alex Murphy', kind: 'person' }, sharePct: 26 },
        { person: { id: 'p-3', name: 'Marcus Brody', kind: 'person' }, sharePct: 20 },
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

import { fetchTeams, fetchTeam, fetchPerson } from '@/lib/api/people';

describe('People & Teams Feature (Task 24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchTeams as any).mockResolvedValue({ teams: sampleTeams, minGroupSize: 5 });
    (fetchTeam as any).mockResolvedValue(sampleTeamDetail);
    (fetchPerson as any).mockResolvedValue(samplePersonDetail);
  });

  describe('PeopleView', () => {
    it('renders team cards, concentration sentence, and privacy roll-up indicator', async () => {
      const { container } = render(<PeopleView initialTeams={sampleTeams} minGroupSize={5} />);

      // Title & header
      expect(screen.getByRole('heading', { level: 1, name: /people & teams/i })).toBeDefined();

      // Team cards
      expect(screen.getByText('Infrastructure & Platform')).toBeDefined();
      expect(screen.getByText('Security Operations')).toBeDefined();

      // Concentration sentence & share bar
      expect(screen.getByText(/Sarah Connor holds 54% of critical automations/i)).toBeDefined();

      // Privacy roll-up for team with < 5 members
      expect(screen.getByText('Rolled up')).toBeDefined();
      expect(screen.getByText(/Privacy Notice/i)).toBeDefined();

      // Accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('filters teams correctly when searching in quick filter input', async () => {
      render(<PeopleView initialTeams={sampleTeams} minGroupSize={5} />);

      const searchInput = screen.getByPlaceholderText(/filter teams by name\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'Security' } });

      expect(screen.queryByText('Infrastructure & Platform')).toBeNull();
      expect(screen.getByText('Security Operations')).toBeDefined();
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
      const sarahToggle = screen.getByLabelText(/view holdings for sarah connor/i);
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
      expect(screen.getByText(/Active Handover Workbenches/i)).toBeDefined();
      expect(screen.getByText(/Pending Ownership Confirmations/i)).toBeDefined();

      // Strict fairness guarantee notice
      expect(screen.getByText(/Fair Assessment Guarantee:/i)).toBeDefined();

      // Relation tab filter
      const ownsButton = screen.getByRole('button', { name: /owned/i });
      fireEvent.click(ownsButton);

      expect(screen.getByText('Stripe Billing Pipeline')).toBeDefined();
      expect(screen.queryByText('Postgres Nightly Vacuum')).toBeNull();

      // Accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
