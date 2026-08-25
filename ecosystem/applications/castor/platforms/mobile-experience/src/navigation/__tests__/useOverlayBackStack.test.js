/**
 * Unit tests for useOverlayBackStack.
 * Ref: specs/02-adaptive-navigation-spec.md §5 ("Mobile hardware/gesture back
 * closes an open sheet/drawer before navigating the route stack back.");
 * PLAN Phase 3 (back/return behavior), Phase 9.
 */

import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { useOverlayBackStack } from '../useOverlayBackStack';

function resetLocation() {
  window.history.pushState({}, '', '#/');
}

beforeEach(resetLocation);
afterEach(() => {
  cleanup();
  resetLocation();
});

describe('useOverlayBackStack', () => {
  test('opening borrows a history entry', () => {
    const before = window.history.length;
    renderHook(() => useOverlayBackStack(true, () => {}));
    expect(window.history.length).toBe(before + 1);
  });

  test('does not push a history entry while closed', () => {
    const before = window.history.length;
    renderHook(() => useOverlayBackStack(false, () => {}));
    expect(window.history.length).toBe(before);
  });

  test('back (popstate) while open calls onRequestClose — closes overlay before route stack', () => {
    const onRequestClose = vi.fn();
    renderHook(() => useOverlayBackStack(true, onRequestClose));

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  test('closing another way (scrim tap / Escape) consumes the borrowed entry via programmatic back', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const { rerender } = renderHook(({ open }) => useOverlayBackStack(open, () => {}), {
      initialProps: { open: true },
    });

    act(() => {
      rerender({ open: false });
    });

    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });

  test('does not double-consume: closing in response to popstate does not also call history.back()', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const onRequestClose = vi.fn();
    // Simulate the real consumer pattern (ModalSheet/SideDrawer): popstate
    // fires onRequestClose, the consumer sets open=false, we rerender with
    // open=false — the hook must recognize the entry was already consumed
    // by the popstate itself and must NOT call history.back() again.
    const { rerender } = renderHook(({ open }) => useOverlayBackStack(open, onRequestClose), {
      initialProps: { open: true },
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(onRequestClose).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({ open: false });
    });

    expect(backSpy).not.toHaveBeenCalled();
    backSpy.mockRestore();
  });
});
