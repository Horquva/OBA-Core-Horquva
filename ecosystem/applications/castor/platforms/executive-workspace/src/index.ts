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