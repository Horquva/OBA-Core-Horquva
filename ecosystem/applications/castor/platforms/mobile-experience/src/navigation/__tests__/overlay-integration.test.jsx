/**
 * Integration tests covering the gap this pass closed: useFocusTrap and
 * useOverlayBackStack were implemented but not wired into ModalSheet /
 * SideDrawer. These assert the wiring actually works end-to-end through the
 * real components, not just the hooks in isolation.
 * Ref: specs/02-adaptive-navigation-spec.md §4, §5; specs/04 §5 (focus trap).
 */

import React from 'react';
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ModalSheet } from '../ModalSheet';
import { SideDrawer } from '../SideDrawer';

function resetLocation() {
  window.history.pushState({}, '', '#/');
}

/**
 * jsdom does not run a layout engine, so `offsetParent` is always null —
 * useFocusTrap's real-browser visibility filter (`el.offsetParent !== null`)
 * would otherwise treat every element but the currently-focused one as
 * invisible and the cycling logic couldn't be exercised at all. Polyfilling
 * offsetParent for the elements under test simulates what a real browser
 * reports, so the trap's actual cycling logic runs the way it would on a
 * device. (Same category of jsdom gap already called out in
 * responsive-test-matrix.test.jsx for touch-target sizing / scrollWidth.)
 */
function makeVisibleInJsdom(...elements) {
  elements.forEach((el) => {
    Object.defineProperty(el, 'offsetParent', { get: () => document.body, configurable: true });
  });
}

beforeEach(resetLocation);
afterEach(() => {
  cleanup();
  resetLocation();
});

describe('ModalSheet — focus trap + back-stack integration', () => {
  test('Tab cycles focus within the sheet and does not escape to the background', () => {
    render(
      <div>
        <button>Background button</button>
        <ModalSheet open title="Info" onClose={() => {}}>
          <button>First</button>
          <button>Last</button>
        </ModalSheet>
      </div>
    );

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    makeVisibleInJsdom(first, last);

    last.focus();
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  test('opening the sheet borrows a history entry so hardware back closes it first', () => {
    const before = window.history.length;
    render(
      <ModalSheet open title="Info" onClose={() => {}}>
        Content
      </ModalSheet>
    );
    expect(window.history.length).toBe(before + 1);
  });

  test('browser back closes a dismissible sheet before it would navigate the route stack', () => {
    const onClose = vi.fn();
    render(
      <ModalSheet open title="Info" onClose={onClose}>
        Content
      </ModalSheet>
    );

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('SideDrawer — focus trap + back-stack integration', () => {
  test('overlay mode: Tab cycles focus within the drawer', () => {
    render(
      <SideDrawer mode="overlay" open onClose={() => {}}>
        <button>Nav 1</button>
        <button>Nav 2</button>
      </SideDrawer>
    );

    const first = screen.getByRole('button', { name: 'Nav 1' });
    const last = screen.getByRole('button', { name: 'Nav 2' });
    makeVisibleInJsdom(first, last);

    last.focus();
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  test('overlay mode: browser back closes the drawer before navigating the route stack', () => {
    const onClose = vi.fn();
    render(
      <SideDrawer mode="overlay" open onClose={onClose}>
        <button>Nav Item</button>
      </SideDrawer>
    );

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('persistent mode (desktop): does not borrow a history entry and back does not close it', () => {
    const onClose = vi.fn();
    const before = window.history.length;
    render(
      <SideDrawer mode="persistent" open onClose={onClose}>
        <button>Nav Item</button>
      </SideDrawer>
    );
    expect(window.history.length).toBe(before);

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
