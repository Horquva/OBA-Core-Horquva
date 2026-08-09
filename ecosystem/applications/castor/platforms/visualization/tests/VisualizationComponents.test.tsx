import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LineChart } from "../src/charts/LineChart";
import { OrganizationalGraph } from "../src/graphs/OrganizationalGraph";
import { MemoryTimeline } from "../src/timeline/MemoryTimeline";

describe("Visualization component library", () => {
  it("renders a line chart with its title and legend", () => {
    render(
      <LineChart
        accessibleLabel="Revenue trend chart"
        title="Revenue Trend"
        series={[
          {
            id: "revenue",
            label: "Revenue",
            data: [
              { x: "January", y: 100 },
              { x: "February", y: 130 },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Revenue Trend")).toBeInTheDocument();
    expect(screen.getByLabelText("Chart legend")).toHaveTextContent(
      "Revenue",
    );
    expect(
      screen.getAllByLabelText("Revenue trend chart").length,
    ).toBeGreaterThan(0);
  });

  it("renders an organizational graph with nodes and search", () => {
    render(
      <OrganizationalGraph
        accessibleLabel="Company organizational graph"
        title="Organization"
        nodes={[
          {
            id: "person-1",
            label: "Ayesha",
            type: "person",
          },
          {
            id: "team-1",
            label: "Finance",
            type: "team",
          },
        ]}
        edges={[
          {
            id: "edge-1",
            source: "person-1",
            target: "team-1",
            label: "Member",
          },
        ]}
      />,
    );

    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Search organizational graph"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ayesha")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
  });

  it("renders memory timeline events and filter controls", () => {
    render(
      <MemoryTimeline
        accessibleLabel="Organizational memory timeline"
        events={[
          {
            id: "event-1",
            timestamp: "2026-08-09T10:00:00Z",
            title: "Quarterly review",
            description: "Executive review completed",
            actor: "Hazam",
            category: "review",
            source: "WOBA",
            confidence: 0.95,
          },
        ]}
      />,
    );

    expect(screen.getByText("Memory Timeline")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Search memory timeline"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Filter timeline by category"),
    ).toBeInTheDocument();
    expect(screen.getByText("Quarterly review")).toBeInTheDocument();
    expect(screen.getByText("Actor: Hazam")).toBeInTheDocument();
    expect(screen.getByText("Confidence: 95%")).toBeInTheDocument();
  });
});