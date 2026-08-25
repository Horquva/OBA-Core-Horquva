import { useEffect, useState, useCallback } from 'react';
import { getBreakpointForWidth } from './breakpoints';

/**
 * Reports the current responsive breakpoint class and orientation.
 * Recomputes on resize AND on orientation change (Spec 01 §6 — width alone is insufficient,
 * since a landscape phone and a portrait tablet can share a width range).
 *
 * Usage:
 *   const { breakpoint, isAtLeast, orientation } = useBreakpoint();
 */
export function useBreakpoint() {
  const getState = useCallback(() => {
    if (typeof window === 'undefined') {
      return { breakpoint: 'lg', orientation: 'landscape', width: 1280 };
    }
    const width = window.innerWidth;
    const orientation = window.matchMedia('(orientation: portrait)').matches
      ? 'portrait'
      : 'landscape';
    return { breakpoint: getBreakpointForWidth(width), orientation, width };
  }, []);

  const [state, setState] = useState(getState);

  useEffect(() => {
    let frame = null;
    const handleChange = () => {
      // rAF-throttle to avoid layout thrash during rapid resize/orientation events
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setState(getState()));
    };

    window.addEventListener('resize', handleChange, { passive: true });
    const orientationQuery = window.matchMedia('(orientation: portrait)');
    // addEventListener on MediaQueryList (fallback to addListener for older WebViews)
    if (orientationQuery.addEventListener) {
      orientationQuery.addEventListener('change', handleChange);
    } else {
      orientationQuery.addListener(handleChange);
    }

    return () => {
      window.removeEventListener('resize', handleChange);
      if (orientationQuery.removeEventListener) {
        orientationQuery.removeEventListener('change', handleChange);
      } else {
        orientationQuery.removeListener(handleChange);
      }
      if (frame) cancelAnimationFrame(frame);
    };
  }, [getState]);

  return {
    breakpoint: state.breakpoint,
    orientation: state.orientation,
    width: state.width,
    isMobile: state.breakpoint === 'xs' || state.breakpoint === 'sm',
    isTablet: state.breakpoint === 'md',
    isDesktop: state.breakpoint === 'lg' || state.breakpoint === 'xl',
  };
}
