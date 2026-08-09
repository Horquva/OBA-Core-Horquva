import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Grid } from "../src/Grid";

describe("Grid", () => {
  it("renders with the base grid class", () => {
    render(<Grid data-testid="g">content</Grid>);
    expect(screen.getByTestId("g")).toHaveClass("oba-grid");
  });

  it("leaves column CSS variables unset when no override is given (falls back to CSS defaults)", () => {
    render(<Grid data-testid="g">content</Grid>);
    const el = screen.getByTestId("g");
    expect(el.style.getPropertyValue("--oba-grid-columns-tablet")).toBe("");
  });

  it("sets only the CSS variables for breakpoints that are overridden", () => {
    render(
      <Grid data-testid="g" columns={{ tablet: 6, desktop: 8 }}>
        content
      </Grid>,
    );
    const el = screen.getByTestId("g");
    expect(el.style.getPropertyValue("--oba-grid-columns-tablet")).toBe("6");
    expect(el.style.getPropertyValue("--oba-grid-columns-desktop")).toBe("8");
    expect(el.style.getPropertyValue("--oba-grid-columns-small-mobile")).toBe("");
  });

  it("applies the overflow guard so grid children cannot force horizontal scroll", () => {
    render(<Grid data-testid="g">content</Grid>);
    expect(screen.getByTestId("g")).toHaveClass("oba-overflow-guard");
  });
});
