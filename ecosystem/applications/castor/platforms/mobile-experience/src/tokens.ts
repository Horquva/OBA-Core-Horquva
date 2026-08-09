/**
 * DESIGN-SYSTEM GAP — READ BEFORE EDITING
 * ----------------------------------------
 * ecosystem/applications/castor/packages/design-tokens/ contains no
 * published tokens (empty except .gitkeep), and
 * ecosystem/applications/castor/packages/ui/ contains no components
 * (same). There is no canonical Castor spacing scale to consume yet.
 *
 * Per the Castor spec ("reuse existing design tokens/spacing primitives,
 * do NOT create a parallel spacing scale"), this file is NOT a competing
 * spacing system — it is a minimal, clearly-scoped placeholder used only
 * by this package's layout primitives, so that Stack/Row/Grid/Container
 * have *some* deterministic spacing values to default to instead of
 * hardcoded magic numbers scattered through the code.
 *
 * ACTION REQUIRED: when the Design System platform publishes real spacing
 * tokens, delete this file's values and re-export the canonical tokens
 * from here instead, so consumers of this package don't need to change
 * their imports.
 */

export type SpaceKey = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export const SPACE: Record<SpaceKey, string> = {
  none: "0px",
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
};

/** Container max-widths per breakpoint. Same gap note as above applies. */
export const CONTAINER_MAX_WIDTH: Record<string, string> = {
  smallMobile: "100%",
  largeMobile: "100%",
  tablet: "720px",
  desktop: "1200px",
};
