import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'vitest-axe/matchers';

// vitest-axe's own extend-expect entry point ships empty in the installed
// version — register the matcher directly instead of depending on it.
expect.extend({ toHaveNoViolations });

// jsdom does not implement window.matchMedia — useBreakpoint() relies on it
// for orientation detection (Spec 01 §6). Polyfill for the test environment only.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
