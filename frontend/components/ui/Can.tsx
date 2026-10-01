import * as React from 'react';
import type { Role, Session } from '@/types/view';

export type UserRole = Role | 'owner' | 'contributor';
export type AppAction = 'edit' | 'attest' | 'resolve' | 'export' | 'admin';

const PERMISSION_MATRIX: Record<UserRole, AppAction[]> = {
  admin: ['admin', 'edit', 'attest', 'resolve', 'export'],
  owner: ['edit', 'attest', 'resolve', 'export'],
  contributor: ['edit', 'resolve', 'export'],
  reviewer: ['attest', 'resolve', 'export'],
  viewer: ['export'],
};

export function hasPermission(role: UserRole = 'viewer', action: AppAction): boolean {
  const allowed = PERMISSION_MATRIX[role];
  if (!allowed) return false;
  return allowed.includes(action);
}

export interface CanProps {
  perform: AppAction;
  role?: UserRole;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ perform, role = 'viewer', fallback = null, children }: CanProps) {
  const isAllowed = hasPermission(role, perform);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
