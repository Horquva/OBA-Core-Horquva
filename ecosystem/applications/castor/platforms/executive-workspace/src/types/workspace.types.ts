import { ReactNode } from 'react';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
  path: string;
  badge?: string;
}

export interface WidgetContainerProps {
  id: string;
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: string;
  children: ReactNode;
  onRefresh?: () => void;
}

export interface WorkspaceGridProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}