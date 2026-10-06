import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ReactFlowProvider } from '@xyflow/react';
import { MapView } from '@/features/map/MapView';
import {
  PersonNode,
  AutomationNode,
  VendorModelNode,
  CredentialNode,
} from '@/features/map/nodes';
import type { Neighbourhood, BlastRadius } from '@/types/view';

// Polyfill ResizeObserver for ReactFlow in JSDOM
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const sampleNeighbourhood: Neighbourhood = {
  rootId: 'w-1',
  nodes: [
    { id: 'p-1', kind: 'person', name: 'Sarah Connor', ring: null },
    { id: 'w-1', kind: 'workflow', name: 'Stripe Billing Pipeline', ring: 'fail' },
    { id: 'c-1', kind: 'credential', name: 'Stripe Live Secret Key', ring: 'unknown' },
    { id: 'v-1', kind: 'vendor', name: 'Stripe Payments API', ring: null },
    { id: 'w-2', kind: 'workflow', name: 'Monthly Invoice Dispatcher', ring: null },
  ],
  edges: [
    { id: 'e-1', from: 'p-1', to: 'w-1', type: 'owns', grade: 'confirmed' },
    { id: 'e-2', from: 'c-1', to: 'w-1', type: 'authenticated_by', grade: 'inferred' },
    { id: 'e-3', from: 'v-1', to: 'w-1', type: 'calls', grade: 'stated' },
    { id: 'e-4', from: 'w-1', to: 'w-2', type: 'triggers', grade: 'confirmed' },
  ],
};

const sampleBlastRadius: BlastRadius = {
  rootId: 'w-1',
  downstream: ['w-2'],
  upstream: ['p-1', 'c-1', 'v-1'],
};

vi.mock('@/lib/api/graph', () => ({
  fetchNeighbourhood: vi.fn(),
  fetchBlastRadius: vi.fn(),
}));

import { fetchNeighbourhood, fetchBlastRadius } from '@/lib/api/graph';

describe('Dependency Map Feature (Task 26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchNeighbourhood as any).mockResolvedValue(sampleNeighbourhood);
    (fetchBlastRadius as any).mockResolvedValue(sampleBlastRadius);
  });

  describe('MapView', () => {
    it('renders MapView header, controls, and canvas', async () => {
      render(
        <MapView
          initialRootId="w-1"
          initialNeighbourhood={sampleNeighbourhood}
          initialBlastRadius={sampleBlastRadius}
        />,
      );

      // Title & centered text
      expect(screen.getByRole('heading', { level: 1, name: /dependency map/i })).toBeDefined();
      expect(screen.getAllByText('Stripe Billing Pipeline').length).toBeGreaterThan(0);

      // Controls
      expect(screen.getByRole('button', { name: '1 Hop' })).toBeDefined();
      expect(screen.getByRole('button', { name: '2 Hops' })).toBeDefined();
      expect(screen.getByRole('button', { name: /blast radius/i })).toBeDefined();
    });

    it('toggles blast radius highlighting on and off', async () => {
      render(
        <MapView
          initialRootId="w-1"
          initialNeighbourhood={sampleNeighbourhood}
          initialBlastRadius={sampleBlastRadius}
        />,
      );

      const blastBtn = screen.getByRole('button', { name: /blast radius/i });
      expect(blastBtn.getAttribute('aria-pressed')).toBe('false');

      fireEvent.click(blastBtn);
      expect(blastBtn.getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByText('(1)')).toBeDefined(); // Downstream count
    });

    it('switches to accessible semantic list view and passes axe audit', async () => {
      const { container } = render(
        <MapView
          initialRootId="w-1"
          initialNeighbourhood={sampleNeighbourhood}
          initialBlastRadius={sampleBlastRadius}
        />,
      );

      // Switch to list view
      const listBtn = screen.getByRole('button', { name: /accessible list/i });
      fireEvent.click(listBtn);

      // Verify accessible list sections
      expect(screen.getByRole('heading', { level: 2, name: /focused root entity/i })).toBeDefined();
      expect(screen.getByText('Downstream Blast Radius')).toBeDefined();
      expect(screen.getByText('Upstream Dependencies')).toBeDefined();
      expect(screen.getAllByText('Monthly Invoice Dispatcher').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Stripe Payments API').length).toBeGreaterThan(0);

      // Verify Relationships & Evidence Grades table
      expect(screen.getByText(/relationship edges & evidence grades/i)).toBeDefined();
      expect(screen.getByText('authenticated_by')).toBeDefined();

      // Accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Custom Node Shapes & Styles', () => {
    it('renders PersonNode with initials and accessible role', async () => {
      const handleSelect = vi.fn();
      const nodeProps: any = {
        data: {
          id: 'p-1',
          name: 'Sarah Connor',
          kind: 'person',
          ring: null,
          isRoot: true,
          onSelect: handleSelect,
        },
      };

      const { container } = render(
        <ReactFlowProvider>
          <PersonNode {...nodeProps} />
        </ReactFlowProvider>,
      );
      const btn = screen.getByRole('button', { name: /person: sarah connor/i });
      expect(btn).toBeDefined();
      expect(screen.getByText('SC')).toBeDefined();

      fireEvent.click(btn);
      expect(handleSelect).toHaveBeenCalledWith('p-1');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders AutomationNode with workflow badge and failing check indicator', async () => {
      const nodeProps: any = {
        data: {
          id: 'w-1',
          name: 'Stripe Billing Pipeline',
          kind: 'workflow',
          ring: 'fail',
          isRoot: false,
        },
      };

      const { container } = render(
        <ReactFlowProvider>
          <AutomationNode {...nodeProps} />
        </ReactFlowProvider>,
      );
      expect(screen.getByText('Workflow')).toBeDefined();
      expect(screen.getByText('Stripe Billing Pipeline')).toBeDefined();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders CredentialNode and VendorModelNode', async () => {
      const credProps: any = {
        data: {
          id: 'c-1',
          name: 'Stripe Live Secret Key',
          kind: 'credential',
          ring: 'unknown',
        },
      };
      const vendorProps: any = {
        data: {
          id: 'v-1',
          name: 'Stripe Payments API',
          kind: 'vendor',
          ring: null,
        },
      };

      const { container: cContainer } = render(
        <ReactFlowProvider>
          <CredentialNode {...credProps} />
        </ReactFlowProvider>,
      );
      expect(screen.getByText('Credential')).toBeDefined();
      expect(screen.getByText('Stripe Live Secret Key')).toBeDefined();
      expect(await axe(cContainer)).toHaveNoViolations();

      const { container: vContainer } = render(
        <ReactFlowProvider>
          <VendorModelNode {...vendorProps} />
        </ReactFlowProvider>,
      );
      expect(screen.getByText('Vendor')).toBeDefined();
      expect(screen.getByText('Stripe Payments API')).toBeDefined();
      expect(await axe(vContainer)).toHaveNoViolations();
    });
  });
});
