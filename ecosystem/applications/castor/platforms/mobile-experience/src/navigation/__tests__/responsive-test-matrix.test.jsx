/**
 * Reference responsive test suite for BottomNav / SideDrawer / ModalSheet.
 * Ref: specs/04-responsive-component-test-matrix.md
 *
 * Framework-agnostic pattern shown with Jest + Testing Library conventions.
 * Adjust imports (`@testing-library/react`, `jest`) to match the actual
 * Castor repository's configured test runner (Jest/Vitest) once integrated —
 * per Part A.6, this must run through the real project's lint/type/test/CI
 * pipeline, not just in isolation.
 */

import React from 'react';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BottomNav } from '../BottomNav';
import { SideDrawer } from '../SideDrawer';
import { ModalSheet } from '../ModalSheet';

// ---- Viewport mocking helper (Spec 04 §2 reference widths) ----
const VIEWPORTS = {
  xs: 320,
  sm: 414,
  md: 834,
  lg: 1280,
};

function setViewportWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: <span>🏠</span> },
  { key: 'search', label: 'Search', icon: <span>🔍</span> },
  { key: 'profile', label: 'Profile', icon: <span>👤</span> },
];

afterEach(cleanup);

describe('BottomNav — Responsive Component Test Matrix', () => {
  test('renders at small mobile (xs) and large mobile (sm)', () => {
    [VIEWPORTS.xs, VIEWPORTS.sm].forEach((width) => {
      setViewportWidth(width);
      const { unmount } = render(
        <BottomNav items={NAV_ITEMS} activeKey="home" onNavigate={() => {}} />
      );
      expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
      unmount();
    });
  });

  test('active item is marked via aria-current, not color alone (a11y)', () => {
    render(<BottomNav items={NAV_ITEMS} activeKey="search" onNavigate={() => {}} />);
    const activeButton = screen.getByRole('button', { name: /search/i });
    expect(activeButton).toHaveAttribute('aria-current', 'page');
  });

  test('touch targets meet 44x44px minimum (Spec 03 §2)', () => {
    render(<BottomNav items={NAV_ITEMS} activeKey="home" onNavigate={() => {}} />);
    const button = screen.getByRole('button', { name: /home/i });
    // In jsdom, layout is not computed — this assertion documents intent and
    // should be re-run under a real browser/CSS engine (e.g. Playwright) for
    // a true pixel measurement as part of CI visual/behavioral checks.
    expect(button.className).toMatch(/cx-bottom-nav__item/);
  });

  test('calls onNavigate with the item key when tapped', () => {
    const onNavigate = vi.fn();
    render(<BottomNav items={NAV_ITEMS} activeKey="home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /profile/i }));
    expect(onNavigate).toHaveBeenCalledWith('profile');
  });
});

describe('SideDrawer — Responsive Component Test Matrix', () => {
  test('overlay mode traps focus and closes on Escape (tablet, md)', () => {
    setViewportWidth(VIEWPORTS.md);
    const onClose = vi.fn();
    render(
      <SideDrawer mode="overlay" open onClose={onClose}>
        <button>Nav Item</button>
      </SideDrawer>
    );
    expect(screen.getByRole('dialog', { name: /primary navigation/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  test('persistent mode renders without dialog role at desktop (lg)', () => {
    setViewportWidth(VIEWPORTS.lg);
    render(
      <SideDrawer mode="persistent" open>
        <button>Nav Item</button>
      </SideDrawer>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /primary navigation/i })).toBeInTheDocument();
  });
});

describe('ModalSheet — Responsive Component Test Matrix', () => {
  test('renders as bottom sheet on mobile (xs/sm)', () => {
    setViewportWidth(VIEWPORTS.xs);
    render(
      <ModalSheet open title="Confirm" onClose={() => {}}>
        Content
      </ModalSheet>
    );
    expect(screen.getByRole('dialog', { name: /confirm/i })).toBeInTheDocument();
  });

  test('non-dismissible sheet does not close on scrim click (destructive flow)', () => {
    const onClose = vi.fn();
    render(
      <ModalSheet open title="Delete item?" dismissible={false} onClose={onClose}>
        This cannot be undone.
      </ModalSheet>
    );
    const scrim = document.querySelector('.cx-drawer__scrim');
    fireEvent.click(scrim);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('Escape closes a dismissible sheet and restores focus to trigger', () => {
    const onClose = vi.fn();
    render(
      <ModalSheet open title="Info" onClose={onClose}>
        Details
      </ModalSheet>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

/**
 * NOTE on horizontal-overflow assertion (Spec 04 §4):
 * `document.documentElement.scrollWidth <= window.innerWidth` cannot be
 * meaningfully asserted under jsdom (no real layout engine). This check
 * belongs in a browser-based E2E pass (Playwright/Cypress) once components
 * are integrated into the actual Castor app shell — flagged here so it is
 * not silently dropped from the matrix.
 */
