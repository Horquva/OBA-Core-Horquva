import { useEffect, useRef } from 'react';

/**
 * useOverlayBackStack — makes hardware/browser back close an open overlay
 * (drawer/sheet) BEFORE it navigates the underlying route stack back.
 * Ref: specs/02-adaptive-navigation-spec.md §5:
 *   "Mobile hardware/gesture back closes an open sheet/drawer before
 *    navigating the route stack back."
 *
 * Overlay open/close state stays local (per §4 — never written into route
 * state); this hook only borrows one history entry while the overlay is
 * open so the platform back gesture has something to "consume" first,
 * without persisting the overlay into the URL/route.
 *
 * @param {boolean} open
 * @param {() => void} onRequestClose — called when back is pressed while open
 */
export function useOverlayBackStack(open, onRequestClose) {
  const pushedRef = useRef(false);
  const closingFromPopRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (open && !pushedRef.current) {
      window.history.pushState({ overlay: true }, '');
      pushedRef.current = true;
    }

    const onPopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        closingFromPopRef.current = true;
        onRequestClose?.();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [open, onRequestClose]);

  useEffect(() => {
    // If the overlay was closed some other way (Escape, scrim tap, swipe)
    // while we still hold the borrowed history entry, consume it via a
    // programmatic back so the stack doesn't accumulate dead entries.
    if (!open && pushedRef.current && !closingFromPopRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
    closingFromPopRef.current = false;
  }, [open]);
}

export default useOverlayBackStack;
