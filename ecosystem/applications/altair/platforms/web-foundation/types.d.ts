export type RouteId =
  | 'dashboard'
  | 'projects'
  | 'knowledge'
  | 'notifications'
  | 'activity'
  | 'profile'
  | 'settings'
  | 'workflows';

export type ThemeMode = 'light' | 'dark';
export type HTMLTagName = 'button' | 'input' | 'textarea' | 'select' | 'nav' | 'main' | 'aside';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type InputVariant = 'default' | 'error' | 'success';
export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface RouteDefinition {
  id: RouteId;
  label: string;
  path: string;
  requiresAuth?: boolean;
  summary: string;
  status: 'approved' | 'placeholder' | 'deferred';
}

export interface ThemeTokens {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    foreground: string;
    muted: string;
    border: string;
    primary: string;
    primarySoft: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  typography: {
    body: string;
    heading: string;
    label: string;
    caption: string;
  };
  focus: {
    ring: string;
    offset: string;
  };
  motion: {
    transition: string;
  };
}

export interface AppState {
  sidebarOpen: boolean;
  themeMode: ThemeMode;
  notifications: number;
  activeRoute: RouteId;
  isHydrated: boolean;
}

export interface RequestState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: string | null;
  updatedAt: string | null;
}

export interface EmptyStateConfig {
  title: string;
  description: string;
  actionLabel?: string;
  actionHandler?: string;
}

export interface ErrorStateConfig {
  title: string;
  message: string;
  retryLabel?: string;
  retryHandler?: string;
}

export interface ServiceRequest<T> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  transform?: (payload: unknown) => T;
}

export interface ServiceResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export interface ButtonProps {
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  variant?: InputVariant;
  type?: 'text' | 'email' | 'password' | 'search';
}

export interface NotificationItem {
  id: string;
  tone: AlertTone;
  title: string;
  message: string;
  createdAt: string;
}

export interface AppLayoutDefinition {
  header: { title: string; supportText?: string };
  navigation: RouteDefinition[];
  sidebar?: boolean;
  mainRegionLabel: string;
}
