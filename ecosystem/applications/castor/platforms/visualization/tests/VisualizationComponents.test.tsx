import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { WidgetContainer } from "../../executive-workspace/src/components/widgets/WidgetContainer";

// Chart Components
import { LineChart } from "../src/charts/LineChart";
import { BarChart } from "../src/charts/BarChart";
import { AreaChart } from "../src/charts/AreaChart";
import { ScatterPlot } from "../src/charts/ScatterPlot";
import { DistributionChart } from "../src/charts/DistributionChart";

// Metric Components
import { Metric } from "../src/metrics/Metric";
import { MetricWithTrend } from "../src/metrics/MetricWithTrend";
import { MetricComparison } from "../src/metrics/MetricComparison";
import { MetricStatus } from "../src/metrics/MetricStatus";

// Graph Components
import { OrganizationalGraph } from "../src/graphs/OrganizationalGraph";
import { KnowledgeGraph } from "../src/graphs/KnowledgeGraph";

// Timeline Component
import { MemoryTimeline } from "../src/timeline/MemoryTimeline";

describe("Visualization component library with real WidgetContainer", () => {
  describe("Chart components", () => {
    it("renders LineChart inside WidgetContainer", () => {
      render(
        <WidgetContainer id="line-widget" title="Revenue">
          <LineChart
            accessibleLabel="Revenue trend"
            title="Trend"
            series={[
              {
                id: "revenue",
                label: "Revenue",
                data: [
                  { x: "Jan", y: 100 },
                  { x: "Feb", y: 130 },
                ],
              },
            ]}
          />
        </WidgetContainer>,
      );

      // Verify container title
      const headers = screen.getAllByText("Revenue");
      expect(headers.length).toBeGreaterThan(0);

      // Verify chart renders
      const chartLabels = screen.getAllByLabelText("Revenue trend");
      expect(chartLabels.length).toBeGreaterThan(0);
      expect(screen.getByLabelText("Chart legend")).toHaveTextContent("Revenue");
    });

    it("renders BarChart inside WidgetContainer", () => {
      render(
        <WidgetContainer id="bar-widget" title="Sales">
          <BarChart
            accessibleLabel="Sales by region"
            title="Regional Sales"
            series={[
              {
                id: "sales",
                label: "Sales",
                data: [
                  { x: "North", y: 250 },
                  { x: "South", y: 180 },
                ],
              },
            ]}
          />
        </WidgetContainer>,
      );

      const salesTitles = screen.getAllByText("Sales");
      expect(salesTitles.length).toBeGreaterThan(0);
      const salesByRegion = screen.getAllByLabelText("Sales by region");
      expect(salesByRegion.length).toBeGreaterThan(0);
      expect(screen.getByLabelText("Chart legend")).toHaveTextContent("Sales");
    });

    it("renders AreaChart inside WidgetContainer", () => {
      render(
        <WidgetContainer id="area-widget" title="Growth">
          <AreaChart
            accessibleLabel="Growth over time"
            title="Growth Curve"
            series={[
              {
                id: "growth",
                label: "Growth",
                data: [
                  { x: "Q1", y: 100 },
                  { x: "Q2", y: 150 },
                ],
              },
            ]}
          />
        </WidgetContainer>,
      );

      const growthTitles = screen.getAllByText("Growth");
      expect(growthTitles.length).toBeGreaterThan(0);
      const growthOverTime = screen.getAllByLabelText("Growth over time");
      expect(growthOverTime.length).toBeGreaterThan(0);
    });

    it("renders ScatterPlot inside WidgetContainer", () => {
      render(
        <WidgetContainer id="scatter-widget" title="Correlation">
          <ScatterPlot
            accessibleLabel="Price vs demand"
            title="Price Demand"
            series={[
              {
                id: "scatter",
                label: "Points",
                data: [
                  { x: 1, y: 10 },
                  { x: 2, y: 20 },
                ],
              },
            ]}
          />
        </WidgetContainer>,
      );

      const correlationTitles = screen.getAllByText("Correlation");
      expect(correlationTitles.length).toBeGreaterThan(0);
      const priceVsDemand = screen.getAllByLabelText("Price vs demand");
      expect(priceVsDemand.length).toBeGreaterThan(0);
    });

    it("renders DistributionChart inside WidgetContainer", () => {
      render(
        <WidgetContainer id="dist-widget" title="Distribution">
          <DistributionChart
            accessibleLabel="Value distribution"
            title="Histogram"
            values={[1, 2, 2, 3, 3, 3, 4, 5, 5, 5, 5]}
          />
        </WidgetContainer>,
      );

      const distributionTitles = screen.getAllByText("Distribution");
      expect(distributionTitles.length).toBeGreaterThan(0);
      const valueDistribution = screen.getAllByLabelText("Value distribution");
      expect(valueDistribution.length).toBeGreaterThan(0);
    });
  });

  describe("Metric components", () => {
    it("renders Metric inside WidgetContainer", () => {
      render(
        <WidgetContainer id="metric-widget" title="Revenue">
          <Metric
            accessibleLabel="Current revenue"
            data={{
              label: "Revenue",
              value: 1000,
              unit: "USD",
            }}
          />
        </WidgetContainer>,
      );

      const revenueTitles = screen.getAllByText("Revenue");
      expect(revenueTitles.length).toBeGreaterThan(0);
      expect(screen.getByText("1,000")).toBeInTheDocument();
      expect(screen.getByText("USD")).toBeInTheDocument();
    });

    it("renders MetricWithTrend inside WidgetContainer", () => {
      render(
        <WidgetContainer id="trend-widget" title="Growth">
          <MetricWithTrend
            accessibleLabel="Growth metric with trend"
            data={{
              label: "Growth",
              value: 250,
              unit: "%",
              trend: 15,
            }}
          />
        </WidgetContainer>,
      );

      const growthTitles = screen.getAllByText("Growth");
      expect(growthTitles.length).toBeGreaterThan(0);
      expect(screen.getByText("250")).toBeInTheDocument();
      expect(screen.getByText("%")).toBeInTheDocument();
    });

    it("renders MetricComparison inside WidgetContainer", () => {
      render(
        <WidgetContainer id="comp-widget" title="Comparison">
          <MetricComparison
            accessibleLabel="Revenue comparison"
            primary={{
              label: "Current",
              value: 1500,
              unit: "USD",
            }}
            comparison={{
              label: "Previous",
              value: 1000,
              unit: "USD",
            }}
          />
        </WidgetContainer>,
      );

      const comparisonTitles = screen.getAllByText("Comparison");
      expect(comparisonTitles.length).toBeGreaterThan(0);
      expect(screen.getByText("Current")).toBeInTheDocument();
      expect(screen.getByText("Previous")).toBeInTheDocument();
    });

    it("renders MetricStatus inside WidgetContainer", () => {
      render(
        <WidgetContainer id="status-widget" title="Status">
          <MetricStatus
            accessibleLabel="System status"
            data={{
              label: "System Health",
              value: 98,
              unit: "%",
              status: "positive",
            }}
          />
        </WidgetContainer>,
      );

      const statusTitles = screen.getAllByText("Status");
      expect(statusTitles.length).toBeGreaterThan(0);
      expect(screen.getByText("System Health")).toBeInTheDocument();
      expect(screen.getByText("98")).toBeInTheDocument();
    });
  });

  describe("Graph components", () => {
    it("renders OrganizationalGraph inside WidgetContainer", () => {
      render(
        <WidgetContainer id="org-widget" title="Organization">
          <OrganizationalGraph
            accessibleLabel="Company structure"
            title="Org Chart"
            nodes={[
              { id: "p1", label: "Alice", type: "person" },
              { id: "t1", label: "Engineering", type: "team" },
            ]}
            edges={[{ id: "e1", source: "p1", target: "t1" }]}
          />
        </WidgetContainer>,
      );

      const orgTitles = screen.getAllByText("Organization");
      expect(orgTitles.length).toBeGreaterThan(0);
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Engineering")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Search organizational graph"),
      ).toBeInTheDocument();
    });

    it("renders KnowledgeGraph inside WidgetContainer", () => {
      render(
        <WidgetContainer id="kg-widget" title="Knowledge">
          <KnowledgeGraph
            accessibleLabel="Knowledge network"
            title="Knowledge Map"
            nodes={[
              { id: "k1", label: "API Docs", type: "knowledge" },
              { id: "p1", label: "Castor", type: "project" },
            ]}
            edges={[{ id: "e1", source: "k1", target: "p1" }]}
          />
        </WidgetContainer>,
      );

      const knowledgeTitles = screen.getAllByText("Knowledge");
      expect(knowledgeTitles.length).toBeGreaterThan(0);
      expect(screen.getByText("API Docs")).toBeInTheDocument();
      expect(screen.getByText("Castor")).toBeInTheDocument();
    });
  });

  describe("Timeline component", () => {
    it("renders MemoryTimeline inside WidgetContainer", () => {
      render(
        <WidgetContainer id="timeline-widget" title="History">
          <MemoryTimeline
            accessibleLabel="Event history"
            events={[
              {
                id: "e1",
                timestamp: "2026-08-01T10:00:00Z",
                title: "Launch",
                category: "release",
              },
            ]}
          />
        </WidgetContainer>,
      );

      const historyTitles = screen.getAllByText("History");
      expect(historyTitles.length).toBeGreaterThan(0);
      expect(screen.getByText("Launch")).toBeInTheDocument();
    });
  });

  describe("WidgetContainer state management", () => {
    it("displays actual loading skeleton when isLoading=true", () => {
      render(
        <WidgetContainer
          id="loading-widget"
          title="Data Widget"
          isLoading={true}
        >
          <Metric
            accessibleLabel="Loading metric"
            data={{ label: "Test", value: 100, unit: "USD" }}
          />
        </WidgetContainer>,
      );

      // Verify title is visible
      expect(screen.getByText("Data Widget")).toBeInTheDocument();

      // Verify loading skeleton is present (animate-pulse class)
      const skeleton = document
        .getElementById("loading-widget")
        ?.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();

      // Verify child visualization is not rendered
      expect(screen.queryByText("Test")).not.toBeInTheDocument();
      expect(screen.queryByText("100")).not.toBeInTheDocument();
    });

    it("displays error alert with role='alert' when error prop is set", () => {
      render(
        <WidgetContainer
          id="error-widget"
          title="Data Widget"
          error="Unable to load data"
        >
          <Metric
            accessibleLabel="Error metric"
            data={{ label: "Test", value: 100, unit: "USD" }}
          />
        </WidgetContainer>,
      );

      const errorTitles = screen.getAllByText("Data Widget");
      expect(errorTitles.length).toBeGreaterThan(0);
      // Verify error alert
      const errorAlert = screen.getByRole("alert");
      expect(errorAlert).toHaveTextContent("Unable to load data");

      // Verify child visualization is not rendered
      expect(screen.queryByText("Test")).not.toBeInTheDocument();
    });

    it("updates visualization through WidgetContainer's Refresh widget button", () => {
      function RefreshableWidget() {
        const [count, setCount] = useState(0);

        return (
          <WidgetContainer
            id="refresh-widget"
            title="Counter"
            onRefresh={() => setCount(count + 1)}
          >
            <Metric
              accessibleLabel="Counter metric"
              data={{
                label: "Count",
                value: count,
                unit: "times",
              }}
            />
          </WidgetContainer>
        );
      }

      render(<RefreshableWidget />);

      // Verify initial state
      expect(screen.getByText("Counter")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();

      // Click the Refresh widget button
      const refreshButton = screen.getByRole("button", {
        name: "Refresh widget",
      });
      fireEvent.click(refreshButton);

      // Verify metric updated
      expect(screen.getByText("1")).toBeInTheDocument();

      // Click again
      fireEvent.click(refreshButton);
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("renders visualization when isLoading=false and error is not set", () => {
      render(
        <WidgetContainer
          id="normal-widget"
          title="Normal Widget"
          isLoading={false}
        >
          <Metric
            accessibleLabel="Normal metric"
            data={{
              label: "Revenue",
              value: 5000,
              unit: "USD",
            }}
          />
        </WidgetContainer>,
      );

      expect(screen.getByText("Normal Widget")).toBeInTheDocument();
      expect(screen.getByText("Revenue")).toBeInTheDocument();
      expect(screen.getByText("5,000")).toBeInTheDocument();
      expect(screen.getByText("USD")).toBeInTheDocument();
    });
  });

  describe("Responsive sizing in WidgetContainer", () => {
    it("respects width and height props inside full-height container", () => {
      render(
        <WidgetContainer
          id="sized-widget"
          title="Sized Chart"
        >
          <LineChart
            accessibleLabel="Full-width chart"
            width="100%"
            height={320}
            series={[
              {
                id: "s1",
                label: "Data",
                data: [
                  { x: "A", y: 10 },
                  { x: "B", y: 20 },
                ],
              },
            ]}
          />
        </WidgetContainer>,
      );

      const sizedTitles = screen.getAllByText("Sized Chart");
      expect(sizedTitles.length).toBeGreaterThan(0);
      const fullWidthChart = screen.getAllByLabelText("Full-width chart");
      expect(fullWidthChart.length).toBeGreaterThan(0);
      expect(fullWidthChart[0]).toHaveStyle({ width: "100%" });
    });
  });

  describe("Data updates and rerendering", () => {
    it("rerenders LineChart when series prop changes", () => {
      function DynamicChart() {
        const [points, setPoints] = useState(1);

        return (
          <>
            <WidgetContainer id="dynamic-widget" title="Dynamic Chart">
              <LineChart
                accessibleLabel="Dynamic line chart"
                series={[
                  {
                    id: "s1",
                    label: "Series",
                    data: Array.from({ length: points }, (_, i) => ({
                      x: `Point ${i + 1}`,
                      y: 100 + i * 10,
                    })),
                  },
                ]}
              />
            </WidgetContainer>
            <button onClick={() => setPoints(points + 1)}>Add Point</button>
          </>
        );
      }

      render(<DynamicChart />);

      const getPointTitles = () =>
        Array.from(
          document.querySelectorAll("#dynamic-widget circle title"),
          (element) => element.textContent,
        );

      expect(getPointTitles()).toContain("Point 1: 100");
      expect(getPointTitles()).not.toContain("Point 2: 110");

      fireEvent.click(screen.getByText("Add Point"));

      expect(getPointTitles()).toContain("Point 1: 100");
      expect(getPointTitles()).toContain("Point 2: 110");
    });

    it("rerenders Metric when data value prop changes", () => {
      function DynamicMetric() {
        const [value, setValue] = useState(1000);

        return (
          <>
            <WidgetContainer id="metric-widget" title="Dynamic Metric">
              <Metric
                accessibleLabel="Dynamic value"
                data={{
                  label: "Amount",
                  value,
                  unit: "USD",
                }}
              />
            </WidgetContainer>
            <button onClick={() => setValue(value + 500)}>
              Increment
            </button>
          </>
        );
      }

      render(<DynamicMetric />);

      expect(screen.getByText("1,000")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Increment"));

      expect(screen.getByText("1,500")).toBeInTheDocument();
    });

    it("rerenders MemoryTimeline when events prop changes", () => {
      function DynamicTimeline() {
        const [eventCount, setEventCount] = useState(1);

        return (
          <>
            <WidgetContainer id="timeline-widget" title="Dynamic Timeline">
              <MemoryTimeline
                accessibleLabel="Dynamic timeline"
                events={Array.from({ length: eventCount }, (_, i) => ({
                  id: `e${i}`,
                  timestamp: `2026-08-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
                  title: `Event ${i + 1}`,
                }))}
              />
            </WidgetContainer>
            <button onClick={() => setEventCount(eventCount + 1)}>
              Add Event
            </button>
          </>
        );
      }

      render(<DynamicTimeline />);

      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.queryByText("Event 2")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Add Event"));

      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 2")).toBeInTheDocument();
    });
  });
});
