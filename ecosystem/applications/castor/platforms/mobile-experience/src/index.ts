// Responsive layout infrastructure — Castor mobile-experience platform.
// See README.md for usage and the design-system gap note before adding
// new tokens or duplicating a primitive that belongs in the canonical
// Castor design system instead.

export * from "./breakpoints";
export * from "./tokens";
export * from "./useBreakpoint";
export * from "./useOrientation";
export * from "./Box";
export * from "./Stack";
export * from "./Row";
export * from "./Cluster";
export * from "./Container";
export * from "./Grid";

// Import for side effects (registers the CSS with bundlers that support
// CSS imports, e.g. webpack/Next/Vite). Consumers using a build tool
// without CSS-import support should import "./layout.css" directly.
import "./layout.css";
