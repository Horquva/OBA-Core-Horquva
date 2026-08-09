import { describe, expect, it } from "vitest";
import { BREAKPOINTS, resolveBreakpoint } from "../src/breakpoints";

describe("resolveBreakpoint", () => {
  it("resolves small mobile widths (e.g. 320px, iPhone SE class)", () => {
    expect(resolveBreakpoint(320)).toBe("smallMobile");
    expect(resolveBreakpoint(0)).toBe("smallMobile");
    expect(resolveBreakpoint(399)).toBe("smallMobile");
  });

  it("resolves large mobile widths at and above the boundary", () => {
    expect(resolveBreakpoint(400)).toBe("largeMobile");
    expect(resolveBreakpoint(600)).toBe("largeMobile");
    expect(resolveBreakpoint(767)).toBe("largeMobile");
  });

  it("resolves tablet widths at and above the boundary", () => {
    expect(resolveBreakpoint(768)).toBe("tablet");
    expect(resolveBreakpoint(1000)).toBe("tablet");
    expect(resolveBreakpoint(1023)).toBe("tablet");
  });

  it("resolves desktop widths at and above the boundary", () => {
    expect(resolveBreakpoint(1024)).toBe("desktop");
    expect(resolveBreakpoint(1920)).toBe("desktop");
  });

  it("is deterministic: every integer width maps to exactly one breakpoint", () => {
    const widths = [0, 1, 399, 400, 401, 767, 768, 769, 1023, 1024, 1025, 5000];
    for (const w of widths) {
      const result = resolveBreakpoint(w);
      expect(Object.keys(BREAKPOINTS)).toContain(result);
    }
  });
});
