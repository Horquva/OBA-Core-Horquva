# Castor Visualization Component Library

**Owner:** Hazam Mehmood
**Platform:** Visualization
**Branch:** `castor/visualization`
**Week:** 3
**Status:** Complete

---

## Overview

This package provides reusable React and TypeScript visualization components for the WOBA Web Application.

The components render organizational intelligence through accessible SVG and HTML interfaces without changing or mutating the meaning of backend data. They are designed to be hosted inside the Executive Workspace `WidgetContainer` and `WorkspaceGrid` components.

## Technology

- React
- TypeScript
- SVG and HTML rendering
- Vitest
- React Testing Library
- Accessible and responsive component interfaces

## Implemented Components

### Metric and KPI Components

- `Metric`
- `MetricWithTrend`
- `MetricComparison`
- `MetricStatus`

### Quantitative Chart Components

- `LineChart`
- `BarChart`
- `AreaChart`
- `ScatterPlot`
- `DistributionChart`

### Organizational Intelligence Components

- `OrganizationalGraph`
- `KnowledgeGraph`
- `MemoryTimeline`

## Shared Foundation

The library also provides:

- Typed chart, metric, graph, and timeline data contracts
- Accessible labels for visualization surfaces
- Responsive width and height properties
- Loading, empty, partial, ready, stale, invalid, unavailable, permission-restricted, and error states
- Source, provenance, freshness, and update metadata
- Central exports through `src/index.ts`

## Data Boundary

The visualization library:

- Receives data through typed properties and JSON-compatible contracts
- Does not directly access backend databases
- Does not change organizational meaning or intelligence
- Does not perform business reasoning
- Preserves source and provenance metadata
- Only controls the visual presentation of supplied data

## Usage Example

```tsx
import {
  LineChart,
  Metric,
} from "@horquva/castor-visualization";

const revenueSeries = [
  {
    id: "revenue",
    label: "Revenue",
    color: "#2563eb",
    data: [
      { x: "Q1", y: 120 },
      { x: "Q2", y: 148 },
      { x: "Q3", y: 167 },
    ],
  },
];

export function ExecutiveOverviewWidget() {
  return (
    <>
      <Metric
        accessibleLabel="Current revenue"
        data={{
          label: "Revenue",
          value: 167,
          unit: "M",
          trend: 12.4,
          status: "positive",
          metadata: {
            source: "WOBA",
            updatedAt: "2026-08-09",
          },
        }}
      />

      <LineChart
        accessibleLabel="Quarterly revenue trend"
        title="Revenue Trend"
        series={revenueSeries}
        height={320}
      />
    </>
  );
}
```

## Executive Workspace Integration

For integration into Taha Zaidi's Executive Workspace:

1. Import the required component from the visualization package.
2. Render it inside a `WidgetContainer`, `WorkspacePanel`, or `WorkspaceGrid`.
3. Always provide a meaningful `accessibleLabel`.
4. Pass backend data through the shared typed contracts.
5. Pass an explicit visualization state when data is loading, empty, unavailable, or in error.
6. Preserve source, provenance, freshness, and update information supplied by WOBA.

The Executive Workspace controls page composition and widget dimensions. This library controls visualization rendering inside those containers.

Compatibility tests import Taha Zaidi's real `WidgetContainer` from the
`castor/executive-workspace` branch. They verify all 12 visualization
components, full-width rendering, container loading and error states,
the real refresh callback, and updated data props after React rerenders.
Visualizations are passed through `children` inside the container's
`w-full h-full` content area.

## Quality Verification

The following verification commands pass successfully:

```bash
npm run typecheck
npm test
```

Current automated verification result:

- TypeScript typecheck passed
- 2 test files passed
- 22 automated tests passed
- 0 known test failures

The tests cover:

- Metric content and loading states
- All five quantitative chart components
- All four metric components
- Organizational and knowledge graph rendering
- Memory timeline events, filters, and live updates
- Real Executive Workspace `WidgetContainer` integration
- Container loading, error, refresh, and responsive-width behavior

### Rendering performance benchmarks

Run the repeatable interaction benchmarks with:

```bash
npm run benchmark
```

The suite exercises a 100-node/150-edge graph and a 250-event
timeline. The smooth-interaction target is at least 60 operations per
second, corresponding to a 16.67 ms frame budget. The verified local
results were approximately 307 graph zoom operations per second and
461 timeline scrub operations per second. These jsdom results provide
a stable regression signal; final visual FPS must also be measured in
the browser after connection to the Workspace `WidgetContainer`.

## Repository

GitHub branch:

[castor/visualization](https://github.com/Horquva/OBA-Core-Horquva/tree/castor/visualization/ecosystem/applications/castor/platforms/visualization)

No pull request has been created because the team lead instructed platform owners to work only in their dedicated branches until further notice.

## Current Limitations and Next Steps

- Live WOBA API integration will be completed through shared JSON experience contracts.
- Final workspace placement depends on the Executive Workspace shell.
- Visual styling can be aligned further when shared Castor design tokens are finalized.
- Additional interaction and accessibility tests can be added during integration.
