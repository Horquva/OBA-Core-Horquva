import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { EntityChip } from '@/components/ui/EntityChip';
import { SourcesList, SourceFactItem } from '@/components/ui/SourcesList';
import { HeroArt } from '@/components/ui/HeroArt';

describe('Chat Components & Hero Artwork', () => {
  describe('EntityChip', () => {
    it('renders entity name and triggers inspection callback', async () => {
      const handleInspect = vi.fn();
      const { container } = render(
        <EntityChip
          id="wf-101"
          name="Billing Sync to Stripe"
          kind="automation"
          grade="confirmed"
          onInspect={handleInspect}
        />
      );

      const chip = screen.getByRole('button', { name: /Inspect Billing Sync to Stripe/ });
      expect(chip).toBeInTheDocument();
      expect(screen.getByText('Billing Sync to Stripe')).toBeInTheDocument();
      expect(screen.getByText('(automation)')).toBeInTheDocument();

      fireEvent.click(chip);
      expect(handleInspect).toHaveBeenCalledWith('wf-101', 'automation');

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('SourcesList', () => {
    const sampleSources: SourceFactItem[] = [
      {
        id: 'f1',
        entityName: 'Billing Sync',
        attribute: 'owner',
        value: 'Sarah Connor',
        grade: 'confirmed',
        source: 'HR BambooHR API',
      },
      {
        id: 'f2',
        entityName: 'Billing Sync',
        attribute: 'backup',
        value: 'None',
        grade: 'stated',
        source: 'n8n Workflow Metadata',
      },
    ];

    it('toggles expansion and displays cited SCD2 facts', async () => {
      const { container } = render(<SourcesList sources={sampleSources} />);

      expect(screen.getByText('Sources')).toBeInTheDocument();
      expect(screen.getByText('(2 verified facts cited)')).toBeInTheDocument();

      // Initially collapsed
      expect(screen.queryByText('HR BambooHR API')).not.toBeInTheDocument();

      // Click to expand
      const toggle = screen.getByRole('button', { name: /Sources/ });
      fireEvent.click(toggle);

      expect(screen.getByText('Source: HR BambooHR API')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();

      expect(await axe(container)).toHaveNoViolations();
    });

    it('renders nothing when sources array is empty', () => {
      const { container } = render(<SourcesList sources={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('HeroArt', () => {
    it('renders aria-hidden decorative SVG', async () => {
      const { container } = render(<HeroArt data-testid="hero-art" />);
      const art = container.querySelector('[aria-hidden="true"]');
      expect(art).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
