import { useEffect, useState } from "react";
import { BREAKPOINT_ORDER, BreakpointKey, minWidthQuery } from "./breakpoints";

/**
 * Returns the currently active breakpoint key.
 *
 * Implementation note (perf, spec requirement #11): this uses
 * `matchMedia` change listeners, NOT a `resize` event listener. Each
 * `MediaQueryList` only fires when its boundary is crossed, so this does
 * not re-render on every pixel of a drag-resize the way a resize handler
 * would. Prefer expressing behavior in CSS (media/container queries)
 * wherever possible; reach for this hook only when JS actually needs to
 * branch on device class (e.g. choosing between two different components,
 * not styling one component).
 */
export function useBreakpoint(): BreakpointKey {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>(() => getCurrent());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const lists = BREAKPOINT_ORDER.map((key) => ({
      key,
      mql: window.matchMedia(minWidthQuery(key)),
    }));

    const recompute = () => setBreakpoint(getCurrentFromLists(lists));

    lists.forEach(({ mql }) => {
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", recompute);
      } else {
        // Safari < 14 fallback
        mql.addListener(recompute);
      }
    });

    recompute();

    return () => {
      lists.forEach(({ mql }) => {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", recompute);
        } else {
          mql.removeListener(recompute);
        }
      });
    };
  }, []);

  return breakpoint;
}

function getCurrentFromLists(
  lists: { key: BreakpointKey; mql: MediaQueryList }[],
): BreakpointKey {
  let active: BreakpointKey = "smallMobile";
  for (const { key, mql } of lists) {
    if (mql.matches) active = key;
  }
  return active;
}

function getCurrent(): BreakpointKey {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "smallMobile";
  }
  let active: BreakpointKey = "smallMobile";
  for (const key of BREAKPOINT_ORDER) {
    if (window.matchMedia(minWidthQuery(key)).matches) active = key;
  }
  return active;
}
