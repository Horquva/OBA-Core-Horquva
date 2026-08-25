/**
 * Central breakpoint tokens for the Castor Mobile Experience Platform.
 * Do not hard-code breakpoint widths elsewhere — always import from here.
 * Ref: specs/01-responsive-layout-infrastructure.md
 */

export const BREAKPOINTS = {
  xs: 0,     // Small Mobile
  sm: 360,   // Large Mobile
  md: 768,   // Tablet
  lg: 1024,  // Desktop
  xl: 1440,  // Wide Desktop
};

export const BREAKPOINT_ORDER = ['xs', 'sm', 'md', 'lg', 'xl'];

/**
 * Returns a min-width media query string for a given breakpoint key.
 * @param {keyof typeof BREAKPOINTS} key
 */
export function mediaUp(key) {
  const px = BREAKPOINTS[key];
  return `(min-width: ${px}px)`;
}

/**
 * Returns the breakpoint class for a given pixel width.
 * @param {number} width
 * @returns {keyof typeof BREAKPOINTS}
 */
export function getBreakpointForWidth(width) {
  let current = 'xs';
  for (const key of BREAKPOINT_ORDER) {
    if (width >= BREAKPOINTS[key]) {
      current = key;
    }
  }
  return current;
}

/** True if `bp` is >= `atLeast` in breakpoint order (e.g. isAtLeast('md', 'sm') === true) */
export function isAtLeast(bp, atLeast) {
  return BREAKPOINT_ORDER.indexOf(bp) >= BREAKPOINT_ORDER.indexOf(atLeast);
}
