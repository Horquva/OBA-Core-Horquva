import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { AssetsView } from '@/features/assets/AssetsView';
import { AssetDrawer } from '@/features/assets/AssetDrawer';
import { AssetDetailView } from '@/features/assets/AssetDetailView';
import type { AssetRow, AssetDetail } from '@/types/view';

const sampleAssets: AssetRow[] = [
  // 1. Non-critical asset (should be sorted LAST by default)
  {
    id: 'w-non-crit',
    kind: 'workflow',
    name: 'Slack Emoji Sync',
    isCritical: false,
    owner: { state: 'value', display: 'Sarah Connor', grade: 'confirmed', source: 'Manual', observedAt: null },
    backup: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
    criticality: { level: 'low', grade: 'confirmed', source: 'Manual', observedAt: null },
    documented: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
    fallback: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
    runsPerWeek: { state: 'value', display: '50', grade: 'confirmed', source: 'n8n', observedAt: null },
    checkStatus: 'PASS',
  },
  // 2. Covered critical asset (priority 3 in default sort)
  {
    id: 'w-covered-crit',
    kind: 'workflow',
    name: 'Customer Identity Sync',
    isCritical: true,
    owner: { state: 'value', display: 'Sarah Connor', grade: 'confirmed', source: 'Manual', observedAt: null },
    backup: { state: 'value', display: 'Alex Murphy', grade: 'confirmed', source: 'Manual', observedAt: null },
    criticality: { level: 'critical', grade: 'confirmed', source: 'Manual', observedAt: null },
    documented: { state: 'value', display: 'https://wiki/id-sync', grade: 'confirmed', source: 'Manual', observedAt: null },
    fallback: { state: 'value', display: 'Manual JWT fallback', grade: 'confirmed', source: 'Manual', observedAt: null },
    runsPerWeek: { state: 'value', display: '2500', grade: 'confirmed', source: 'n8n', observedAt: null },
    checkStatus: 'PASS',
  },
  // 3. Unknown critical asset (priority 2 in default sort)
  {
    id: 'w-unknown-crit',
    kind: 'workflow',
    name: 'AWS Deploy Bot',
    isCritical: true,
    owner: { state: 'value', display: 'Sarah Connor', grade: 'inferred', source: 'Scanner', observedAt: null },
    backup: { state: 'unknown', display: null, grade: 'unknown', source: 'Scanner', observedAt: null },
    criticality: { level: 'critical', grade: 'confirmed', source: 'Manual', observedAt: null },
    documented: { state: 'unknown', display: null, grade: 'unknown', source: 'Scanner', observedAt: null },
    fallback: { state: 'unknown', display: null, grade: 'unknown', source: 'Scanner', observedAt: null },
    runsPerWeek: { state: 'value', display: '800', grade: 'confirmed', source: 'n8n', observedAt: null },
    checkStatus: 'UNKNOWN',
  },
  // 4. Failing critical asset (priority 1 in default sort - MUST BE FIRST)
  {
    id: 'w-failing-crit',
    kind: 'workflow',
    name: 'Stripe Billing Pipeline',
    isCritical: true,
    owner: { state: 'value', display: 'Sarah Connor', grade: 'confirmed', source: 'Manual', observedAt: null },
    backup: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
    criticality: { level: 'critical', grade: 'confirmed', source: 'Manual', observedAt: null },
    documented: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
    fallback: { state: 'none', display: null, grade: 'confirmed', source: 'Manual', observedAt: null },
    runsPerWeek: { state: 'value', display: '1200', grade: 'confirmed', source: 'n8n', observedAt: null },
    checkStatus: 'FAIL',
  },
  // 5. Vendor asset
  {
    id: 'v-openai',
    kind: 'vendor',
    name: 'OpenAI Enterprise API',
    isCritical: true,
    owner: { state: 'value', display: 'Marcus Brody', grade: 'confirmed', source: 'Manual', observedAt: null },
    backup: { state: 'value', display: 'Alex Murphy', grade: 'confirmed', source: 'Manual', observedAt: null },
    criticality: { level: 'high', grade: 'confirmed', source: 'Manual', observedAt: null },
    documented: { state: 'value', display: 'https://wiki/openai', grade: 'confirmed', source: 'Manual', observedAt: null },
    fallback: { state: 'value', display: 'Failover to Anthropic Claude 3.5', grade: 'confirmed', source: 'Manual', observedAt: null },
    runsPerWeek: { state: 'value', display: '15000', grade: 'confirmed', source: 'Logs', observedAt: null },
    checkStatus: 'PASS',
  },
];

const sampleDetail: AssetDetail = {
  asset: sampleAssets[3], // Stripe Billing Pipeline (failing critical)
  checks: [
    {
      checkId: 'SIM-01',
      entityId: 'w-failing-crit',
      status: 'FAIL',
      evidenceFactIds: ['fact-1'],
      reason: 'No confirmed backup operator assigned to critical billing pipeline.',
    },
    {
      checkId: 'SIM-03',
      entityId: 'w-failing-crit',
      status: 'FAIL',
      evidenceFactIds: ['fact-2'],
      reason: 'Missing operational runbook documentation.',
    },
  ],
  upstream: [
    { id: 'v-stripe', kind: 'vendor', name: 'Stripe Payments API' },
    { id: 'c-stripe-secret', kind: 'credential', name: 'Stripe Live Secret Key' },
  ],
  downstream: [
    { id: 'w-invoice-gen', kind: 'workflow', name: 'Monthly Invoice Dispatcher' },
  ],
  history: [
    {
      attribute: 'backup',
      display: null,
      state: 'none',
      grade: 'confirmed',
      source: 'Offboarding Audit',
      changedBy: 'Admin',
      validFrom: '2026-10-01T00:00:00Z',
      validTo: null,
    },
    {
      attribute: 'backup',
      display: 'John Doe',
      state: 'value',
      grade: 'confirmed',
      source: 'Attestation Form',
      changedBy: 'John Doe',
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-10-01T00:00:00Z',
    },
  ],
};

vi.mock('@/lib/api/assets', () => ({
  fetchAssets: vi.fn(),
  fetchAssetDetail: vi.fn(),
}));

import { fetchAssets, fetchAssetDetail } from '@/lib/api/assets';

describe('Assets Catalog & Drawer (Task 25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchAssets as any).mockResolvedValue(sampleAssets);
    (fetchAssetDetail as any).mockResolvedValue(sampleDetail);
  });

  describe('AssetsView', () => {
    it('enforces invariant sort order: failing critical -> unknown critical -> covered critical -> non-critical', async () => {
      const { container } = render(<AssetsView initialAssets={sampleAssets} />);

      // Title & header counters
      expect(screen.getByRole('heading', { level: 1, name: /assets catalog/i })).toBeDefined();
      expect(screen.getAllByText('5').length).toBeGreaterThan(0); // Total count

      // Invariant Default Sort Order Check:
      // Row 1: Stripe Billing Pipeline (failing critical)
      // Row 2: AWS Deploy Bot (unknown critical)
      // Row 3: OpenAI Enterprise API (high critical covered) OR Customer Identity Sync (critical covered)
      // Last: Slack Emoji Sync (non-critical)
      const rows = screen.getAllByRole('button', { name: /^inspect /i });
      expect(rows[0].getAttribute('aria-label')).toBe('Inspect Stripe Billing Pipeline');
      expect(rows[1].getAttribute('aria-label')).toBe('Inspect AWS Deploy Bot');
      expect(rows[rows.length - 1].getAttribute('aria-label')).toBe('Inspect Slack Emoji Sync');

      // Accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('filters assets by kind tab correctly', async () => {
      render(<AssetsView initialAssets={sampleAssets} />);

      // Switch to Vendors tab
      const vendorTab = screen.getByRole('button', { name: /vendors/i });
      fireEvent.click(vendorTab);

      expect(screen.getByText('OpenAI Enterprise API')).toBeDefined();
      expect(screen.queryByText('Stripe Billing Pipeline')).toBeNull();
    });

    it('filters assets by search query', async () => {
      render(<AssetsView initialAssets={sampleAssets} />);

      const searchInput = screen.getByPlaceholderText(/search assets, owners, backups\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'Identity' } });

      expect(screen.getByText('Customer Identity Sync')).toBeDefined();
      expect(screen.queryByText('Stripe Billing Pipeline')).toBeNull();
    });

    it('opens AssetDrawer when an asset row is clicked', async () => {
      render(<AssetsView initialAssets={sampleAssets} />);

      const stripeRow = screen.getByRole('button', { name: 'Inspect Stripe Billing Pipeline' });
      fireEvent.click(stripeRow);

      // Verify drawer opens with dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(screen.getAllByText('Stripe Billing Pipeline').length).toBeGreaterThan(0);
    });
  });

  describe('AssetDrawer', () => {
    it('renders checks, dependency topology, and SCD2 timeline, and passes axe', async () => {
      const handleClose = vi.fn();
      const { container } = render(
        <AssetDrawer
          assetId="w-failing-crit"
          isOpen={true}
          onClose={handleClose}
          initialDetail={sampleDetail}
        />,
      );

      // Title & Overview
      expect(screen.getAllByText('Stripe Billing Pipeline').length).toBeGreaterThan(0);
      expect(screen.getByText('Criticality & Health')).toBeDefined();


      // Check results
      expect(screen.getByText('SIM-01')).toBeDefined();
      expect(screen.getByText(/no confirmed backup operator/i)).toBeDefined();

      // Dependency Topology
      expect(screen.getByText('Stripe Payments API')).toBeDefined();
      expect(screen.getByText('Stripe Live Secret Key')).toBeDefined();
      expect(screen.getByText('Monthly Invoice Dispatcher')).toBeDefined();

      // SCD2 Fact History Timeline
      expect(screen.getByText('SCD2 Fact History Timeline')).toBeDefined();
      expect(screen.getByText('Offboarding Audit')).toBeDefined();

      // Close button
      const closeBtn = screen.getByRole('button', { name: /close drawer/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AssetDetailView', () => {
    it('renders standalone asset page with facts, checks, dependencies, and timeline', async () => {
      const { container } = render(
        <AssetDetailView id="w-failing-crit" initialDetail={sampleDetail} />,
      );

      // Heading and navigation
      expect(screen.getByRole('heading', { level: 1, name: 'Stripe Billing Pipeline' })).toBeDefined();
      expect(screen.getByText('Back to Assets Catalog')).toBeDefined();

      // Checks and topology
      expect(screen.getByText(/continuity check results/i)).toBeDefined();
      expect(screen.getByText('SIM-01')).toBeDefined();
      expect(screen.getByText('Upstream Dependencies')).toBeDefined();
      expect(screen.getByText('Stripe Payments API')).toBeDefined();

      // Accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
