import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { LineChart } from "../src/charts/LineChart";
import { KnowledgeGraph } from "../src/graphs/KnowledgeGraph";
import { OrganizationalGraph } from "../src/graphs/OrganizationalGraph";
import { MemoryTimeline } from "../src/timeline/MemoryTimeline";

interface WidgetContainerCompatibilityProps {
  id: string;
  title: string;
  children: ReactNode;
}

function TahaWidgetContainer({
  id,
  title,
  children,
}: WidgetContainerCompatibilityProps) {
  return (
    <div
      id={id}
      data-testid="widget-container"
      className="flex flex-col h-full"
    >
      <h3>{title}</h3>
      <div className="flex-1 p-4 w-full h-full">{children}</div>
    </div>
  );
}

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

  it("highlights matching organizational graph nodes during search", () => {
    render(
      <OrganizationalGraph
        accessibleLabel="Searchable organizational graph"
        title="Organization Search"
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

    const searchInput = screen.getByLabelText(
      "Search organizational graph",
    );
    const ayeshaNode = screen.getByLabelText("person: Ayesha");
    const financeNode = screen.getByLabelText("team: Finance");

    expect(ayeshaNode).toHaveStyle({ opacity: "1" });
    expect(financeNode).toHaveStyle({ opacity: "1" });

    fireEvent.change(searchInput, {
      target: { value: "Ayesha" },
    });

    expect(searchInput).toHaveValue("Ayesha");
    expect(ayeshaNode).toHaveStyle({ opacity: "1" });
    expect(financeNode).toHaveStyle({ opacity: "0.22" });

    const ayeshaCircle = ayeshaNode.querySelector("circle");

    expect(ayeshaCircle).not.toBeNull();
    expect(ayeshaCircle).toHaveAttribute("stroke", "#f59e0b");

    fireEvent.change(searchInput, {
      target: { value: "" },
    });

    expect(financeNode).toHaveStyle({ opacity: "1" });
  });

  it("supports knowledge graph search, grouping, zoom, and keyboard selection", () => {
    const onNodeSelect = vi.fn();

    render(
      <KnowledgeGraph
        accessibleLabel="Company knowledge map"
        onNodeSelect={onNodeSelect}
        nodes={[
          {
            id: "knowledge-1",
            label: "Deployment guide",
            type: "knowledge",
          },
          {
            id: "project-1",
            label: "Castor",
            type: "project",
          },
        ]}
        edges={[
          {
            id: "edge-1",
            source: "knowledge-1",
            target: "project-1",
            label: "Documents",
          },
        ]}
      />,
    );

    const search = screen.getByLabelText("Search knowledge graph");
    const filter = screen.getByLabelText(
      "Filter knowledge graph by node type",
    );
    const knowledgeNode = screen.getByLabelText(
      "knowledge: Deployment guide",
    );
    const projectNode = screen.getByLabelText("project: Castor");

    fireEvent.change(search, {
      target: { value: "Deployment" },
    });

    expect(knowledgeNode).toHaveAttribute("data-search-match", "true");
    expect(projectNode).toHaveStyle({ opacity: "0.22" });

    fireEvent.click(screen.getByLabelText("Zoom in knowledge graph"));
    expect(screen.getByLabelText("knowledge graph zoom level")).toHaveTextContent(
      "115%",
    );

    fireEvent.keyDown(knowledgeNode, { key: "Enter" });
    expect(onNodeSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "knowledge-1" }),
    );

    fireEvent.change(filter, { target: { value: "project" } });
    expect(screen.queryByText("Deployment guide")).not.toBeInTheDocument();
    expect(screen.getByText("Castor")).toBeInTheDocument();
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

  it("sorts memory events chronologically and filters them", () => {
    render(
      <MemoryTimeline
        accessibleLabel="Filterable memory timeline"
        events={[
          {
            id: "event-3",
            timestamp: "2026-08-20T10:00:00Z",
            title: "Release approved",
            category: "release",
            source: "GitHub",
          },
          {
            id: "event-1",
            timestamp: "2026-08-05T10:00:00Z",
            title: "Planning meeting",
            category: "meeting",
            source: "Calendar",
          },
          {
            id: "event-2",
            timestamp: "2026-08-12T10:00:00Z",
            title: "Design review",
            category: "review",
            source: "WOBA",
          },
        ]}
      />,
    );

    const timeline = screen.getByRole("list", {
      name: "Chronological memory events",
    });

    expect(timeline).toHaveTextContent(
      /Planning meeting.*Design review.*Release approved/,
    );

    fireEvent.change(screen.getByLabelText("Search memory timeline"), {
      target: { value: "WOBA" },
    });

    expect(screen.getByText("Design review")).toBeInTheDocument();
    expect(screen.queryByText("Planning meeting")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.change(
      screen.getByLabelText("Filter timeline by category"),
      { target: { value: "release" } },
    );

    expect(screen.getByText("Release approved")).toBeInTheDocument();
    expect(screen.queryByText("Design review")).not.toBeInTheDocument();
  });

  it("filters memory events by date range and scrubber position", () => {
    render(
      <MemoryTimeline
        accessibleLabel="Temporal memory timeline"
        events={[
          {
            id: "event-1",
            timestamp: "2026-08-01T12:00:00Z",
            title: "August started",
          },
          {
            id: "event-2",
            timestamp: "2026-08-15T12:00:00Z",
            title: "Mid-month review",
          },
          {
            id: "event-3",
            timestamp: "2026-08-30T12:00:00Z",
            title: "Month completed",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filter timeline from date"), {
      target: { value: "2026-08-10" },
    });
    fireEvent.change(screen.getByLabelText("Filter timeline until date"), {
      target: { value: "2026-08-30" },
    });

    expect(screen.queryByText("August started")).not.toBeInTheDocument();
    expect(screen.getByText("Mid-month review")).toBeInTheDocument();
    expect(screen.getByText("Month completed")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Scrub through timeline events"), {
      target: { value: "50" },
    });

    expect(screen.getByText("Mid-month review")).toBeInTheDocument();
    expect(screen.queryByText("Month completed")).not.toBeInTheDocument();
  });

  it("exposes confidence, provenance, and event selection accessibly", () => {
    const onEventSelect = vi.fn();

    render(
      <MemoryTimeline
        accessibleLabel="Accessible memory timeline"
        onEventSelect={onEventSelect}
        events={[
          {
            id: "event-1",
            timestamp: "2026-08-09T10:00:00Z",
            title: "Verified decision",
            source: "Decision log",
            confidence: 0.82,
          },
        ]}
      />,
    );

    expect(screen.getByTitle("Event provenance or source")).toHaveTextContent(
      "Source: Decision log",
    );
    expect(
      screen.getByRole("progressbar", {
        name: "Verified decision confidence",
      }),
    ).toHaveAttribute("aria-valuenow", "82");

    fireEvent.click(
      screen.getByRole("button", { name: /Verified decision/ }),
    );

    expect(onEventSelect).toHaveBeenCalledTimes(1);
    expect(onEventSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "event-1" }),
    );
  });

  it("resizes inside Taha's WidgetContainer compatibility contract", () => {
    render(
      <TahaWidgetContainer id="knowledge-widget" title="Knowledge">
        <KnowledgeGraph
          accessibleLabel="Responsive knowledge graph"
          width="100%"
          height={360}
          nodes={[
            {
              id: "knowledge-1",
              label: "Castor guide",
              type: "knowledge",
            },
          ]}
          edges={[]}
        />
      </TahaWidgetContainer>,
    );

    expect(screen.getByTestId("widget-container")).toHaveClass(
      "h-full",
    );
    expect(
      screen.getByRole("region", { name: "Responsive knowledge graph" }),
    ).toHaveStyle({ width: "100%" });
    expect(
      screen.getByRole("img", {
        name: "Responsive knowledge graph visualization",
      }),
    ).toHaveAttribute("width", "100%");
  });

  it("receives live timeline data updates inside Taha's WidgetContainer", () => {
    const initialEvents = [
      {
        id: "event-1",
        timestamp: "2026-08-24T10:00:00Z",
        title: "Initial memory",
      },
    ];

    const view = render(
      <TahaWidgetContainer id="memory-widget" title="Memory">
        <MemoryTimeline
          accessibleLabel="Live memory timeline"
          events={initialEvents}
        />
      </TahaWidgetContainer>,
    );

    expect(screen.getByText("Initial memory")).toBeInTheDocument();

    view.rerender(
      <TahaWidgetContainer id="memory-widget" title="Memory">
        <MemoryTimeline
          accessibleLabel="Live memory timeline"
          events={[
            ...initialEvents,
            {
              id: "event-2",
              timestamp: "2026-08-24T11:00:00Z",
              title: "Live memory update",
            },
          ]}
        />
      </TahaWidgetContainer>,
    );

    expect(screen.getByText("Initial memory")).toBeInTheDocument();
    expect(screen.getByText("Live memory update")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 events")).toBeInTheDocument();
  });
});
