import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useOrientation } from "../src/useOrientation";

function TestComponent() {
  const orientation = useOrientation();
  return <div data-testid="orientation">{orientation}</div>;
}

function mockMatchMedia(matchesPortrait: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("portrait") ? matchesPortrait : !matchesPortrait,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("useOrientation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports portrait when the portrait media query matches", () => {
    mockMatchMedia(true);
    render(<TestComponent />);
    expect(screen.getByTestId("orientation")).toHaveTextContent("portrait");
  });

  it("reports landscape when the portrait media query does not match", () => {
    mockMatchMedia(false);
    render(<TestComponent />);
    expect(screen.getByTestId("orientation")).toHaveTextContent("landscape");
  });
});
