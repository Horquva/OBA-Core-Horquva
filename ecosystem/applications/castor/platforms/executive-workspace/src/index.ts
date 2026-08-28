export { default as ApplicationShell } from './components/shell/ApplicationShell';
export { default as TopNavBar } from './components/shell/TopNavBar';
export { default as SidebarNav } from './components/shell/SidebarNav';
export { default as Breadcrumbs } from './components/shell/Breadcrumbs';
export { default as WorkspaceGrid } from './components/layout/WorkspaceGrid';
export { default as WorkspaceSection } from './components/layout/WorkspaceSection';
export { default as WidgetContainer } from './components/widgets/WidgetContainer';

export type {
  NavigationItem,
  WidgetContainerProps,
  WorkspaceGridProps,
  BreadcrumbItem,
} from './types/workspace.types';
export { default as WorkspacePanel } from './components/layout/WorkspacePanel';
export { default as WorkspaceSplitView } from './components/layout/WorkspaceSplitView';
export { WorkspaceStateProvider, useWorkspaceState } from './context/WorkspaceStateContext';
export { default as WorkspaceTabs } from './components/shell/WorkspaceTabs';
export type { TabItem } from './components/shell/WorkspaceTabs';
export { default as WorkspaceDrawer } from './components/shell/WorkspaceDrawer';
export { default as WorkspaceModal } from './components/shell/WorkspaceModal';
export { default as WorkspaceToolbar } from './components/shell/WorkspaceToolbar';
export { default as WorkspaceContextBar } from './components/shell/WorkspaceContextBar';
export { default as WorkspaceEmptyState } from './components/shell/WorkspaceEmptyState';
export { default as WorkspaceErrorState } from './components/shell/WorkspaceErrorState';