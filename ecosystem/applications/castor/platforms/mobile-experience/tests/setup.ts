import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// vitest.config.ts runs with test.globals=false, so @testing-library/react's
// automatic afterEach cleanup (which relies on a global `afterEach`) never
// registers. Register it explicitly instead of flipping on global test APIs
// project-wide.
afterEach(() => {
  cleanup();
});
