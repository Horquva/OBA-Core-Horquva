/**
 * Centralized breakpoint system for Castor mobile-experience layout infrastructure.
 *
 * GAP NOTE: No canonical Castor design-system breakpoint tokens exist yet
 * (ecosystem/applications/castor/packages/design-tokens/ is currently empty —
 * only a .gitkeep). These four values are scoped to this platform package
 * only. They map 1:1 to the device classes required by the Castor
 * engineering spec (small mobile / large mobile / tablet / desktop) and
 * should be replaced by canonical design-token values once the Design
 * System platform publishes them — see README "Design System Gap".
 *
 * These are intentionally the ONLY four breakpoints. Do not add ad-hoc
 * breakpoints elsewhere; extend this table instead.
 */

export type BreakpointKey = "smallMobile" | "largeMobile" | "tablet" | "desktop";

/** Minimum viewport width (px) at which each device class begins. */
export const BREAKPOINTS: Record<BreakpointKey, number> = {
  smallMobile: 0,
  largeMobile: 400,
  tablet: 768,
  desktop: 1024,
};

/** Ordered list, smallest to largest, for iteration and lookups. */
export const BREAKPOINT_ORDER: BreakpointKey[] = [
  "smallMobile",
  "largeMobile",
  "tablet",
  "desktop",
];

/**
 * min-width media query string for a given breakpoint.
 * smallMobile has no min-width query since it is the base (mobile-first) case.
 */
export function minWidthQuery(key: BreakpointKey): string {
  const px = BREAKPOINTS[key];
  return `(min-width: ${px}px)`;
}

/** Convenience, ready-to-use `@media` query strings, e.g. for styled output or docs. */
export const MEDIA_QUERIES: Record<BreakpointKey, string> = {
  smallMobile: `@media ${minWidthQuery("smallMobile")}`,
  largeMobile: `@media ${minWidthQuery("largeMobile")}`,
  tablet: `@media ${minWidthQuery("tablet")}`,
  desktop: `@media ${minWidthQuery("desktop")}`,
};

/**
 * Given a viewport width in px, resolve the active breakpoint key.
 * Pure function — safe to unit test without a DOM/matchMedia environment.
 */
export function resolveBreakpoint(widthPx: number): BreakpointKey {
  let active: BreakpointKey = "smallMobile";
  for (const key of BREAKPOINT_ORDER) {
    if (widthPx >= BREAKPOINTS[key]) {
      active = key;
    }
  }
  return active;
}
