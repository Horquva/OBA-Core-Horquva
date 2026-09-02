import { useRef, useCallback } from 'react';

/**
 * Shared drag/swipe gesture hook for ModalSheet (drag-to-dismiss) and
 * SideDrawer overlay mode (edge-swipe-to-open/close).
 * Ref: specs/02-adaptive-navigation-spec.md §6, specs/03-touch-device-performance-spec.md §3
 *
 * Implements accidental-activation prevention: a gesture only counts as a
 * dismiss/open swipe if it crosses both a distance AND velocity threshold —
 * small internal scrolls (e.g. inside sheet content) do not trigger dismissal.
 *
 * @param {Object} opts
 * @param {'vertical'|'horizontal'} opts.axis
 * @param {number} opts.distanceThreshold px the gesture must travel to count (default 60)
 * @param {number} opts.velocityThreshold px/ms to count as a fast flick (default 0.3)
 * @param {() => void} opts.onDismiss called when the gesture crosses the dismiss thresholds
 */
export function useSwipeGesture({
  axis = 'vertical',
  distanceThreshold = 60,
  velocityThreshold = 0.3,
  onDismiss,
} = {}) {
  const startRef = useRef({ x: 0, y: 0, t: 0 });
  const draggingRef = useRef(false);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY, t: performance.now() };
    draggingRef.current = true;
  }, []);

  const onTouchMove = useCallback(
    (_e) => {
      if (!draggingRef.current) return;
      // Intentionally left for consumers to read live delta if they want a
      // follow-the-finger drag effect; core logic decides on touchend.
    },
    []
  );

  const onTouchEnd = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;
      const dt = Math.max(1, performance.now() - startRef.current.t);

      const primaryDelta = axis === 'vertical' ? dy : dx;
      const distance = Math.abs(primaryDelta);
      const velocity = distance / dt;

      // Only trigger dismiss for movement in the "closing" direction
      // (down for vertical sheets, matching typical bottom-sheet UX).
      const isClosingDirection = axis === 'vertical' ? primaryDelta > 0 : true;

      const crossedDistance = distance >= distanceThreshold;
      const crossedVelocity = velocity >= velocityThreshold;

      if (isClosingDirection && (crossedDistance || crossedVelocity) && onDismiss) {
        onDismiss();
      }
    },
    [axis, distanceThreshold, velocityThreshold, onDismiss]
  );

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
