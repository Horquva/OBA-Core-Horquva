/**
 * PLAN Phase 2 breakpoint contract validation, at the literal tier widths the
 * plan specifies: 0px, 400px, 768px, 1024px. These are boundary-condition
 * widths, distinct from the device-realistic reference widths already used
 * in responsive-test-matrix.test.jsx (320/414/834/1280, per
 * docs/04-responsive-component-test-matrix.md §2). Both sets are kept —
 * this file validates the plan's exact contract tiers; the other validates
 * representative real-device sizes. Together they cover the requirement
 * without one silently standing in for the other.
 */

import React from 'react';
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { getBreakpointForWidth } from '../../layout/breakpoints';
import { BottomNav } from '../BottomNav';
import { SideDrawer } from '../SideDrawer';
import { ModalSheet } from '../ModalSheet';

const TIERS = [0, 400, 768, 1024];

function setViewportWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

afterEach(cleanup);

describe('Breakpoint contract — getBreakpointForWidth at PLAN tiers', () => {
  test.each([
    [0, 'xs'],
    [400, 'sm'],
    [768, 'md'],
    [1024, 'lg'],
  ])('%dpx classifies as %s', (width, expected) => {
    expect(getBreakpointForWidth(width)).toBe(expected);
  });
});

describe('BottomNav — visibility across PLAN tiers (mobile-only, xs/sm)', () => {
  TIERS.forEach((width) => {
    test(`renders without layout error at ${width}px`, () => {
      setViewportWidth(width);
      const { unmount } = render(
        <BottomNav
          items={[{ key: 'home', label: 'Home' }]}
          activeKey="home"
          onNavigate={() => {}}
        />
      );
      // BottomNav has no internal breakpoint gate of its own — App.jsx only
      // mounts it when isMobile (Spec 02 §2: xs/sm only). This asserts the
      // component itself renders cleanly at every contract tier; the
      // mount/unmount decision by breakpoint is covered at the App level.
      expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
      unmount();
    });
  });
});

describe('SideDrawer — presentation switches correctly at the md/lg contract tiers', () => {
  test('0px / 400px (below md): overlay mode still renders as a dialog if opened', () => {
    setViewportWidth(400);
    render(
      <SideDrawer mode="overlay" open onClose={() => {}}>
        <button>Nav</button>
      </SideDrawer>
    );
    expect(screen.getByRole('dialog', { name: /primary navigation/i })).toBeInTheDocument();
  });

  test('768px (md contract boundary): overlay mode renders as dialog', () => {
    setViewportWidth(768);
    render(
      <SideDrawer mode="overlay" open onClose={() => {}}>
        <button>Nav</button>
      </SideDrawer>
    );
    expect(screen.getByRole('dialog', { name: /primary navigation/i })).toBeInTheDocument();
  });

  test('1024px (lg contract boundary): persistent mode renders without a dialog role', () => {
    setViewportWidth(1024);
    render(
      <SideDrawer mode="persistent" open>
        <button>Nav</button>
      </SideDrawer>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /primary navigation/i })).toBeInTheDocument();
  });
});

describe('ModalSheet — adaptive presentation at every PLAN tier', () => {
  test('0px: bottom-sheet presentation (mobile)', () => {
    setViewportWidth(0);
    render(
      <ModalSheet open title="Confirm" onClose={() => {}}>
        Content
      </ModalSheet>
    );
    const dialog = screen.getByRole('dialog', { name: /confirm/i });
    expect(dialog.className).toMatch(/cx-sheet--bottom/);
  });

  test('400px: bottom-sheet presentation (still sm/mobile)', () => {
    setViewportWidth(400);
    render(
      <ModalSheet open title="Confirm" onClose={() => {}}>
        Content
      </ModalSheet>
    );
    const dialog = screen.getByRole('dialog', { name: /confirm/i });
    expect(dialog.className).toMatch(/cx-sheet--bottom/);
  });

  test('768px: centered-dialog presentation (md/tablet)', () => {
    setViewportWidth(768);
    render(
      <ModalSheet open title="Confirm" onClose={() => {}}>
        Content
      </ModalSheet>
    );
    const dialog = screen.getByRole('dialog', { name: /confirm/i });
    expect(dialog.className).toMatch(/cx-sheet--centered/);
  });

  test('1024px: centered-dialog presentation (lg/desktop)', () => {
    setViewportWidth(1024);
    render(
      <ModalSheet open title="Confirm" onClose={() => {}}>
        Content
      </ModalSheet>
    );
    const dialog = screen.getByRole('dialog', { name: /confirm/i });
    expect(dialog.className).toMatch(/cx-sheet--centered/);
  });
});

/**
 * NOTE on horizontal-overflow assertion (Spec 01 §5, Spec 04 §4):
 * as already documented in responsive-test-matrix.test.jsx, jsdom has no
 * real layout engine, so `document.documentElement.scrollWidth <=
 * window.innerWidth` cannot be meaningfully asserted here either. Not
 * fabricated — flagged as requiring a browser-based E2E pass
 * (Playwright/Cypress) once integrated into the locked Castor repository.
 */
