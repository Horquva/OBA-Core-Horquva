/**
 * Unit tests for usePullToRefresh.
 * Ref: PLAN Phase 4 item 2; specs/03-touch-device-performance-spec.md §4, §8.
 *
 * Covers: must not trigger during normal scrolling (only arms at scrollTop 0),
 * cancellation/recovery (release before threshold snaps back to idle), and
 * the refresh lifecycle (ready → refreshing → idle).
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { usePullToRefresh } from '../usePullToRefresh';

afterEach(cleanup);

function touch(clientY) {
  return { touches: [{ clientY }], changedTouches: [{ clientY }] };
}

describe('usePullToRefresh', () => {
  test('starts idle', () => {
    const { result } = renderHook(() => usePullToRefresh({ onRefresh: vi.fn() }));
    expect(result.current.status).toBe('idle');
  });

  test('does not arm when the scroll container is mid-scroll (scrollTop > 0)', () => {
    const scrollContainerRef = { current: { scrollTop: 120 } };
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: vi.fn(), scrollContainerRef })
    );

    act(() => {
      result.current.handlers.onTouchStart(touch(100));
      result.current.handlers.onTouchMove(touch(220)); // 120px pull attempt
    });

    // A pull that starts mid-scroll must not register as a refresh gesture —
    // this is a normal scroll, not pull-to-refresh (Phase 4 requirement).
    expect(result.current.status).toBe('idle');
    expect(result.current.pullDistance).toBe(0);
  });

  test('arms and reports "pulling" then "ready" once past the distance threshold', () => {
    const scrollContainerRef = { current: { scrollTop: 0 } };
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: vi.fn(), scrollContainerRef, distanceThreshold: 70 })
    );

    act(() => {
      result.current.handlers.onTouchStart(touch(0));
      result.current.handlers.onTouchMove(touch(40));
    });
    expect(result.current.status).toBe('pulling');

    act(() => {
      result.current.handlers.onTouchMove(touch(90));
    });
    expect(result.current.status).toBe('ready');
  });

  test('cancellation/recovery: releasing before the threshold snaps back to idle with no stuck state', async () => {
    const onRefresh = vi.fn();
    const scrollContainerRef = { current: { scrollTop: 0 } };
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, scrollContainerRef, distanceThreshold: 70 })
    );

    act(() => {
      result.current.handlers.onTouchStart(touch(0));
      result.current.handlers.onTouchMove(touch(30)); // below threshold
    });
    await act(async () => {
      await result.current.handlers.onTouchEnd();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.pullDistance).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  test('releasing past the threshold calls onRefresh and recovers to idle afterward', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const scrollContainerRef = { current: { scrollTop: 0 } };
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, scrollContainerRef, distanceThreshold: 70 })
    );

    act(() => {
      result.current.handlers.onTouchStart(touch(0));
      result.current.handlers.onTouchMove(touch(100));
    });
    expect(result.current.status).toBe('ready');

    await act(async () => {
      await result.current.handlers.onTouchEnd();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    expect(result.current.pullDistance).toBe(0);
  });

  test('finger moving back up past the start point resets to idle (does not fight normal scroll)', () => {
    const scrollContainerRef = { current: { scrollTop: 0 } };
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: vi.fn(), scrollContainerRef })
    );

    act(() => {
      result.current.handlers.onTouchStart(touch(50));
      result.current.handlers.onTouchMove(touch(90)); // pulling down
    });
    expect(result.current.status).toBe('pulling');

    act(() => {
      result.current.handlers.onTouchMove(touch(30)); // back up past start
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.pullDistance).toBe(0);
  });
});
