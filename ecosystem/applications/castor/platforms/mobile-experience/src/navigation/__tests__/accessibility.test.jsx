/**
 * Automated accessibility validation using axe-core.
 * Ref: Castor PDF Part C.6 ("Accessibility Validation") and Part D.4.
 * This is a real audit tool (WCAG ruleset), not a manual aria-attribute check —
 * closes the gap flagged in docs/05-design-system-gap-log.md and the README's
 * "what this reference build cannot verify" list.
 */
import React from 'react';
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { BottomNav } from '../BottomNav';
import { SideDrawer } from '../SideDrawer';
import { ModalSheet } from '../ModalSheet';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: <span>🏠</span> },
  { key: 'search', label: 'Search', icon: <span>🔍</span> },
  { key: 'profile', label: 'Profile', icon: <span>👤</span> },
];

afterEach(cleanup);

describe('Accessibility audit (axe-core)', () => {
  test('BottomNav has no detectable a11y violations', async () => {
    const { container } = render(
      <BottomNav items={NAV_ITEMS} activeKey="home" onNavigate={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('SideDrawer (overlay, open) has no detectable a11y violations', async () => {
    const { container } = render(
      <SideDrawer mode="overlay" open onClose={() => {}}>
        <button>Nav Item</button>
      </SideDrawer>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('ModalSheet (open) has no detectable a11y violations', async () => {
    const { container } = render(
      <ModalSheet open title="Confirm" onClose={() => {}}>
        Content
      </ModalSheet>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
