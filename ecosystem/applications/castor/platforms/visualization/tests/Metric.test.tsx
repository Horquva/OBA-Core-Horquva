import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Metric } from "../src/metrics/Metric";

const metricData = {
  label: "Revenue",
  value: 1250.5,
  unit: "USD",
  metadata: {
    updatedAt: "2026-08-09",
  },
};

describe("Metric", () => {
  it("renders the metric information", () => {
    render(
      <Metric
        accessibleLabel="Revenue metric"
        data={metricData}
      />,
    );

    expect(screen.getByLabelText("Revenue metric")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("1,250.5")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("renders the loading state", () => {
    render(
      <Metric
        accessibleLabel="Revenue metric"
        data={metricData}
        state="loading"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading visualization",
    );
  });
});