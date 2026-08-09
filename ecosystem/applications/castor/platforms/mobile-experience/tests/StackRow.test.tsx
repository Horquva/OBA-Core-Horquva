import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stack } from "../src/Stack";
import { Row } from "../src/Row";
import { Cluster } from "../src/Cluster";
import { SPACE } from "../src/tokens";

describe("Stack", () => {
  it("defaults to md gap and stretch alignment", () => {
    render(<Stack data-testid="s">content</Stack>);
    const el = screen.getByTestId("s");
    expect(el).toHaveClass("oba-stack");
    expect(el.style.gap).toBe(SPACE.md);
    expect(el.style.alignItems).toBe("stretch");
  });

  it("applies a custom gap token", () => {
    render(
      <Stack data-testid="s" gap="xl">
        content
      </Stack>,
    );
    expect(screen.getByTestId("s").style.gap).toBe(SPACE.xl);
  });
});

describe("Row", () => {
  it("wraps by default so children cannot overflow horizontally", () => {
    render(<Row data-testid="r">content</Row>);
    const el = screen.getByTestId("r");
    expect(el).toHaveClass("oba-row");
    expect(el).toHaveClass("oba-overflow-guard");
  });

  it("applies justify-content mapping correctly", () => {
    render(
      <Row data-testid="r" justify="space-between">
        content
      </Row>,
    );
    expect(screen.getByTestId("r").style.justifyContent).toBe("space-between");
  });
});

describe("Cluster", () => {
  it("renders with wrapping cluster class and default sm gap", () => {
    render(<Cluster data-testid="c">content</Cluster>);
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("oba-cluster");
    expect(el.style.gap).toBe(SPACE.sm);
  });
});
