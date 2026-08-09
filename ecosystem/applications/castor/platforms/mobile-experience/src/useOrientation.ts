import { useEffect, useState } from "react";

export type Orientation = "portrait" | "landscape";

const QUERY = "(orientation: portrait)";

/**
 * Tracks device orientation via a single matchMedia listener.
 * Most orientation-aware styling should be expressed in CSS with
 * `@media (orientation: ...)` directly — reach for this hook only when a
 * component must branch its rendered output (not just its styling) based
 * on orientation.
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(() => getCurrent());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(QUERY);
    const recompute = () => setOrientation(mql.matches ? "portrait" : "landscape");

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", recompute);
    } else {
      mql.addListener(recompute);
    }
    recompute();

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", recompute);
      } else {
        mql.removeListener(recompute);
      }
    };
  }, []);

  return orientation;
}

function getCurrent(): Orientation {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "portrait";
  }
  return window.matchMedia(QUERY).matches ? "portrait" : "landscape";
}
