import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Container } from "../src/Container";

describe("Container", () => {
  it("applies the overflow guard and container classes by default", () => {
    render(<Container data-testid="c">content</Container>);
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("oba-container");
    expect(el).toHaveClass("oba-overflow-guard");
  });

  it("applies safe-area padding classes by default", () => {
    render(<Container data-testid="c">content</Container>);
    const el = screen.getByTestId("c");
    expect(el).not.toHaveClass("oba-container--no-safe-area");
  });

  it("opts out of safe-area padding when safeArea=false", () => {
    render(
      <Container data-testid="c" safeArea={false}>
        content
      </Container>,
    );
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("oba-container--no-safe-area");
  });

  it("renders children", () => {
    render(<Container>hello world</Container>);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("merges caller-supplied className instead of overwriting it", () => {
    render(
      <Container data-testid="c" className="custom-class">
        content
      </Container>,
    );
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("custom-class");
    expect(el).toHaveClass("oba-container");
  });
});
