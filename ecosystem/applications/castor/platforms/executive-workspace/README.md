# Executive Workspace Platform (WOBA Shell)

The Application Shell & Layout System for the Horquva Castor Executive Workspace, built with React, TypeScript, and Tailwind CSS.

## What this is

This platform provides the frame that other teams' widgets plug into:
- **ApplicationShell** — top nav, collapsible sidebar, main viewport
- **WorkspaceGrid** — responsive 1–4 column grid
- **WidgetContainer** — card wrapper with loading/error/ready states

## Install

```bash
npm install
```

## Run type checking

```bash
npm run typecheck
```

## Run tests

```bash
npm test
```

## Usage

```tsx
import { ApplicationShell, WorkspaceGrid, WidgetContainer } from './src';

<ApplicationShell navigationItems={navItems} userName="Jane Doe" userRole="COO">
  <WorkspaceGrid columns={4} gap="md">
    <WidgetContainer id="revenue" title="Revenue">
      {/* Hazam's chart component goes here */}
    </WidgetContainer>
  </WorkspaceGrid>
</ApplicationShell>
```

See `src/WorkspaceDashboard.tsx` for a full working example.

## Folder structure