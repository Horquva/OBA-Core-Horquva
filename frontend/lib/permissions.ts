import type { Role, Session } from '@/types/view';

export function isViewerOnly(session: Session | null): boolean {
  if (!session) return true;
  return session.role === 'viewer';
}

export function canEdit(session: Session | null): boolean {
  if (!session) return false;
  return session.role === 'admin' || session.role === 'reviewer';
}

export function canAttest(session: Session | null): boolean {
  if (!session) return false;
  return session.role === 'admin' || session.role === 'reviewer';
}

export function canInitiateDeparture(session: Session | null): boolean {
  if (!session) return false;
  return session.role === 'admin' || session.isHrManager;
}

export function canManageSettings(session: Session | null): boolean {
  if (!session) return false;
  return session.role === 'admin';
}
