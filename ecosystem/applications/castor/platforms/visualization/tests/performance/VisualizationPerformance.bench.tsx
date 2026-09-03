import { fireEvent, render } from "@testing-library/react";
import { afterAll, bench, describe } from "vitest";

import type {
  GraphEdge,
  GraphNode,
  TimelineEvent,
} from "../../src/contracts/visualization.types";
import { OrganizationalGraph } from "../../src/graphs/OrganizationalGraph";
import { MemoryTimeline } from "../../src/timeline/MemoryTimeline";

const graphNodes: GraphNode[] = Array.from(
  { length: 100 },
  (_, index) => ({
    id: `node-${index}`,
    label: `Node ${index}`,
    type: index % 2 === 0 ? "person" : "knowledge",
  }),
);

const graphEdges: GraphEdge[] = Array.from(
  { length: 150 },
  (_, index) => ({
    id: `edge-${index}`,
    source: `node-${index % graphNodes.length}`,
    target: `node-${(index + 1) % graphNodes.length}`,
    weight: (index % 5) + 1,
  }),
);

const timelineEvents: TimelineEvent[] = Array.from(
  { length: 250 },
  (_, index) => ({
    id: `event-${index}`,
    timestamp: new Date(
      Date.UTC(2026, 0, 1) + index * 86_400_000,
    ).toISOString(),
    title: `Memory event ${index}`,
    category: index % 2 === 0 ? "decision" : "review",
    source: "Performance fixture",
    confidence: 0.9,
  }),
);

describe("60fps interaction target (at least 60 operations per second)", () => {
  const graphView = render(
    <OrganizationalGraph
      accessibleLabel="Performance graph"
      nodes={graphNodes}
      edges={graphEdges}
    />,
  );
  const timelineView = render(
    <MemoryTimeline
      accessibleLabel="Performance timeline"
      events={timelineEvents}
      />,
  );
  const zoomInButton = graphView.getByLabelText(
    "Zoom in organizational graph",
  );
  const zoomOutButton = graphView.getByLabelText(
    "Zoom out organizational graph",
  );
  const timelineScrubber = timelineView.getByLabelText(
    "Scrub through timeline events",
  );
  let graphZoomedIn = false;
  let scrubbedForward = false;

  afterAll(() => {
    graphView.unmount();
    timelineView.unmount();
  });

  bench("zooms an already-mounted 100-node, 150-edge graph", () => {
    graphZoomedIn = !graphZoomedIn;
    fireEvent.click(graphZoomedIn ? zoomInButton : zoomOutButton);
  });

  bench("scrubs an already-mounted 250-event memory timeline", () => {
    scrubbedForward = !scrubbedForward;
    fireEvent.change(timelineScrubber, {
      target: { value: scrubbedForward ? "100" : "99.9" },
    });
  });
});
