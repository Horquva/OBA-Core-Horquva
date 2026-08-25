import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useRouteNav — minimal route-state source of truth for primary navigation.
 * Ref: specs/02-adaptive-navigation-spec.md §4, §5.
 *
 * The locked Castor router is not available inside this reference build
 * (spec §8: "pending integration with the locked Castor router"). Building a
 * parallel routing library would violate the "no parallel routing system"
 * rule, so this hook uses only the browser's native History API — the
 * smallest architecture-compatible mechanism that satisfies the navigation
 * lifecycle requirements (deep-linking, back-stack, route restoration)
 * without inventing new architecture. It is meant to be a drop-in-replaceable
 * shim: once the real router lands, `active`/`navigate` here map directly to
 * route params/navigate calls.
 *
 * Responsibilities:
 *  - `active` is derived from `location.hash` (route state), never local-only
 *    state — satisfies spec §4 ("route state is the single source of truth").
 *  - Deep-link restoration: reading the hash on mount sets the initial tab,
 *    so a shared/reloaded URL restores the correct nav highlight with no
 *    flash of incorrect state.
 *  - Back-stack correctness: `navigate(key)` pushes a history entry per tab
 *    change so hardware/browser back steps through tab history instead of
 *    leaving the app immediately.
 *  - Scroll position is remembered per tab key and restored on switch, so
 *    switching tabs and coming back does not lose scroll offset (Phase 6 /
 *    Spec 03 §7).
 *
 * Overlay (drawer/sheet) back-stack integration is intentionally NOT handled
 * here — per spec §4, "drawer/sheet open-state is local UI state; it is
 * explicitly NOT persisted into route/URL state". That back-before-route
 * behavior (spec §5) is handled by useOverlayBackStack instead, kept
 * separate so overlay state never leaks into route state.
 */

const DEFAULT_KEY = 'home';

function readHashKey(validKeys, fallback) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.location.hash.replace(/^#\/?/, '');
  return raw && validKeys.includes(raw) ? raw : fallback;
}

export function useRouteNav(validKeys, defaultKey = DEFAULT_KEY) {
  const [active, setActive] = useState(() => readHashKey(validKeys, defaultKey));
  const scrollPositions = useRef(new Map());
  const containerRef = useRef(null);

  // Deep-link / browser back-forward restoration: route state is derived
  // from the URL, so popstate (back/forward) re-syncs `active` instead of
  // trusting stale component state.
  useEffect(() => {
    const onPopState = () => {
      setActive((prev) => {
        const next = readHashKey(validKeys, defaultKey);
        if (next !== prev && containerRef.current) {
          scrollPositions.current.set(prev, containerRef.current.scrollTop);
        }
        return next;
      });
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validKeys.join('|'), defaultKey]);

  // Restore scroll position for the active tab after it changes.
  useEffect(() => {
    const saved = scrollPositions.current.get(active);
    if (containerRef.current) {
      containerRef.current.scrollTop = saved ?? 0;
    }
  }, [active]);

  const navigate = useCallback(
    (key) => {
      if (!validKeys.includes(key) || key === active) return;
      if (containerRef.current) {
        scrollPositions.current.set(active, containerRef.current.scrollTop);
      }
      if (typeof window !== 'undefined') {
        window.history.pushState({ navKey: key }, '', `#/${key}`);
      }
      setActive(key);
    },
    [active, validKeys]
  );

  return { active, navigate, containerRef };
}

export default useRouteNav;
