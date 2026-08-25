import { useCallback, useRef, useState } from 'react';

/**
 * usePullToRefresh — pull-down-to-refresh gesture for a scrollable container.
 * Ref: PLAN Phase 4 item 2; specs/03-touch-device-performance-spec.md §4, §8.
 *
 * Guards against the two most common pull-to-refresh bugs:
 *  - Must NOT trigger during normal scrolling: the gesture only arms when the
 *    container's scrollTop is 0 at touchstart — a pull that starts mid-scroll
 *    never counts, so this can't fight with vertical scroll physics.
 *  - Must recover after cancellation: releasing before the distance threshold
 *    resets to idle (no stuck "loading" state, no dangling listeners).
 *
 * Usage:
 *   const { handlers, status, pullDistance } = usePullToRefresh({
 *     onRefresh: async () => { await refetch(); },
 *     scrollContainerRef,
 *   });
 *   <div ref={scrollContainerRef} {...handlers}>...</div>
 *
 * status: 'idle' | 'pulling' | 'ready' | 'refreshing'
 */
export function usePullToRefresh({
  onRefresh,
  scrollContainerRef,
  distanceThreshold = 70,
  maxPull = 120,
} = {}) {
  const [status, setStatus] = useState('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const armedRef = useRef(false);
  const refreshingRef = useRef(false);

  const onTouchStart = useCallback(
    (e) => {
      if (refreshingRef.current) return;
      const container = scrollContainerRef?.current;
      // Only arm the gesture if we're already at the top — a pull that
      // starts mid-scroll is a normal scroll, not a refresh gesture.
      const atTop = !container || container.scrollTop <= 0;
      armedRef.current = atTop;
      if (atTop) {
        startYRef.current = e.touches[0].clientY;
      }
    },
    [scrollContainerRef]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (!armedRef.current || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        // Finger moved back up past the start point — not a pull, and
        // scrolling should resume normally.
        setPullDistance(0);
        setStatus('idle');
        return;
      }
      const clamped = Math.min(dy, maxPull);
      setPullDistance(clamped);
      setStatus(clamped >= distanceThreshold ? 'ready' : 'pulling');
    },
    [distanceThreshold, maxPull]
  );

  const onTouchEnd = useCallback(async () => {
    if (!armedRef.current || refreshingRef.current) {
      armedRef.current = false;
      return;
    }
    armedRef.current = false;

    if (pullDistance >= distanceThreshold) {
      refreshingRef.current = true;
      setStatus('refreshing');
      try {
        await onRefresh?.();
      } finally {
        refreshingRef.current = false;
        setStatus('idle');
        setPullDistance(0);
      }
    } else {
      // Cancellation/recovery: released before threshold, snap back to idle.
      setStatus('idle');
      setPullDistance(0);
    }
  }, [distanceThreshold, onRefresh, pullDistance]);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    status,
    pullDistance,
  };
}

export default usePullToRefresh;
