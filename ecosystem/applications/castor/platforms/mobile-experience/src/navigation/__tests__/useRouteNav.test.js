/**
 * Unit tests for useRouteNav.
 * Ref: specs/02-adaptive-navigation-spec.md §4, §5; PLAN Phase 3 / Phase 9.
 *
 * Covers: hash-derived active state (route is the source of truth), deep-link
 * restoration on mount, navigate() pushing a back-stack entry, popstate
 * re-sync (hardware/browser back), and per-tab scroll position bookkeeping.
 */

import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { useRouteNav } from '../useRouteNav';

const KEYS = ['home', 'search', 'saved', 'profile'];

function resetLocation() {
  window.history.pushState({}, '', '#/');
}

beforeEach(resetLocation);
afterEach(() => {
  cleanup();
  resetLocation();
});

describe('useRouteNav', () => {
  test('defaults to the default key when there is no hash', () => {
    const { result } = renderHook(() => useRouteNav(KEYS));
    expect(result.current.active).toBe('home');
  });

  test('deep-link restoration: reads an existing hash on mount', () => {
    window.history.pushState({}, '', '#/saved');
    const { result } = renderHook(() => useRouteNav(KEYS));
    expect(result.current.active).toBe('saved');
  });

  test('falls back to default for an unknown/invalid hash', () => {
    window.history.pushState({}, '', '#/not-a-real-tab');
    const { result } = renderHook(() => useRouteNav(KEYS));
    expect(result.current.active).toBe('home');
  });

  test('navigate() updates active state and pushes a history entry (back-stack)', () => {
    const { result } = renderHook(() => useRouteNav(KEYS));
    act(() => {
      result.current.navigate('search');
    });
    expect(result.current.active).toBe('search');
    expect(window.location.hash).toBe('#/search');
  });

  test('navigate() to the current key is a no-op (no duplicate history entries)', () => {
    const { result } = renderHook(() => useRouteNav(KEYS));
    const before = window.history.length;
    act(() => {
      result.current.navigate('home');
    });
    expect(window.history.length).toBe(before);
  });

  test('navigate() ignores keys outside the valid set', () => {
    const { result } = renderHook(() => useRouteNav(KEYS));
    act(() => {
      result.current.navigate('not-a-tab');
    });
    expect(result.current.active).toBe('home');
  });

  test('browser/hardware back (popstate) re-syncs active from the URL, not stale state', () => {
    const { result } = renderHook(() => useRouteNav(KEYS));
    act(() => {
      result.current.navigate('profile');
    });
    expect(result.current.active).toBe('profile');

    // jsdom does not implement real back-navigation (history.back() does not
    // update window.location — a known jsdom limitation, not something this
    // suite can work around). We simulate what a real browser does on back —
    // the URL changes to the previous entry and a popstate event fires — by
    // setting the hash directly and dispatching popstate. A real-device/
    // Playwright pass is the place to verify actual history.back() wiring.
    act(() => {
      window.location.hash = '/home';
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.active).toBe('home');
  });

  test('per-tab scroll position is remembered and restored on switch back', () => {
    const { result } = renderHook(() => useRouteNav(KEYS));

    // Attach a fake scrollable element the hook can read/write scrollTop on.
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollTop', { value: 0, writable: true });
    act(() => {
      result.current.containerRef.current = el;
    });

    el.scrollTop = 240;

    act(() => {
      result.current.navigate('search');
    });
    // Switching away should have captured home's scroll offset and reset
    // scrollTop for the freshly-entered tab.
    expect(el.scrollTop).toBe(0);

    act(() => {
      result.current.navigate('home');
    });
    expect(el.scrollTop).toBe(240);
  });
});
